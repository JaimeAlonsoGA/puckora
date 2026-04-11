import { after } from 'next/server'
import { NextRequest, NextResponse } from 'next/server'
import { API_ERROR_MESSAGES, API_STATUS } from '@/constants/api'
import { SEARCH_RESULT_REPAIR } from '@/constants/search'
import { createFlyioDb } from '@/integrations/flyio/client'
import { repairKeywordProductBatch } from '@/integrations/data-pipeline/enrich'
import { createServerClient } from '@/integrations/supabase/server'
import { KeywordResultsRepairBodySchema } from '@/schemas/api'
import { getKeyword, listKeywordProductsNeedingRepair } from '@/services/keywords'

const NO_STORE_HEADERS = {
    'Cache-Control': 'no-store, max-age=0, must-revalidate',
}

interface KeywordResultsRepairResponse {
    queued: boolean
    candidateCount: number
}

export async function POST(req: NextRequest) {
    let body: unknown
    try {
        body = await req.json()
    } catch {
        return NextResponse.json(
            { error: API_ERROR_MESSAGES.INVALID_JSON_BODY },
            { status: API_STATUS.BAD_REQUEST },
        )
    }

    const parsedBody = KeywordResultsRepairBodySchema.safeParse(body)
    if (!parsedBody.success) {
        return NextResponse.json(
            { error: API_ERROR_MESSAGES.VALIDATION_FAILED },
            { status: API_STATUS.UNPROCESSABLE_ENTITY },
        )
    }

    const supabase = await createServerClient()
    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
        return NextResponse.json(
            { error: API_ERROR_MESSAGES.UNAUTHORIZED },
            { status: API_STATUS.UNAUTHORIZED },
        )
    }

    const { keyword, marketplace } = parsedBody.data

    try {
        const db = createFlyioDb()
        const keywordRow = await getKeyword(db, keyword, marketplace)
        if (!keywordRow) {
            return NextResponse.json<KeywordResultsRepairResponse>(
                { queued: false, candidateCount: 0 },
                { headers: NO_STORE_HEADERS },
            )
        }

        const candidates = await listKeywordProductsNeedingRepair(
            db,
            keywordRow.id,
            SEARCH_RESULT_REPAIR.BATCH_LIMIT,
        )

        if (candidates.length === 0) {
            return NextResponse.json<KeywordResultsRepairResponse>(
                { queued: false, candidateCount: 0 },
                { headers: NO_STORE_HEADERS },
            )
        }

        after(async () => {
            try {
                const repairDb = createFlyioDb()
                await repairKeywordProductBatch(repairDb, candidates, marketplace)
            } catch (error) {
                console.error('[keyword-results/repair] background repair failed:', error)
            }
        })

        return NextResponse.json<KeywordResultsRepairResponse>(
            { queued: true, candidateCount: candidates.length },
            { headers: NO_STORE_HEADERS },
        )
    } catch (error) {
        const message = error instanceof Error ? error.message : API_ERROR_MESSAGES.KEYWORD_RESULT_REPAIR_FAILED
        return NextResponse.json(
            { error: message },
            { status: API_STATUS.INTERNAL_SERVER_ERROR },
        )
    }
}