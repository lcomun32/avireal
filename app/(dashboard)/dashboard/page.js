'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

const stats = [
  { label: 'Clientes activos',  value: '128',      icon: '👥', color: 'bg-blue-50 text-blue-600',      border: 'border-blue-100'    },
  { label: 'Créditos vigentes', value: '43',       icon: '💳', color: 'bg-indigo-50 text-indigo-600',  border: 'border-indigo-100'  },
  { label: 'Pagos del mes',     value: 'S/ 8,450', icon: '💰', color: 'bg-emerald-50 text-emerald-600',border: 'border-emerald-100' },
  { label: 'Créditos vencidos', value: '7',        icon: '⚠️', color: 'bg-red-50 text-red-600',        border: 'border-red-100'     },
]

export default function DashboardPage() {
  const supabase = createClient()
  const [nombre, setNombre] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setNombre(user?.user_metadata?.nombre ?? user?.email ?? 'Usuario')
    })
  }, [])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* Bienvenida */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Bienvenido, {nombre} 👋</h2>
        <p className="text-gray-500 text-sm mt-1">Resumen general del sistema</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(stat => (
          <div key={stat.label} className={`bg-white rounded-xl border ${stat.border} p-5 shadow-sm flex flex-col gap-3`}>
            <div className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center text-xl`}>
              {stat.icon}
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Accesos rápidos */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h3 className="text-base font-semibold text-gray-800 mb-4">Accesos rápidos</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: 'Nuevo cliente',  href: '/clientes', icon: '➕', desc: 'Registrar cliente' },
            { label: 'Nuevo crédito',  href: '/creditos', icon: '💳', desc: 'Asignar crédito'  },
            { label: 'Registrar pago', href: '/pagos',    icon: '💰', desc: 'Ingresar pago'    },
          ].map(item => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-4 p-4 rounded-lg border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50 transition-all group"
            >
              <span className="text-2xl">{item.icon}</span>
              <div>
                <p className="font-medium text-gray-800 group-hover:text-indigo-700 text-sm">{item.label}</p>
                <p className="text-xs text-gray-400">{item.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}