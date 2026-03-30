// components/clientes/NuevoClienteModal.jsx
'use client'
import { useState, useEffect, useRef } from 'react'

const PUESTOS = ['P1', 'P4', 'P5']

const camposVacios = () => ({
  nombre: '', dni: '', telefono: '', email: '', direccion: '', puesto_id: '',
})

export default function NuevoClienteModal({ open, onClose, onCreado }) {
  const [form,   setForm]   = useState(camposVacios())
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState(null)
  const primerInputRef      = useRef(null)

  useEffect(() => {
    if (!open) return
    setForm(camposVacios())
    setError(null)
    setSaving(false)
    setTimeout(() => primerInputRef.current?.focus(), 50)
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  const set = (field, val) => setForm(prev => ({ ...prev, [field]: val }))

  const puedeGuardar = form.nombre.trim() !== ''

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!puedeGuardar || saving) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/clientes', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          nombre:    form.nombre.trim(),
          puesto_id: form.puesto_id || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al guardar')
      onCreado(data)
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        role="dialog" aria-modal="true" aria-labelledby="modal-cliente-titulo"
        className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 id="modal-cliente-titulo" className="text-base font-semibold text-gray-900">
            Nuevo cliente
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

          {/* Nombre */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Nombre <span className="text-red-400">*</span>
            </label>
            <input
              ref={primerInputRef}
              type="text" placeholder="Ej: Rosa Flores"
              value={form.nombre}
              onChange={e => set('nombre', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* DNI + Teléfono en fila */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">DNI</label>
              <input
                type="text" placeholder="12345678" maxLength={8}
                value={form.dni}
                onChange={e => set('dni', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Teléfono</label>
              <input
                type="tel" placeholder="987654321"
                value={form.telefono}
                onChange={e => set('telefono', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Email</label>
            <input
              type="email" placeholder="correo@ejemplo.com"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Dirección */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Dirección</label>
            <input
              type="text" placeholder="Opcional"
              value={form.direccion}
              onChange={e => set('direccion', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Puesto */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Puesto</label>
            <div className="flex gap-2">
              {PUESTOS.map(p => (
                <button
                  key={p} type="button" onClick={() => set('puesto_id', form.puesto_id === p ? '' : p)}
                  className={`flex-1 py-2 rounded-xl text-sm font-bold border-2 transition ${
                    form.puesto_id === p
                      ? 'border-indigo-600 bg-indigo-600 text-white'
                      : 'border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              ⚠️ {error}
            </p>
          )}

          {/* Footer */}
          <div className="flex gap-3 pt-1">
            <button
              type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
            <button
              type="submit" disabled={!puedeGuardar || saving}
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  Guardando…
                </span>
              ) : 'Guardar cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}