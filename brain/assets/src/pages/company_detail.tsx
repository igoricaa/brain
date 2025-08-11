import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'

type Company = {
  uuid: string
  name: string
  website?: string | null
  hq_country?: string | null
  hq_state_name?: string | null
  hq_city_name?: string | null
  year_founded?: number | null
  summary?: string | null
}

function joinLocation(country?: string | null, state?: string | null, city?: string | null) {
  return [city, state, country].filter(Boolean).join(', ')
}

function useCompany(uuid: string | null) {
  const [data, setData] = useState<Company | null>(null)
  const [loading, setLoading] = useState<boolean>(!!uuid)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function run() {
      if (!uuid) return
      setLoading(true)
      setError(null)
      try {
        const resp = await fetch(`/api/companies/companies/${uuid}/`, {
          credentials: 'same-origin',
          headers: { Accept: 'application/json' },
        })
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
        const json = (await resp.json()) as Company
        if (!cancelled) setData(json)
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load company')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [uuid])

  return { data, loading, error }
}

function CompanyAbout({ company }: { company: Company }) {
  const location = useMemo(
    () => joinLocation(company.hq_country, company.hq_state_name, company.hq_city_name),
    [company.hq_country, company.hq_state_name, company.hq_city_name],
  )
  return (
    <div className="card mt-3">
      <div className="card-header">About</div>
      <div className="card-body">
        <div className="mb-2">
          <strong>Website:</strong>{' '}
          {company.website ? (
            <a href={company.website} target="_blank" rel="noreferrer">
              {company.website}
            </a>
          ) : (
            <span>-</span>
          )}
        </div>
        <div className="mb-2">
          <strong>HQ:</strong> <span>{location || '-'}</span>
        </div>
        <div className="mb-2">
          <strong>Founded:</strong> <span>{company.year_founded ?? '-'}</span>
        </div>
        {company.summary && (
          <div className="mb-0">
            <strong>Summary:</strong>
            <div>{company.summary}</div>
          </div>
        )}
      </div>
    </div>
  )
}

function App({ uuid }: { uuid: string }) {
  const { data, loading, error } = useCompany(uuid)
  if (loading) return <div className="text-muted small">Loading company…</div>
  if (error) return <div className="text-danger small">{error}</div>
  if (!data) return null
  return <CompanyAbout company={data} />
}

function mount() {
  const el = document.getElementById('company-detail-root')
  if (!el) return
  const uuid = el.getAttribute('data-uuid')
  if (!uuid) return
  const root = createRoot(el)
  root.render(<App uuid={uuid} />)
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount)
} else {
  mount()
}

