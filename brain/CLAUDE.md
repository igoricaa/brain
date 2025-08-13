# VITE-REACT.md — Vite + React SPA Playbook

> **Goal**: Senior‑level guide for fast, secure, maintainable **Vite + React 19+** apps with **TypeScript 5.6+**, **Tailwind 4.x**, **shadcn/ui + Radix** (optional), **Zod v4+**, **TanStack Query v5**, **React Router**, **PostgreSQL/Drizzle (via API/BFF)**, **Motion One/Framer Motion**.
>
> **Retrieval policy**: Before coding, **query **`` for official docs & types of libraries used. If this file conflicts with docs, **docs win**.

---

## 0) Architecture & Guardrails

- **Client‑first SPA**: React router for navigation; render on client; push data access behind a typed API/BFF.
- **Functional & declarative**: Hooks, composition, pure functions; avoid classes and mutation‑heavy patterns.
- **Type safety**: Strict TS; validate **all external inputs** with Zod at the BFF boundary and parse responses on the client.
- **State**: Server data → **TanStack Query**; local UI state → React state; avoid global stores unless necessary.
- **Performance**: Code‑split routes, lazy load heavy charts/editors; keep initial chunk small; prefetch on intent.
- **Security**: Never ship secrets to the client; use token‑based auth with refresh rotation; sanitize untrusted HTML.

---

## 1) Project Layout

```
src/
  app/
    routes/                 # Route components (React Router)
    providers/              # Query client, theme providers
  components/
    ui/                     # shadcn primitives (optional)
    features/
    forms/
  lib/
    api/                    # Fetch client, interceptors
    validation/             # Zod schemas
    utils/
  styles/
    tokens.css
index.html
main.tsx
vite.config.ts
```

**Conventions**: folders `kebab-case`; components `PascalCase.tsx`; utils `camelCase.ts`; booleans with auxiliaries (`isLoading`), constants `SCREAMING_SNAKE_CASE`.

---

## 2) Tooling & Config

**Vite**

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  build: { sourcemap: true, target: 'es2022' },
  server: { port: 5173, open: true },
})
```

**Tailwind**

```ts
// tailwind.config.ts
import type { Config } from 'tailwindcss'
export default {
  content: ['./index.html','./src/**/*.{ts,tsx}'],
  theme: { extend: {} },
  plugins: [],
} satisfies Config
```

**Providers**

```tsx
// src/app/providers/QueryProvider.tsx
'use client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState } from 'react'
function makeClient(){ return new QueryClient({ defaultOptions:{ queries:{ staleTime:60_000, gcTime:300_000 } } }) }
export function QueryProvider({ children }:{ children: React.ReactNode }){
  const [client] = useState(makeClient)
  return <QueryClientProvider client={client}>{children}<ReactQueryDevtools initialIsOpen={false}/></QueryClientProvider>
}
```

---

## 3) Routing (React Router)

```tsx
// src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { QueryProvider } from '@/app/providers/QueryProvider'
import Home from '@/app/routes/Home'
import Products from '@/app/routes/Products'
const router = createBrowserRouter([
  { path: '/', element: <Home/> },
  { path: '/products', element: <Products/> },
])
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryProvider>
      <RouterProvider router={router} />
    </QueryProvider>
  </React.StrictMode>
)
```

**Route‑level code‑split**

```tsx
import { lazy, Suspense } from 'react'
const Products = lazy(()=> import('@/app/routes/Products'))
export default function App(){
  return <Suspense fallback={<div className="p-6">Loading…</div>}><Products/></Suspense>
}
```

---

## 4) Typed API Client (+ Zod)

```ts
// src/lib/api/http.ts
class ApiError extends Error { constructor(msg:string, public status:number, public body?:unknown){ super(msg) } }
export async function getJson<T>(input: RequestInfo, init?: RequestInit){
  const res = await fetch(input,{ ...init, headers: { 'content-type':'application/json', ...(init?.headers||{}) } })
  let body: unknown; try { body = await res.json() } catch {}
  if (!res.ok) throw new ApiError((body as any)?.message ?? `HTTP ${res.status}`, res.status, body)
  return body as T
}
```

```ts
// src/lib/api/products.ts
import { z } from 'zod'
import { getJson } from './http'
export const Product = z.object({ id:z.string(), name:z.string(), price:z.number(), description:z.string(), imageUrl:z.string().url() })
export type Product = z.infer<typeof Product>
export async function listProducts(params: { search?: string; category?: string }){
  const qs = new URLSearchParams(); Object.entries(params).forEach(([k,v])=>{ if (v) qs.set(k,String(v)) })
  const data = await getJson<unknown>(`/api/products?${qs}`)
  return z.array(Product).parse(data)
}
```

---

## 5) TanStack Query v5 Patterns

- Option factories; pass `AbortSignal` from `queryFn`.
- Zod‑validate responses; use **stable keys**; `placeholderData: keepPreviousData` for filters.
- Optimistic updates with `onMutate`/`onError` rollback.

```ts
// src/lib/queries/products.ts
import { queryOptions, keepPreviousData } from '@tanstack/react-query'
import { listProducts, Product } from '@/lib/api/products'
export const productKeys = { all:()=>['products'] as const, list:(f:{search?:string; category?:string})=>[...productKeys.all(),'list',f] as const }
export const productQueries = {
  list: (filters:{ search?: string; category?: string }) => queryOptions<Product[]>({
    queryKey: productKeys.list(filters),
    queryFn: ({ signal }) => listProducts(filters).then(r=>r),
    placeholderData: keepPreviousData,
    staleTime: 5*60_000,
  }),
}
```

```tsx
// src/app/routes/Products.tsx
'use client'
import { useSuspenseQuery } from '@tanstack/react-query'
import { productQueries } from '@/lib/queries/products'
export default function Products(){
  const { data: products } = useSuspenseQuery(productQueries.list({}))
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {products.map(p=> (<article key={p.id} className="rounded-lg border p-4"><h3 className="font-semibold">{p.name}</h3><p>${'{'}p.price.toFixed(2){'}'}</p></article>))}
    </div>
  )
}
```

---

## 6) Forms & Validation

- Use **React Hook Form** + `@hookform/resolvers/zod` for client validation.
- Submit to your BFF/API; parse/validate on server; return typed responses.

```tsx
// src/components/ProductForm.tsx
'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
const ProductSchema = z.object({ name:z.string().min(2), price:z.coerce.number().positive() })
export type ProductInput = z.infer<typeof ProductSchema>
export function ProductForm(){
  const form = useForm<ProductInput>({ resolver: zodResolver(ProductSchema), defaultValues:{ name:'', price:0 } })
  async function onSubmit(data: ProductInput){ /* POST to /api */ }
  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <input {...form.register('name')} placeholder="Name" className="input"/>
      <input type="number" step="0.01" {...form.register('price', { valueAsNumber:true })} className="input"/>
      <button type="submit" className="btn">Save</button>
    </form>
  )
}
```

---

## 7) Styling (Tailwind + shadcn/ui)

```css
/* src/styles/tokens.css */
@layer base {
  :root { --background: 0 0% 100%; --foreground: 222.2 84% 4.9%; --primary: 222.2 47.4% 11.2%; --primary-foreground: 210 40% 98%; --radius: 0.5rem; }
  .dark { --background: 222.2 84% 4.9%; --foreground: 210 40% 98%; }
}
```

```ts
// src/lib/utils/cn.ts
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
export const cn = (...i: ClassValue[]) => twMerge(clsx(i))
```

---

## 8) Animations

- **Motion One** for light entrance/sequence; **Framer Motion** for layout/gestures.

```tsx
'use client'
import { animate, spring, stagger } from 'motion'
import { useEffect, useRef } from 'react'
export function AnimatedList({ children }:{ children: React.ReactNode }){
  const ref = useRef<HTMLUListElement>(null)
  useEffect(()=>{ if(!ref.current) return; const els = ref.current.querySelectorAll('li')
    animate(els,{ opacity:[0,1], y:[20,0] },{ delay: stagger(0.08), duration:0.5, easing: spring({ damping:20, stiffness:300 }) })
  },[children])
  return <ul ref={ref} className="space-y-2">{children}</ul>
}
```

---

## 9) Performance

- Route‑level code splitting; lazy heavy modules.
- Prefetch on hover/intent for likely navigations.
- Keep initial JS < \~200KB; measure with Lighthouse/React Profiler.

```tsx
// Simple hover prefetch
function NavLink({ to, children }:{ to:string; children:React.ReactNode }){
  return <a href={to} onMouseEnter={()=> import(/* @vite-ignore */ to)}>{children}</a>
}
```

---

## 10) Security

- Tokens in `Authorization` header; renew via refresh endpoints (httpOnly cookie).
- Sanitize untrusted HTML with DOMPurify; escape interpolated content.
- Never expose private keys (`VITE_*` only for public config; secrets live on server).

---

## 11) Testing & CI

- Unit: **Vitest** + RTL; E2E: **Playwright**.
- CI gates: typecheck, lint, tests, build.

```json
// package.json (scripts excerpt)
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "test": "vitest",
    "test:e2e": "playwright test"
  }
}
```

---

## 12) Review Checklist (SPA)

-

---

## 13) Quick Links

- Vite — `vite`
- React — `react`
- React Router — `react-router-dom`
- TanStack Query — `@tanstack/react-query`
- Zod — `zod`
- Tailwind — `tailwindcss`
- shadcn/ui — `shadcn`
- Motion One / Framer Motion — `motion` / `framer-motion`
- DOMPurify — `isomorphic-dompurify`

---

**Note**: Keep business logic in portable libraries (e.g., `packages/`) so you can share between Vite and Next.js apps.

