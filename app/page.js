'use client'
import { useState } from 'react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

// Credenciales simuladas
const MOCK_USER = { email: 'admin@avireal.com', password: '123456', nombre: 'Admin Avireal' }

const stats = [
  { label: 'Clientes activos',  value: '128',   icon: '👥', color: 'bg-blue-50 text-blue-600',   border: 'border-blue-100' },
  { label: 'Créditos vigentes', value: '43',    icon: '💳', color: 'bg-indigo-50 text-indigo-600', border: 'border-indigo-100' },
  { label: 'Pagos del mes',     value: 'S/ 8,450', icon: '💰', color: 'bg-emerald-50 text-emerald-600', border: 'border-emerald-100' },
  { label: 'Créditos vencidos', value: '7',     icon: '⚠️', color: 'bg-red-50 text-red-600',     border: 'border-red-100' },
]

export default function Home() {
  const [auth, setAuth]       = useState(false)
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)

  const handleLogin = (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    setTimeout(() => {
      if (email === MOCK_USER.email && password === MOCK_USER.password) {
        setAuth(true)
      } else {
        setError('Correo o contraseña incorrectos.')
      }
      setLoading(false)
    }, 900)
  }

  const handleLogout = () => {
    setAuth(false)
    setEmail('')
    setPassword('')
  }

  /* ─── LOGIN ─── */
  if (!auth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo / cabecera */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600 mb-4 shadow-lg">
              <span className="text-3xl">✈️</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Avireal</h1>
            <p className="text-gray-500 mt-1 text-sm">Gestión de créditos y pagos</p>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">Iniciar sesión</h2>

            <form onSubmit={handleLogin} className="space-y-5">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Correo electrónico
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@avireal.com"
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
                  >
                    {showPass ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">
                  <span className="text-red-500 text-sm">⚠️</span>
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                    </svg>
                    Ingresando...
                  </>
                ) : 'Ingresar'}
              </button>
            </form>

            {/* Hint */}
            <p className="mt-5 text-center text-xs text-gray-400">
              Demo: <span className="font-mono">admin@avireal.com</span> / <span className="font-mono">123456</span>
            </p>
          </div>
        </div>
      </div>
    )
  }

  /* ─── DASHBOARD ─── */
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar user={MOCK_USER} onLogout={handleLogout} />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Bienvenida */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">
            Bienvenido, {MOCK_USER.nombre} 👋
          </h2>
          <p className="text-gray-500 text-sm mt-1">Resumen general del sistema</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className={`bg-white rounded-xl border ${stat.border} p-5 shadow-sm flex flex-col gap-3`}
            >
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
              { label: 'Nuevo cliente',  href: '/clientes/nuevo',  icon: '➕', desc: 'Registrar cliente' },
              { label: 'Nuevo crédito',  href: '/creditos/nuevo',  icon: '💳', desc: 'Asignar crédito' },
              { label: 'Registrar pago', href: '/pagos/nuevo',     icon: '💰', desc: 'Ingresar pago' },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="flex items-center gap-4 p-4 rounded-lg border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50 transition-all group"
              >
                <span className="text-2xl">{item.icon}</span>
                <div>
                  <p className="font-medium text-gray-800 group-hover:text-indigo-700 text-sm">{item.label}</p>
                  <p className="text-xs text-gray-400">{item.desc}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}