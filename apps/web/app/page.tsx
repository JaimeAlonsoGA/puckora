import { redirect } from 'next/navigation'
import { AppRoute } from '@/lib/routes'

export default function HomePage() {
    redirect(AppRoute.home as never)
}
