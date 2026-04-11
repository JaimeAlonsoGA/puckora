import { Caption } from '@puckora/ui'
import {
    CERT_ICON_MAP,
    CERT_KEYS,
    getCertsByCategories,
    type CertKey,
    type GatedCategory,
} from '@puckora/utils/certs'

const CERT_LABELS: Record<CertKey, string> = {
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

const MAX_REQUIRED_DOCUMENTS = 3

export function getCertificationEntries(categoryPaths: Array<string | null | undefined>): GatedCategory[] {
    const normalizedPaths = categoryPaths.filter((path): path is string => Boolean(path))

    if (normalizedPaths.length === 0) {
        return []
    }

    return getCertsByCategories(normalizedPaths)
}

function getCertificationKeys(entries: GatedCategory[]): CertKey[] {
    const seen = new Set<CertKey>()
    const keys: CertKey[] = []

    for (const entry of entries) {
        for (const key of entry.certification_keys) {
            if (!seen.has(key)) {
                seen.add(key)
                keys.push(key)
            }
        }
    }

    return keys
}

interface CertificationSignalsProps {
    entries: GatedCategory[]
    maxEntries?: number
}

export function CertificationSignals({ entries, maxEntries = 3 }: CertificationSignalsProps) {
    if (entries.length === 0) {
        return null
    }

    const certKeys = getCertificationKeys(entries)
    const visibleEntries = entries.slice(0, maxEntries)

    return (
        <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-3">
                {certKeys.map((key) => {
                    const Icon = CERT_ICON_MAP[key]

                    return (
                        <div key={key} className="flex flex-col items-center gap-1">
                            <Icon aria-hidden="true" className="h-8 w-8 text-muted-foreground" />
                            <Caption className="text-faint">{CERT_LABELS[key]}</Caption>
                        </div>
                    )
                })}
            </div>

            <div className="flex flex-col gap-2">
                {visibleEntries.map((entry) => (
                    <div key={entry.id} className="rounded-md border border-border bg-muted/20 px-3 py-2.5">
                        <Caption className="font-medium text-foreground">{entry.category}</Caption>
                        <Caption className="mt-1 block leading-relaxed text-muted-foreground">
                            {entry.subcategory_notes}
                        </Caption>
                        {entry.required_documents.length > 0 && (
                            <ul className="mt-2 flex flex-col gap-1">
                                {entry.required_documents.slice(0, MAX_REQUIRED_DOCUMENTS).map((document) => (
                                    <li key={document} className="flex gap-2 text-sm text-muted-foreground">
                                        <span className="text-faint">•</span>
                                        <span>{document}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}