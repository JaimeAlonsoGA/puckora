import { redirect } from 'next/navigation'
import { AppRoute } from '@/constants/routes'

export default function HomePage() {
    redirect(AppRoute.home as never)
}
