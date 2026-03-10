import { Suspense } from 'react'
import { PageContainer } from '@/components/layout/page-container'
import { Heading, Body } from '@/components/building-blocks/typography'
import { SearchShell } from './_components/search-shell'
import { getCachedScrapeJob } from '@/server/scrape'
import { getAuthUser } from '@/server/auth'

interface SearchPageProps {
    searchParams: Promise<{ job?: string }>
}

/**
 * /search
 *
 * Server Component. Reads an optional `?job=<uuid>` query param that is set
 * by createScrapeJobAction after a successful job creation. The job row is
 * pre-fetched server-side so the client shell has initial data immediately.
 */
export default async function SearchPage({ searchParams }: SearchPageProps) {
    const params = await searchParams
    const jobId = params.job ?? null

    // Ensure the user is authenticated. Redirects to /login if not.
    const user = await getAuthUser()

    // Pre-fetch the job so the shell can render an initial state.
    const initialJob = jobId ? await getCachedScrapeJob(jobId) : null

    return (
        <PageContainer>
            <div className="flex flex-col gap-[var(--space-2)]">
                <Heading as="h1">Search Amazon</Heading>
                <Body>
                    Find products using the Puckora extension. Results are enriched with
                    SP-API data automatically.
                </Body>
            </div>

            <Suspense>
                <SearchShell
                    userId={user.id}
                    initialJobId={jobId}
                    initialJob={initialJob}
                />
            </Suspense>
        </PageContainer>
    )
}
