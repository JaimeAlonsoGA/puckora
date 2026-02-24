import { useMutation } from '@tanstack/react-query'
import { scraper } from '@/lib/scraper'
import type { CostCalculatorInput, CostBreakdown } from '@repo/types'

// Submit a cost estimate calculation directly to the SP-API/fees endpoint.
export function useCostEstimate() {
    return useMutation({
        mutationFn: (input: CostCalculatorInput) =>
            scraper.post<CostBreakdown>('/sp-api/fees', input),
    })
}
