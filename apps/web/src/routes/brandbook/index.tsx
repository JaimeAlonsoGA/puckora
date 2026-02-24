import React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { BrandbookPage } from '@/pages/brandbook/BrandbookPage'

export const Route = createFileRoute('/brandbook/')({
    component: BrandbookPage,
})
