# Technical Requirements Document (TRD)

## Project
Form Builder with Conditional Branching

## Version
1.0

## Date
2026-03-27

## Primary Stack
- React 19 + TypeScript + Vite
- Tailwind CSS v4
- shadcn/ui (Radix-based primitives)
- Redux Toolkit + React Redux
- TanStack React Query

## 1. Purpose
This TRD translates the FRD into an implementation-ready technical blueprint for a frontend-only product that supports:
- Dynamic multi-step form authoring
- Conditional branching logic
- Real-time rule evaluation in Preview mode
- Deeply nested executable JSON schema output
- Mock API persistence

## 2. Goals and Constraints
### 2.1 Technical Goals
- Deterministic, testable state engine for branching logic
- Clear separation of concerns between schema authoring, runtime execution, and persistence
- Smooth UX for large forms (target up to 10 pages and 100+ fields)
- Strict typing and runtime validation to avoid malformed schemas

### 2.2 Constraints
- No backend service in initial release
- Must simulate real async API behavior
- Must support all FRD field types and rule actions

## 3. Architecture Overview
### 3.1 Architecture Style
A layered, feature-oriented frontend architecture:
- Presentation Layer: React components + shadcn/ui + Tailwind
- State Layer: Redux Toolkit (authoring and runtime), memoized selectors
- Rule Engine Layer: Pure TypeScript compiler and evaluator
- Data Layer: React Query service adapters + mock API handlers
- Validation Layer: Zod schemas for runtime contract safety

### 3.2 Runtime Modes
- Builder Mode: manages form structure, field metadata, and rule authoring
- Preview Mode: executes compiled schema and evaluates branching on every response change

### 3.3 Proposed Module Boundaries
- app: providers, app shell, routing, store setup
- domains/schema: schema models, migration, normalization
- domains/builder: page/field/rule CRUD and ordering logic
- domains/engine: compile, dependency graph, evaluation pipeline
- domains/preview: responses, navigation, visible state
- domains/api: query keys, API client, DTO mapping
- shared/ui: shadcn wrappers, reusable UI components
- shared/lib: id generation, date and value utilities, logging

## 4. Technology Decisions
### 4.1 State Management
Decision: Redux Toolkit for primary app state.
Rationale:
- Complex cross-panel editing state and runtime visibility graph require centralized deterministic updates.
- Supports time-travel-friendly debugging and predictable reducers.
- Easy composition with memoized selectors and dev tooling.

### 4.2 Server State Management
Decision: TanStack React Query for API interactions.
Rationale:
- Handles async cache, retry policies, and stale data behavior for list and detail views.
- Keeps persistence concerns separate from local editing state.

### 4.3 Mock API Strategy
Decision: MSW + localStorage-backed repository adapter.
Rationale:
- MSW simulates real network boundaries while keeping implementation frontend-only.
- localStorage provides persistence across browser refresh for realistic save/load flows.
- Easy latency/error injection for resilience testing.

### 4.4 Validation Strategy
Decision: Zod for runtime validation and parsing of schema payloads.
Rationale:
- Strong runtime guarantees in addition to TypeScript static typing.
- Enables migration-safe parsing with clear error reporting.

### 4.5 Drag-and-Drop (Recommended)
Decision: dnd-kit.
Rationale:
- Accessible drag/drop experience for page and field reorder.
- Better composability than HTML5 native drag events for complex nested items.

## 5. Recommended Dependency Additions
### 5.1 Runtime Dependencies
- @reduxjs/toolkit
- react-redux
- @tanstack/react-query
- @tanstack/react-query-devtools
- zod
- nanoid
- msw
- dnd-kit core packages
- class-variance-authority
- clsx
- tailwind-merge

### 5.2 Dev/Test Dependencies
- vitest
- @testing-library/react
- @testing-library/user-event
- @testing-library/jest-dom
- jsdom
- playwright

## 6. Data Contracts
### 6.1 Core Type Model
```ts
export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'email'
  | 'phone'
  | 'date'
  | 'dropdown'
  | 'multiSelect'
  | 'radio'
  | 'checkbox'
  | 'checkboxGroup'
  | 'toggle';

export type Operator =
  | 'equals'
  | 'notEquals'
  | 'contains'
  | 'notContains'
  | 'isEmpty'
  | 'isNotEmpty'
  | 'greaterThan'
  | 'lessThan';

export type RuleActionType =
  | 'showField'
  | 'hideField'
  | 'showPage'
  | 'hidePage'
  | 'skipToPage'
  | 'setRequired'
  | 'clearValue';
```

### 6.2 Schema Normalization Strategy
Store authored schema in normalized maps for efficient updates:
- pagesById
- fieldsById
- rulesById
- pageOrder
- ruleOrder

Persist/export denormalized schema shape compliant with FRD executable JSON contract.

### 6.3 ID Strategy
- IDs are immutable once created.
- IDs are generated using nanoid.
- Labels are editable and non-identifying.

## 7. State Design
### 7.1 Redux Slices
- builderSlice
  - form metadata
  - normalized pages and fields
  - rules and rule ordering
  - selected nodes and editing context
- previewSlice
  - response values by field id
  - current page id
  - visited page ids
- runtimeSlice
  - visibleFieldIds
  - visiblePageIds
  - requiredOverrides
  - hiddenReasonByTarget (dev diagnostics)
- uiSlice
  - mode (builder or preview)
  - panel state and dialogs
  - toasts and banners

### 7.2 Derived Selectors
Memoized selectors (Reselect) must compute:
- active pages in navigation order
- visible fields per active page
- required fields under current visibility
- validation errors for current page and entire form
- impacted rule IDs for changed field

### 7.3 Undo/Redo (Recommended)
Implement command-based undo/redo for builder mutations:
- add and remove page
- add and remove field
- edit field config
- add and edit rule
- reorder page and field

## 8. Rule Engine Design
### 8.1 Engine Components
- Compiler
  - validates schema references and operator compatibility
  - builds dependency index: source field -> affected rules
  - builds target index: rule -> targets
  - detects cycles in rule dependencies
- Evaluator
  - evaluates impacted rules incrementally on response changes
  - resolves conflicts using deterministic order
  - emits runtime patch (visibility, required flags, navigation adjustments)

### 8.2 Evaluation Algorithm
1. On input change, update response value in previewSlice.
2. Lookup impacted rules from dependency index.
3. Evaluate conditions for impacted rules only.
4. Build action queue sorted by:
   - action precedence
   - rule priority (higher wins)
   - rule order fallback
5. Apply resulting runtime patch atomically in runtimeSlice.
6. Recompute current page validity and navigation path.
7. Clear hidden field values when clearOnHide is true.

### 8.3 Action Precedence
1. Field visibility actions
2. Page visibility actions
3. Required toggles
4. Value mutation actions
5. Navigation actions (skipToPage) after visibility set is finalized

### 8.4 Loop and Safety Guards
- Compile-time cycle detection over rule dependency graph.
- Runtime max evaluation depth guard.
- Hard fail in dev mode with diagnostics panel.
- Soft fail in prod mode with fallback to last stable runtime state.

## 9. Validation Design
### 9.1 Builder-Time Validation
- Duplicate IDs
- Missing rule facts and targets
- Operator and field-type mismatch
- Invalid defaultValue type for field type
- Invalid options and selected values mismatch

### 9.2 Preview-Time Validation
- Required only when visible
- Type-aware value validation
- Page-level validity before next navigation
- Form-level validity before submit

### 9.3 Validation Engine Strategy
- Zod schemas for structural validation
- Pure validator functions for dynamic rule and runtime checks
- Validation output model:
  - error code
  - severity
  - target id
  - human-friendly message

## 10. API and Persistence Design
### 10.1 API Surface
- POST /api/forms
- PUT /api/forms/:id
- GET /api/forms/:id
- GET /api/forms

### 10.2 API Handler Implementation
- Use MSW request handlers.
- Persist records in localStorage under namespace form-builder:forms:v1.
- Each save increments version and updates savedAt timestamp.

### 10.3 Latency and Failure Simulation
- Random latency: 300 to 1200 ms
- Configurable failure probability default 5 percent
- Configurable through environment variable:
  - VITE_MOCK_API_FAILURE_RATE

### 10.4 React Query Contract
Use query keys:
- ['forms']
- ['forms', formId]

Mutations:
- createFormMutation
- updateFormMutation

Policies:
- retry: 1 for GET, 0 for write operations
- staleTime: 30 seconds for list and detail

## 11. UI and Interaction Design
### 11.1 Builder Layout
- Left panel
  - pages tree
  - add and reorder pages
- Center panel
  - page canvas
  - field cards and reorder controls
- Right panel
  - inspector tabs: field, page, rules

### 11.2 Preview Layout
- stepper header with active page
- form body with only visible fields
- navigation footer with Back and Next
- optional diagnostics drawer in dev mode

### 11.3 shadcn Component Usage
- Button, Input, Textarea, Select, Checkbox, RadioGroup, Switch, Calendar
- Sheet and Dialog for editors and confirmations
- Tabs for inspector sections
- Toast for save and validation feedback
- Badge for rule and visibility state tags

### 11.4 Accessibility
- Keyboard-first navigation for all controls
- Correct labels and described-by wiring
- Focus management on page transitions and conditionally rendered elements
- ARIA live region for critical visibility changes (optional)

## 12. Performance Strategy
### 12.1 Targets
- Rule re-evaluation under 50 ms for 200 fields and 300 rules.

### 12.2 Techniques
- normalized state for O(1) lookup
- dependency-index-based incremental evaluation
- memoized selectors to limit rerenders
- React component memoization for field rows and rule cards
- virtualization optional for very large builder panels

### 12.3 Instrumentation
- Mark evaluation start and end using performance.now.
- Emit lightweight dev metrics in diagnostics panel.

## 13. Error Handling and Observability
### 13.1 Error Categories
- schema compile error
- runtime evaluation error
- validation error
- network/mock persistence error

### 13.2 UX Error Patterns
- non-blocking toast for save failures with retry
- inline error chips in rule builder for broken references
- fallback banner in Preview when runtime enters safe mode

### 13.3 Dev Diagnostics
Expose optional trace events:
- inputChanged
- rulesEvaluated
- visibilityChanged
- navigationAdjusted

## 14. Testing Strategy
### 14.1 Unit Tests (Vitest)
- operator evaluation by data type
- grouped conditions all and any nesting
- rule action reducer behavior
- compile-time validation and cycle detection
- hidden value clearing behavior

### 14.2 Integration Tests (RTL + MSW)
- builder to preview flow using same schema
- dynamic visibility while typing/selecting
- page skip and back flow correctness
- save/load/update round-trip with mock API

### 14.3 End-to-End Tests (Playwright)
- baseline branching scenario yes/no path
- nested condition path with required toggles
- visibility conflict resolution path
- failed save with retry path

### 14.4 Coverage Goals
- Engine domain at least 95 percent branch coverage
- Overall project at least 80 percent line coverage

## 15. Security and Data Safety
- Evaluate only whitelisted operators and actions.
- Never evaluate arbitrary JS expressions from schema.
- Sanitize rendered labels and helper text.
- Keep persistence scoped to local mock storage only in this release.

## 16. FRD Traceability Matrix
| FRD Requirement | TRD Implementation Section |
|---|---|
| FR-1 Builder workspace | Sections 7, 11 |
| FR-2 Rule authoring and actions | Sections 6, 8, 9 |
| FR-3 Preview and real-time behavior | Sections 7, 8, 11 |
| FR-4 Executable JSON output | Sections 6, 10 |
| FR-5 Mock API simulation | Section 10 |
| Validation requirements | Section 9 |
| Performance and stability | Sections 8, 12 |
| Testing requirements | Section 14 |

## 17. Delivery Plan
### Phase 1: Foundation
- setup providers (Redux, React Query)
- setup shadcn and baseline app shell
- define schema contracts and validators

### Phase 2: Builder Core
- implement page and field CRUD
- implement inspector editing
- implement reorder interactions

### Phase 3: Rule Engine and Preview
- implement compiler and incremental evaluator
- implement preview rendering and navigation engine
- wire runtime diagnostics (dev mode)

### Phase 4: Persistence and Hardening
- integrate MSW handlers and React Query hooks
- add save/load flows with optimistic-safe UX
- complete tests and performance checks

## 18. Risks and Mitigations
- Risk: Complex rule dependencies create hard-to-debug behavior.
  - Mitigation: compiler diagnostics, dependency visualization, and trace panel.
- Risk: Re-render spikes with large schemas.
  - Mitigation: selector memoization, normalized state, and rendering boundaries.
- Risk: Schema drift between TS and runtime.
  - Mitigation: Zod parse at boundaries and versioned migration path.

## 19. Definition of Technical Done
- All FRD acceptance criteria mapped and implemented.
- Engine determinism validated by test suite.
- Save/load/update/list mock API flows verified.
- Core performance target met on representative schema size.
- Accessibility checks pass for critical Builder and Preview journeys.

## 20. Proposed Next Technical Artifacts
- ADR-001: Redux and Query state boundary decision
- ADR-002: Rule engine compile/evaluate architecture
- ADR-003: MSW + localStorage mock persistence strategy
- JSON Schema Migration Guide for schemaVersion updates
