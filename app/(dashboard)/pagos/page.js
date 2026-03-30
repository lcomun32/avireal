'use client'
import { useState, useMemo, useRef, useEffect } from 'react'
import { usePagos } from '@/hooks/usePagos'
import NuevoPagoModal from '@/components/pagos/NuevoPagoModal'

const METODOS      = ['efectivo', 'yape', 'transferencia', 'otro']
const METODO_ICON  = { efectivo: '💵', yape: '📲', transferencia: '🏦', otro: '💳' }
const METODO_COLOR = {
  efectivo:      { bg: 'bg-emerald-50',  text: 'text-emerald-700',  border: 'border-emerald-200' },
  yape:          { bg: 'bg-purple-50',   text: 'text-purple-700',   border: 'border-purple-200'  },
  transferencia: { bg: 'bg-sky-50',      text: 'text-sky-700',      border: 'border-sky-200'     },
  otro:          { bg: 'bg-gray-50',     text: 'text-gray-600',     border: 'border-gray-200'    },
}

// ─── Skeleton ──────────────────────────────────────────────
function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {[...Array(5)].map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-gray-100 rounded w-full" />
        </td>
      ))}
    </tr>
  )
}

// ─── Stat card ─────────────────────────────────────────────
function StatCard({ icon, label, value, sub, color }) {
  return (
    <div className={`bg-white rounded-xl border ${color.border} shadow-sm p-5`}>
      <div className={`w-10 h-10 rounded-lg ${color.bg} flex items-center justify-center text-xl mb-3`}>
        {icon}
      </div>
      <p className={`text-2xl font-bold ${color.text}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

// ─── Badge método ──────────────────────────────────────────
function MetodoBadge({ metodo }) {
  const m = metodo ?? 'otro'
  const c = METODO_COLOR[m] ?? METODO_COLOR.otro
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${c.bg} ${c.text} ${c.border}`}>
      {METODO_ICON[m] ?? '💳'} {m}
    </span>
  )
}

// ─── Card móvil ────────────────────────────────────────────
function PagoCard({ pago }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-gray-900">{pago.cliente_nombre ?? '—'}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {pago.creado_en
              ? new Date(pago.creado_en).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
              : '—'}
          </p>
        </div>
        <p className="shrink-0 text-lg font-bold text-emerald-600">
          S/ {Number(pago.monto ?? 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
        </p>
      </div>

      <div className="flex items-center justify-between">
        <MetodoBadge metodo={pago.metodo} />
        {pago.aplicaciones?.length > 0 && (
          <span className="text-xs text-gray-400">
            {pago.aplicaciones.length} crédito{pago.aplicaciones.length !== 1 ? 's' : ''} aplicado{pago.aplicaciones.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {pago.observacion && (
        <p className="text-xs text-gray-500 italic truncate">{pago.observacion}</p>
      )}
    </div>
  )
}

// ─── Página principal ──────────────────────────────────────
export default function PagosPage() {
  const { pagos, loading, error, refetch, setPagos } = usePagos()

  const [modalOpen,     setModalOpen]  = useState(false)
  const [busqueda,      setBusqueda]   = useState('')
  const [metodosFiltro, setMetodos]    = useState([])
  const [sortKey,       setSortKey]    = useState('creado_en')
  const [sortDir,       setSortDir]    = useState('desc')
  const [pagina,        setPagina]     = useState(1)
  const POR_PAGINA = 10

  const handlePagoCreado = (nuevo) => {
    setPagos(prev => [{ ...nuevo, aplicaciones: [] }, ...prev])
  }

  // ── Stats ──────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total        = pagos.length
    const montoTotal   = pagos.reduce((s, p) => s + Number(p.monto ?? 0), 0)
    const porMetodo    = METODOS.reduce((acc, m) => {
      acc[m] = pagos.filter(p => p.metodo === m).reduce((s, p) => s + Number(p.monto ?? 0), 0)
      return acc
    }, {})
    const hoy = new Date().toDateString()
    const cobradoHoy = pagos
      .filter(p => new Date(p.creado_en).toDateString() === hoy)
      .reduce((s, p) => s + Number(p.monto ?? 0), 0)
    return { total, montoTotal, porMetodo, cobradoHoy }
  }, [pagos])

  // ── Filtrado + orden + paginación ──────────────────────────
  const filtrados = useMemo(() => {
    let list = pagos.filter(p => {
      const texto       = busqueda.toLowerCase()
      const matchBusqueda =
        !busqueda ||
        p.cliente_nombre?.toLowerCase().includes(texto) ||
        p.metodo?.toLowerCase().includes(texto) ||
        p.observacion?.toLowerCase().includes(texto)
      const matchMetodo = metodosFiltro.length === 0 || metodosFiltro.includes(p.metodo)
      return matchBusqueda && matchMetodo
    })

    list = [...list].sort((a, b) => {
      let va = a[sortKey] ?? ''
      let vb = b[sortKey] ?? ''
      if (typeof va === 'string') va = va.toLowerCase()
      if (typeof vb === 'string') vb = vb.toLowerCase()
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ?  1 : -1
      return 0
    })

    return list
  }, [pagos, busqueda, metodosFiltro, sortKey, sortDir])

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA))
  const paginados    = filtrados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA)

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
    setPagina(1)
  }

  const toggleMetodo = (m) => {
    setMetodos(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m])
    setPagina(1)
  }

  const SortIcon = ({ col }) =>
    sortKey !== col     ? <span className="text-gray-300 ml-1">↕</span>
    : sortDir === 'asc' ? <span className="text-indigo-500 ml-1">↑</span>
    :                     <span className="text-indigo-500 ml-1">↓</span>

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

      {/* ── Encabezado ──────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pagos</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {loading
              ? 'Cargando...'
              : `${filtrados.length} pago${filtrados.length !== 1 ? 's' : ''} encontrado${filtrados.length !== 1 ? 's' : ''}`}
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition shadow-sm"
        >
          <span>💰</span> Registrar pago
        </button>

        <NuevoPagoModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onCreado={handlePagoCreado}
        />
      </div>

      {/* ── Stats ───────────────────────────────────────── */}
      <div className="hidden md:grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon="💰" label="Total cobrado"
          value={`S/ ${stats.montoTotal.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`}
          sub={`${stats.total} pago${stats.total !== 1 ? 's' : ''} registrado${stats.total !== 1 ? 's' : ''}`}
          color={{ border: 'border-emerald-100', bg: 'bg-emerald-50', text: 'text-emerald-700' }}
        />
        <StatCard
          icon="📅" label="Cobrado hoy"
          value={`S/ ${stats.cobradoHoy.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`}
          color={{ border: 'border-indigo-100', bg: 'bg-indigo-50', text: 'text-indigo-700' }}
        />
        <StatCard
          icon="💵" label="Efectivo"
          value={`S/ ${stats.porMetodo.efectivo.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`}
          color={{ border: 'border-amber-100', bg: 'bg-amber-50', text: 'text-amber-700' }}
        />
        <StatCard
          icon="📲" label="Yape / digital"
          value={`S/ ${(stats.porMetodo.yape + stats.porMetodo.transferencia).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`}
          sub={`Yape S/ ${stats.porMetodo.yape.toLocaleString('es-PE')} · Transf. S/ ${stats.porMetodo.transferencia.toLocaleString('es-PE')}`}
          color={{ border: 'border-purple-100', bg: 'bg-purple-50', text: 'text-purple-700' }}
        />
      </div>

      {/* ── Filtros ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <input
            type="text" placeholder="Buscar por cliente, método…"
            value={busqueda}
            onChange={e => { setBusqueda(e.target.value); setPagina(1) }}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        <div className="flex gap-1.5 flex-wrap items-center">
          {METODOS.map(m => (
            <button key={m} onClick={() => toggleMetodo(m)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium capitalize transition ${
                metodosFiltro.includes(m)
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600'
              }`}
            >
              {METODO_ICON[m]} {m}
            </button>
          ))}
        </div>
      </div>

      {/* ── Chips activos ───────────────────────────────── */}
      {metodosFiltro.length > 0 && (
        <div className="flex gap-2 flex-wrap -mt-2">
          {metodosFiltro.map(m => (
            <span key={m}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
              {METODO_ICON[m]} {m}
              <button onClick={() => { setMetodos(p => p.filter(x => x !== m)); setPagina(1) }}
                className="hover:text-indigo-900 font-bold">×</button>
            </span>
          ))}
        </div>
      )}

      {/* ── Error ───────────────────────────────────────── */}
      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg p-4">
          <span className="text-red-500">⚠️</span>
          <p className="text-sm text-red-700">{error}</p>
          <button onClick={refetch} className="ml-auto text-xs text-red-600 underline">Reintentar</button>
        </div>
      )}

      {/* ── Tabla (desktop) ─────────────────────────────── */}
      <div className="hidden md:block bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {[
                  { key: 'cliente_nombre', label: 'Cliente'            },
                  { key: 'monto',          label: 'Monto'              },
                  { key: 'metodo',         label: 'Método'             },
                  { key: null,             label: 'Créditos aplicados' },
                  { key: 'observacion',    label: 'Observación'        },
                  { key: 'creado_en',      label: 'Fecha'              },
                ].map(col => (
                  <th key={col.label}
                    onClick={() => col.key && toggleSort(col.key)}
                    className={`px-4 py-3 text-left font-semibold text-gray-600 whitespace-nowrap ${
                      col.key ? 'cursor-pointer hover:text-indigo-600 select-none' : ''
                    }`}
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
                    <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                      <p className="text-3xl mb-2">💸</p>
                      <p className="text-sm">No se encontraron pagos</p>
                    </td>
                  </tr>
                )
                : paginados.map(pago => (
                  <tr key={pago.id} className="hover:bg-gray-50 transition">

                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{pago.cliente_nombre ?? '—'}</p>
                    </td>

                    <td className="px-4 py-3">
                      <p className="font-bold text-emerald-600 whitespace-nowrap">
                        S/ {Number(pago.monto ?? 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                      </p>
                    </td>

                    <td className="px-4 py-3">
                      <MetodoBadge metodo={pago.metodo} />
                    </td>

                    <td className="px-4 py-3">
                      {pago.aplicaciones?.length > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full text-xs font-medium">
                          💳 {pago.aplicaciones.length} crédito{pago.aplicaciones.length !== 1 ? 's' : ''}
                        </span>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-xs text-gray-500 max-w-[180px] truncate">
                      {pago.observacion ?? <span className="text-gray-300">—</span>}
                    </td>

                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                      {pago.creado_en
                        ? new Date(pago.creado_en).toLocaleDateString('es-PE', {
                            day: '2-digit', month: 'short', year: 'numeric',
                          })
                        : '—'}
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {!loading && filtrados.length > POR_PAGINA && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
            <span>
              Mostrando {(pagina - 1) * POR_PAGINA + 1}–{Math.min(pagina * POR_PAGINA, filtrados.length)} de {filtrados.length}
            </span>
            <div className="flex gap-1">
              <button onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina === 1}
                className="px-3 py-1 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition">
                ‹ Anterior
              </button>
              {[...Array(totalPaginas)].map((_, i) => (
                <button key={i} onClick={() => setPagina(i + 1)}
                  className={`px-3 py-1 rounded-lg border transition ${
                    pagina === i + 1
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}>
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
              <p className="text-3xl mb-2">💸</p>
              <p className="text-sm">No se encontraron pagos</p>
            </div>
          )
          : paginados.map(p => <PagoCard key={p.id} pago={p} />)
        }

        {!loading && filtrados.length > POR_PAGINA && (
          <div className="flex justify-center gap-2 pt-2">
            <button onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina === 1}
              className="px-4 py-2 rounded-lg border border-gray-200 text-sm disabled:opacity-40 hover:bg-gray-50">‹</button>
            <span className="px-4 py-2 text-sm text-gray-500">{pagina} / {totalPaginas}</span>
            <button onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))} disabled={pagina === totalPaginas}
              className="px-4 py-2 rounded-lg border border-gray-200 text-sm disabled:opacity-40 hover:bg-gray-50">›</button>
          </div>
        )}
      </div>

    </div>
  )
}