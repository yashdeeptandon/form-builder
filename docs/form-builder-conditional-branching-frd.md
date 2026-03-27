# Functional Requirements Document (FRD)

## Project
Form Builder with Conditional Branching (Frontend)

## Version
1.0

## Date
2026-03-27

## Authoring Context
This document defines requirements for a frontend application that allows users to build dynamic, multi-step forms with conditional branching, produce an executable JSON schema, and test runtime behavior in a preview mode.

## 1. Executive Summary
The system enables non-technical and semi-technical users to create multi-step forms composed of pages and fields, then configure branching logic so field and page visibility adapts in real-time based on user responses.

The primary output is a deeply nested, executable JSON schema that captures:
- Form metadata
- Page sequence and navigation behavior
- Field definitions and validations
- Conditional rules and branching actions

A mocked API will persist and retrieve schema configurations.

## 2. Objectives
- Provide a Builder workspace where users can create pages and fields.
- Provide a Preview mode that renders the form execution experience.
- Evaluate branching rules in real-time while users interact with Preview.
- Seamlessly show/hide relevant fields and alter page flow according to conditions.
- Persist and load form schema through a mock API layer.

## 3. Scope
### 3.1 In Scope
- Multi-page form design
- Field types:
  - Text (single-line)
  - Textarea (multi-line)
  - Number
  - Email
  - Phone
  - Date
  - Dropdown (single select)
  - Multi Select Dropdown
  - Radio
  - Checkbox (single boolean)
  - Checkbox Group (multi-choice)
  - Toggle/Switch
- Conditional logic with if/then/else behavior
- Rule composition (single and grouped conditions)
- Runtime visibility and page navigation updates
- Schema export and import
- Mock persistence API (save/get/list)

### 3.2 Out of Scope (Initial Release)
- Backend production API integration
- Authentication and authorization
- Rich text editor fields
- File upload fields
- External data connectors for options
- Collaborative real-time editing by multiple builders

## 4. Personas
- Product Ops Manager: Builds internal workflows with no code.
- Analyst: Configures survey-style decision trees.
- QA Engineer: Validates that branching behavior is deterministic and testable.

## 5. Success Criteria
- Builder can create at least 10 pages with 100+ fields without unstable behavior.
- Preview reflects branching outcomes instantly after input changes.
- Schema produced by Builder is executable with no manual editing.
- Mock API supports save, update, fetch by id, and list all forms.
- 95%+ rule-engine unit test coverage for branch evaluation paths.

## 6. Functional Requirements

### FR-1 Builder Workspace
- The application shall provide a workspace with:
  - Page panel (add, reorder, rename, delete pages)
  - Field panel per page (add, edit, delete, reorder fields)
  - Configuration panel for selected page/field/rule
- The user shall be able to add field types:
  - Text
  - Textarea
  - Number
  - Email
  - Phone
  - Date
  - Dropdown
  - Multi Select Dropdown
  - Radio
  - Checkbox
  - Checkbox Group
  - Toggle/Switch
- The user shall be able to define labels, required state, helper text, placeholder text, default values, and option lists (for Dropdown/Radio/Checkbox Group/Multi Select).
- Deleting a page or field that is referenced by rules shall trigger dependency warnings and guided fix options.

### FR-2 Conditional Logic Builder
- The system shall support rule definition against prior answers.
- The system shall support operators:
  - equals, notEquals
  - contains, notContains
  - isEmpty, isNotEmpty
  - greaterThan, lessThan (for Number and Date)
- The system shall support grouped logic:
  - all (logical AND)
  - any (logical OR)
- The system shall support actions:
  - showField
  - hideField
  - showPage
  - hidePage
  - skipToPage
  - setRequired
  - clearValue
- The system shall support optional else-action when condition is false.

### FR-3 Preview Toggle and Runtime
- The user shall be able to switch between Builder and Preview mode.
- Preview shall use the current unsaved in-memory schema state.
- While in Preview, each answer update shall re-evaluate relevant conditions immediately.
- Hidden fields shall disappear without layout breakage and without full form remount.
- Hidden fields with clearOnHide=true shall have their value removed.
- Navigation controls (Next/Back) shall respect dynamic page visibility and skip rules.

### FR-4 Schema Output
- The Builder shall produce a deeply nested executable JSON schema.
- The schema shall include:
  - Metadata
  - Page definitions
  - Field definitions
  - Rule graph
  - Navigation behavior
  - Validation behavior
- Schema shall be serializable, deterministic, and versioned.

### FR-5 Mock API
- The frontend shall include a mocked API service to simulate persistence.
- Required operations:
  - createForm
  - updateForm
  - getFormById
  - listForms
- API behavior shall simulate asynchronous latency and basic failure states.

## 7. User Flows

### 7.1 Builder Flow
1. User creates a form and enters metadata.
2. User adds pages.
3. User adds fields to each page.
4. User configures conditional rules referencing existing fields.
5. User resolves any validation warnings.
6. User saves schema using mock API.

### 7.2 Preview Flow
1. User switches to Preview.
2. User fills values in visible fields.
3. Engine evaluates dependency graph.
4. Hidden fields/pages are updated in real-time.
5. User verifies path outcomes and returns to Builder for adjustments.

## 8. Detailed JSON Schema Contract (Executable)

### 8.1 Design Principles
- Rule references are ID-based, never label-based.
- Schema must be immutable-friendly for state updates.
- Rule graph must be machine-evaluable without custom parsing per rule.
- Version field required for migration strategy.

### 8.2 Canonical Schema Shape
~~~json
{
  "schemaVersion": "1.0.0",
  "form": {
    "id": "form_customer_onboarding",
    "name": "Customer Onboarding",
    "description": "Dynamic intake flow",
    "settings": {
      "saveProgress": true,
      "clearHiddenValuesByDefault": true
    },
    "pages": [
      {
        "id": "page_1",
        "title": "Basic Eligibility",
        "order": 1,
        "visibility": {
          "mode": "always"
        },
        "fields": [
          {
            "id": "q1",
            "type": "radio",
            "label": "Are you an existing customer?",
            "required": true,
            "options": [
              { "label": "Yes", "value": "yes" },
              { "label": "No", "value": "no" }
            ],
            "visibility": { "mode": "always" }
          },
          {
            "id": "q2a",
            "type": "text",
            "label": "Enter your customer ID",
            "required": true,
            "visibility": {
              "mode": "conditional",
              "ruleRef": "rule_show_q2a"
            },
            "behaviors": {
              "clearOnHide": true
            }
          },
          {
            "id": "q2b",
            "type": "dropdown",
            "label": "How did you hear about us?",
            "required": false,
            "options": [
              { "label": "Search Engine", "value": "search" },
              { "label": "Referral", "value": "referral" },
              { "label": "Ad", "value": "ad" }
            ],
            "visibility": {
              "mode": "conditional",
              "ruleRef": "rule_show_q2b"
            }
          }
        ]
      },
      {
        "id": "page_2",
        "title": "Business Details",
        "order": 2,
        "visibility": {
          "mode": "conditional",
          "ruleRef": "rule_show_page_2"
        },
        "fields": [
          {
            "id": "q3",
            "type": "text",
            "label": "Company Name",
            "required": true,
            "visibility": { "mode": "always" }
          }
        ]
      }
    ],
    "rules": [
      {
        "id": "rule_show_q2a",
        "when": {
          "all": [
            {
              "fact": "q1",
              "operator": "equals",
              "value": "yes"
            }
          ]
        },
        "then": [
          {
            "action": "showField",
            "target": "q2a"
          }
        ],
        "else": [
          {
            "action": "hideField",
            "target": "q2a"
          }
        ]
      },
      {
        "id": "rule_show_q2b",
        "when": {
          "all": [
            {
              "fact": "q1",
              "operator": "equals",
              "value": "no"
            }
          ]
        },
        "then": [
          {
            "action": "showField",
            "target": "q2b"
          }
        ],
        "else": [
          {
            "action": "hideField",
            "target": "q2b"
          }
        ]
      },
      {
        "id": "rule_show_page_2",
        "when": {
          "any": [
            {
              "fact": "q1",
              "operator": "equals",
              "value": "yes"
            },
            {
              "fact": "q2b",
              "operator": "notEquals",
              "value": ""
            }
          ]
        },
        "then": [
          {
            "action": "showPage",
            "target": "page_2"
          }
        ],
        "else": [
          {
            "action": "hideField",
            "target": "q3"
          }
        ]
      }
    ],
    "navigation": {
      "startPageId": "page_1",
      "strategy": "sequential_with_skip"
    }
  }
}
~~~

### 8.3 Rule Evaluation Semantics
- all: true only if every condition is true.
- any: true if at least one condition is true.
- Rule conflict resolution order:
  1. Explicit field visibility actions
  2. Page visibility actions
  3. Required toggling actions
  4. Value mutation actions
- If multiple rules target same field visibility in one cycle, latest rule by deterministic order wins (sorted by rule index).

## 9. State Engine Requirements

### 9.1 Runtime Stores
- schemaStore: builder-authored schema state
- responseStore: preview answers keyed by field id
- runtimeStore: computed visibility, required flags, active page path, and validation status

### 9.2 Engine Behavior
- Parse schema into dependency graph:
  - dependencyIndex[sourceFieldId] -> dependentRuleIds
- On answer change:
  1. Update responseStore
  2. Find impacted rules via dependencyIndex
  3. Recompute affected nodes only (incremental evaluation)
  4. Apply actions into runtimeStore atomically
  5. Trigger validation re-check for now-visible required fields
- Engine must prevent infinite loops from rule chains by:
  - cycle detection during rule compile
  - max evaluation depth guard at runtime

### 9.3 Determinism and Stability
- Given same schema + same responses, output must be identical across runs.
- Rules must be pure functions with no hidden side effects.
- Hidden field behavior:
  - keep value if clearOnHide=false
  - clear value if clearOnHide=true

## 10. Builder UI Requirements
- Left pane: page tree and quick actions
- Center pane: page canvas with fields
- Right pane: inspector for selected element and rule builder
- Rule builder UX shall provide:
  - human-readable condition summary
  - source field selector constrained to existing fields
  - target selector constrained by action type
  - invalid reference warnings when source/target deleted

## 11. Preview UX Requirements
- Clear mode switch between Builder and Preview.
- Preview displays only active pages and fields.
- Transition behavior:
  - smooth layout updates for show/hide actions
  - no focus loss for unaffected controls
- Runtime diagnostics panel (optional in dev mode):
  - shows active rules
  - shows why a field/page is hidden

## 12. Validation and Error Handling

### 12.1 Builder-Time Validation
- Duplicate ids are prohibited.
- Rule source/target ids must exist.
- Rule operator must be compatible with source field type.
- Page must contain at least one field unless explicitly marked informational.

### 12.4 Field-Type Validation Rules
- Text/Textarea: supports minLength and maxLength constraints.
- Number: supports min, max, and step constraints; non-numeric values are invalid.
- Email: must follow standard email pattern validation.
- Phone: must support configurable country-aware pattern (default E.164-compatible input check).
- Date: supports minDate and maxDate bounds; runtime comparisons use normalized date values.
- Dropdown/Radio: selected value must exist in allowed options.
- Multi Select Dropdown/Checkbox Group: selected values must be subset of allowed options; minSelect/maxSelect supported.
- Checkbox/Toggle: boolean-only value handling.

### 12.2 Runtime Validation
- Required validation applies only to visible fields.
- Page cannot be submitted if visible required fields are incomplete.
- If active page becomes hidden after change, runtime must route to next valid page.

### 12.3 API Error Handling
- Save failure shall present non-blocking error with retry.
- Unsaved local draft state must remain intact on API failure.

## 13. Mock API Contract

### Endpoints (Simulated)
- POST /api/forms
- PUT /api/forms/:id
- GET /api/forms/:id
- GET /api/forms

### Request and Response Principles
- Content-Type: application/json
- Latency simulation: 300ms to 1200ms random delay
- Error simulation: configurable 5% failure rate in development

### Example Save Response
~~~json
{
  "id": "form_customer_onboarding",
  "version": 7,
  "savedAt": "2026-03-27T14:50:00.000Z",
  "status": "ok"
}
~~~

## 14. Non-Functional Requirements
- Performance:
  - rule re-evaluation after user input should complete within 50ms for 200 fields and 300 rules on modern laptop hardware
- Accessibility:
  - keyboard navigable builder and preview
  - semantic labels for inputs
  - color contrast WCAG AA
- Responsiveness:
  - usable layout on desktop and tablet widths
- Maintainability:
  - strict TypeScript typing for schema and runtime engine
  - modular rule operators and action handlers

## 15. Security and Data Considerations
- Do not execute arbitrary expressions from schema.
- Operators are whitelisted and pure.
- Escape and sanitize user-entered labels/help text when rendered.
- No PII persistence beyond local mock store for development.

## 16. Testing Strategy

### 16.1 Unit Tests
- Operator tests (equals, contains, isEmpty, etc.)
- Rule group tests (all/any nesting)
- Action reducer tests (show/hide/setRequired/clearValue)
- Cycle detection tests
- Field-type validator tests (Number, Email, Phone, Date, Multi Select, Checkbox Group)

### 16.2 Integration Tests
- Builder creates schema then Preview executes same schema.
- Deleting referenced field produces warning and preserves app stability.
- Page skip and back navigation with changing conditions.
- Type-specific rendering and validation in Preview for all supported field types.

### 16.3 End-to-End Tests
- Scenario A: q1 = yes -> q2a visible, q2b hidden, page2 visible.
- Scenario B: q1 = no -> q2a hidden, q2b visible.
- Scenario C: change q1 from yes to no after entering q2a value -> q2a hidden and value cleared if clearOnHide=true.
- Scenario D: complex any/all combinations across pages.

## 17. Observability and Debugging (Development)
- Optional event log for evaluation cycles:
  - inputChanged
  - rulesEvaluated
  - visibilityChanged
  - navigationAdjusted
- Rule trace output should identify:
  - evaluated condition values
  - winning rule when conflicts exist

## 18. Risks and Mitigations
- Risk: Rule conflicts create ambiguous visibility.
  - Mitigation: deterministic precedence and conflict warnings in Builder.
- Risk: Circular references degrade runtime.
  - Mitigation: compile-time cycle detection and runtime depth limits.
- Risk: Large schemas hurt responsiveness.
  - Mitigation: incremental dependency-based evaluation and memoization.

## 19. Acceptance Criteria
- User can create pages and add all supported field types (Text, Textarea, Number, Email, Phone, Date, Dropdown, Multi Select Dropdown, Radio, Checkbox, Checkbox Group, Toggle/Switch).
- User can define conditional branching rules using Builder UI.
- Preview mode reflects live show/hide logic instantly.
- Output JSON schema is deeply nested, executable, and versioned.
- Mock API can save and retrieve schemas with simulated latency.
- Engine handles rule conflicts and edge cases deterministically.

## 20. Future Enhancements
- Advanced field types (file upload, address block, calculated/computed fields).
- Rule templates for common branching patterns.
- Visual rule graph editor.
- Import/export schema packages.
- Backend integration with version history and audit trail.

## 21. Definition of Done
- Functional requirements implemented and demonstrated.
- Test suite passes with branch logic scenarios.
- JSON schema contract documented and stable.
- Mock API integrated with save/load flows.
- No critical accessibility issues in Builder and Preview.

## 22. Appendix A: Field Schema Examples (Implementation-Ready)

### 22.1 Canonical Field Type Enum
The schema should use these canonical type values:
- text
- textarea
- number
- email
- phone
- date
- dropdown
- multiSelect
- radio
- checkbox
- checkboxGroup
- toggle

### 22.2 Common Field Contract
All field objects should follow this base structure:
~~~json
{
  "id": "unique_field_id",
  "type": "text",
  "label": "Field label",
  "required": false,
  "helperText": "Optional help text",
  "defaultValue": "",
  "visibility": {
    "mode": "always"
  },
  "behaviors": {
    "clearOnHide": true
  },
  "validation": {}
}
~~~

### 22.3 Field Type Examples
~~~json
{
  "fieldExamples": [
    {
      "id": "first_name",
      "type": "text",
      "label": "First Name",
      "required": true,
      "defaultValue": "",
      "validation": {
        "minLength": 2,
        "maxLength": 50,
        "pattern": "^[A-Za-z .'-]+$"
      },
      "visibility": { "mode": "always" },
      "behaviors": { "clearOnHide": true }
    },
    {
      "id": "address_notes",
      "type": "textarea",
      "label": "Additional Notes",
      "required": false,
      "defaultValue": "",
      "validation": {
        "minLength": 0,
        "maxLength": 500
      },
      "visibility": { "mode": "always" },
      "behaviors": { "clearOnHide": true }
    },
    {
      "id": "employee_count",
      "type": "number",
      "label": "Employee Count",
      "required": true,
      "defaultValue": null,
      "validation": {
        "min": 1,
        "max": 100000,
        "step": 1
      },
      "visibility": { "mode": "always" },
      "behaviors": { "clearOnHide": true }
    },
    {
      "id": "work_email",
      "type": "email",
      "label": "Work Email",
      "required": true,
      "defaultValue": "",
      "validation": {
        "format": "email",
        "maxLength": 254
      },
      "visibility": { "mode": "always" },
      "behaviors": { "clearOnHide": true }
    },
    {
      "id": "contact_phone",
      "type": "phone",
      "label": "Contact Number",
      "required": false,
      "defaultValue": "",
      "validation": {
        "format": "phone",
        "country": "IN",
        "pattern": "^\\+?[1-9]\\d{7,14}$"
      },
      "visibility": { "mode": "always" },
      "behaviors": { "clearOnHide": true }
    },
    {
      "id": "start_date",
      "type": "date",
      "label": "Start Date",
      "required": true,
      "defaultValue": null,
      "validation": {
        "minDate": "2020-01-01",
        "maxDate": "2035-12-31"
      },
      "visibility": {
        "mode": "conditional",
        "ruleRef": "rule_show_start_date"
      },
      "behaviors": { "clearOnHide": true }
    },
    {
      "id": "industry",
      "type": "dropdown",
      "label": "Industry",
      "required": true,
      "defaultValue": "",
      "options": [
        { "label": "Technology", "value": "tech" },
        { "label": "Healthcare", "value": "healthcare" },
        { "label": "Finance", "value": "finance" }
      ],
      "validation": {
        "allowedValues": ["tech", "healthcare", "finance"]
      },
      "visibility": { "mode": "always" },
      "behaviors": { "clearOnHide": true }
    },
    {
      "id": "preferred_channels",
      "type": "multiSelect",
      "label": "Preferred Communication Channels",
      "required": false,
      "defaultValue": [],
      "options": [
        { "label": "Email", "value": "email" },
        { "label": "SMS", "value": "sms" },
        { "label": "Phone", "value": "phone" },
        { "label": "WhatsApp", "value": "whatsapp" }
      ],
      "validation": {
        "minSelect": 1,
        "maxSelect": 3,
        "allowedValues": ["email", "sms", "phone", "whatsapp"]
      },
      "visibility": { "mode": "always" },
      "behaviors": { "clearOnHide": true }
    },
    {
      "id": "is_existing_customer",
      "type": "radio",
      "label": "Are you an existing customer?",
      "required": true,
      "defaultValue": "",
      "options": [
        { "label": "Yes", "value": "yes" },
        { "label": "No", "value": "no" }
      ],
      "validation": {
        "allowedValues": ["yes", "no"]
      },
      "visibility": { "mode": "always" },
      "behaviors": { "clearOnHide": true }
    },
    {
      "id": "accept_terms",
      "type": "checkbox",
      "label": "I agree to terms and conditions",
      "required": true,
      "defaultValue": false,
      "validation": {
        "mustBeTrue": true
      },
      "visibility": { "mode": "always" },
      "behaviors": { "clearOnHide": false }
    },
    {
      "id": "services_needed",
      "type": "checkboxGroup",
      "label": "Services Needed",
      "required": false,
      "defaultValue": [],
      "options": [
        { "label": "Implementation", "value": "implementation" },
        { "label": "Support", "value": "support" },
        { "label": "Training", "value": "training" }
      ],
      "validation": {
        "minSelect": 1,
        "maxSelect": 2,
        "allowedValues": ["implementation", "support", "training"]
      },
      "visibility": { "mode": "always" },
      "behaviors": { "clearOnHide": true }
    },
    {
      "id": "wants_updates",
      "type": "toggle",
      "label": "Receive Product Updates",
      "required": false,
      "defaultValue": false,
      "validation": {
        "valueType": "boolean"
      },
      "visibility": { "mode": "always" },
      "behaviors": { "clearOnHide": false }
    }
  ]
}
~~~

### 22.4 Notes for Engine Compatibility
- `defaultValue` type must match field type: string, number, boolean, date string, or array.
- `allowedValues` checks should run for option-based controls before submit.
- `minSelect` and `maxSelect` apply only to `multiSelect` and `checkboxGroup`.
- `mustBeTrue` applies only to `checkbox`.

## 23. Appendix B: Branching Rule Schema Examples

### 23.1 Canonical Rule Contract
~~~json
{
  "id": "rule_id",
  "priority": 100,
  "when": {
    "all": [
      {
        "fact": "field_id",
        "operator": "equals",
        "value": "some_value"
      }
    ]
  },
  "then": [
    {
      "action": "showField",
      "target": "target_field_id"
    }
  ],
  "else": [
    {
      "action": "hideField",
      "target": "target_field_id"
    }
  ]
}
~~~

Notes:
- `priority` is optional; if present, higher number executes later and wins on conflicts.
- If `priority` is absent, evaluation order falls back to array index order.
- `then` and `else` support one or more actions.

### 23.2 Example A: Simple If/Else Field Visibility
Condition: If `q1` is `yes`, show `q2a`, else hide it.

~~~json
{
  "id": "rule_show_q2a",
  "when": {
    "all": [
      { "fact": "q1", "operator": "equals", "value": "yes" }
    ]
  },
  "then": [
    { "action": "showField", "target": "q2a" }
  ],
  "else": [
    { "action": "hideField", "target": "q2a" },
    { "action": "clearValue", "target": "q2a" }
  ]
}
~~~

### 23.3 Example B: Nested Group Logic (all + any)
Condition: Show `gst_number` only when country is `IN` and either business type is `company` or revenue is greater than `2000000`.

~~~json
{
  "id": "rule_show_gst",
  "when": {
    "all": [
      { "fact": "country", "operator": "equals", "value": "IN" },
      {
        "any": [
          { "fact": "business_type", "operator": "equals", "value": "company" },
          { "fact": "annual_revenue", "operator": "greaterThan", "value": 2000000 }
        ]
      }
    ]
  },
  "then": [
    { "action": "showField", "target": "gst_number" },
    { "action": "setRequired", "target": "gst_number", "value": true }
  ],
  "else": [
    { "action": "setRequired", "target": "gst_number", "value": false },
    { "action": "hideField", "target": "gst_number" },
    { "action": "clearValue", "target": "gst_number" }
  ]
}
~~~

### 23.4 Example C: Dynamic Page Skipping
Condition: If `needs_support` is `no`, skip directly to summary page.

~~~json
{
  "id": "rule_skip_support_page",
  "when": {
    "all": [
      { "fact": "needs_support", "operator": "equals", "value": "no" }
    ]
  },
  "then": [
    { "action": "skipToPage", "target": "page_summary" },
    { "action": "hidePage", "target": "page_support_details" }
  ],
  "else": [
    { "action": "showPage", "target": "page_support_details" }
  ]
}
~~~

### 23.5 Example D: Multi-Action Rule for Compliance Flow
Condition: If `is_existing_customer` is `yes`, show KYC fields and mark them required.

~~~json
{
  "id": "rule_kyc_for_existing",
  "when": {
    "all": [
      { "fact": "is_existing_customer", "operator": "equals", "value": "yes" }
    ]
  },
  "then": [
    { "action": "showField", "target": "customer_id" },
    { "action": "setRequired", "target": "customer_id", "value": true },
    { "action": "showField", "target": "kyc_verified" },
    { "action": "setRequired", "target": "kyc_verified", "value": true }
  ],
  "else": [
    { "action": "setRequired", "target": "customer_id", "value": false },
    { "action": "hideField", "target": "customer_id" },
    { "action": "clearValue", "target": "customer_id" },
    { "action": "setRequired", "target": "kyc_verified", "value": false },
    { "action": "hideField", "target": "kyc_verified" },
    { "action": "clearValue", "target": "kyc_verified" }
  ]
}
~~~

### 23.6 Example E: Conflict Resolution with Priority
Two rules target the same field visibility. Rule with higher priority wins.

~~~json
{
  "rules": [
    {
      "id": "rule_hide_discount",
      "priority": 10,
      "when": {
        "all": [
          { "fact": "plan", "operator": "equals", "value": "basic" }
        ]
      },
      "then": [
        { "action": "hideField", "target": "discount_code" }
      ]
    },
    {
      "id": "rule_show_discount_for_promo",
      "priority": 20,
      "when": {
        "all": [
          { "fact": "promo_eligible", "operator": "equals", "value": true }
        ]
      },
      "then": [
        { "action": "showField", "target": "discount_code" }
      ]
    }
  ]
}
~~~

Expected behavior:
- If both rules evaluate true, `discount_code` remains visible because priority `20` overrides `10`.
- If priorities are equal, deterministic fallback is rules array order.

### 23.7 Example F: Invalid Rule Patterns (Builder Must Reject)
~~~json
[
  {
    "id": "invalid_missing_fact",
    "when": { "all": [{ "operator": "equals", "value": "yes" }] },
    "then": [{ "action": "showField", "target": "q2" }]
  },
  {
    "id": "invalid_unknown_target",
    "when": { "all": [{ "fact": "q1", "operator": "equals", "value": "yes" }] },
    "then": [{ "action": "showField", "target": "field_not_found" }]
  },
  {
    "id": "invalid_operator_for_type",
    "when": { "all": [{ "fact": "email", "operator": "greaterThan", "value": 10 }] },
    "then": [{ "action": "showField", "target": "q2" }]
  }
]
~~~

Validation expectations:
- Missing `fact` is rejected at schema compile time.
- Unknown `target` is rejected with dependency error.
- Operator/type mismatch is rejected with actionable builder message.

## 24. Appendix C: End-to-End Executable Sample Schema

### 24.1 Full Sample Schema
~~~json
{
  "schemaVersion": "1.1.0",
  "form": {
    "id": "form_b2b_onboarding",
    "name": "B2B Onboarding Flow",
    "description": "Sample end-to-end schema with major field types and branching",
    "settings": {
      "saveProgress": true,
      "clearHiddenValuesByDefault": true
    },
    "pages": [
      {
        "id": "page_intro",
        "title": "Intro and Contact",
        "order": 1,
        "visibility": { "mode": "always" },
        "fields": [
          {
            "id": "is_existing_customer",
            "type": "radio",
            "label": "Are you an existing customer?",
            "required": true,
            "defaultValue": "",
            "options": [
              { "label": "Yes", "value": "yes" },
              { "label": "No", "value": "no" }
            ],
            "visibility": { "mode": "always" },
            "behaviors": { "clearOnHide": true }
          },
          {
            "id": "needs_support",
            "type": "radio",
            "label": "Do you need immediate support setup?",
            "required": true,
            "defaultValue": "",
            "options": [
              { "label": "Yes", "value": "yes" },
              { "label": "No", "value": "no" }
            ],
            "visibility": { "mode": "always" },
            "behaviors": { "clearOnHide": true }
          },
          {
            "id": "contact_email",
            "type": "email",
            "label": "Contact Email",
            "required": true,
            "defaultValue": "",
            "validation": { "format": "email", "maxLength": 254 },
            "visibility": { "mode": "always" },
            "behaviors": { "clearOnHide": true }
          },
          {
            "id": "contact_phone",
            "type": "phone",
            "label": "Contact Phone",
            "required": false,
            "defaultValue": "",
            "validation": { "format": "phone", "pattern": "^\\+?[1-9]\\d{7,14}$" },
            "visibility": { "mode": "always" },
            "behaviors": { "clearOnHide": true }
          },
          {
            "id": "preferred_channels",
            "type": "multiSelect",
            "label": "Preferred Channels",
            "required": false,
            "defaultValue": [],
            "options": [
              { "label": "Email", "value": "email" },
              { "label": "SMS", "value": "sms" },
              { "label": "Phone", "value": "phone" }
            ],
            "validation": { "minSelect": 1, "maxSelect": 3 },
            "visibility": { "mode": "always" },
            "behaviors": { "clearOnHide": true }
          },
          {
            "id": "accept_terms",
            "type": "checkbox",
            "label": "I agree to terms",
            "required": true,
            "defaultValue": false,
            "validation": { "mustBeTrue": true },
            "visibility": { "mode": "always" },
            "behaviors": { "clearOnHide": false }
          },
          {
            "id": "wants_updates",
            "type": "toggle",
            "label": "Receive product updates",
            "required": false,
            "defaultValue": false,
            "validation": { "valueType": "boolean" },
            "visibility": { "mode": "always" },
            "behaviors": { "clearOnHide": false }
          }
        ]
      },
      {
        "id": "page_business",
        "title": "Business Details",
        "order": 2,
        "visibility": { "mode": "always" },
        "fields": [
          {
            "id": "company_name",
            "type": "text",
            "label": "Company Name",
            "required": true,
            "defaultValue": "",
            "validation": { "minLength": 2, "maxLength": 120 },
            "visibility": { "mode": "always" },
            "behaviors": { "clearOnHide": true }
          },
          {
            "id": "company_notes",
            "type": "textarea",
            "label": "Company Notes",
            "required": false,
            "defaultValue": "",
            "validation": { "maxLength": 500 },
            "visibility": { "mode": "always" },
            "behaviors": { "clearOnHide": true }
          },
          {
            "id": "employee_count",
            "type": "number",
            "label": "Employee Count",
            "required": true,
            "defaultValue": null,
            "validation": { "min": 1, "max": 100000, "step": 1 },
            "visibility": { "mode": "always" },
            "behaviors": { "clearOnHide": true }
          },
          {
            "id": "incorporation_date",
            "type": "date",
            "label": "Incorporation Date",
            "required": true,
            "defaultValue": null,
            "validation": { "minDate": "1990-01-01", "maxDate": "2035-12-31" },
            "visibility": { "mode": "always" },
            "behaviors": { "clearOnHide": true }
          },
          {
            "id": "country",
            "type": "dropdown",
            "label": "Country",
            "required": true,
            "defaultValue": "",
            "options": [
              { "label": "India", "value": "IN" },
              { "label": "United States", "value": "US" },
              { "label": "Other", "value": "OTHER" }
            ],
            "visibility": { "mode": "always" },
            "behaviors": { "clearOnHide": true }
          },
          {
            "id": "business_type",
            "type": "dropdown",
            "label": "Business Type",
            "required": true,
            "defaultValue": "",
            "options": [
              { "label": "Company", "value": "company" },
              { "label": "Partnership", "value": "partnership" },
              { "label": "Proprietorship", "value": "proprietorship" }
            ],
            "visibility": { "mode": "always" },
            "behaviors": { "clearOnHide": true }
          },
          {
            "id": "services_needed",
            "type": "checkboxGroup",
            "label": "Services Needed",
            "required": false,
            "defaultValue": [],
            "options": [
              { "label": "Implementation", "value": "implementation" },
              { "label": "Support", "value": "support" },
              { "label": "Training", "value": "training" }
            ],
            "validation": { "minSelect": 1, "maxSelect": 2 },
            "visibility": { "mode": "always" },
            "behaviors": { "clearOnHide": true }
          },
          {
            "id": "gst_number",
            "type": "text",
            "label": "GST Number",
            "required": false,
            "defaultValue": "",
            "visibility": { "mode": "conditional", "ruleRef": "rule_show_gst" },
            "behaviors": { "clearOnHide": true }
          }
        ]
      },
      {
        "id": "page_existing_customer",
        "title": "Existing Customer Details",
        "order": 3,
        "visibility": { "mode": "conditional", "ruleRef": "rule_show_existing_page" },
        "fields": [
          {
            "id": "customer_id",
            "type": "text",
            "label": "Customer ID",
            "required": false,
            "defaultValue": "",
            "visibility": { "mode": "always" },
            "behaviors": { "clearOnHide": true }
          },
          {
            "id": "kyc_verified",
            "type": "radio",
            "label": "KYC Verified?",
            "required": false,
            "defaultValue": "",
            "options": [
              { "label": "Yes", "value": "yes" },
              { "label": "No", "value": "no" }
            ],
            "visibility": { "mode": "always" },
            "behaviors": { "clearOnHide": true }
          }
        ]
      },
      {
        "id": "page_support",
        "title": "Support Requirements",
        "order": 4,
        "visibility": { "mode": "conditional", "ruleRef": "rule_show_support_page" },
        "fields": [
          {
            "id": "issue_category",
            "type": "dropdown",
            "label": "Issue Category",
            "required": false,
            "defaultValue": "",
            "options": [
              { "label": "Technical", "value": "technical" },
              { "label": "Billing", "value": "billing" },
              { "label": "Account", "value": "account" }
            ],
            "visibility": { "mode": "always" },
            "behaviors": { "clearOnHide": true }
          },
          {
            "id": "issue_description",
            "type": "textarea",
            "label": "Issue Description",
            "required": false,
            "defaultValue": "",
            "visibility": { "mode": "conditional", "ruleRef": "rule_show_issue_description" },
            "behaviors": { "clearOnHide": true }
          }
        ]
      },
      {
        "id": "page_summary",
        "title": "Summary",
        "order": 5,
        "visibility": { "mode": "always" },
        "fields": []
      }
    ],
    "rules": [
      {
        "id": "rule_show_existing_page",
        "when": {
          "all": [
            { "fact": "is_existing_customer", "operator": "equals", "value": "yes" }
          ]
        },
        "then": [
          { "action": "showPage", "target": "page_existing_customer" },
          { "action": "setRequired", "target": "customer_id", "value": true },
          { "action": "setRequired", "target": "kyc_verified", "value": true }
        ],
        "else": [
          { "action": "setRequired", "target": "customer_id", "value": false },
          { "action": "setRequired", "target": "kyc_verified", "value": false },
          { "action": "hidePage", "target": "page_existing_customer" },
          { "action": "clearValue", "target": "customer_id" },
          { "action": "clearValue", "target": "kyc_verified" }
        ]
      },
      {
        "id": "rule_show_gst",
        "when": {
          "all": [
            { "fact": "country", "operator": "equals", "value": "IN" },
            {
              "any": [
                { "fact": "business_type", "operator": "equals", "value": "company" },
                { "fact": "employee_count", "operator": "greaterThan", "value": 20 }
              ]
            }
          ]
        },
        "then": [
          { "action": "showField", "target": "gst_number" },
          { "action": "setRequired", "target": "gst_number", "value": true }
        ],
        "else": [
          { "action": "setRequired", "target": "gst_number", "value": false },
          { "action": "hideField", "target": "gst_number" },
          { "action": "clearValue", "target": "gst_number" }
        ]
      },
      {
        "id": "rule_require_phone_for_sms",
        "when": {
          "all": [
            { "fact": "preferred_channels", "operator": "contains", "value": "sms" }
          ]
        },
        "then": [
          { "action": "setRequired", "target": "contact_phone", "value": true }
        ],
        "else": [
          { "action": "setRequired", "target": "contact_phone", "value": false }
        ]
      },
      {
        "id": "rule_show_support_page",
        "when": {
          "all": [
            { "fact": "needs_support", "operator": "equals", "value": "yes" }
          ]
        },
        "then": [
          { "action": "showPage", "target": "page_support" }
        ],
        "else": [
          { "action": "hidePage", "target": "page_support" },
          { "action": "skipToPage", "target": "page_summary" }
        ]
      },
      {
        "id": "rule_show_issue_description",
        "when": {
          "all": [
            { "fact": "issue_category", "operator": "isNotEmpty" }
          ]
        },
        "then": [
          { "action": "showField", "target": "issue_description" },
          { "action": "setRequired", "target": "issue_description", "value": true }
        ],
        "else": [
          { "action": "setRequired", "target": "issue_description", "value": false },
          { "action": "hideField", "target": "issue_description" },
          { "action": "clearValue", "target": "issue_description" }
        ]
      }
    ],
    "navigation": {
      "startPageId": "page_intro",
      "strategy": "sequential_with_skip"
    }
  }
}
~~~

### 24.2 Expected Runtime Paths
- Path A: `is_existing_customer = yes`, `needs_support = yes`
  - Includes `page_existing_customer` and `page_support`
  - `customer_id` and `kyc_verified` are required
- Path B: `is_existing_customer = no`, `needs_support = no`
  - Skips `page_existing_customer`
  - Hides `page_support` and routes to `page_summary`
- Path C: `country = IN` and (`business_type = company` or `employee_count > 20`)
  - Shows `gst_number` and marks it required
- Path D: `preferred_channels` contains `sms`
  - `contact_phone` becomes required in real time
