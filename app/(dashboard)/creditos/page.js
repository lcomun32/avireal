'use client'
import { Fragment, useState, useMemo, useRef, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client' // ← ajusta según tu proyecto
import { useCreditos } from '@/hooks/useCreditos'
import CreditoBadge from '@/components/creditos/CreditoBadge'
import CreditoCard from '@/components/creditos/CreditoCard'
import NuevoCreditoModal from '@/components/creditos/NuevoCreditoModal'
import { formatFechaPeru } from '@/utils/fecha'
import CreditoPagosDetalle from '@/components/creditos/CreditoPagosDetalle'

const ESTADOS = ['pendiente', 'vencido', 'pagado']

// ─── Helper: estado del grupo (worst-case) ─────────────────
function estadoGrupo(creditos) {
  const estados = creditos.map(c => c.estado)
  if (estados.every(e => e === 'pagado')) return 'pagado'
  if (estados.some(e => e === 'vencido')) return 'vencido'
  return 'pendiente'
}

// ─── Skeleton ──────────────────────────────────────────────
function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {[...Array(8)].map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-gray-100 rounded w-full" />
        </td>
      ))}
    </tr>
  )
}

// ─── StatCard ──────────────────────────────────────────────
function StatCard({ icon, label, value, sub, color }) {
  return (
    <div className={`bg-white rounded-xl border ${color.border} shadow-sm p-5`}>
      <div className={`w-10 h-10 rounded-lg ${color.bg} flex items-center justify-center text-xl mb-3`}>{icon}</div>
      <p className={`text-2xl font-bold ${color.text}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

// ─── PuestoFilter ──────────────────────────────────────────
function PuestoFilter({ opciones, seleccionados, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const label =
    seleccionados.length === 0 ? 'Puestos' :
    seleccionados.length === 1 ? seleccionados[0] :
    `${seleccionados.length} puestos`

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`px-3 py-2 rounded-lg text-xs font-medium capitalize transition min-w-30 flex items-center gap-1 ${
          seleccionados.length > 0
            ? 'border border-indigo-400 bg-indigo-50 text-indigo-700'
            : 'border border-gray-200 bg-white text-gray-600 hover:border-indigo-300 hover:text-indigo-600'
        }`}
      >
        <span>🏪</span>
        <span>{label}</span>
        <span className="text-gray-400 text-xs">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="absolute z-20 mt-1 left-0 bg-white border border-gray-200 rounded-xl shadow-lg min-w-[200px] py-1 overflow-hidden">
          {opciones.length === 0
            ? <p className="px-4 py-3 text-xs text-gray-400">Sin puestos disponibles</p>
            : opciones.map(id => (
              <label key={id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer text-sm text-gray-700 transition">
                <input
                  type="checkbox"
                  checked={seleccionados.includes(id)}
                  onChange={() => onChange(seleccionados.includes(id) ? seleccionados.filter(p => p !== id) : [...seleccionados, id])}
                  className="accent-indigo-600 w-4 h-4"
                />
                <span className="truncate">{id}</span>
              </label>
            ))
          }
        </div>
      )}
    </div>
  )
}

// ─── PagarClienteModal ─────────────────────────────────────
// Distribuye el pago entre créditos pendientes del más antiguo al más nuevo
function PagarClienteModal({ open, onClose, grupo, onPagado }) {
  const [monto, setMonto] = useState('')
  const [metodo, setMetodo] = useState('efectivo')
  const [observacion, setObservacion] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (open) { setMonto(''); setMetodo('efectivo'); setObservacion(''); setError(null) }
  }, [open])

  // Créditos con saldo, ordenados de más antiguo a más nuevo
  const creditosPendientes = useMemo(() =>
    [...(grupo?.creditos ?? [])]
      .filter(c => Number(c.saldo_pendiente) > 0)
      .sort((a, b) => new Date(a.creado_en) - new Date(b.creado_en)),
    [grupo]
  )

  // Preview de distribución en tiempo real
  const distribucion = useMemo(() => {
    const m = Number(monto) || 0
    if (m <= 0) return []
    let restante = m
    const result = []
    for (const c of creditosPendientes) {
      if (restante <= 0) break
      const aplicar = Math.min(restante, Number(c.saldo_pendiente))
      result.push({ credito: c, monto_aplicado: aplicar })
      restante -= aplicar
    }
    return result
  }, [monto, creditosPendientes])

  // const handleSubmit = async (e) => {
  //   e.preventDefault()
  //   const montoNum = parseFloat(Number(monto).toFixed(2))
  //   if (!montoNum || montoNum <= 0 || distribucion.length === 0) return

  //   setLoading(true)
  //   setError(null)

  //   try {

  //     const supabase = createClient()

  //     // 1. Crear registro en pagos
  //     const { data: pago, error: pagoErr } = await supabase
  //       .from('pagos')
  //       .insert({
  //         cliente_id: grupo.cliente_id,
  //         cliente_nombre: grupo.cliente_nombre,
  //         monto: montoNum,
  //         metodo,
  //         observacion: observacion || null,
  //       })
  //       .select()
  //       .single()

  //     if (pagoErr) throw pagoErr

  //     // 2. Crear pago_credito para cada crédito afectado
  //     const { error: pcErr } = await supabase
  //       .from('pago_credito')
  //       .insert(
  //         distribucion.map(d => ({
  //           pago_id: pago.id,
  //           credito_id: d.credito.id,
  //           monto_aplicado: d.monto_aplicado,
  //         }))
  //       )

  //     if (pcErr) throw pcErr

  //     onPagado()
  //   } catch (err) {
  //     setError(err.message)
  //   } finally {
  //     setLoading(false)
  //   }
  // }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const montoNum = parseFloat(Number(monto).toFixed(2))
    if (!montoNum || montoNum <= 0 || distribucion.length === 0) return

    if (excedeMonto) {
      setError('El monto no puede ser mayor al saldo pendiente')
      return
    }
    setLoading(true)
    setError(null)

    try {
      // Determinar si es pago individual o global
      // grupo.credito_id_unico viene seteado cuando se abre el modal
      // desde una sub-fila (pago de un solo crédito)
      const body = grupo.credito_id_unico
        ? {
            // MODO A: pago individual
            credito_id:  grupo.credito_id_unico,
            monto:       montoNum,
            metodo,
            observacion: observacion || null,
          }
        : {
            // MODO B: pago global (waterfall)
            puesto_id:      grupo.puesto_id,
            cliente_nombre: grupo.cliente_nombre,
            monto:          montoNum,
            metodo,
            observacion:    observacion || null,
          }

      const res = await fetch('/api/pagos', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.error ?? 'Error al registrar el pago')

      onPagado(data.resumen)   // puedes pasar el resumen al padre si lo necesitas

    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!open || !grupo) return null

  const excedeMonto = Number(monto) > grupo.saldo_pendiente



  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">💳 Registrar pago</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        <div className="px-6 py-5">
          <div className="bg-gray-50 rounded-lg p-3 mb-4">
            <p className="font-semibold text-gray-900 text-sm">{grupo.cliente_nombre}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {grupo.creditos_count} crédito{grupo.creditos_count !== 1 ? 's' : ''} ·{' '}
              Saldo total:{' '}
              <span className="text-red-500 font-semibold">
                S/ {grupo.saldo_pendiente.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
              </span>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Monto a pagar</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={monto}
                onChange={e => setMonto(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Método de pago</label>
              <select
                value={metodo}
                onChange={e => setMetodo(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="efectivo">Efectivo</option>
                <option value="yape">Yape</option>
                <option value="plin">Plin</option>
                <option value="transferencia">Transferencia</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Observación (opcional)</label>
              <input
                type="text"
                value={observacion}
                onChange={e => setObservacion(e.target.value)}
                placeholder="Notas del pago..."
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Preview de distribución */}
            {!grupo.credito_id_unico && distribucion.length > 0 && (
              <div className="bg-indigo-50 rounded-lg p-3 space-y-2">
                <p className="text-xs font-semibold text-indigo-700">Distribución automática (más antiguo primero):</p>
                {distribucion.map((d, i) => (
                  <div key={d.credito.id} className="flex justify-between items-start text-xs">
                    <div>
                      <span className="text-gray-600 font-medium">Crédito #{i + 1}</span>
                      <span className="text-gray-400 ml-1">({formatFechaPeru(d.credito.creado_en)})</span>
                      <p className="text-gray-400">
                        Pendiente: S/ {Number(d.credito.saldo_pendiente).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                        {d.monto_aplicado >= Number(d.credito.saldo_pendiente) && (
                          <span className="ml-1 text-emerald-600 font-medium">✓ Saldado</span>
                        )}
                      </p>
                    </div>
                    <span className="font-bold text-emerald-600 shrink-0 ml-2">
                      − S/ {d.monto_aplicado.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Advertencia de excedente — siempre visible en ambos modos */}
            {excedeMonto && (
              <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                ⚠️ El monto supera el saldo total (S/ {grupo.saldo_pendiente.toLocaleString('es-PE')})
              </p>
            )}

            {error && (
              <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">⚠️ {error}</p>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || !monto || distribucion.length === 0 || excedeMonto}
                className="flex-1 px-4 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition"
              >
                {loading ? 'Guardando...' : 'Confirmar pago'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// ─── Componente principal ───────────────────────────────────
export default function CreditosPage() {
  const { creditos, loading, error, refetch, setCreditos } = useCreditos()

  const [modalOpen, setModalOpen]     = useState(false)
  const [busqueda, setBusqueda]       = useState('')
  const [estadosFiltro, setEstados]   = useState(['pendiente', 'vencido'])
  const [puestosFiltro, setPuestos]   = useState([])
  const [sortKey, setSortKey]         = useState('creado_en')
  const [sortDir, setSortDir]         = useState('desc')
  const [pagina, setPagina]           = useState(1)
  const [expandedKeys, setExpandedKeys] = useState(new Set())
  const [pagarModal, setPagarModal]   = useState({ open: false, grupo: null })
  const [expandedCreditoIds, setExpandedCreditoIds] = useState(new Set())

  const POR_PAGINA = 40

  const handleCreditoCreado = (nuevo) => setCreditos(prev => [nuevo, ...prev])

  const puestosDisponibles = useMemo(() => {
    const ids = creditos.map(c => c.puesto_id).filter(Boolean)
    return [...new Set(ids)].sort()
  }, [creditos])

  // Stats sobre todos los créditos (sin filtrar)
  const stats = useMemo(() => {
    const total        = creditos.length
    const pendientes   = creditos.filter(c => c.estado === 'pendiente').length
    const vencidos     = creditos.filter(c => c.estado === 'vencido').length
    const pagados      = creditos.filter(c => c.estado === 'pagado').length
    const montoTotal   = creditos.reduce((s, c) => s + Number(c.total          ?? 0), 0)
    const saldoTotal   = creditos.reduce((s, c) => s + Number(c.saldo_pendiente ?? 0), 0)
    const totalCobrado = creditos.reduce((s, c) => s + Number(c.total_pagado    ?? 0), 0)
    return { total, pendientes, vencidos, pagados, montoTotal, saldoTotal, totalCobrado }
  }, [creditos])

  // Filtrado individual (base para agrupar)
  const filtrados = useMemo(() => {
    return creditos.filter(c => {
      const texto = busqueda.toLowerCase()
      const matchBusqueda =
        !busqueda ||
        c.cliente_nombre?.toLowerCase().includes(texto) ||
        c.puesto_id?.toLowerCase().includes(texto)
      const matchEstado = estadosFiltro.length === 0 || estadosFiltro.includes(c.estado)
      const matchPuesto = puestosFiltro.length === 0 || puestosFiltro.includes(c.puesto_id)
      return matchBusqueda && matchEstado && matchPuesto
    })
  }, [creditos, busqueda, estadosFiltro, puestosFiltro])

  // Agrupación por cliente_id + puesto_id, con ordenamiento
  const agrupados = useMemo(() => {
    const map = new Map()

    filtrados.forEach(c => {
      const key = `${c.cliente_id}__${c.puesto_id ?? ''}`
      if (!map.has(key)) {
        map.set(key, {
          key,
          cliente_id:     c.cliente_id,
          cliente_nombre: c.cliente_nombre,
          puesto_id:      c.puesto_id,
          creditos:       [],
          total:          0,
          total_pagado:   0,
          saldo_pendiente: 0,
        })
      }
      const g = map.get(key)
      g.creditos.push(c)
      g.total           += Number(c.total           ?? 0)
      g.total_pagado    += Number(c.total_pagado     ?? 0)
      g.saldo_pendiente += Number(c.saldo_pendiente  ?? 0)
    })

    const groups = [...map.values()].map(g => ({
      ...g,
      creditos_count:    g.creditos.length,
      estado:            estadoGrupo(g.creditos),
      progreso_pct:      g.total > 0 ? Math.round((g.total_pagado / g.total) * 100) : 0,
      ultimo_pago_fecha: g.creditos.map(c => c.ultimo_pago_fecha).filter(Boolean).sort().at(-1) ?? null,
      creado_en:         g.creditos.map(c => c.creado_en).filter(Boolean).sort().at(0) ?? null,
    }))

    return groups.sort((a, b) => {
      let va = a[sortKey] ?? ''
      let vb = b[sortKey] ?? ''
      if (typeof va === 'string') va = va.toLowerCase()
      if (typeof vb === 'string') vb = vb.toLowerCase()
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [filtrados, sortKey, sortDir])

  const totalPaginas = Math.max(1, Math.ceil(agrupados.length / POR_PAGINA))
  const paginados    = agrupados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA)

  const toggleExpand = (key) => {
    setExpandedKeys(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
    setPagina(1)
  }



  const toggleEstado = (est) => {
    setEstados(prev => prev.includes(est) ? prev.filter(e => e !== est) : [...prev, est])
    setPagina(1)
  }

  const toggleCreditoDetalle = (creditoId) => {
    setExpandedCreditoIds(prev => {
      const next = new Set(prev)
      next.has(creditoId) ? next.delete(creditoId) : next.add(creditoId)
      return next
    })
  }  

  const SortIcon = ({ col }) =>
    sortKey !== col ? <span className="text-gray-300 ml-1">↕</span>
    : sortDir === 'asc' ? <span className="text-indigo-500 ml-1">↑</span>
    : <span className="text-indigo-500 ml-1">↓</span>

  const COLS = [
    { key: 'cliente_nombre',    label: 'Cliente'        },
    { key: 'puesto_id',         label: 'Puesto'         },
    { key: 'total',             label: 'Total'          },
    { key: 'saldo_pendiente',   label: 'Saldo / Avance' },
    { key: 'estado',            label: 'Estado'         },
    { key: 'ultimo_pago_fecha', label: 'Último pago'    },
    { key: 'creado_en',         label: 'Fecha'          },
    { key: null,                label: 'Acciones'       },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

      {/* ── Encabezado ──────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Créditos</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {loading
              ? 'Cargando...'
              : `${agrupados.length} cliente${agrupados.length !== 1 ? 's' : ''} · ${filtrados.length} crédito${filtrados.length !== 1 ? 's' : ''}`
            }
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition shadow-sm"
        >
          <span>➕</span> Nuevo crédito
        </button>
        <NuevoCreditoModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onCreado={handleCreditoCreado}
        />
      </div>

      {/* ── Stats ──────────────────────────────────────── */}
      <div className="hidden md:grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard icon="💳" label="Total créditos" value={stats.total}
          color={{ border: 'border-indigo-100', bg: 'bg-indigo-50', text: 'text-indigo-700' }} />
        <StatCard icon="🕐" label="Pendientes" value={stats.pendientes}
          sub={`${stats.pagados} pagado${stats.pagados !== 1 ? 's' : ''}`}
          color={{ border: 'border-amber-100', bg: 'bg-amber-50', text: 'text-amber-700' }} />
        <StatCard icon="🔴" label="Vencidos +3d" value={stats.vencidos}
          sub={stats.vencidos > 0 ? 'Requieren atención' : 'Sin vencidos 🎉'}
          color={{ border: 'border-red-100', bg: 'bg-red-50', text: 'text-red-700' }} />
        <StatCard icon="⏳" label="Por cobrar"
          value={`S/ ${stats.saldoTotal.toLocaleString('es-PE')}`}
          sub={`Cobrado: S/ ${stats.totalCobrado.toLocaleString('es-PE')}`}
          color={{ border: 'border-orange-100', bg: 'bg-orange-50', text: 'text-orange-700' }} />
        <StatCard icon="💰" label="Total otorgado"
          value={`S/ ${stats.montoTotal.toLocaleString('es-PE')}`}
          color={{ border: 'border-emerald-100', bg: 'bg-emerald-50', text: 'text-emerald-700' }} />
      </div>

      {/* ── Filtros ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <input
            type="text"
            placeholder="Buscar por cliente o puesto..."
            value={busqueda}
            onChange={e => { setBusqueda(e.target.value); setPagina(1) }}
            className="w-full pl-9 pr-4 py-2 rounded-lg text-xs font-medium border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap items-center">
          {ESTADOS.map(est => (
            <button
              key={est}
              onClick={() => toggleEstado(est)}
              className={`px-3 py-2 rounded-lg text-xs font-medium capitalize transition ${
                estadosFiltro.includes(est)
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600'
              }`}
            >
              {est}
            </button>
          ))}
          <PuestoFilter
            opciones={puestosDisponibles}
            seleccionados={puestosFiltro}
            onChange={(nuevos) => { setPuestos(nuevos); setPagina(1) }}
          />
        </div>
      </div>

      {puestosFiltro.length > 0 && (
        <div className="flex gap-2 flex-wrap -mt-2">
          {puestosFiltro.map(id => (
            <span key={id} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
              🏪 {id}
              <button onClick={() => { setPuestos(p => p.filter(x => x !== id)); setPagina(1) }} className="hover:text-indigo-900 font-bold">×</button>
            </span>
          ))}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg p-4">
          <span className="text-red-500">⚠️</span>
          <p className="text-sm text-red-700">{error}</p>
          <button onClick={refetch} className="ml-auto text-xs text-red-600 underline">Reintentar</button>
        </div>
      )}

      {/* ── Tabla desktop ───────────────────────────────── */}
      <div className="hidden md:block bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {COLS.map(col => (
                  <th
                    key={col.label}
                    onClick={() => col.key && toggleSort(col.key)}
                    className={`px-4 py-3 text-left font-semibold text-gray-600 whitespace-nowrap ${col.key ? 'cursor-pointer hover:text-indigo-600 select-none' : ''}`}
                  >
                    {col.label}{col.key && <SortIcon col={col.key} />}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-50">
              {loading
                ? [...Array(5)].map((_, i) => <SkeletonRow key={i} />)
                : paginados.length === 0
                ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                      <p className="text-3xl mb-2">🗂️</p>
                      <p className="text-sm">No se encontraron créditos</p>
                    </td>
                  </tr>
                )
                : paginados.map(grupo => {
                  const isExpanded = expandedKeys.has(grupo.key)
                  return (
                    <Fragment key={grupo.key}>

                      {/* ── Fila agrupada ─────────────────── */}
                      <tr
                        onClick={() => toggleExpand(grupo.key)}
                        className="hover:bg-gray-50 transition cursor-pointer group"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span
                              className="text-gray-400 text-xs transition-transform duration-150 inline-block"
                              style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
                            >
                              ▶
                            </span>
                            <div>
                              <p className="font-medium text-gray-900">{grupo.cliente_nombre ?? '—'}</p>
                              {grupo.creditos_count > 1 && (
                                <p className="text-xs text-indigo-500">{grupo.creditos_count} créditos</p>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3 text-gray-600">{grupo.puesto_id ?? '—'}</td>

                        <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">
                          S/ {grupo.total.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                        </td>

                        <td className="px-4 py-3">
                          <p className={`font-semibold whitespace-nowrap ${grupo.saldo_pendiente > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                            S/ {grupo.saldo_pendiente.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                          </p>
                          <div className="w-24 bg-gray-100 rounded-full h-1.5 mt-1">
                            <div className="bg-indigo-400 h-1.5 rounded-full transition-all" style={{ width: `${grupo.progreso_pct}%` }} />
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">{grupo.progreso_pct}% cobrado</p>
                        </td>

                        <td className="px-4 py-3"><CreditoBadge estado={grupo.estado} /></td>

                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                          {grupo.ultimo_pago_fecha ? formatFechaPeru(grupo.ultimo_pago_fecha) : <span className="text-gray-300">Sin pagos</span>}
                        </td>

                        <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                          {grupo.creado_en ? formatFechaPeru(grupo.creado_en,'') : '—'}
                        </td>

                        {/* Acciones del grupo — stopPropagation para no abrir/cerrar el expand */}
                        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>

                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
                            {grupo.saldo_pendiente > 0 && (
                              <button
                                onClick={() => setPagarModal({ open: true, grupo })}
                                className="px-3 py-1.5 text-xs font-medium bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition"
                              >
                                💳 Pagar
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* ── Sub-filas: créditos individuales ── */}
                      {isExpanded && grupo.creditos.map((credito, idx) => {
                        const isCreditoExpanded = expandedCreditoIds.has(credito.id)
                        return (
                          <Fragment key={credito.id}>
                            {/* Fila del crédito — clickeable para ver pagos */}
                            <tr
                              onClick={() => toggleCreditoDetalle(credito.id)}
                              className="bg-indigo-50/40 hover:bg-indigo-50/70 transition text-xs cursor-pointer group/credito"
                            >
                              <td className="py-2.5 pl-10 pr-4 border-l-2 border-indigo-300">
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className="text-indigo-300 text-[10px] transition-transform duration-150 inline-block"
                                    style={{ transform: isCreditoExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
                                  >
                                    ▶
                                  </span>
                                  <span className="text-gray-500 font-medium">Crédito #{idx + 1}</span>
                                  {credito.nota && (
                                    <span className="text-gray-400 truncate max-w-[120px]">{credito.nota}</span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-2.5 text-gray-500">{credito.puesto_id ?? '—'}</td>
                              <td className="px-4 py-2.5 font-semibold text-gray-700 whitespace-nowrap">
                                S/ {Number(credito.total ?? 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="px-4 py-2.5">
                                <p className={`font-semibold whitespace-nowrap ${Number(credito.saldo_pendiente) > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                                  S/ {Number(credito.saldo_pendiente ?? 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                                </p>
                                <div className="w-20 bg-gray-200 rounded-full h-1 mt-1">
                                  <div className="bg-indigo-400 h-1 rounded-full" style={{ width: `${credito.progreso_pct ?? 0}%` }} />
                                </div>
                              </td>
                              <td className="px-4 py-2.5">
                                <CreditoBadge estado={credito.estado} />
                                {credito.estado === 'vencido' && credito.dias_pendiente > 0 && (
                                  <p className="text-red-400 mt-0.5">{credito.dias_pendiente}d sin pagar</p>
                                )}
                              </td>
                              <td className="px-4 py-2.5 text-gray-400 whitespace-nowrap">
                                {credito.ultimo_pago_fecha ? formatFechaPeru(credito.ultimo_pago_fecha) : <span className="text-gray-300">—</span>}
                              </td>
                              <td className="px-4 py-2.5 text-gray-400 whitespace-nowrap">
                                {formatFechaPeru(credito.creado_en)}
                              </td>
                              <td className="px-4 py-2.5" onClick={e => e.stopPropagation()}>
                                <div className="flex items-center gap-2">
                                  {Number(credito.saldo_pendiente) > 0 && (
                                    <button
                                      onClick={() => setPagarModal({
                                        open: true,
                                        grupo: {
                                          credito_id_unico: credito.id,
                                          puesto_id:        credito.puesto_id,
                                          cliente_id:       credito.cliente_id,
                                          cliente_nombre:   credito.cliente_nombre,
                                          saldo_pendiente:  Number(credito.saldo_pendiente),
                                          creditos_count:   1,
                                          creditos:         [credito],
                                        },
                                      })}
                                      className="px-2.5 py-1 font-medium bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition"
                                    >
                                      Pagar
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>

                            {/* ── Detalle de pagos del crédito ── */}
                            {isCreditoExpanded && (
                              <tr className="bg-white">
                                <td colSpan={8} className="pl-16 pr-4 py-0 border-l-2 border-indigo-200">
                                  <div className="border border-gray-100 rounded-lg my-2 overflow-hidden bg-gray-50/50">
                                    {/* <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-between">
                                      <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                                        📋 Líneas de pago
                                      </p>
                                    </div> */}
                                    <CreditoPagosDetalle creditoId={credito.id} />
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        )
                      })}

                    </Fragment>
                  )
                })
              }
            </tbody>
          </table>
        </div>

        {/* Paginación (sobre grupos) */}
        {!loading && agrupados.length > POR_PAGINA && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
            <span>
              Mostrando {(pagina - 1) * POR_PAGINA + 1}–{Math.min(pagina * POR_PAGINA, agrupados.length)} de {agrupados.length} clientes
            </span>
            <div className="flex gap-1">
              <button onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina === 1}
                className="px-3 py-1 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition">
                ‹ Anterior
              </button>
              {[...Array(totalPaginas)].map((_, i) => (
                <button key={i} onClick={() => setPagina(i + 1)}
                  className={`px-3 py-1 rounded-lg border transition ${pagina === i + 1 ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-200 hover:bg-gray-50'}`}>
                  {i + 1}
                </button>
              ))}
              <button onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))} disabled={pagina === totalPaginas}
                className="px-3 py-1 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition">
                Siguiente ›
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Cards mobile ────────────────────────────────── */}
{/* ── Cards (mobile) ──────────────────────────────── */}
<div className="md:hidden space-y-3">
  {loading
    ? [...Array(4)].map((_, i) => (
      <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 animate-pulse space-y-3">
        <div className="h-4 bg-gray-100 rounded w-3/4" />
        <div className="h-4 bg-gray-100 rounded w-1/2" />
        <div className="h-3 bg-gray-100 rounded w-full" />
      </div>
    ))
    : paginados.length === 0
    ? (
      <div className="text-center py-12 text-gray-400">
        <p className="text-3xl mb-2">🗂️</p>
        <p className="text-sm">No se encontraron créditos</p>
      </div>
    )
    // ✅ Antes: paginados.map(c => <CreditoCard key={c.id} credito={c} />)
    // ✅ Ahora: usa grupo + onPagar
    : paginados.map(grupo => (
      <CreditoCard
        key={grupo.key}
        grupo={grupo}
        onPagar={(g) => setPagarModal({ open: true, grupo: g })}
      />
    ))
  }

  {!loading && agrupados.length > POR_PAGINA && (
    <div className="flex justify-center gap-2 pt-2">
      <button onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina === 1}
        className="px-4 py-2 rounded-lg border border-gray-200 text-sm disabled:opacity-40 hover:bg-gray-50">‹</button>
      <span className="px-4 py-2 text-sm text-gray-500">{pagina} / {totalPaginas}</span>
      <button onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))} disabled={pagina === totalPaginas}
        className="px-4 py-2 rounded-lg border border-gray-200 text-sm disabled:opacity-40 hover:bg-gray-50">›</button>
    </div>
  )}
</div>

      {/* ── Modal pago multi-crédito ─────────────────────── */}
      <PagarClienteModal
        open={pagarModal.open}
        grupo={pagarModal.grupo}
        onClose={() => setPagarModal({ open: false, grupo: null })}
        onPagado={() => { refetch(); setPagarModal({ open: false, grupo: null }) }}
      />

    </div>
  )
}


// 'use client'
// import { useState, useMemo, useRef, useEffect } from 'react'
// import Link from 'next/link'
// import { useCreditos } from '@/hooks/useCreditos'
// import CreditoBadge from '@/components/creditos/CreditoBadge'
// import CreditoCard from '@/components/creditos/CreditoCard'
// import NuevoCreditoModal from '@/components/creditos/NuevoCreditoModal'
// import { formatFechaPeru } from '@/utils/fecha'

// //const ESTADOS = ['todos', 'pendiente', 'vencido', 'pagado']
// const ESTADOS = ['pendiente', 'vencido', 'pagado']

// // ─── Skeleton loader ───────────────────────────────────────
// function SkeletonRow() {
//   return (
//     <tr className="animate-pulse">
//       {[...Array(7)].map((_, i) => (
//         <td key={i} className="px-4 py-3">
//           <div className="h-4 bg-gray-100 rounded w-full" />
//         </td>
//       ))}
//     </tr>
//   )
// }

// // ─── Stats card ────────────────────────────────────────────
// function StatCard({ icon, label, value, sub, color }) {
//   return (
//     <div className={`bg-white rounded-xl border ${color.border} shadow-sm p-5`}>
//       <div className={`w-10 h-10 rounded-lg ${color.bg} flex items-center justify-center text-xl mb-3`}>
//         {icon}
//       </div>
//       <p className={`text-2xl font-bold ${color.text}`}>{value}</p>
//       <p className="text-xs text-gray-500 mt-0.5">{label}</p>
//       {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
//     </div>
//   )
// }

// // ─── Multi-select Puesto ───────────────────────────────────
// function PuestoFilter({ opciones, seleccionados, onChange }) {
//   const [open, setOpen] = useState(false)
//   const ref = useRef(null)

//   // Cerrar al hacer click fuera
//   useEffect(() => {
//     const handler = (e) => {
//       if (ref.current && !ref.current.contains(e.target)) setOpen(false)
//     }
//     document.addEventListener('mousedown', handler)
//     return () => document.removeEventListener('mousedown', handler)
//   }, [])

//   const togglePuesto = (id) => {
//     onChange(
//       seleccionados.includes(id)
//         ? seleccionados.filter(p => p !== id)
//         : [...seleccionados, id]
//     )
//   }

//   const label =
//     seleccionados.length === 0           ? 'Puestos'       :
//     seleccionados.length === 1           ? seleccionados[0]           :
//     `${seleccionados.length} puestos`

//   return (
//     <div ref={ref} className="relative">
//       <button
//         onClick={() => setOpen(o => !o)}
//         className={`px-3 py-2 rounded-lg text-xs font-medium capitalize transition bg-white border border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600 min-w-30 ${
//           seleccionados.length > 0
//             ? 'border-indigo-400 bg-indigo-50 text-indigo-700 font-medium'
//             : 'border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600 bg-white'
//         }`}
//       >
//         <span>🏪</span>
//         <span>{label}</span>
//         <span className="text-gray-400 text-xs">{open ? '▲' : '▼'}</span>
//       </button>

//       {open && (
//         <div className="absolute z-20 mt-1 left-0 bg-white border border-gray-200 rounded-xl shadow-lg min-w-[200px] py-1 overflow-hidden">
//           {/* Limpiar selección */}
//           {/* {seleccionados.length > 0 && (
//             <button
//               onClick={() => { onChange([]); setOpen(false) }}
//               className="w-full text-left px-4 py-2 text-xs text-indigo-600 hover:bg-indigo-50 border-b border-gray-100 font-medium"
//             >
//               ✕ Limpiar filtro
//             </button>
//           )} */}

//           {opciones.length === 0 ? (
//             <p className="px-4 py-3 text-xs text-gray-400">Sin puestos disponibles</p>
//           ) : (
//             opciones.map(id => (
//               <label
//                 key={id}
//                 className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer text-sm text-gray-700 transition"
//               >
//                 <input
//                   type="checkbox"
//                   checked={seleccionados.includes(id)}
//                   onChange={() => togglePuesto(id)}
//                   className="accent-indigo-600 w-4 h-4 rounded"
//                 />
//                 <span className="truncate">{id}</span>
//               </label>
//             ))
//           )}
//         </div>
//       )}
//     </div>
//   )
// }

// // ─── Componente principal ───────────────────────────────────
// export default function CreditosPage() {
//  // const { creditos, loading, error, refetch } = useCreditos()
//   const { creditos, loading, error, refetch, setCreditos } = useCreditos()

//   const [modalOpen, setModalOpen] = useState(false)
//   const [busqueda, setBusqueda]         = useState('')
//   //const [estadoFiltro, setEstado]       = useState('pendiente')
//   const [estadosFiltro, setEstados] = useState(['pendiente','vencido'])
//   const [puestosFiltro, setPuestos]     = useState([])   // ✅ multi-select puestos
//   const [sortKey, setSortKey]           = useState('creado_en')
//   const [sortDir, setSortDir]           = useState('desc')
//   const [pagina, setPagina]             = useState(1)
//   const POR_PAGINA = 40


//   const handleCreditoCreado = (nuevo) => {
//     // Inserta al inicio sin esperar el refetch
//     setCreditos(prev => [nuevo, ...prev])
//   }

//   // ── Puestos únicos disponibles ────────────────────────────
//   const puestosDisponibles = useMemo(() => {
//     const ids = creditos
//       .map(c => c.puesto_id)
//       .filter(Boolean)
//     return [...new Set(ids)].sort()
//   }, [creditos])

//   // ── Stats calculadas ──────────────────────────────────────
//   const stats = useMemo(() => {
//     const total        = creditos.length
//     const pendientes   = creditos.filter(c => c.estado === 'pendiente').length
//     const vencidos     = creditos.filter(c => c.estado === 'vencido').length
//     const pagados      = creditos.filter(c => c.estado === 'pagado').length
//     const montoTotal   = creditos.reduce((s, c) => s + Number(c.total          ?? 0), 0)
//     const saldoTotal   = creditos.reduce((s, c) => s + Number(c.saldo_pendiente ?? 0), 0)
//     const totalCobrado = creditos.reduce((s, c) => s + Number(c.total_pagado    ?? 0), 0)
//     return { total, pendientes, vencidos, pagados, montoTotal, saldoTotal, totalCobrado }
//   }, [creditos])

//   // ── Filtrado + orden + paginación ─────────────────────────
//   const filtrados = useMemo(() => {
//     let list = creditos.filter(c => {
//       const texto = busqueda.toLowerCase()
//       const matchBusqueda =
//         !busqueda ||
//         c.clientes?.nombre?.toLowerCase().includes(texto) ||
//         c.cliente_nombre?.toLowerCase().includes(texto) ||
//         c.puesto_id?.toLowerCase().includes(texto)
//       //const matchEstado  = estadoFiltro === 'todos' || c.estado === estadoFiltro
//       const matchEstado = estadosFiltro.length === 0 || estadosFiltro.includes(c.estado)
//       // ✅ si no hay puestos seleccionados, pasa todos; si hay, solo los incluidos
//       const matchPuesto  = puestosFiltro.length === 0 || puestosFiltro.includes(c.puesto_id)
//       return matchBusqueda && matchEstado && matchPuesto
//     })

//     list = [...list].sort((a, b) => {
//       let va = a[sortKey] ?? ''
//       let vb = b[sortKey] ?? ''
//       if (typeof va === 'string') va = va.toLowerCase()
//       if (typeof vb === 'string') vb = vb.toLowerCase()
//       if (va < vb) return sortDir === 'asc' ? -1 : 1
//       if (va > vb) return sortDir === 'asc' ? 1 : -1
//       return 0
//     })

//     return list
//   }, [creditos, busqueda, estadosFiltro, puestosFiltro, sortKey, sortDir])

//   const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA))
//   const paginados    = filtrados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA)

//   const toggleSort = (key) => {
//     if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
//     else { setSortKey(key); setSortDir('asc') }
//     setPagina(1)
//   }

//   const toggleEstado = (est) => {
//     setEstados(prev =>
//       prev.includes(est)
//         ? prev.filter(e => e !== est)   // deseleccionar
//         : [...prev, est]                // seleccionar
//     )
//     setPagina(1)
//   }

//   const SortIcon = ({ col }) =>
//     sortKey !== col ? <span className="text-gray-300 ml-1">↕</span>
//     : sortDir === 'asc' ? <span className="text-indigo-500 ml-1">↑</span>
//     : <span className="text-indigo-500 ml-1">↓</span>

//   return (
//     <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

//       {/* ── Encabezado ─────────────────────────────────── */}
//       <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
//         <div>
//           <h1 className="text-2xl font-bold text-gray-900">Créditos</h1>
//           <p className="text-sm text-gray-500 mt-0.5">
//             {loading ? 'Cargando...' : `${filtrados.length} crédito${filtrados.length !== 1 ? 's' : ''} encontrado${filtrados.length !== 1 ? 's' : ''}`}
//           </p>
//         </div>


//         <button
//           onClick={() => setModalOpen(true)}
//           className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition shadow-sm"
//         >
//           <span>➕</span> Nuevo crédito
//         </button>

//         <NuevoCreditoModal
//           open={modalOpen}
//           onClose={() => setModalOpen(false)}
//           onCreado={handleCreditoCreado}   // ✅ actualización instantánea
//         />


//       </div>

//       {/* ── Stats (5 cards en grid responsivo) ─────────── */}
//       <div className=" hidden md:grid grid-cols-2 lg:grid-cols-5 gap-4">
//         <StatCard icon="💳" label="Total créditos" value={stats.total}
//           color={{ border: 'border-indigo-100', bg: 'bg-indigo-50', text: 'text-indigo-700' }} />
//         <StatCard icon="🕐" label="Pendientes" value={stats.pendientes}
//           sub={`${stats.pagados} pagado${stats.pagados !== 1 ? 's' : ''}`}
//           color={{ border: 'border-amber-100', bg: 'bg-amber-50', text: 'text-amber-700' }} />
//         <StatCard icon="🔴" label="Vencidos +3d" value={stats.vencidos}
//           sub={stats.vencidos > 0 ? 'Requieren atención' : 'Sin vencidos 🎉'}
//           color={{ border: 'border-red-100', bg: 'bg-red-50', text: 'text-red-700' }} />
//         <StatCard
//           icon="⏳" label="Por cobrar"
//           value={`S/ ${stats.saldoTotal.toLocaleString('es-PE')}`}
//           sub={`Cobrado: S/ ${stats.totalCobrado.toLocaleString('es-PE')}`}
//           color={{ border: 'border-orange-100', bg: 'bg-orange-50', text: 'text-orange-700' }} />
//         <StatCard
//           icon="💰" label="Total otorgado"
//           value={`S/ ${stats.montoTotal.toLocaleString('es-PE')}`}
//           color={{ border: 'border-emerald-100', bg: 'bg-emerald-50', text: 'text-emerald-700' }} />
//       </div>

//       {/* ── Filtros ────────────────────────────────────── */}
//       <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
//         {/* Buscador */}
//         <div className="relative flex-1 min-w-[200px]">
//           <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
//           <input
//             type="text"
//             placeholder="Buscar por cliente..."
//             value={busqueda}
//             onChange={e => { setBusqueda(e.target.value); setPagina(1) }}
//             className="w-full pl-9 pr-4 px-3 py-2 rounded-lg text-xs font-medium capitalize transition border border-gray-300  focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
//           />
//         </div>

//         {/* Filtro estado */}
//       <div className="flex gap-1.5 flex-wrap items-center">
//         {ESTADOS.map(est => (
//           <button
//             key={est}
//             onClick={() => toggleEstado(est)}
//             className={`px-3 py-2 rounded-lg text-xs font-medium capitalize transition ${
//               estadosFiltro.includes(est)           // ✅ includes en vez de ===
//                 ? 'bg-indigo-600 text-white shadow-sm'
//                 : 'bg-white border border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600'
//             }`}
//           >
//             {est}
//           </button>
//         ))}

//         <PuestoFilter
//           opciones={puestosDisponibles}
//           seleccionados={puestosFiltro}
//           onChange={(nuevos) => { setPuestos(nuevos); setPagina(1) }}
//         />

//         </div>

//         {/* ✅ Filtro multi-select puesto */}


//         {/* Refetch */}
//         {/* <button
//           onClick={refetch}
//           disabled={loading}
//           className="px-3 py-2  rounded-lg text-xs font-medium capitalize transition bg-white border border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600"
//           title="Actualizar"
//         >
//           🔄
//         </button> */}
//       </div>

//       {/* ── Chips de puestos activos ───────────────────── */}
//       {puestosFiltro.length > 0 && (
//         <div className="flex gap-2 flex-wrap -mt-2 ">
//           {puestosFiltro.map(id => (
//             <span
//               key={id}
//               className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium"
//             >
//               🏪 {id}
//               <button
//                 onClick={() => {
//                   setPuestos(p => p.filter(x => x !== id))
//                   setPagina(1)
//                 }}
//                 className="hover:text-indigo-900 font-bold"
//               >
//                 ×
//               </button>
//             </span>
//           ))}
//         </div>
//       )}

//       {/* ── Error ──────────────────────────────────────── */}
//       {error && (
//         <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg p-4">
//           <span className="text-red-500">⚠️</span>
//           <p className="text-sm text-red-700">{error}</p>
//           <button onClick={refetch} className="ml-auto text-xs text-red-600 underline">Reintentar</button>
//         </div>
//       )}

//       {/* ── Tabla (desktop) ────────────────────────────── */}
//       <div className="hidden md:block bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
//         <div className="overflow-x-auto">
//           <table className="min-w-full text-sm">
//             <thead>
//               <tr className="bg-gray-50 border-b border-gray-100">
//                 {[
//                   { key: 'cliente_nombre',    label: 'Cliente'        },
//                   { key: 'puesto_id',         label: 'Puesto'         },
//                   { key: 'total',             label: 'Total'          },
//                   { key: 'saldo_pendiente',   label: 'Saldo / Avance' },
//                   { key: 'estado',            label: 'Estado'         },
//                   { key: 'ultimo_pago_fecha', label: 'Último pago'    },
//                   { key: 'creado_en',         label: 'Fecha'          },
//                   { key: null,                label: 'Acciones'       },
//                 ].map(col => (
//                   <th
//                     key={col.label}
//                     onClick={() => col.key && toggleSort(col.key)}
//                     className={`px-4 py-3 text-left font-semibold text-gray-600 whitespace-nowrap ${col.key ? 'cursor-pointer hover:text-indigo-600 select-none' : ''}`}
//                   >
//                     {col.label}
//                     {col.key && <SortIcon col={col.key} />}
//                   </th>
//                 ))}
//               </tr>
//             </thead>

//             <tbody className="divide-y divide-gray-50">
//               {loading
//                 ? [...Array(5)].map((_, i) => <SkeletonRow key={i} />)
//                 : paginados.length === 0
//                 ? (
//                   <tr>
//                     <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
//                       <p className="text-3xl mb-2">🗂️</p>
//                       <p className="text-sm">No se encontraron créditos</p>
//                     </td>
//                   </tr>
//                 )
//                 : paginados.map(credito => (
//                   <tr key={credito.id} className="hover:bg-gray-50 transition group">

//                     <td className="px-4 py-3">
//                       <p className="font-medium text-gray-900">
//                         {credito.clientes?.nombre ?? credito.cliente_nombre ?? '—'}
//                       </p>
//                     </td>

//                     <td className="px-4 py-3 text-gray-600">
//                       {credito.puesto_id ?? '—'}
//                     </td>

//                     <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">
//                       S/ {Number(credito.total ?? 0).toLocaleString('es-PE')}
//                     </td>

//                     <td className="px-4 py-3">
//                       <p className={`font-semibold whitespace-nowrap ${
//                         credito.saldo_pendiente > 0 ? 'text-red-500' : 'text-emerald-600'
//                       }`}>
//                         S/ {Number(credito.saldo_pendiente ?? 0).toLocaleString('es-PE')}
//                       </p>
//                       <div className="w-24 bg-gray-100 rounded-full h-1.5 mt-1" title={`${credito.progreso_pct ?? 0}% cobrado`}>
//                         <div
//                           className="bg-indigo-400 h-1.5 rounded-full transition-all"
//                           style={{ width: `${credito.progreso_pct ?? 0}%` }}
//                         />
//                       </div>
//                       <p className="text-xs text-gray-400 mt-0.5">{credito.progreso_pct ?? 0}% cobrado</p>
//                     </td>

//                     <td className="px-4 py-3">
//                       <CreditoBadge estado={credito.estado} />
//                       {credito.estado === 'vencido' && credito.dias_pendiente > 0 && (
//                         <p className="text-xs text-red-400 mt-0.5">{credito.dias_pendiente}d sin pagar</p>
//                       )}
//                     </td>

//                     <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
//                       {credito.ultimo_pago_fecha
//                         ? formatFechaPeru(credito.ultimo_pago_fecha)
//                         : <span className="text-gray-300">Sin pagos</span>
//                       }
//                     </td>

//                     <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
//                         {formatFechaPeru(credito.creado_en)}
//                     </td>

//                     <td className="px-4 py-3">
//                       <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
//                         <Link
//                           href={`/creditos/${credito.id}`}
//                           className="px-3 py-1.5 text-xs font-medium bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition"
//                         >
//                           Ver
//                         </Link>
//                         {credito.saldo_pendiente > 0 && (
//                           <Link
//                             href={`/pagos/nuevo?credito_id=${credito.id}`}
//                             className="px-3 py-1.5 text-xs font-medium bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition"
//                           >
//                             Pagar
//                           </Link>
//                         )}
//                       </div>
//                     </td>
//                   </tr>
//                 ))
//               }
//             </tbody>
//           </table>
//         </div>

//         {/* Paginación */}
//         {!loading && filtrados.length > POR_PAGINA && (
//           <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
//             <span>
//               Mostrando {(pagina - 1) * POR_PAGINA + 1}–{Math.min(pagina * POR_PAGINA, filtrados.length)} de {filtrados.length}
//             </span>
//             <div className="flex gap-1">
//               <button
//                 onClick={() => setPagina(p => Math.max(1, p - 1))}
//                 disabled={pagina === 1}
//                 className="px-3 py-1 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition"
//               >
//                 ‹ Anterior
//               </button>
//               {[...Array(totalPaginas)].map((_, i) => (
//                 <button
//                   key={i}
//                   onClick={() => setPagina(i + 1)}
//                   className={`px-3 py-1 rounded-lg border transition ${
//                     pagina === i + 1
//                       ? 'bg-indigo-600 text-white border-indigo-600'
//                       : 'border-gray-200 hover:bg-gray-50'
//                   }`}
//                 >
//                   {i + 1}
//                 </button>
//               ))}
//               <button
//                 onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
//                 disabled={pagina === totalPaginas}
//                 className="px-3 py-1 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition"
//               >
//                 Siguiente ›
//               </button>
//             </div>
//           </div>
//         )}
//       </div>

//       {/* ── Cards (mobile) ─────────────────────────────── */}
//       <div className="md:hidden space-y-3">
//         {loading
//           ? [...Array(4)].map((_, i) => (
//             <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 animate-pulse space-y-3">
//               <div className="h-4 bg-gray-100 rounded w-3/4" />
//               <div className="h-4 bg-gray-100 rounded w-1/2" />
//               <div className="h-3 bg-gray-100 rounded w-full" />
//             </div>
//           ))
//           : paginados.length === 0
//           ? (
//             <div className="text-center py-12 text-gray-400">
//               <p className="text-3xl mb-2">🗂️</p>
//               <p className="text-sm">No se encontraron créditos</p>
//             </div>
//           )
//           : paginados.map(c => <CreditoCard key={c.id} credito={c} />)
//         }

//         {!loading && filtrados.length > POR_PAGINA && (
//           <div className="flex justify-center gap-2 pt-2">
//             <button
//               onClick={() => setPagina(p => Math.max(1, p - 1))}
//               disabled={pagina === 1}
//               className="px-4 py-2 rounded-lg border border-gray-200 text-sm disabled:opacity-40 hover:bg-gray-50"
//             >
//               ‹
//             </button>
//             <span className="px-4 py-2 text-sm text-gray-500">
//               {pagina} / {totalPaginas}
//             </span>
//             <button
//               onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
//               disabled={pagina === totalPaginas}
//               className="px-4 py-2 rounded-lg border border-gray-200 text-sm disabled:opacity-40 hover:bg-gray-50"
//             >
//               ›
//             </button>
//           </div>
//         )}
//       </div>

//     </div>
//   )
// }

