---
applyTo: "apps/extension/**"
---

# Extension file rules

## File placement (`@/` → `apps/extension/src/`)

| What | Where | Rule |
|---|---|---|
| Popup screen | `panels/popup/screens/{name}.tsx` | kebab-case filename |
| Sidebar screen | `panels/sidebar/screens/{name}.tsx` | kebab-case filename |
| Sidebar sub-component | `panels/sidebar/components/{name}.tsx` | |
| Background logic | `background/{name}.ts` | No React, no DOM |
| New content-script target | `content-scripts/{page}/index.ts` + `mount.tsx` + `parsers.ts` | Register in `vite.scripts.ts` + `manifest.json` |
| Global state | `stores/{domain}.store.ts` | Zustand only |
| Remote data | `queries/{domain}.ts` + `queries/_keys.ts` | Re-export from `queries/index.ts` |
| Hook wrapper | `hooks/use-{name}.ts` | One `useQuery(domainQueryOptions())` only |
| Vendor client | `integrations/{vendor}/client.ts` | No store/query imports |
| Extension-local type | `types/{domain}.ts` | Prefer `@puckora/types` first |
| i18n strings | `i18n/messages/{locale}/{namespace}.json` | One file per namespace |

Root components (`App.tsx`) are PascalCase. Everything else is kebab-case. Stores use the `{domain}.store.ts` suffix.

## Two Vite builds

- `vite.config.ts` → popup (`panels/popup/index.html`)
- `vite.scripts.ts` → background + all content scripts

New content script: add to both `vite.scripts.ts` `rollupOptions.input` and `manifest.json` `content_scripts`.

## Entry points

Every `mount.tsx` and `main.tsx` must call `setupI18n()` before `createRoot`. Wrap every root in `<Providers>`. Sidebar mounts inside shadow DOM — token CSS is injected via `tokensRaw` in `mount.tsx`.

## CSS (`styles/globals.css` and `styles/sidebar.css`)

Extension builds cannot resolve `@puckora/ui/globals.css` via package alias — always use the relative path:

```css
@import "tailwindcss";
@import "../../../../packages/ui/src/globals.css";   /* relative, not package alias */

@source "../panels";
@source "../../../../packages/ui/src";
```

- The popup uses `globals.css`; the sidebar uses `sidebar.css` (same structure, narrower `@source`).
- No `@custom-variant dark` — the extension popup does not have a class-based dark mode toggle.
- Never import `packages/ui/tailwind.css` — that file contains the deprecated `--sf-*` token palette.

## Token system

Same three-layer stack as the web app. Components only use the **Tailwind utility** layer.

| Layer | Examples | Rule |
| --- | --- | --- |
| **Cockpit raw** | `--bg1`, `--t1`, `--green`, `--b2` | Source palette in `packages/ui/src/globals.css`. Never in className. |
| **shadcn semantic** | `--background`, `--foreground`, `--primary`, `--card`, `--border` | Never written directly in JSX className. |
| **Tailwind utilities** | `bg-background`, `text-foreground`, `text-muted-foreground`, `bg-card`, `border-border` | The ONLY layer used in component JSX. |

**`--sf-*` tokens** are from the old deprecated design system — never use.

## Stores

- `chrome.storage` reads/writes belong inside store actions only — never in components or content scripts
- Allowed exceptions: `providers.tsx` may call `hydrate()` inside a `chrome.storage.onChanged` listener to react to session changes pushed by the web app
- Never write to `chrome.storage` from content scripts directly — only via background messaging
- One named export per store: `use{Domain}Store`

## Query files (`queries/*.ts`)

Same rules as the web app:
- `queryKey` and `queryFn` never defined inline in components
- `useQueryClient` never imported outside `queries/`
- Key factories in `queries/_keys.ts` — no hardcoded strings elsewhere
- Every domain re-exported from `queries/index.ts`

## Messaging

All inter-context message types come from `EXTENSION_MSG` in `types/messages.ts`. Never use raw string literals. New message type → add to `EXTENSION_MSG` const + matching interface in `types/messages.ts`.

Background is the single source of truth for session state: persists to `chrome.storage`, fans out auth changes, and supports overlay messaging. Content scripts never write to `chrome.storage` directly.

The extension is overlay-first. Do not introduce scrape-job executors or background-tab scraping flows here.

## Backend boundaries

- The extension never connects directly to Fly.io Postgres or the local/tailnet vector Postgres
- Structured catalog data and semantic search must come through the web app or extension background/web messaging layers
- `DATABASE_URL`, `DATABASE_PROXY_URL`, and vector env vars remain server-only and must not be bundled into the extension

## Auth & session

- **Native login**: `useAuthStore.signIn(email, password)` calls Supabase directly, saves session to `chrome.storage`. No web app tab required.
- **Web app auto-sync**: `providers.tsx` `AuthHydrator` listens to `chrome.storage.onChanged` — when the web app pushes a session via `useExtensionSync`, the popup transitions from `AuthGate` → dashboard automatically.
- **Token refresh**: background schedules `chrome.alarms.create('puckora_token_refresh', { periodInMinutes: 45 })` on install; `hydrate()` also silently refreshes if the token expires within 5 min.
- **Web app detection**: background injects `window.__puckora_ext = true` and `window.__puckora_ext_id = extId` into every Puckora web app tab via `chrome.scripting.executeScript` — requires `host_permissions` for `http://localhost:3000/*` and `https://app.puckora.com/*`.

## i18n

Uses **`react-i18next`** (not `next-intl`). The API differs from the web app:
- `const { t } = useTranslation()` — destructure `t` from the hook result
- `t('auth.email')` — dot-namespaced key, namespace prefix included in the key string
- `setupI18n()` from `@/i18n/setup` must be called before `createRoot` in every entry point
- New key → add to both `i18n/messages/en/{namespace}.json` and `es/{namespace}.json`
- New namespace → import in `i18n/setup.ts` and add under both locale `resources`

## Design system

Use `@puckora/ui` building blocks (`Stack`, `Surface`, `Button`, `Heading`, `Body`, `Caption`, `Alert`, etc.) — not raw HTML with inline styles. For form inputs in the extension, use raw `<input>` with Tailwind token classes (`bg-background text-foreground border-border`) — there is no `FormInput` component shared from the web app. Decorative icons: `aria-hidden="true"`.

## Pre-flight checklist

- [ ] `setupI18n()` called before `createRoot` in every entry point
- [ ] No `useQueryClient` outside `queries/`
- [ ] No `queryKey` / `queryFn` inline in components
- [ ] No raw message type strings — always `EXTENSION_MSG.FOO`
- [ ] No `chrome.storage` access outside stores or `message-handler.ts` (exception: `providers.tsx` `onChanged` listener)
- [ ] No hardcoded UI strings — all text through `t('...')`
- [ ] New i18n keys in both `en/` and `es/`; new namespace registered in `i18n/setup.ts`
- [ ] No `--sf-*` tokens, no raw `var(--*)` in className — only Tailwind utility layer
- [ ] No cockpit raw tokens (`--bg1`, `--t1`, etc.) in component className
- [ ] New content script in both `vite.scripts.ts` and `manifest.json`
- [ ] New query domain in `_keys.ts` and re-exported from `queries/index.ts`
