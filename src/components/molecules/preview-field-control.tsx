import type { ChangeEvent } from 'react'

import type { FieldSchema } from '@/domains/schema/types'

interface PreviewFieldControlProps {
  field: FieldSchema
  value: unknown
  required: boolean
  onChange: (fieldId: string, value: unknown) => void
}

const inputClassName =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring'

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

export function PreviewFieldControl({
  field,
  value,
  required,
  onChange,
}: PreviewFieldControlProps) {
  const setValue = (nextValue: unknown) => onChange(field.id, nextValue)

  const label = (
    <label className='mb-1 block text-sm font-medium text-foreground'>
      {field.label}
      {required ? <span className='ml-1 text-destructive'>*</span> : null}
    </label>
  )

  const helper = field.helperText ? (
    <p className='mt-1 text-xs text-muted-foreground'>{field.helperText}</p>
  ) : null

  if (field.type === 'textarea') {
    return (
      <div>
        {label}
        <textarea
          className={inputClassName}
          value={typeof value === 'string' ? value : ''}
          required={required}
          placeholder={field.placeholder}
          onChange={(event) => setValue(event.target.value)}
        />
        {helper}
      </div>
    )
  }

  if (field.type === 'number') {
    return (
      <div>
        {label}
        <input
          className={inputClassName}
          type='number'
          required={required}
          value={typeof value === 'number' ? value : ''}
          placeholder={field.placeholder}
          onChange={(event: ChangeEvent<HTMLInputElement>) => {
            const raw = event.target.value
            setValue(raw === '' ? '' : Number(raw))
          }}
        />
        {helper}
      </div>
    )
  }

  if (field.type === 'email' || field.type === 'phone' || field.type === 'date' || field.type === 'text') {
    const inputType = field.type === 'phone' ? 'tel' : field.type
    return (
      <div>
        {label}
        <input
          className={inputClassName}
          type={inputType}
          required={required}
          value={typeof value === 'string' ? value : ''}
          placeholder={field.placeholder}
          onChange={(event) => setValue(event.target.value)}
        />
        {helper}
      </div>
    )
  }

  if (field.type === 'dropdown') {
    return (
      <div>
        {label}
        <select
          className={inputClassName}
          value={typeof value === 'string' ? value : ''}
          required={required}
          onChange={(event) => setValue(event.target.value)}
        >
          <option value=''>Select...</option>
          {(field.options ?? []).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {helper}
      </div>
    )
  }

  if (field.type === 'radio') {
    return (
      <div>
        {label}
        <div className='space-y-2'>
          {(field.options ?? []).map((option) => (
            <label key={option.value} className='flex items-center gap-2 text-sm'>
              <input
                type='radio'
                name={field.id}
                value={option.value}
                checked={value === option.value}
                required={required}
                onChange={() => setValue(option.value)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
        {helper}
      </div>
    )
  }

  if (field.type === 'checkbox' || field.type === 'toggle') {
    return (
      <div>
        <label className='flex items-center gap-2 text-sm font-medium'>
          <input
            type='checkbox'
            checked={Boolean(value)}
            onChange={(event) => setValue(event.target.checked)}
          />
          <span>{field.label}</span>
          {required ? <span className='text-destructive'>*</span> : null}
        </label>
        {helper}
      </div>
    )
  }

  if (field.type === 'multiSelect' || field.type === 'checkboxGroup') {
    const selected = asArray(value)
    return (
      <div>
        {label}
        <div className='space-y-2'>
          {(field.options ?? []).map((option) => {
            const checked = selected.includes(option.value)
            return (
              <label key={option.value} className='flex items-center gap-2 text-sm'>
                <input
                  type='checkbox'
                  checked={checked}
                  onChange={(event) => {
                    if (event.target.checked) {
                      setValue([...selected, option.value])
                    } else {
                      setValue(selected.filter((item) => item !== option.value))
                    }
                  }}
                />
                <span>{option.label}</span>
              </label>
            )
          })}
        </div>
        {helper}
      </div>
    )
  }

  return null
}
