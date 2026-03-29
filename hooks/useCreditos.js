'use client'
import { useState, useEffect, useCallback } from 'react'

export function useCreditos() {
  const [creditos, setCreditos]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)

  const fetchCreditos = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/creditos')
      if (!res.ok) throw new Error('Error al cargar créditos')
      const data = await res.json()
      setCreditos(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchCreditos() }, [fetchCreditos])

  return { creditos, loading, error, refetch: fetchCreditos }
}