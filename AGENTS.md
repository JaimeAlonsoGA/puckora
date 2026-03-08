# puckora — Agent Reference

> For agents only.

---

**CRITICAL**
## Reference materials
- Design guidelines: fetch fresh from `https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md`
- React best practices: `apps/web/.agents/skills/vercel-react-best-practices/AGENTS.md`
- Composition patterns (incl. React 19 no-forwardRef): `apps/web/.agents/skills/vercel-composition-patterns/AGENTS.md`
- Next.js docs: https://nextjs.org/docs (App Router, Server Components, Server Actions)
- Supabase SSR: https://supabase.com/docs/guides/auth/server-side/nextjs

---

---

## Table of contents
- [Design system](#design-system) **CRITICAL**
- [Form pattern](#form-pattern) **CRITICAL**
- [Auth DAL](#auth-dal) **MEDIUM**
- [Middleware](#middleware) **MEDIUM**

---

## Design system

### Token layer (`apps/web/styles/tokens.css`)

Two layers. Never skip the semantic layer.

| Layer    | Prefix                                                                                            | Purpose                                                         |
| -------- | ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Raw      | `--sf-*`                                                                                          | Source values (colors, etc). Never used in components directly. |
| Semantic | `--space-*`, `--text-*`, `--surface-*`, `--border-*`, `--brand-*`, `--radius-*`, `--transition-*` | What components use. Aliases to `--sf-*`.                       |

Key rules:
- Zero border-radius policy: `--radius-sm/md/lg` = `0px`. Only `--radius-full` = `9999px` (pills/circles).
- Spacing is 4px base: `--space-1`=4px, `--space-2`=8px … `--space-24`=96px.
- Typography: `--text-xs` (12px) → `--text-5xl` (48px).

### Building blocks (`apps/web/components/building-blocks/`)

All exported from `index.ts`. Use these exclusively — no raw `<div className="...">` with hardcoded colors/spacing.

| Component  | Key typed props                                                                                 |
| ---------- | ----------------------------------------------------------------------------------------------- |
| `Button`   | `variant` (primary/secondary/ghost/danger/outline), `size` (sm/md/lg), `loading`, `fullWidth`   |
| `Stack`    | `gap` (none/1/1-5/2/3/4/5/6/8/10/12/16), `direction` (column/row), `align`, `justify`           |
| `Surface`  | `variant` (base/card/secondary), `padding` (none/sm/md/lg/xl), `border` (none/default/strong)   |
| `Divider`  | `spacing` (none/sm/md/lg/xl), `orientation` (horizontal/vertical)                               |
| `Badge`    | `variant` (default/brand/success/warning/error/info), `size` (sm/md)                            |
| `Alert`    | `variant` (success/warning/error/info), `title?` — renders with `role="alert"`                  |
| `TextLink` | `href`, `variant` (brand/primary/secondary/muted), `underline` (always/hover/never), `external` |
| `Icon`     | `size` (xs/sm/md/lg/xl)                                                                         |
| Typography | `Display`, `Heading`, `Subheading`, `Body`, `Caption`, `Label`, `Mono` — all accept `as` prop   |

Rule: `Caption` is the standard for helper text and error messages. `Alert` is the standard for server-returned errors.

---

## Form pattern

### Schemas (`apps/web/lib/schemas/auth.ts`)

Zod schemas. Cross-field validation via `.refine()` (e.g. password match targeting `path: ['confirmPassword']`).

### Hook (`apps/web/hooks/use-form-action.ts`)

Bridges `react-hook-form` + Server Actions.

```ts
const { form, onSubmit, serverError, isPending } = useFormAction(Schema, serverAction)
```

- `zodResolver(schema as any)` — required cast due to hookform/resolvers v5 overload incompatibility with generic `ZodSchema`.
- `isPending` from `useTransition` — use for `loading` prop on `Button`.
- `serverError` — pass to `<Alert variant="error">`.

### Server Actions (`apps/web/app/(auth)/actions.ts`)

- `'use server'` file.
- Accept typed data (not `FormData`).
- Return `{ error: string }` on failure, call `redirect()` on success.

### Client/Server split for auth pages

- Page files = Server Components. Use `getTranslations` (server). Render static chrome + form component.
- `_components/login-form.tsx`, `_components/signup-form.tsx` = `'use client'`. Contain only the interactive form.

### Form components (`apps/web/components/form/`)

- `FormField` — wraps label + input + error. Error uses `<Caption>`.
- `FormInput`, `FormSelect`, `FormToggle` — React 19 style: `ref` as plain prop, no `forwardRef`.

---

## Auth DAL (`apps/web/lib/auth.ts`)

- `import 'server-only'` — enforced at import time.
- `getAuthUser` and `getOptionalUser` wrapped in `React.cache()`.

## Middleware (`apps/web/proxy.ts`)

- Uses `supabase.auth.getClaims()` — not `getUser()` (avoids network round-trip).
- Pattern: `const { data: claimsData } = await supabase.auth.getClaims(); const userId = claimsData?.claims?.sub`
