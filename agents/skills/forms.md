# Agent Skill: Forms

## Standard Form Pattern

All forms in Silkflow follow this pattern:

1. **Zod schema** defined in `@repo/zod-schemas` (or locally for page-specific forms)
2. **`useForm` hook** from `@/hooks/useForm.ts`
3. **`<FormField>`** wraps each input with label + error display
4. **`<FormInput>`, `<FormSelect>`, etc.** from `@/components/form/`
5. **`<Button type="submit">`** from `@/components/building-blocks/Button`
6. All strings via `t()` — **never hardcoded**

## Example

```tsx
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { useForm } from '@/hooks/useForm'
import { FormField } from '@/components/form/FormField'
import { FormInput } from '@/components/form/FormInput'
import { Button } from '@/components/building-blocks/Button'

const schema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
})

type FormData = z.infer<typeof schema>

export function MyForm() {
  const { t } = useTranslation()
  const { values, errors, handleChange, handleSubmit, submitting } = useForm<FormData>({
    initialValues: { email: '', name: '' },
    schema,
    onSubmit: async (data) => {
      // call API
    },
  })

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <FormField label={t('auth.email')} error={errors.email} required>
        <FormInput
          value={values.email}
          onChange={e => handleChange('email', e.target.value)}
          error={!!errors.email}
        />
      </FormField>
      <Button type="submit" loading={submitting}>
        {t('common.save')}
      </Button>
    </form>
  )
}
```

## Rules

- ❌ Never use raw `<input>` elements in feature code
- ❌ Never build ad-hoc validation logic — use Zod schemas
- ✅ Every input must have `<FormField>` wrapper for accessibility
- ✅ Every label and error message must go through `t()`
- ✅ `type="submit"` on the button, not `onClick` mutation
- ✅ Show loading state via `submitting` from `useForm`

## Available Form Components

| Component | Use case |
|---|---|
| `FormInput` | Text, email, search inputs |
| `FormNumberInput` | Numeric inputs with prefix/suffix |
| `FormSelect` | Dropdown with `SelectOption[]` |
| `FormSlider` | Range value (price, rating, BSR) |
| `FormToggle` | Boolean on/off |
| `FormField` | Wrapper: label + error + hint |

## Reference Implementation

`apps/web/src/routes/research/create/index.tsx`
