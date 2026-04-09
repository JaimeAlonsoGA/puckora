/**
 * Tailwind chip classes for each rating / review tier badge, applied when
 * that bucket is in the top-2 by product count (highest competition signal).
 *
 * Semantics (FBA entry difficulty):
 *   Green  → low bar, easy to compete (opportunity)
 *   Amber  → moderate competition (caution)
 *   Red    → dominant tier, very hard to break in (avoid)
 */

// Professional dark-background palette — low-saturation text on near-black chip.
// Colour encodes entry difficulty: green = opportunity, amber = caution, rose = avoid.
export const RATING_TIER_BADGE_CLASS: Record<string, string> = {
    Poor: 'bg-emerald-950/80 text-emerald-400', // low ratings → easy to differentiate
    Weak: 'bg-teal-950/80 text-teal-400',       // moderate-low bar
    Good: 'bg-amber-950/80 text-amber-400',     // high quality market, moderate entry cost
    Excellent: 'bg-rose-950/80 text-rose-400',       // top-tier market → very hard to crack
} as const

export const REVIEW_TIER_BADGE_CLASS: Record<string, string> = {
    New: 'bg-emerald-950/80 text-emerald-400', // few reviews → low social proof barrier
    Growing: 'bg-teal-950/80 text-teal-400',       // climbing review counts
    Established: 'bg-amber-950/80 text-amber-400',    // entrenched social proof
    Leading: 'bg-orange-950/80 text-orange-400',  // high review moat
    Dominant: 'bg-rose-950/80 text-rose-400',       // insurmountable review wall → avoid
} as const
