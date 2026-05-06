El patrón central: fetch paralelo sin waterfall
El error más común es el waterfall: await fetchA() seguido de await fetchB(). En page.tsx hay que iniciar todos los fetches críticos a la vez:
// app/(dashboard)/page.tsx
import { Suspense } from 'react'
import { HeavyList } from './_components/HeavyList'
import { StaticShell } from './_components/StaticShell'
import { getUserData, getProducts } from '@/lib/data'

export default async function Page() {
  // Inicia en paralelo — no hace await todavía
  const userPromise = getUserData()
  const productsPromise = getProducts()

  // Resuelve en paralelo — un solo round trip efectivo
  const [user, products] = await Promise.all([userPromise, productsPromise])

  return (
    <main>
      {/* Datos ya resueltos — sin Suspense */}
      <StaticShell user={user} />

      {/* Datos lentos — streamed, muestra skeleton hasta que llega */}
      <Suspense fallback={<HeavyListSkeleton />}>
        <HeavyList productsPromise={productsPromise} />
      </Suspense>
    </main>
  )
}
Nota el truco de productsPromise: puedes pasar la promesa sin resolver a un componente dentro de <Suspense> y hacer el await dentro del componente hijo. Así Next.js puede streamear ese bloque de forma independiente.

Estrategias de cache por tipo de dato
En la capa de datos (lib/data/) se centraliza toda la lógica de fetching con su política de cache:
// lib/data/products.ts
import { unstable_cache } from 'next/cache'
import { cache } from 'react'

// React cache() — dedup dentro del mismo request (sin persistencia)
// Útil para datos que se leen varias veces en el árbol de componentes
export const getCurrentUser = cache(async () => {
  return db.user.findFirst(...)
})

// unstable_cache — persiste entre requests, invalida por tag
// Para queries de ORM/DB que no pasan por fetch()
export const getProducts = unstable_cache(
  async () => {
    return db.product.findMany(...)
  },
  ['products-list'],           // cache key
  { revalidate: 60, tags: ['products'] }  // TTL + tag para invalidación manual
)

// fetch() nativo — se integra directamente con el Data Cache de Next.js
export async function getConfig() {
  const res = await fetch('https://api.example.com/config', {
    next: { revalidate: 3600, tags: ['config'] }  // ISR-style
  })
  return res.json()
}

// Datos en tiempo real — nunca se cachean
export async function getLiveMetrics() {
  const res = await fetch('https://api.example.com/metrics', {
    cache: 'no-store'
  })
  return res.json()
}
Server Actions + revalidación
Las mutaciones viven en lib/actions/ con "use server":

// lib/actions/mutations.ts
'use server'

import { revalidatePath, revalidateTag } from 'next/cache'

export async function updateProduct(id: string, data: FormData) {
  await db.product.update({ where: { id }, data: parseFormData(data) })

  // Invalida por tag — más quirúrgico que revalidatePath
  revalidateTag('products')

  // O por path si necesitas también el layout
  // revalidatePath('/dashboard/products')
}
En el cliente, con useOptimistic el UX es instantáneo:
'use client'

import { useOptimistic, useTransition } from 'react'
import { updateProduct } from '@/lib/actions/mutations'

export function OptimisticForm({ product }) {
  const [optimisticProduct, addOptimistic] = useOptimistic(product)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      // UX inmediato — actualiza UI antes de que el server responda
      addOptimistic({ ...product, name: formData.get('name') })
      await updateProduct(product.id, formData)
    })
  }

  return <form action={handleSubmit}>...</form>
}
Reglas de composición Server / Client
El modelo mental clave es que los Client Components son "hojas" del árbol, no intermediarios. Un Server Component puede renderizar un Client Component, pero un Client Component no puede importar un Server Component directamente (sí puede recibirlo como children).
// CORRECTO — Server Component pasa children
// ServerParent.tsx (Server)
import { ClientWrapper } from './ClientWrapper'
import { ServerChild } from './ServerChild'

export function ServerParent() {
  return (
    <ClientWrapper>
      <ServerChild /> {/* se serializa antes de llegar al cliente */}
    </ClientWrapper>
  )
}

// ClientWrapper.tsx (Client)
'use client'
export function ClientWrapper({ children }) {
  const [open, setOpen] = useState(false)
  return <div onClick={() => setOpen(!open)}>{children}</div>
}
