import type { ComponentType, SVGProps } from 'react'
import certsData from './amazon_certifications.json'
import {
    CeIcon,
    CoaIcon,
    CpcIcon,
    CpscIcon,
    DotIcon,
    EpaIcon,
    EpaFifraIcon,
    FccIcon,
    FdaCosmeticIcon,
    FdaDrugIcon,
    FdaFacilityIcon,
    FsmaIcon,
    GmpIcon,
    HaccpIcon,
    IsoIcon,
    Iso13485Icon,
    NsfIcon,
    ReachIcon,
    RohsIcon,
    SaeIcon,
    TtbIcon,
    UlIcon,
    Un383Icon,
    UsdaOrganicIcon,
    UspIcon,
} from './icons'

export const CERT_KEYS = {
    CE: 'CE',
    COA: 'COA',
    CPC: 'CPC',
    CPSC: 'CPSC',
    DOT: 'DOT',
    EPA: 'EPA',
    EPA_FIFRA: 'EPA_FIFRA',
    FCC: 'FCC',
    FDA_COSMETIC: 'FDA_COSMETIC',
    FDA_DRUG: 'FDA_DRUG',
    FDA_FACILITY: 'FDA_FACILITY',
    FSMA: 'FSMA',
    GMP: 'GMP',
    HACCP: 'HACCP',
    ISO: 'ISO',
    ISO_13485: 'ISO_13485',
    NSF: 'NSF',
    REACH: 'REACH',
    ROHS: 'ROHS',
    SAE: 'SAE',
    TTB: 'TTB',
    UL: 'UL',
    UN38_3: 'UN38_3',
    USDA_ORGANIC: 'USDA_ORGANIC',
    USP: 'USP',
} as const

export const CERT_KEY_VALUES = [
    CERT_KEYS.CE,
    CERT_KEYS.COA,
    CERT_KEYS.CPC,
    CERT_KEYS.CPSC,
    CERT_KEYS.DOT,
    CERT_KEYS.EPA,
    CERT_KEYS.EPA_FIFRA,
    CERT_KEYS.FCC,
    CERT_KEYS.FDA_COSMETIC,
    CERT_KEYS.FDA_DRUG,
    CERT_KEYS.FDA_FACILITY,
    CERT_KEYS.FSMA,
    CERT_KEYS.GMP,
    CERT_KEYS.HACCP,
    CERT_KEYS.ISO,
    CERT_KEYS.ISO_13485,
    CERT_KEYS.NSF,
    CERT_KEYS.REACH,
    CERT_KEYS.ROHS,
    CERT_KEYS.SAE,
    CERT_KEYS.TTB,
    CERT_KEYS.UL,
    CERT_KEYS.UN38_3,
    CERT_KEYS.USDA_ORGANIC,
    CERT_KEYS.USP,
] as const

export type CertKey = (typeof CERT_KEY_VALUES)[number]

export type SubcategoryGating = 'root_only' | 'independent' | 'mixed' | 'seasonal'

export interface GatedCategory {
    id: number
    category: string
    gated: boolean
    subcategory_gating: SubcategoryGating
    subcategory_notes: string
    match_keywords: string[]
    required_documents: string[]
    certifications: string[]
    certification_keys: CertKey[]
    common_rejection_reasons: string[]
}

type SvgComponent = ComponentType<SVGProps<SVGSVGElement>>

export const CERT_ICON_MAP: Record<CertKey, SvgComponent> = {
    [CERT_KEYS.CE]: CeIcon,
    [CERT_KEYS.COA]: CoaIcon,
    [CERT_KEYS.CPC]: CpcIcon,
    [CERT_KEYS.CPSC]: CpscIcon,
    [CERT_KEYS.DOT]: DotIcon,
    [CERT_KEYS.EPA]: EpaIcon,
    [CERT_KEYS.EPA_FIFRA]: EpaFifraIcon,
    [CERT_KEYS.FCC]: FccIcon,
    [CERT_KEYS.FDA_COSMETIC]: FdaCosmeticIcon,
    [CERT_KEYS.FDA_DRUG]: FdaDrugIcon,
    [CERT_KEYS.FDA_FACILITY]: FdaFacilityIcon,
    [CERT_KEYS.FSMA]: FsmaIcon,
    [CERT_KEYS.GMP]: GmpIcon,
    [CERT_KEYS.HACCP]: HaccpIcon,
    [CERT_KEYS.ISO]: IsoIcon,
    [CERT_KEYS.ISO_13485]: Iso13485Icon,
    [CERT_KEYS.NSF]: NsfIcon,
    [CERT_KEYS.REACH]: ReachIcon,
    [CERT_KEYS.ROHS]: RohsIcon,
    [CERT_KEYS.SAE]: SaeIcon,
    [CERT_KEYS.TTB]: TtbIcon,
    [CERT_KEYS.UL]: UlIcon,
    [CERT_KEYS.UN38_3]: Un383Icon,
    [CERT_KEYS.USDA_ORGANIC]: UsdaOrganicIcon,
    [CERT_KEYS.USP]: UspIcon,
}

export function getCertIcon(key: string): SvgComponent | undefined {
    return CERT_KEY_VALUES.includes(key as CertKey)
        ? CERT_ICON_MAP[key as CertKey]
        : undefined
}

/**
 * Given an array of category path strings (e.g. from ProductFinancial.category_path),
 * returns all GatedCategory entries whose match_keywords appear in any of the paths.
 * Deduplicates by category id.
 */
export function getCertsByCategories(categoryPaths: string[]): GatedCategory[] {
    const normalizedPaths = categoryPaths.map(p => p.toLowerCase())
    const seen = new Set<number>()
    const results: GatedCategory[] = []

    for (const entry of certsData.gated_categories as GatedCategory[]) {
        if (seen.has(entry.id)) continue
        const matches = entry.match_keywords.some(kw =>
            normalizedPaths.some(path => path.includes(kw.toLowerCase()))
        )
        if (matches) {
            seen.add(entry.id)
            results.push(entry)
        }
    }

    return results
}

export { CeIcon, CoaIcon, CpcIcon, CpscIcon, DotIcon, EpaIcon, EpaFifraIcon, FccIcon, FdaCosmeticIcon, FdaDrugIcon, FdaFacilityIcon, FsmaIcon, GmpIcon, HaccpIcon, IsoIcon, Iso13485Icon, NsfIcon, ReachIcon, RohsIcon, SaeIcon, TtbIcon, UlIcon, Un383Icon, UsdaOrganicIcon, UspIcon };

