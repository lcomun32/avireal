const config = {
  activo:   { label: 'Activo',   classes: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  vencido:  { label: 'Vencido',  classes: 'bg-red-100 text-red-700 border-red-200'             },
  pagado:   { label: 'Pagado',   classes: 'bg-gray-100 text-gray-600 border-gray-200'          },
  pendiente:{ label: 'Pendiente',classes: 'bg-amber-100 text-amber-700 border-amber-200'       },
}

export default function CreditoBadge({ estado }) {
  const { label, classes } = config[estado] ?? config.pendiente
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${classes}`}>
      {label}
    </span>
  )
}