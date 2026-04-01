'use client'
import { useState, useEffect, useCallback } from 'react'

// ── Caché a nivel de módulo ───────────────────────────────────────
const _cache = new Map()
const makeKey = (puestoId, q) => `${puestoId ?? '__all__'}:${q.trim()}`

export const precalentarPuestos = (puestos = []) => {
  puestos.forEach(async (p) => {
    const key = makeKey(p, '')
    if (_cache.has(key)) return
    try {
      const res = await fetch(`/api/clientes?puesto_id=${p}`)
      if (res.ok) _cache.set(key, await res.json())
    } catch { /* silencioso */ }
  })
}

export const invalidarCachePuesto = (puestoId) => {
  for (const key of _cache.keys()) {
    if (key.startsWith(`${puestoId ?? '__all__'}:`)) _cache.delete(key)
  }
}

export const limpiarCacheClientes = () => _cache.clear()
// ─────────────────────────────────────────────────────────────────


export function useClientes({ puestoId = null, q = '' } = {}) {
  const cacheKey = makeKey(puestoId, q)

  // Si ya está en caché → arranca con data y sin spinner
  // Si NO está en caché → arranca vacío CON spinner (siempre fetchea)
  const [clientes, setClientes] = useState(() => _cache.get(cacheKey) ?? [])
  const [loading,  setLoading]  = useState(!_cache.has(cacheKey))  // ← sin && !!puestoId
  const [error,    setError]    = useState(null)

  const fetchClientes = useCallback(async ({ force = false } = {}) => {
    // ── HIT de caché (no forzado) → retorno instantáneo ──
    if (!force && _cache.has(cacheKey)) {
      setClientes(_cache.get(cacheKey))
      setLoading(false)
      return
    }

    // ── MISS → fetch real (puestoId null = todos los clientes) ──
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (puestoId)  params.set('puesto_id', puestoId)  // ← opcional, no obligatorio
      if (q.trim())  params.set('q', q.trim())

      const res = await fetch(`/api/clientes?${params}`)
      if (!res.ok) throw new Error('Error al cargar clientes')
      const data = await res.json()
      _cache.set(cacheKey, data)
      setClientes(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [puestoId, q, cacheKey])

  useEffect(() => { fetchClientes() }, [fetchClientes])

  const crearCliente = useCallback(async (body) => {
    const res = await fetch('/api/clientes', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    })
    if (!res.ok) throw new Error('Error al crear cliente')
    const nuevo = await res.json()
    setClientes(prev => {
      const updated = [...prev, nuevo]
      _cache.set(cacheKey, updated)
      return updated
    })
    return nuevo
  }, [cacheKey])

  const refetch = useCallback(() => fetchClientes({ force: true }), [fetchClientes])

  return { clientes, setClientes, loading, error, refetch, crearCliente }
}

// 'use client'
// import { useState, useEffect, useCallback } from 'react'

// export function useClientes({ puestoId = null, q = '' } = {}) {
//   const [clientes, setClientes] = useState([])
//   const [loading, setLoading]   = useState(true)
//   const [error, setError]       = useState(null)

//   const fetchClientes = useCallback(async () => {
//     setLoading(true)
//     setError(null)
//     try {
//       const params = new URLSearchParams()
//       if (puestoId) params.set('puesto_id', puestoId)
//       if (q.trim()) params.set('q', q.trim())

//       const res = await fetch(`/api/clientes?${params}`)
//       if (!res.ok) throw new Error('Error al cargar clientes')
//       const data = await res.json()
//       setClientes(data)
//     } catch (e) {
//       setError(e.message)
//     } finally {
//       setLoading(false)
//     }
//   }, [puestoId, q])  // ← re-fetch automático cuando cambian los filtros

//   useEffect(() => { fetchClientes() }, [fetchClientes])

//   const crearCliente = useCallback(async (body) => {
//     const res = await fetch('/api/clientes', {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify(body),
//     })
//     if (!res.ok) throw new Error('Error al crear cliente')
//     const nuevo = await res.json()
//     setClientes(prev => [...prev, nuevo])   // actualiza local sin re-fetch
//     return nuevo
//   }, [])

//   return { clientes, setClientes, loading, error, refetch: fetchClientes, crearCliente }
// }

