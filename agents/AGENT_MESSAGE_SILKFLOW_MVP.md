# MESSAGE TO SCAFFOLDING AGENT — SILKFLOW MVP (v2)

> Read this entire document before writing a single line of code.
> This supersedes the previous MVP message. The technical base prompt (stack, architecture,
> frontend rules) remains in force. What changes here is the product philosophy,
> module design, interconnection model, and freemium strategy.

---

## THE PRODUCT PHILOSOPHY — READ THIS FIRST

Silkflow is not a collection of tools. It is a **single guided journey** from curiosity to conviction.

The user starts with a feeling: "I want to sell something on Amazon." They end with a decision: "I'm going to order 500 units of this product from this supplier at this cost, and here's my projected margin." Everything in between is Silkflow.

This means:

- **The app generates its own inspiration.** Users never need to leave to find ideas, ASINs, URLs, or supplier contacts. Silkflow surfaces all of it.
- **Modules are not tabs. They are steps.** Each module hands off naturally to the next. Data flows forward automatically. The user is always one CTA away from the next insight.
- **AI fills the gaps.** Any moment where a user would otherwise be stuck — "what should I search for?", "what does this metric mean?", "which supplier should I choose?" — AI answers proactively.
- **The Chrome Extension is the physical presence of this philosophy** on Amazon and Alibaba. It brings Silkflow's intelligence to the pages where decisions actually happen.

The competitor experience (Helium 10, Jungle Scout) is: open tool, stare at empty search box, wonder what to do. The Silkflow experience is: open app, get asked one question, be guided from there.

---

## THE NAME AND BRAND

The product is **Silkflow**. Domain: `silkflow.app`.

Update every reference, package name, env variable, and string. The brand voice is: precise, warm for beginners, dark and premium visually. The Silk Road metaphor — China to Amazon, East to West, guided route — runs through the product narrative.

---

## MODULE ARCHITECTURE — REDESIGNED AS A CONNECTED FLOW

There are 8 modules designed as an **interconnected system**, not independent tools. Think of them as nodes in a graph where every node connects contextually to every other.

The primary flow is linear:

```
[1. Discovery] → [2. Research] → [3. Analysis] → [4. Sourcing] → [5. Cost Intelligence] → [6. Decision]
```

With persistent loops:

```
[7. Tracker]        — observes everything over time, feeds back into Research and Cost
[8. Competitor Intel] — entered from any product, outputs flow into Research and Analysis
[Chrome Extension]  — the same intelligence, surfaced on Amazon.com and Alibaba.com directly
```

---

### MODULE 1 — DISCOVERY ENGINE
**Route:** `/discover`
**Purpose:** The entry point for users who don't know what they want yet.

- AI-curated feed of trending product opportunities, updated daily
- Browseable Amazon category tree (visual pill navigation, not dropdowns)
- "Inspire me" button: AI suggests 5 product ideas based on onboarding answers (budget, experience)
- Trending searches: anonymized aggregated view of what Silkflow users are researching now
- Seasonal signals: "Holiday gifting in 8 weeks — these categories historically spike"
- Search bar accepts plain English: "something for dog owners under $30"

**Interconnection:**
- Any product or category → one click to Research (pre-filtered), Analysis (pre-loaded), or Cost Calculator
- AI suggestions carry confidence score + one-line rationale

**Data to scaffold:**
- `trending_products` table (populated by daily cron Edge Function)
- `category_embeddings` (already in schema — power semantic search here)
- `POST /discover/suggestions` Edge Function → Python `/ai/suggest-products`

---

### MODULE 2 — RESEARCH ENGINE
**Route:** `/research`
**Purpose:** Keyword and product validation for users who have a direction.

**No ASIN inputs.** Users search by:
- Keyword or phrase
- Plain English description
- Category pill selection
- AI suggestion (click-through from Discovery)

**Results show:** product image, title, BSR, monthly sales estimate, review count, price, competition score (0–100), opportunity score (0–100).

Each result card has direct CTAs: "Analyze", "Find suppliers", "Calculate cost", "Save" — no navigation required.

**AI layer:**
- "Why is this a good opportunity?" tooltip per card — AI one-paragraph rationale
- "Similar products" section below results
- Auto-suggest related keywords as user types

**Interconnection:**
- Every card flows to Analysis, Sourcing, Cost Calculator, or Tracker
- Research state (keyword, filters, results) persists in `ResearchContext` — navigating back restores it exactly

---

### MODULE 3 — PRODUCT ANALYZER
**Route:** `/analyze`
**Purpose:** Full 360-degree product and market profile.

**No ASIN in URL for normal use.** Product is carried in `ProductContext`. URL uses internal slug or ID. ASIN-based URL (`/analyze?asin=B0...`) is supported for deep links and extension handoffs only.

**Shows:**
- BSR history chart (90 days), price history, review distribution with velocity trend
- Seller landscape: FBA vs FBM vs Amazon ratio, top seller market share
- Listing quality score: actionable improvement signals
- Market demand: search volume trend, estimated market size
- Competition score breakdown: why this number, what factors
- **"Opportunity Summary"**: AI paragraph in plain English — "This market has X. The opportunity is Y. The risk is Z."

**Interconnection sidebar (always visible):**
- "Find suppliers" → Sourcing pre-loaded
- "Calculate cost" → Cost Calculator pre-filled with dimensions and FBA fees
- "Analyze competitors' reviews" → Competitor Intel pre-loaded
- "Save to tracker" → snapshot saved
- "Search similar" → Research pre-filled from product NLP keyword extraction

---

### MODULE 4 — SOURCING BRIDGE
**Route:** `/source`
**Purpose:** Find Alibaba suppliers. The China half of the Silk Road.

Users arriving from Research or Analysis see suppliers **already loaded** from context. No manual entry needed.

**Shows:**
- Supplier cards: company name, product image, unit price at MOQ tiers, MOQ, tier (Gold/Verified/Trade Assurance), shipping time, response rate
- Filters: tier, MOQ range, price range, Trade Assurance toggle
- "Compare suppliers" (up to 3, side-by-side)
- For each supplier: "Calculate cost with this supplier" → Cost Calculator pre-filled

**AI layer:**
- Supplier quality score (synthesized from tier, ratings, platform tenure)
- Red flag warnings (very low price, no Trade Assurance, new account)
- Negotiation starting point suggestion

**Context panel (always visible):**
- "What does this product sell for on Amazon?" — shows Research data without navigating away
- "Save this supplier" → `saved_suppliers` table

---

### MODULE 5 — COST INTELLIGENCE
**Route:** `/calculate`
**Purpose:** The single most important module. The decision engine. A guided wizard — not a form.

**Step 1 — Product:** Name, category (drives referral fee %), dimensions + weight (drives FBA fees, auto-calculated), target selling price or "AI suggest"

**Step 2 — Supplier Cost:** Unit cost (from saved supplier or manual), MOQ tiers calculated simultaneously at 100 / 300 / 500 / 1000 units, packaging cost

**Step 3 — Shipping:** Method (sea/air/express), origin (China default), weight/volume (pre-filled), destination (FBA US East / US West / EU), auto-calculated cost with override

**Step 4 — Import & Duties:** HS code lookup (AI suggests from product name), auto-filled duty rate, US Section 301 tariff flag for China-origin products, customs broker fee

**Step 5 — Amazon Fees:** FBA fee breakdown (fulfillment + storage, auto from dimensions), referral fee % by category, optional ad spend per unit

**Step 6 — Results:**
- Stacked bar chart: supplier / shipping / duties / FBA / referral / ads / profit
- At each MOQ tier: total investment, break-even price, net margin %, ROI %, payback period
- Traffic light: Green (>30% margin), Yellow (15–30%), Red (<15%) with plain English explanation
- "What needs to change to reach 30% margin?" — AI identifies biggest cost lever with direct action links
- Save, Share (public link), Export PDF (Pro), Add to Tracker

**Interconnection:**
- Red margin result shows: "Find a cheaper supplier" → Sourcing, "Check if competitors have better margins" → Intel, "Try a different price point" → recalculates inline

---

### MODULE 6 — COMPETITOR INTEL
**Route:** `/intel`
**Purpose:** Turn competitor weaknesses into your product's strengths.

**Entry — no ASIN input required.** User selects from:
- Tracker products (most common)
- Recently viewed products (shown as a list)
- Keyword search → top results as selectable targets
- Product URL paste (power user, not primary CTA)

**Output:**
- Pain point clusters: AI groups 1–2 star reviews into recurring themes with count and sentiment intensity
- Opportunity score per cluster: how fixable and how differentiating
- "Product improvement checklist" — actionable items derived from pain points
- Keyword opportunities hidden in negative review language

**Freemium gate:** Pain point category names and counts are free. Detail, excerpts, and improvement checklist are Pro. This is the highest-converting upsell moment.

**Interconnection:**
- "Add competitor to tracker" → monitors BSR/price/review velocity
- "Calculate cost for this product type" → Cost Calculator
- "Find suppliers" → Sourcing
- "Search similar products" → Research

---

### MODULE 7 — TRACKER
**Route:** `/tracker`
**Purpose:** The user's portfolio of products under consideration. The retention engine.

- Products saved from any module land here automatically
- Each shows: current BSR, price, review count, and delta from when saved ("BSR improved 12% this week")
- Alert conditions per product: BSR threshold, price change %
- Status tags: "Researching", "Calculating", "Sourcing", "Yes", "No"
- Notes field per product
- "Continue where I left off" — links back to the last module used for this product with context restored

**Freemium gate:** 5 saved products on free plan. Unlimited on Pro. The prompt at the 5th save is the highest-converting moment outside of Competitor Intel.

**Interconnection:**
- Every saved product has a one-click panel opening any module pre-loaded
- Tracker is the persistent state of the user's entire decision journey

---

### MODULE 8 — CHROME EXTENSION (bidirectional)

**Registered for both domains:**
```json
"content_scripts": [
  { "matches": ["*://*.amazon.com/*", "*://*.amazon.co.uk/*", "*://*.amazon.de/*"], "js": ["amazon-content.js"] },
  { "matches": ["*://*.alibaba.com/*"], "js": ["alibaba-content.js"] }
]
```

**On Amazon:**
- Search results: score badges per product card (opportunity score, monthly sales estimate)
- Product pages: collapsible side panel with mini-analysis + "Find on Alibaba" button
- "Find on Alibaba" panel: calls `/sourcing/quick-search?keyword=<title>`, shows top 3 suppliers with unit prices and MOQs — without leaving Amazon
- "Calculate cost" button: opens mini Cost Calculator pre-filled with scraped product dimensions and top supplier price

**On Alibaba:**
- Search results: "Amazon demand" badge (estimated monthly sales range)
- Supplier pages: collapsible side panel with "Find on Amazon" button
- "Find on Amazon" panel: calls `/research/quick?keyword=<product title>`, shows top 3 Amazon results with BSR, price, competition score
- "Calculate full cost" + "Save supplier to Silkflow" buttons

**Authentication:** Extension reads session from `chrome.storage.local`. Single login on silkflow.app authenticates both.

**Freemium in extension:** "Find on Alibaba" / "Find on Amazon" panels available free for 3 uses/day, then a non-blocking Pro upsell.

---

## THE GUIDED ONBOARDING WIZARD

New users land on a 3-step wizard, not a dashboard:

**Step 1:** "Where are you in your FBA journey?"
- "Complete beginner" / "Researching but haven't launched" / "I've launched at least one product"

**Step 2:** "What's your starting budget?"
- Under $1,000 / $1,000–$3,000 / $3,000–$10,000 / Over $10,000

**Step 3:** "What do you want to do first?"
- "Find product ideas" → Discovery
- "Research a keyword I have in mind" → Research (search box focused)
- "Understand costs before committing" → Cost Calculator
- "See what's selling right now" → Discovery trending feed

Store Step 1 and 2 answers on `user_profiles`. They drive: AI suggestion personalization, default filter ranges, onboarding tooltip tone.

---

## FREEMIUM MODEL — GENEROUS BY DESIGN

**Always free, no cap:**
- All searches in Research and Discovery — unlimited
- Browsing categories and trending products
- Viewing product analysis (BSR, scores, charts)
- Full Cost Calculator (calculate as many times as wanted, cannot save)
- Chrome Extension basic overlay (scores on Amazon/Alibaba)
- Competitor Intel pain point category names and counts

**Starter ($19/mo annual):**
- Save up to 5 products in Tracker
- Save up to 3 cost calculations
- Sourcing Bridge basic (see suppliers, not full details or contact)
- Price and BSR alerts for saved products

**Pro ($39/mo annual) — the conversion target:**
- Unlimited saved products and calculations
- Full Sourcing Bridge (details, contact, compare)
- Full Competitor Intel (pain point detail, improvement checklist)
- Shareable links for calculations and reports
- Chrome Extension full features (Find on Alibaba/Amazon panels, unlimited)
- AI "Inspire me" — 5 suggestions with full rationale (free gets 2)
- Trending data and seasonal signals

**Scale ($69/mo annual):**
- Multi-user / team seats
- Export and download (PDF, CSV)
- API access
- White-label shareable reports
- Priority support

**The 5 designed upsell moments:**
1. Saving the 5th product — soft prompt, non-blocking
2. Competitor Intel blur — hard gate with visible preview of what's hidden
3. "Share this calculation" — prompt for shareable link
4. Chrome Extension "Find on Alibaba" after 3 free uses — non-blocking banner
5. AI "Inspire me" 3rd suggestion — blurred with "See all 5 with Pro"

Each prompt is **contextual and specific**. Never "Upgrade to Pro." Always "Upgrade to [exact thing they just tried]."

---

## PRODUCTCONTEXT — THE CONNECTIVE TISSUE

```typescript
interface ProductContext {
  activeProduct: AmazonProduct | null
  activeSupplier: AlibabaSupplier | null
  costDraft: CostCalculationDraft | null
  researchState: ResearchState | null

  setActiveProduct: (product: AmazonProduct) => void
  setActiveSupplier: (supplier: AlibabaSupplier) => void
  updateCostDraft: (patch: Partial<CostCalculationDraft>) => void
  clearAll: () => void
}
```

- Provided at root layout (`__root.tsx`)
- Persisted to `sessionStorage` — survives page refresh, cleared on logout
- Every "Analyze / Source / Calculate" CTA sets context then navigates
- When a module loads with pre-filled context, show a subtle "Pre-filled from [product name]" indicator

---

## NAVIGATION ARCHITECTURE

Sidebar in three sections:

**EXPLORE**
- Discover
- Research
- Trending

**DECIDE**
- Analyze
- Source
- Calculate
- Competitor Intel

**MANAGE**
- Tracker
- Settings

When `activeProduct` is set: a persistent mini-card at the sidebar bottom shows the product image, name, and quick-action buttons (Analyze / Source / Calculate). This is the physical manifestation of the flow.

---

## AI INTEGRATION POINTS

| Location | Action | Model | Notes |
|---|---|---|---|
| Discovery "Inspire me" | Product ideas from user profile | GPT-4o-mini | Free: 2. Pro: 5 with rationale |
| Research auto-suggest | Related keywords while typing | GPT-4o-mini | Debounced |
| Analyzer Opportunity Summary | Plain English market summary | GPT-4o-mini | Cached 24h per product |
| Sourcing red flag detection | Flag suspicious supplier patterns | GPT-4o-mini | Simple classification |
| Cost Calc HS code lookup | Suggest HS codes from product name | GPT-4o-mini | Returns top 3 with confidence |
| Cost Calc margin advisor | Identify biggest cost lever | GPT-4o-mini | Rule-based + AI narrative |
| Competitor Intel clustering | Group reviews into pain point themes | GPT-4o + scikit-learn | Python service, Pro only |
| Onboarding routing | Personalize first recommendation | GPT-4o-mini | One-time, on first login |

Cache all AI outputs aggressively. Most are valid 24–48 hours. Never re-generate on page reload.

---

## REFERRAL & AFFILIATE INFRASTRUCTURE

**New tables (add to migration):**
```sql
referral_codes (id, user_id, code varchar(12) unique, created_at)
referral_events (id, referrer_user_id, referred_user_id, event_type, revenue_amount, created_at)
-- event_type: 'signup' | 'first_payment' | 'renewal'
affiliate_profiles (id, user_id, commission_rate numeric default 0.30, payout_email, total_earned, status, created_at)
```

**Capture logic (critical — in auth flow from day one):**
- `?ref=CODE` in any URL → stored in localStorage before auth
- On account creation: resolve CODE to referrer user_id, insert `referral_event` type `signup`, store `referred_by_user_id` on profile
- Every shareable output link auto-appends `?ref=USERCODE` if the user has a referral code

**Routes to scaffold:**
- `/settings/referral` — personal referral link + stats
- `/affiliates` — public affiliate program landing page (static)

---

## PUBLIC SEO ROUTES

Functional, indexable, no login required:

- `/tools/fba-calculator` — full Cost Calculator, no save. Highest-intent SEO page.
- `/tools/fba-fee-calculator` — dimensions + weight → FBA fee breakdown
- `/tools/profit-margin-calculator` — simple margin calculator
- `/tools/import-duty-calculator` — HS code + value → estimated duty

- `/categories/[slug]` — top 10 products by opportunity score (blurred after #3 for free users)
- `/trending` — public trending products, updated daily

Every public page: proper `<title>`, `<meta description>`, Open Graph, JSON-LD (SoftwareApplication schema for tools), canonical URL, non-intrusive signup CTA (sticky bottom bar, not a popup).

---

## WHAT DONE LOOKS LIKE

1. `npm run dev:web` starts without errors. Onboarding wizard appears for new users.
2. `npm run typecheck` passes with zero errors.
3. `uvicorn app.main:app --reload` starts. `GET /health` returns `{"status": "ok", "service": "silkflow-scraper"}`.
4. All 10 Edge Functions exist with valid stubs and `_shared/` utilities.
5. All 4 SQL migrations valid, including new tables: `referral_codes`, `referral_events`, `affiliate_profiles`, `trending_products`.
6. `ProductContext` exists, typed correctly, provided at root, persists to sessionStorage.
7. Sidebar matches EXPLORE / DECIDE / MANAGE structure with active-product mini-card slot at bottom.
8. `PlanGate` component implemented. All 5 upsell moments scaffolded (stubs acceptable).
9. `?ref=CODE` capture is in the auth flow, stored in localStorage, associated on account creation.
10. Public SEO routes render without login: `/tools/fba-calculator`, `/tools/fba-fee-calculator`, `/tools/profit-margin-calculator`, `/tools/import-duty-calculator`.
11. Chrome extension manifest valid MV3. Content scripts registered for amazon.com and alibaba.com.
12. Every module has an empty state with a contextual CTA.
13. Every module has a skeleton loader for its primary async operation.
14. Onboarding wizard stores 3 answers to user profile and routes correctly.
15. AI endpoint stubs exist in Python service for all 8 integration points.

---

## UX PHILOSOPHY — FAST, SMART, SURPRISING (NOT GUIDED)

This section overrides any wizard-like, step-by-step, or sequential UX pattern described elsewhere in this document — **except for the onboarding wizard**, which is the single intentional exception.

### The onboarding wizard is the only wizard

The 3-step onboarding exists for one purpose: give a new user a memorable first impression of what the app can do, and capture their profile (experience level, budget) so the app can personalize from that moment forward. It is a conversion and data-capture tool. It ends after 3 questions and never appears again.

**Everything else in the app must be fast.** The user is a seller with limited time making high-stakes decisions. They do not want to be guided. They want to be helped quickly.

### The Cost Calculator is not a wizard — it is a smart panel

The previous description of the Cost Calculator as a 6-step wizard is **wrong**. Replace it entirely with this model:

The Cost Calculator is a **single-screen panel** with intelligent pre-filling. It looks like a clean form — all fields visible at once, organized in logical groups (Product / Supplier / Shipping / Fees / Results). The results update **live** as the user changes any field. There is no "next step." There is no progress bar.

**How it fills itself:**
- If the user arrives from a saved product → product name, category, dimensions, weight, and FBA fees are pre-filled automatically
- If the user arrives from a supplier card in Sourcing → unit price and MOQ are pre-filled
- If the user arrives from the Chrome Extension → product dimensions scraped from the Amazon page are pre-filled
- If the user arrives from a fresh start → they see a product selector first: a searchable dropdown of their saved products, or a keyword search. Selecting a product fills the form. Selecting "start from scratch" leaves it empty.

**The HS code / tariff section** collapses by default ("Advanced: Import duties") and expands on click. Most beginners skip it on the first pass — do not force it in their face.

**The MOQ comparison** (100 / 300 / 500 / 1000 units) is shown as a toggle or tab switcher at the top of the results panel — not as separate steps. The user flips between tiers in one click and sees the numbers change instantly.

**The results column is always visible** — even while editing inputs. It updates in real time (debounced 300ms). The user sees their margin number react as they adjust the supplier price. That reactivity is the entire value of the tool.

### The general UX rule: act in advance, fill intelligently, get out of the way

Every module must follow this principle:

**1. Pre-fill from context, always.** If there is an active product in `ProductContext`, every module that can use it should already have it loaded when the user arrives. The user should feel like the app read their mind — not like they have to re-enter data they already provided.

**2. Collapse the advanced.** For every module, identify the 20% of inputs that 80% of users never touch. Collapse them behind an "Advanced" disclosure. The default view should look almost embarrassingly simple. The power is there when needed — it just isn't in the way.

**3. Show results before the user is done.** Wherever possible, show partial results or estimates as the user fills in data — not only after they click a submit button. The Research module starts fetching as the user types (debounced). The Cost Calculator updates as fields change. The Competitor Intel module shows a "scanning..." animation immediately and streams in clusters as they're found.

**4. Make repetition effortless.** A user running cost calculations for multiple products should be able to: select product from saved list → numbers update → read result → select next product → numbers update. The entire cycle in under 10 seconds. No re-entering data that hasn't changed (shipping rates, FBA fee table) between calculations.

**5. Surprise with intelligence, don't announce it.** When the app detects that a product is sourced from China and the HS code matches a Section 301 tariff, it should quietly add a yellow warning badge to the duties field — not pop up a modal asking "did you know about tariffs?" When a supplier's price is 40% below market average for the category, it should show a subtle red flag icon on the supplier card — not interrupt the flow with a warning dialog.

**6. Navigation between modules must be instant.** CTAs like "Find suppliers for this product" or "Calculate cost" must navigate and pre-load in a single action. No intermediate "are you sure?" screens, no loading gates between modules. The user should feel like they're moving through one continuous surface, not jumping between separate apps.

### What to avoid — explicitly

- **No multi-step wizards** for any repeatable task (calculating costs, running a search, analyzing a product)
- **No mandatory field sequences** — the user should be able to fill fields in any order
- **No "submit and wait"** patterns where the form disappears and a spinner takes over the screen — keep the form visible, show results alongside it
- **No modal confirmation dialogs** for non-destructive actions
- **No forced tooltips or coach marks** after onboarding — contextual `?` icons are fine, but the app must never pause the user to explain itself
- **No pagination** on search results — use infinite scroll or "load more" at the bottom
- **No empty states that just say "no data"** — every empty state suggests a specific next action

### The design test

Before implementing any UX pattern, ask: *"Can a user who already knows what they want accomplish this in under 30 seconds without reading any instructions?"*

If the answer is no, simplify until it is yes.

---

## THE NORTH STAR

The seller who finds Silkflow at 11pm after watching three YouTube videos about FBA. They have $2,000 and a vague idea. The wizard asks where they are. They answer. The app says: "Let's find something in the pet supplies space that fits your budget." Three clicks later they're looking at a stacked bar chart showing 34% margin on a product sourced from a verified Alibaba supplier, $1,800 total investment, selling at $27.99 on Amazon.

They didn't enter a single ASIN. They didn't open a second tab. They didn't need to know what BSR meant.

That is what you are building.
