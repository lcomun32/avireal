'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export default function DashboardLayout({ children }) {
  const supabase = createClient()
  const router   = useRouter()
  const [user, setUser] = useState(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    // Obtener sesión actual
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace('/')
      } else {
        setUser(user)
      }
      setChecking(false)
    })

    // Escuchar cambios de sesión (logout desde otra pestaña, expiración, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        router.replace('/')
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.replace('/')
  }

  // Pantalla de carga mientras verifica sesión
  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin w-8 h-8 text-indigo-600" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
          </svg>
          <p className="text-sm text-gray-500">Verificando sesión...</p>
        </div>
      </div>
    )
  }

  if (!user) return null  // ya está redirigiendo

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar
        user={{ nombre: user.user_metadata?.nombre ?? user.email, email: user.email }}
        onLogout={handleLogout}
      />
      <main className="flex-1 w-full">
        {children}
      </main>
      <Footer />
    </div>
  )
}