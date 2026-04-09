'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Caption, DataCard } from '@puckora/ui'
import { getCertsByCategories, CERT_ICON_MAP, CERT_KEYS } from '@puckora/utils/certs'
import type { CertKey, GatedCategory } from '@puckora/utils/certs'
import type { ProductFinancial } from '@puckora/types'
import type { SearchDataAvailability } from '@/types/search'
import { useHoverTutorial } from '@/hooks/use-hover-tutorial'
import { TUTORIAL_KEYS } from '@/constants/tutorial'

// ── Per-certification FBA-focused description ────────────────────────────────
const CERT_DESCRIPTION: Record<CertKey, string> = {
    [CERT_KEYS.CE]: 'European Conformity mark — mandatory for electronics, toys, and machinery sold in the EU. Confirms the product meets EU safety, health, and environmental standards before listing.',
    [CERT_KEYS.COA]: 'Certificate of Analysis — lab report verifying the chemical composition and purity of a product. Required documentation for supplements, foods, and cosmetics categories on Amazon.',
    [CERT_KEYS.CPC]: "Children's Product Certificate — mandatory for all items marketed to children under 12. Requires third-party lab testing against ASTM and CPSC safety standards before FBA inbound.",
    [CERT_KEYS.CPSC]: 'Consumer Product Safety Commission compliance — enforces federal safety standards for consumer goods. Violations trigger mandatory recalls and ASIN removals without seller appeal windows.',
    [CERT_KEYS.DOT]: 'Department of Transportation certification — required for automotive safety parts (brakes, helmets, tires). Listing with a DOT marking but without documented compliance triggers immediate suspension.',
    [CERT_KEYS.EPA]: 'Environmental Protection Agency registration — covers pesticides, antimicrobials, and chemical products. Unregistered claims on a listing result in category-level suspension.',
    [CERT_KEYS.EPA_FIFRA]: 'Federal Insecticide, Fungicide, and Rodenticide Act — EPA sub-regulation requiring federal registration for all pesticide products prior to any US sale or Amazon listing.',
    [CERT_KEYS.FCC]: 'Federal Communications Commission ID — mandatory for any device emitting radio frequency energy. Missing FCC ID blocks FBA inbound and the ASIN can be removed by carriers mid-shipment.',
    [CERT_KEYS.FDA_COSMETIC]: 'FDA cosmetic compliance under MoCRA (2023) — requires ingredient disclosure, facility registration, and safety substantiation. Non-compliant cosmetic listings are proactively removed.',
    [CERT_KEYS.FDA_DRUG]: 'FDA drug approval or OTC monograph compliance — required for any product making drug claims. Triggers the strictest Amazon gating; approval timeline is 12–18+ months.',
    [CERT_KEYS.FDA_FACILITY]: 'FDA registered manufacturing facility — required for food, dietary supplements, and medical devices. The facility registration number must appear in seller documentation to ungate.',
    [CERT_KEYS.FSMA]: 'Food Safety Modernization Act — mandates documented supply chain safety controls for food items. Non-FSMA-compliant food sellers cannot access Amazon grocery or fresh categories.',
    [CERT_KEYS.GMP]: 'Good Manufacturing Practice — ISO and FDA process standard for supplements, food, and cosmetics manufacturing. Mandatory documentation for ungating most CPG categories.',
    [CERT_KEYS.HACCP]: 'Hazard Analysis and Critical Control Points — mandatory food safety process documentation for perishable and temperature-sensitive products sold on Amazon.',
    [CERT_KEYS.ISO]: 'International Organization for Standardization — ISO 9001 quality management certification frequently required for B2B, industrial, and medical product categories.',
    [CERT_KEYS.ISO_13485]: 'ISO 13485 medical device quality management certification — required to sell medical and dental devices on Amazon. Audit cycle adds 3–6 months to entry timelines.',
    [CERT_KEYS.NSF]: 'NSF International third-party certification — required for water treatment equipment, dietary supplements, and commercial food contact materials listed on Amazon.',
    [CERT_KEYS.REACH]: 'EU REACH regulation — restricts hazardous substances in products sold on EU marketplaces. Required compliance documentation for chemicals, electronics, and apparel on Amazon EU.',
    [CERT_KEYS.ROHS]: 'Restriction of Hazardous Substances directive — limits lead, mercury, and cadmium in electronics. Mandatory for any electrical product distributed in Europe; affects FBA EU inventory.',
    [CERT_KEYS.SAE]: 'Society of Automotive Engineers technical standard — specifies performance and safety criteria for automotive and aerospace parts. Required documentation for performance components.',
    [CERT_KEYS.TTB]: 'Alcohol and Tobacco Tax and Trade Bureau permit — required for any alcohol-related product. Licensing is a federal requirement and cannot be bypassed; penalties include criminal charges.',
    [CERT_KEYS.UL]: 'Underwriters Laboratories safety certification — US third-party testing for electronics and appliances. Not always legally required, but Amazon enforces it as a prerequisite for many electrical categories.',
    [CERT_KEYS.UN38_3]: 'UN 38.3 lithium battery transport test — mandatory for all standalone cells and products containing lithium batteries. Missing this certification blocks FBA inbound shipments at the carrier level.',
    [CERT_KEYS.USDA_ORGANIC]: "USDA National Organic Program certification — required to label any food, beverage, or agricultural product as 'organic'. Cannot be self-certified; third-party accredited certifier is mandatory.",
    [CERT_KEYS.USP]: "US Pharmacopeia verification — identity, purity, and potency standard for dietary supplements. Required for Amazon's premium supplement program and increasingly requested during category ungating.",
}

const CERT_LABEL: Record<CertKey, string> = {
    [CERT_KEYS.CE]: 'CE',
    [CERT_KEYS.COA]: 'COA',
    [CERT_KEYS.CPC]: 'CPC',
    [CERT_KEYS.CPSC]: 'CPSC',
    [CERT_KEYS.DOT]: 'DOT',
    [CERT_KEYS.EPA]: 'EPA',
    [CERT_KEYS.EPA_FIFRA]: 'EPA FIFRA',
    [CERT_KEYS.FCC]: 'FCC',
    [CERT_KEYS.FDA_COSMETIC]: 'FDA Cosmetic',
    [CERT_KEYS.FDA_DRUG]: 'FDA Drug',
    [CERT_KEYS.FDA_FACILITY]: 'FDA Facility',
    [CERT_KEYS.FSMA]: 'FSMA',
    [CERT_KEYS.GMP]: 'GMP',
    [CERT_KEYS.HACCP]: 'HACCP',
    [CERT_KEYS.ISO]: 'ISO',
    [CERT_KEYS.ISO_13485]: 'ISO 13485',
    [CERT_KEYS.NSF]: 'NSF',
    [CERT_KEYS.REACH]: 'REACH',
    [CERT_KEYS.ROHS]: 'RoHS',
    [CERT_KEYS.SAE]: 'SAE',
    [CERT_KEYS.TTB]: 'TTB',
    [CERT_KEYS.UL]: 'UL',
    [CERT_KEYS.UN38_3]: 'UN 38.3',
    [CERT_KEYS.USDA_ORGANIC]: 'USDA Organic',
    [CERT_KEYS.USP]: 'USP',
}

interface CertificationsCardProps {
    products: ProductFinancial[]
    availability: SearchDataAvailability
}

export function CertificationsCard({ products, availability }: CertificationsCardProps) {
    const t = useTranslations('search')
    const tutorial = useHoverTutorial(TUTORIAL_KEYS.CERTIFICATIONS)
    const [hoveredCert, setHoveredCert] = useState<CertKey | null>(null)

    const certKeys = useMemo(() => {
        if (!availability.hasCategories) return [] as CertKey[]

        const paths = products.map((p) => p.category_path).filter((p): p is string => p != null)
        const entries = getCertsByCategories(paths)

        const seen = new Set<CertKey>()
        const keys: CertKey[] = []

        for (const entry of entries as GatedCategory[]) {
            entry.certification_keys.forEach((key) => {
                if (!seen.has(key)) {
                    seen.add(key)
                    keys.push(key)
                }
            })
        }

        return keys
    }, [products, availability.hasCategories])

    if (!availability.hasCategories || certKeys.length === 0) return null

    return (
        <DataCard
            title={t('certs.card')}
            {...tutorial}
        >
            <div className="flex flex-col gap-3">
                <div className="flex flex-wrap gap-3">
                    {certKeys.map((key) => {
                        const Icon = CERT_ICON_MAP[key]
                        const isHovered = hoveredCert === key
                        return (
                            <div
                                key={key}
                                className="flex flex-col items-center gap-1 cursor-pointer"
                                onMouseEnter={() => setHoveredCert(key)}
                                onMouseLeave={() => setHoveredCert(null)}
                            >
                                <Icon
                                    aria-hidden="true"
                                    className={isHovered ? 'h-8 w-8 text-foreground' : 'h-8 w-8 text-muted-foreground/60 transition-colors hover:text-foreground'}
                                />
                            </div>
                        )
                    })}
                </div>

                {/* Hover expansion — shows per-cert description inline below icons */}
                {hoveredCert && (
                    <div className="rounded-md border border-border bg-muted/30 px-3 py-2.5">
                        <Caption className="text-muted-foreground text-justify leading-relaxed text-xs">
                            {CERT_DESCRIPTION[hoveredCert]}
                        </Caption>
                    </div>
                )}
            </div>
        </DataCard>
    )
}

