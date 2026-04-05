'use client'
import { useState } from 'react'
import Link from 'next/link'
import CreditoBadge from './CreditoBadge'
import CreditoPagosDetalle from './CreditoPagosDetalle' // ← NUEVO

// ─── Normaliza prop viejo `credito` → formato `grupo` ─────
function normalizar({ grupo, credito }) {
  if (grupo) return grupo
  if (!credito) return null
  const total  = Number(credito.total ?? 0)
  const saldo  = Number(credito.saldo_pendiente ?? 0)
  const pagado = total - saldo
  return {
    key:              credito.id,
    cliente_id:       credito.cliente_id,
    cliente_nombre:   credito.cliente_nombre ?? credito.clientes?.nombre ?? '—',
    puesto_id:        credito.puesto_id,
    creditos:         [credito],
    creditos_count:   1,
    total,
    saldo_pendiente:  saldo,
    progreso_pct:     credito.progreso_pct ?? (total > 0 ? Math.round((pagado / total) * 100) : 0),
    estado:           credito.estado ?? 'pendiente',
    ultimo_pago_fecha: credito.ultimo_pago_fecha ?? null,
  }
}

export default function CreditoCard({ grupo: grupoProp, credito, onPagar }) {
  const [expanded, setExpanded] = useState(false)
  const [creditoDetalle, setCreditoDetalle] = useState(null)

  const grupo = normalizar({ grupo: grupoProp, credito })
  if (!grupo) return null

  const tieneMultiples = grupo.creditos_count > 1
  const progreso = Math.min(grupo.progreso_pct ?? 0, 100)

  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5 flex flex-col gap-3">

      {/* ── Header ──────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-gray-900 text-sm leading-tight">
            {grupo.cliente_nombre}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <p className="text-xs text-gray-400">Puesto: {grupo.puesto_id ?? '—'}</p>
            {tieneMultiples && (
              <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-600 rounded-full text-[10px] font-semibold">
                {grupo.creditos_count} créditos
              </span>
            )}
          </div>
        </div>
        <CreditoBadge estado={grupo.estado} />
      </div>

      {/* ── Montos ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="bg-gray-50 rounded-lg p-2.5">
          <p className="text-xs text-gray-400 mb-0.5">Monto total</p>
          <p className="font-bold text-gray-900">
            S/ {grupo.total.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-2.5">
          <p className="text-xs text-gray-400 mb-0.5">Saldo pendiente</p>
          <p className={`font-bold ${grupo.saldo_pendiente > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
            {grupo.saldo_pendiente > 0
              ? `S/ ${grupo.saldo_pendiente.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`
              : '✓ Pagado'}
          </p>
        </div>
      </div>

      {/* ── Progreso ────────────────────────────────────── */}
      <div>
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>Progreso de pago</span>
          <span>{progreso}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${progreso >= 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
            style={{ width: `${progreso}%` }}
          />
        </div>
      </div>

      {/* ── Footer ──────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-1 border-t border-gray-50 gap-2">
        {!tieneMultiples ? (
          // Crédito único → botón que despliega pagos inline
          <button
            onClick={() => setCreditoDetalle(
              creditoDetalle === grupo.creditos[0].id ? null : grupo.creditos[0].id
            )}
            className="text-xs font-medium text-indigo-600 active:text-indigo-800 transition"
          >
            {creditoDetalle ? 'Ocultar pagos ▲' : 'Ver pagos ▼'}
          </button>
        ) : (
          <button
            onClick={() => setExpanded(e => !e)}
            className="text-xs font-medium text-indigo-600 active:text-indigo-800 transition"
          >
            {expanded ? 'Ocultar créditos ▲' : `Ver ${grupo.creditos_count} créditos ▼`}
          </button>
        )}

        {grupo.saldo_pendiente > 0 && (
          <button
            onClick={() => onPagar?.(grupo)}
            className="text-xs font-semibold text-emerald-600 active:text-emerald-800 transition"
          >
            💳 Pagar
          </button>
        )}
      </div>


      {/* ── Pagos inline (crédito único) ─────────────────── */}
      {!tieneMultiples && creditoDetalle && (
        <div className="border border-gray-100 rounded-lg overflow-hidden -mx-1">
          <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
              📋 Líneas de pago
            </p>
          </div>
          <CreditoPagosDetalle creditoId={creditoDetalle} />
        </div>
      )}

      {/* ── Créditos expandidos ──────────────────────────── */}
      {/* ── Créditos expandidos ──────────────────────────── */}
      {tieneMultiples && expanded && (
        <div className="flex flex-col gap-2 pt-1 border-t border-gray-100">
          {[...grupo.creditos]
            .sort((a, b) => new Date(a.creado_en) - new Date(b.creado_en))
            .map((c, i) => {
              const saldo = Number(c.saldo_pendiente ?? 0)
              const isOpen = creditoDetalle === c.id
              return (
                <div key={c.id} className="flex items-center justify-between gap-2 py-2 px-3 bg-gray-50 rounded-lg">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-indigo-400">#{i + 1}</span>
                      <CreditoBadge estado={c.estado} />
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Total: <span className="font-semibold text-gray-700">
                        S/ {Number(c.total ?? 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                      </span>
                      {saldo > 0 && (
                        <> · Pendiente: <span className="font-semibold text-red-500">
                          S/ {saldo.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                        </span></>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {/* <Link
                      href={`/creditos/${c.id}`}
                      className="text-[10px] font-medium text-indigo-600 active:text-indigo-800"
                    >
                      Ver →
                    </Link> */}

                      <button
                        onClick={() => setCreditoDetalle(isOpen ? null : c.id)}
                        className="text-[10px] font-medium text-indigo-600 active:text-indigo-800"
                      >
                        {isOpen ? 'Ocultar ▲' : 'Ver pagos ▼'}
                      </button>



                    {/* ✅ CAMBIO: button en lugar de Link, llama onPagar con credito_id_unico */}
                    {saldo > 0 && (
                      <button
                        onClick={() => onPagar?.({
                          credito_id_unico: c.id,
                          puesto_id:        c.puesto_id,
                          cliente_id:       c.cliente_id,
                          cliente_nombre:   c.cliente_nombre ?? grupo.cliente_nombre,
                          saldo_pendiente:  saldo,
                          creditos_count:   1,
                          creditos:         [c],
                        })}
                        className="text-[10px] font-medium text-emerald-600 active:text-emerald-800"
                      >
                        💳 Pagar
                      </button>
                    )}
                  </div>
                  {isOpen && <CreditoPagosDetalle creditoId={c.id} />}
                </div>

  


              )
            })
          }
        </div>
      )}
    </div>
  )
}

// import Link from 'next/link'
// import CreditoBadge from './CreditoBadge'

// export default function CreditoCard({ credito }) {
//   const progreso = Math.min(
//     Math.round(((credito.total - (credito.saldo_pendiente ?? 0)) / credito.total) * 100),
//     100
//   )

//   return (
//     <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5 flex flex-col gap-3">
//       {/* Header */}
//       <div className="flex items-start justify-between gap-2">
//         <div>
//           <p className="font-semibold text-gray-900 text-sm leading-tight">
//             {credito.clientes?.nombre ?? '—'}
//           </p>
//           <p className="text-xs text-gray-400 mt-0.5">Puesto: {credito.puesto_id?? '—'}</p>
//         </div>
//         <CreditoBadge estado={credito.estado} />
//       </div>

//       {/* Montos */}
//       <div className="grid grid-cols-2 gap-3 text-sm">
//         <div className="bg-gray-50 rounded-lg p-2.5">
//           <p className="text-xs text-gray-400 mb-0.5">Monto total</p>
//           <p className="font-bold text-gray-900">S/ {Number(credito.total).toLocaleString('es-PE')}</p>
//         </div>
//         <div className="bg-gray-50 rounded-lg p-2.5">
//           <p className="text-xs text-gray-400 mb-0.5">Saldo pendiente</p>
//           <p className="font-bold text-red-600">S/ {Number(credito.saldo_pendiente ?? 0).toLocaleString('es-PE')}</p>
//         </div>
//       </div>

//       {/* Barra de progreso */}
//       <div>
//         <div className="flex justify-between text-xs text-gray-400 mb-1">
//           <span>Progreso de pago</span>
//           <span>{progreso}%</span>
//         </div>
//         <div className="w-full bg-gray-100 rounded-full h-2">
//           <div
//             className="bg-indigo-500 h-2 rounded-full transition-all"
//             style={{ width: `${progreso}%` }}
//           />
//         </div>
//       </div>

//       {/* Footer */}
//       <div className="flex items-center justify-between pt-1 border-t border-gray-50">
//         {/* <div className="text-xs text-gray-400">
//           📅 {credito.cuotas} cuotas · {credito.tasa_interes}% TEA
//         </div> */}
//         <Link
//           href={`/creditos/${credito.id}`}
//           className="text-xs font-medium text-indigo-600 hover:text-indigo-800 transition"
//         >
//           Ver detalle →
//         </Link>
//       </div>
//     </div>
//   )
// }

