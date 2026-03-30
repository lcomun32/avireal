'use client'
import { useState, useEffect, useCallback } from 'react'

export function useClientes({ puestoId = null, q = '' } = {}) {
  const [clientes, setClientes] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)

  const fetchClientes = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (puestoId) params.set('puesto_id', puestoId)
      if (q.trim()) params.set('q', q.trim())

      const res = await fetch(`/api/clientes?${params}`)
      if (!res.ok) throw new Error('Error al cargar clientes')
      const data = await res.json()
      setClientes(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [puestoId, q])  // ← re-fetch automático cuando cambian los filtros

  useEffect(() => { fetchClientes() }, [fetchClientes])

  const crearCliente = useCallback(async (body) => {
    const res = await fetch('/api/clientes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error('Error al crear cliente')
    const nuevo = await res.json()
    setClientes(prev => [...prev, nuevo])   // actualiza local sin re-fetch
    return nuevo
  }, [])

  return { clientes, setClientes, loading, error, refetch: fetchClientes, crearCliente }
}