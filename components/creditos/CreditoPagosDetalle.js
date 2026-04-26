'use client'
import { useEffect, useState } from 'react'
import { formatFechaPeru } from '@/utils/fecha'

const METODO_LABEL = {
  efectivo:      '💵 Efectivo',
  yape:          '📱 Yape',
  plin:          '📱 Plin',
  transferencia: '🏦 Transferencia',
}

const SkeletonRow = () => (
  <div className="flex items-center justify-between px-4 py-2.5 gap-4 animate-pulse">
    <div className="flex items-center gap-3 w-full">
      <div className="w-5 h-5 rounded-full bg-gray-200" />
      <div className="flex-1">
        <div className="h-3 w-24 bg-gray-200 rounded mb-1" />
        <div className="h-2 w-32 bg-gray-100 rounded" />
      </div>
    </div>
    <div className="h-3 w-16 bg-gray-200 rounded" />
  </div>
)

export default function CreditoPagosDetalle({ creditoId }) {
  //const [estado, setEstado] = useState('idle') // idle | loading | loaded | error
  const [estado, setEstado] = useState('loading')
  const [pagos, setPagos]   = useState([])
  const [errorMsg, setErrorMsg] = useState(null)

    useEffect(() => {
    fetch(`/api/pagos?credito_id=${creditoId}`)
        .then(r => r.json())
        .then(data => {
        if (data.error) throw new Error(data.error)
        setPagos(data)
        setEstado('loaded')
        })
        .catch(err => {
        setErrorMsg(err.message)
        setEstado('error')
        })
    }, [creditoId])

    if (estado === 'loading') return (
    <div className="flex flex-col divide-y divide-gray-100">
        {Array.from({ length: 1 }).map((_, i) => (
        <SkeletonRow key={i} />
        ))}
    </div>
    )

  if (estado === 'error') return (
    <p className="py-3 px-4 text-xs text-red-500">⚠️ {errorMsg}</p>
  )

  if (!pagos.length) return (
    <p className="py-3 px-4 text-xs text-gray-400 italic">Sin pagos registrados</p>
  )

  return (
    <div className="flex flex-col divide-y divide-gray-100">
      {pagos.map((pago, i) => (
       <div key={pago.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 py-2 gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3 w-full min-w-0">
            {/* Número e ícono */}
            <span className="shrink-0 w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 text-[10px] font-bold flex items-center justify-center">
              {i + 1}
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-700">
                S/ {Number(pago.monto_aplicado ?? pago.monto).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                {/* Si el pago cubrió más créditos, mostramos el monto del pago total */}
                {pago.monto_aplicado && Number(pago.monto_aplicado) !== Number(pago.monto) && (
                  <span className="ml-1 text-gray-400 font-normal">
                    (pago total: S/ {Number(pago.monto).toLocaleString('es-PE', { minimumFractionDigits: 2 })})
                  </span>
                )}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5 truncate">
                {METODO_LABEL[pago.metodo] ?? pago.metodo}
                {pago.observacion && <> · {pago.observacion}</>}
              </p>
            </div>
          </div>
          <span className="text-[12px] text-gray-400 whitespace-nowrap flex-shrink-0">
            {formatFechaPeru(pago.creado_en,'fecha-hora')}
          </span>
        </div>
      ))}
    </div>
  )
}