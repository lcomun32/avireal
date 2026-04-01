'use client'
import { useState, useMemo, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useCreditos } from '@/hooks/useCreditos'
import CreditoBadge from '@/components/creditos/CreditoBadge'
import CreditoCard from '@/components/creditos/CreditoCard'
import NuevoCreditoModal from '@/components/creditos/NuevoCreditoModal'
import { formatFechaPeru } from '@/utils/fecha'

//const ESTADOS = ['todos', 'pendiente', 'vencido', 'pagado']
const ESTADOS = ['pendiente', 'vencido', 'pagado']



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

// ─── Multi-select Puesto ───────────────────────────────────
function PuestoFilter({ opciones, seleccionados, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  // Cerrar al hacer click fuera
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const togglePuesto = (id) => {
    onChange(
      seleccionados.includes(id)
        ? seleccionados.filter(p => p !== id)
        : [...seleccionados, id]
    )
  }

  const label =
    seleccionados.length === 0           ? 'Puestos'       :
    seleccionados.length === 1           ? seleccionados[0]           :
    `${seleccionados.length} puestos`

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`px-3 py-2 rounded-lg text-xs font-medium capitalize transition bg-white border border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600 min-w-30 ${
          seleccionados.length > 0
            ? 'border-indigo-400 bg-indigo-50 text-indigo-700 font-medium'
            : 'border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600 bg-white'
        }`}
      >
        <span>🏪</span>
        <span>{label}</span>
        <span className="text-gray-400 text-xs">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="absolute z-20 mt-1 left-0 bg-white border border-gray-200 rounded-xl shadow-lg min-w-[200px] py-1 overflow-hidden">
          {/* Limpiar selección */}
          {/* {seleccionados.length > 0 && (
            <button
              onClick={() => { onChange([]); setOpen(false) }}
              className="w-full text-left px-4 py-2 text-xs text-indigo-600 hover:bg-indigo-50 border-b border-gray-100 font-medium"
            >
              ✕ Limpiar filtro
            </button>
          )} */}

          {opciones.length === 0 ? (
            <p className="px-4 py-3 text-xs text-gray-400">Sin puestos disponibles</p>
          ) : (
            opciones.map(id => (
              <label
                key={id}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer text-sm text-gray-700 transition"
              >
                <input
                  type="checkbox"
                  checked={seleccionados.includes(id)}
                  onChange={() => togglePuesto(id)}
                  className="accent-indigo-600 w-4 h-4 rounded"
                />
                <span className="truncate">{id}</span>
              </label>
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ─── Componente principal ───────────────────────────────────
export default function CreditosPage() {
 // const { creditos, loading, error, refetch } = useCreditos()
  const { creditos, loading, error, refetch, setCreditos } = useCreditos()

  const [modalOpen, setModalOpen] = useState(false)
  const [busqueda, setBusqueda]         = useState('')
  //const [estadoFiltro, setEstado]       = useState('pendiente')
  const [estadosFiltro, setEstados] = useState(['pendiente','vencido'])
  const [puestosFiltro, setPuestos]     = useState([])   // ✅ multi-select puestos
  const [sortKey, setSortKey]           = useState('creado_en')
  const [sortDir, setSortDir]           = useState('desc')
  const [pagina, setPagina]             = useState(1)
  const POR_PAGINA = 40


  const handleCreditoCreado = (nuevo) => {
    // Inserta al inicio sin esperar el refetch
    setCreditos(prev => [nuevo, ...prev])
  }

  // ── Puestos únicos disponibles ────────────────────────────
  const puestosDisponibles = useMemo(() => {
    const ids = creditos
      .map(c => c.puesto_id)
      .filter(Boolean)
    return [...new Set(ids)].sort()
  }, [creditos])

  // ── Stats calculadas ──────────────────────────────────────
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

  // ── Filtrado + orden + paginación ─────────────────────────
  const filtrados = useMemo(() => {
    let list = creditos.filter(c => {
      const texto = busqueda.toLowerCase()
      const matchBusqueda =
        !busqueda ||
        c.clientes?.nombre?.toLowerCase().includes(texto) ||
        c.cliente_nombre?.toLowerCase().includes(texto) ||
        c.puesto_id?.toLowerCase().includes(texto)
      //const matchEstado  = estadoFiltro === 'todos' || c.estado === estadoFiltro
      const matchEstado = estadosFiltro.length === 0 || estadosFiltro.includes(c.estado)
      // ✅ si no hay puestos seleccionados, pasa todos; si hay, solo los incluidos
      const matchPuesto  = puestosFiltro.length === 0 || puestosFiltro.includes(c.puesto_id)
      return matchBusqueda && matchEstado && matchPuesto
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
  }, [creditos, busqueda, estadosFiltro, puestosFiltro, sortKey, sortDir])

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA))
  const paginados    = filtrados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA)

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
    setPagina(1)
  }

  const toggleEstado = (est) => {
    setEstados(prev =>
      prev.includes(est)
        ? prev.filter(e => e !== est)   // deseleccionar
        : [...prev, est]                // seleccionar
    )
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


        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition shadow-sm"
        >
          <span>➕</span> Nuevo crédito
        </button>

        <NuevoCreditoModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onCreado={handleCreditoCreado}   // ✅ actualización instantánea
        />


      </div>

      {/* ── Stats (5 cards en grid responsivo) ─────────── */}
      <div className=" hidden md:grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard icon="💳" label="Total créditos" value={stats.total}
          color={{ border: 'border-indigo-100', bg: 'bg-indigo-50', text: 'text-indigo-700' }} />
        <StatCard icon="🕐" label="Pendientes" value={stats.pendientes}
          sub={`${stats.pagados} pagado${stats.pagados !== 1 ? 's' : ''}`}
          color={{ border: 'border-amber-100', bg: 'bg-amber-50', text: 'text-amber-700' }} />
        <StatCard icon="🔴" label="Vencidos +3d" value={stats.vencidos}
          sub={stats.vencidos > 0 ? 'Requieren atención' : 'Sin vencidos 🎉'}
          color={{ border: 'border-red-100', bg: 'bg-red-50', text: 'text-red-700' }} />
        <StatCard
          icon="⏳" label="Por cobrar"
          value={`S/ ${stats.saldoTotal.toLocaleString('es-PE')}`}
          sub={`Cobrado: S/ ${stats.totalCobrado.toLocaleString('es-PE')}`}
          color={{ border: 'border-orange-100', bg: 'bg-orange-50', text: 'text-orange-700' }} />
        <StatCard
          icon="💰" label="Total otorgado"
          value={`S/ ${stats.montoTotal.toLocaleString('es-PE')}`}
          color={{ border: 'border-emerald-100', bg: 'bg-emerald-50', text: 'text-emerald-700' }} />
      </div>

      {/* ── Filtros ────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        {/* Buscador */}
        <div className="relative flex-1 min-w-[200px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <input
            type="text"
            placeholder="Buscar por cliente..."
            value={busqueda}
            onChange={e => { setBusqueda(e.target.value); setPagina(1) }}
            className="w-full pl-9 pr-4 px-3 py-2 rounded-lg text-xs font-medium capitalize transition border border-gray-300  focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        {/* Filtro estado */}
      <div className="flex gap-1.5 flex-wrap items-center">
        {ESTADOS.map(est => (
          <button
            key={est}
            onClick={() => toggleEstado(est)}
            className={`px-3 py-2 rounded-lg text-xs font-medium capitalize transition ${
              estadosFiltro.includes(est)           // ✅ includes en vez de ===
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

        {/* ✅ Filtro multi-select puesto */}


        {/* Refetch */}
        {/* <button
          onClick={refetch}
          disabled={loading}
          className="px-3 py-2  rounded-lg text-xs font-medium capitalize transition bg-white border border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600"
          title="Actualizar"
        >
          🔄
        </button> */}
      </div>

      {/* ── Chips de puestos activos ───────────────────── */}
      {puestosFiltro.length > 0 && (
        <div className="flex gap-2 flex-wrap -mt-2 ">
          {puestosFiltro.map(id => (
            <span
              key={id}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium"
            >
              🏪 {id}
              <button
                onClick={() => {
                  setPuestos(p => p.filter(x => x !== id))
                  setPagina(1)
                }}
                className="hover:text-indigo-900 font-bold"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

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
                  { key: 'cliente_nombre',    label: 'Cliente'        },
                  { key: 'puesto_id',         label: 'Puesto'         },
                  { key: 'total',             label: 'Total'          },
                  { key: 'saldo_pendiente',   label: 'Saldo / Avance' },
                  { key: 'estado',            label: 'Estado'         },
                  { key: 'ultimo_pago_fecha', label: 'Último pago'    },
                  { key: 'creado_en',         label: 'Fecha'          },
                  { key: null,                label: 'Acciones'       },
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
                    <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                      <p className="text-3xl mb-2">🗂️</p>
                      <p className="text-sm">No se encontraron créditos</p>
                    </td>
                  </tr>
                )
                : paginados.map(credito => (
                  <tr key={credito.id} className="hover:bg-gray-50 transition group">

                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">
                        {credito.clientes?.nombre ?? credito.cliente_nombre ?? '—'}
                      </p>
                    </td>

                    <td className="px-4 py-3 text-gray-600">
                      {credito.puesto_id ?? '—'}
                    </td>

                    <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">
                      S/ {Number(credito.total ?? 0).toLocaleString('es-PE')}
                    </td>

                    <td className="px-4 py-3">
                      <p className={`font-semibold whitespace-nowrap ${
                        credito.saldo_pendiente > 0 ? 'text-red-500' : 'text-emerald-600'
                      }`}>
                        S/ {Number(credito.saldo_pendiente ?? 0).toLocaleString('es-PE')}
                      </p>
                      <div className="w-24 bg-gray-100 rounded-full h-1.5 mt-1" title={`${credito.progreso_pct ?? 0}% cobrado`}>
                        <div
                          className="bg-indigo-400 h-1.5 rounded-full transition-all"
                          style={{ width: `${credito.progreso_pct ?? 0}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{credito.progreso_pct ?? 0}% cobrado</p>
                    </td>

                    <td className="px-4 py-3">
                      <CreditoBadge estado={credito.estado} />
                      {credito.estado === 'vencido' && credito.dias_pendiente > 0 && (
                        <p className="text-xs text-red-400 mt-0.5">{credito.dias_pendiente}d sin pagar</p>
                      )}
                    </td>

                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {credito.ultimo_pago_fecha
                        ? formatFechaPeru(credito.ultimo_pago_fecha)
                        : <span className="text-gray-300">Sin pagos</span>
                      }
                    </td>

                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                        {formatFechaPeru(credito.creado_en)}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
                        <Link
                          href={`/creditos/${credito.id}`}
                          className="px-3 py-1.5 text-xs font-medium bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition"
                        >
                          Ver
                        </Link>
                        {credito.saldo_pendiente > 0 && (
                          <Link
                            href={`/pagos/nuevo?credito_id=${credito.id}`}
                            className="px-3 py-1.5 text-xs font-medium bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition"
                          >
                            Pagar
                          </Link>
                        )}
                      </div>
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

