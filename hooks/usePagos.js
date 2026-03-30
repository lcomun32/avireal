'use client'
import { useState, useEffect, useCallback } from 'react'

export function usePagos({ clienteId = null } = {}) {
  const [pagos,   setPagos]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  const fetchPagos = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (clienteId) params.set('cliente_id', clienteId)

      const res = await fetch(`/api/pagos?${params}`)
      if (!res.ok) throw new Error('Error al cargar pagos')
      setPagos(await res.json())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [clienteId])

  useEffect(() => { fetchPagos() }, [fetchPagos])

  const registrarPago = useCallback(async ({ puesto_id, cliente_nombre, monto, metodo, observacion }) => {
    const res = await fetch('/api/pagos', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ puesto_id, cliente_nombre, monto, metodo, observacion }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? 'Error al registrar pago')

    // Actualización local optimista
    setPagos(prev => [{ ...data.pago, aplicaciones: data.aplicaciones }, ...prev])
    return data   // { pago, aplicaciones, resumen }
  }, [])

  return { pagos, setPagos, loading, error, refetch: fetchPagos, registrarPago }
}