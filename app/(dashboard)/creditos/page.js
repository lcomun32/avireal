'use client'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useCreditos } from '@/hooks/useCreditos'
import CreditoBadge from '@/components/creditos/CreditoBadge'
import CreditoCard from '@/components/creditos/CreditoCard'

const ESTADOS = ['todos', 'activo', 'vencido', 'pagado', 'pendiente']

// ─── Skeleton loader ───────────────────────────────────────
function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {[...Array(7)].map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-gray-100 rounded w-full" />
        </td>
      ))}
    </tr>
  )
}

// ─── Stats card ────────────────────────────────────────────
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

// ─── Componente principal ───────────────────────────────────
export default function CreditosPage() {
  const { creditos, loading, error, refetch } = useCreditos()

  const [busqueda, setBusqueda]   = useState('')
  const [estadoFiltro, setEstado] = useState('todos')
  const [sortKey, setSortKey]     = useState('created_at')
  const [sortDir, setSortDir]     = useState('desc')
  const [pagina, setPagina]       = useState(1)
  const POR_PAGINA = 10

  // ── Stats calculadas ──────────────────────────────────────
  const stats = useMemo(() => {
    const total       = creditos.length
    const activos     = creditos.filter(c => c.estado === 'activo').length
    const vencidos    = creditos.filter(c => c.estado === 'vencido').length
    const montoTotal  = creditos.reduce((s, c) => s + Number(c.monto_total ?? 0), 0)
    const saldoTotal  = creditos.reduce((s, c) => s + Number(c.saldo_pendiente ?? 0), 0)
    return { total, activos, vencidos, montoTotal, saldoTotal }
  }, [creditos])

  // ── Filtrado + orden + paginación ─────────────────────────
  const filtrados = useMemo(() => {
    let list = creditos.filter(c => {
      const texto = busqueda.toLowerCase()
      const matchBusqueda =
        !busqueda ||
        c.clientes?.nombre?.toLowerCase().includes(texto) ||
        c.clientes?.dni?.includes(texto)
      const matchEstado = estadoFiltro === 'todos' || c.estado === estadoFiltro
      return matchBusqueda && matchEstado
    })

    list = [...list].sort((a, b) => {
      let va = a[sortKey] ?? ''
      let vb = b[sortKey] ?? ''
      if (typeof va === 'string') va = va.toLowerCase()
      if (typeof vb === 'string') vb = vb.toLowerCase()
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })

    return list
  }, [creditos, busqueda, estadoFiltro, sortKey, sortDir])

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA))
  const paginados    = filtrados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA)

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
    setPagina(1)
  }

  const SortIcon = ({ col }) =>
    sortKey !== col ? <span className="text-gray-300 ml-1">↕</span>
    : sortDir === 'asc' ? <span className="text-indigo-500 ml-1">↑</span>
    : <span className="text-indigo-500 ml-1">↓</span>

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

      {/* ── Encabezado ─────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Créditos</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {loading ? 'Cargando...' : `${filtrados.length} crédito${filtrados.length !== 1 ? 's' : ''} encontrado${filtrados.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <Link
          href="/creditos/nuevo"
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition shadow-sm"
        >
          <span>➕</span> Nuevo crédito
        </Link>
      </div>

      {/* ── Stats ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon="💳" label="Total créditos" value={stats.total}
          color={{ border: 'border-indigo-100', bg: 'bg-indigo-50', text: 'text-indigo-700' }} />
        <StatCard icon="✅" label="Activos" value={stats.activos}
          color={{ border: 'border-emerald-100', bg: 'bg-emerald-50', text: 'text-emerald-700' }} />
        <StatCard icon="⚠️" label="Vencidos" value={stats.vencidos}
          color={{ border: 'border-red-100', bg: 'bg-red-50', text: 'text-red-700' }} />
        <StatCard
          icon="💰" label="Saldo por cobrar"
          value={`S/ ${stats.saldoTotal.toLocaleString('es-PE')}`}
          sub={`De S/ ${stats.montoTotal.toLocaleString('es-PE')} totales`}
          color={{ border: 'border-amber-100', bg: 'bg-amber-50', text: 'text-amber-700' }}
        />
      </div>

      {/* ── Filtros ────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Buscador */}
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <input
            type="text"
            placeholder="Buscar por cliente o DNI..."
            value={busqueda}
            onChange={e => { setBusqueda(e.target.value); setPagina(1) }}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        {/* Filtro estado */}
        <div className="flex gap-1.5 flex-wrap">
          {ESTADOS.map(est => (
            <button
              key={est}
              onClick={() => { setEstado(est); setPagina(1) }}
              className={`px-3 py-2 rounded-lg text-xs font-medium capitalize transition ${
                estadoFiltro === est
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600'
              }`}
            >
              {est === 'todos' ? 'Todos' : est}
            </button>
          ))}
        </div>

        {/* Refetch */}
        <button
          onClick={refetch}
          disabled={loading}
          className="px-3 py-2.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 text-sm transition disabled:opacity-50"
          title="Actualizar"
        >
          🔄
        </button>
      </div>

      {/* ── Error ──────────────────────────────────────── */}
      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg p-4">
          <span className="text-red-500">⚠️</span>
          <p className="text-sm text-red-700">{error}</p>
          <button onClick={refetch} className="ml-auto text-xs text-red-600 underline">Reintentar</button>
        </div>
      )}

      {/* ── Tabla (desktop) ────────────────────────────── */}
      <div className="hidden md:block bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {[
                  { key: 'clientes.nombre', label: 'Cliente'         },
                  { key: 'monto_total',     label: 'Monto total'     },
                  { key: 'saldo_pendiente', label: 'Saldo pendiente' },
                  { key: 'cuotas',          label: 'Cuotas'          },
                  { key: 'tasa_interes',    label: 'TEA %'           },
                  { key: 'estado',          label: 'Estado'          },
                  { key: null,              label: 'Acciones'        },
                ].map(col => (
                  <th
                    key={col.label}
                    onClick={() => col.key && toggleSort(col.key)}
                    className={`px-4 py-3 text-left font-semibold text-gray-600 whitespace-nowrap ${col.key ? 'cursor-pointer hover:text-indigo-600 select-none' : ''}`}
                  >
                    {col.label}
                    {col.key && <SortIcon col={col.key} />}
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
                    <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                      <p className="text-3xl mb-2">🗂️</p>
                      <p className="text-sm">No se encontraron créditos</p>
                    </td>
                  </tr>
                )
                : paginados.map(credito => {
                  const progreso = Math.min(
                    Math.round(((credito.monto_total - (credito.saldo_pendiente ?? 0)) / credito.monto_total) * 100),
                    100
                  )
                  return (
                    <tr key={credito.id} className="hover:bg-gray-50 transition group">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{credito.clientes?.nombre ?? '—'}</p>
                        <p className="text-xs text-gray-400">{credito.clientes?.dni ?? '—'}</p>
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-900">
                        S/ {Number(credito.monto_total).toLocaleString('es-PE')}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-red-600">
                          S/ {Number(credito.saldo_pendiente ?? 0).toLocaleString('es-PE')}
                        </p>
                        {/* mini barra */}
                        <div className="w-20 bg-gray-100 rounded-full h-1.5 mt-1">
                          <div className="bg-indigo-400 h-1.5 rounded-full" style={{ width: `${progreso}%` }} />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{credito.cuotas}</td>
                      <td className="px-4 py-3 text-gray-600">{credito.tasa_interes}%</td>
                      <td className="px-4 py-3">
                        <CreditoBadge estado={credito.estado} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
                          <Link
                            href={`/creditos/${credito.id}`}
                            className="px-3 py-1.5 text-xs font-medium bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition"
                          >
                            Ver
                          </Link>
                          <Link
                            href={`/pagos/nuevo?credito_id=${credito.id}`}
                            className="px-3 py-1.5 text-xs font-medium bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition"
                          >
                            Pagar
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })
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
              <button
                onClick={() => setPagina(p => Math.max(1, p - 1))}
                disabled={pagina === 1}
                className="px-3 py-1 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition"
              >
                ‹ Anterior
              </button>
              {[...Array(totalPaginas)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPagina(i + 1)}
                  className={`px-3 py-1 rounded-lg border transition ${
                    pagina === i + 1
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
                disabled={pagina === totalPaginas}
                className="px-3 py-1 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition"
              >
                Siguiente ›
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Cards (mobile) ─────────────────────────────── */}
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
          : paginados.map(c => <CreditoCard key={c.id} credito={c} />)
        }

        {/* Paginación mobile */}
        {!loading && filtrados.length > POR_PAGINA && (
          <div className="flex justify-center gap-2 pt-2">
            <button
              onClick={() => setPagina(p => Math.max(1, p - 1))}
              disabled={pagina === 1}
              className="px-4 py-2 rounded-lg border border-gray-200 text-sm disabled:opacity-40 hover:bg-gray-50"
            >
              ‹
            </button>
            <span className="px-4 py-2 text-sm text-gray-500">
              {pagina} / {totalPaginas}
            </span>
            <button
              onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
              disabled={pagina === totalPaginas}
              className="px-4 py-2 rounded-lg border border-gray-200 text-sm disabled:opacity-40 hover:bg-gray-50"
            >
              ›
            </button>
          </div>
        )}
      </div>

    </div>
  )
}