import Link from 'next/link'
import CreditoBadge from './CreditoBadge'

export default function CreditoCard({ credito }) {
  const progreso = Math.min(
    Math.round(((credito.total - (credito.saldo_pendiente ?? 0)) / credito.total) * 100),
    100
  )

  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-gray-900 text-sm leading-tight">
            {credito.clientes?.nombre ?? '—'}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">Puesto: {credito.puesto_id?? '—'}</p>
        </div>
        <CreditoBadge estado={credito.estado} />
      </div>

      {/* Montos */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="bg-gray-50 rounded-lg p-2.5">
          <p className="text-xs text-gray-400 mb-0.5">Monto total</p>
          <p className="font-bold text-gray-900">S/ {Number(credito.total).toLocaleString('es-PE')}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-2.5">
          <p className="text-xs text-gray-400 mb-0.5">Saldo pendiente</p>
          <p className="font-bold text-red-600">S/ {Number(credito.saldo_pendiente ?? 0).toLocaleString('es-PE')}</p>
        </div>
      </div>

      {/* Barra de progreso */}
      <div>
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>Progreso de pago</span>
          <span>{progreso}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div
            className="bg-indigo-500 h-2 rounded-full transition-all"
            style={{ width: `${progreso}%` }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1 border-t border-gray-50">
        {/* <div className="text-xs text-gray-400">
          📅 {credito.cuotas} cuotas · {credito.tasa_interes}% TEA
        </div> */}
        <Link
          href={`/creditos/${credito.id}`}
          className="text-xs font-medium text-indigo-600 hover:text-indigo-800 transition"
        >
          Ver detalle →
        </Link>
      </div>
    </div>
  )
}