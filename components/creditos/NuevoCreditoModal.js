'use client'
import { useState, useEffect, useRef } from 'react'

const PUESTOS      = ['P1', 'P4', 'P5']
const BORRADOR_KEY = 'creditos_borrador'

const guardarBorrador = (puestoId, lineas) => {
  const tieneContenido = lineas.some(
    l => l.cliente_nombre.trim() !== '' || Number(l.total) > 0
  )
  if (!tieneContenido) return limpiarBorrador()
  localStorage.setItem(BORRADOR_KEY, JSON.stringify({
    puestoId, lineas, guardadoEn: Date.now(),
  }))
}

const limpiarBorrador = () => localStorage.removeItem(BORRADOR_KEY)

const leerBorrador = () => {
  try {
    const raw = localStorage.getItem(BORRADOR_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

const nuevaLinea = () => ({
  _id:            'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 5),
  cliente_nombre: '',
  total:          '',
  nota:           '',
})

export default function NuevoCreditoModal({ open, onClose, onCreado }) {
  const [puestoId,  setPuestoId]  = useState('')
  const [lineas,    setLineas]    = useState([nuevaLinea()])
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState(null)
  const [borrador,  setBorrador]  = useState(null)
  const [grabando,  setGrabando]  = useState(false)
  const [parseando, setParseando] = useState(false)
  const [transcript,setTranscript]= useState('')

  const primerInputRef = useRef(null)
  const recognitionRef = useRef(null)
  const skipSaveRef    = useRef(false)   // ← bloquea auto-save durante restauración

  const silenceTimerRef = useRef(null)

  // ── 1. Restaurar borrador al abrir (PRIMERO) ───────────────
  useEffect(() => {
    if (!open) return

    const borrador = leerBorrador()
    skipSaveRef.current = true           // bloquea el auto-save del siguiente render

    if (borrador) {
      setPuestoId(borrador.puestoId ?? '')
      setLineas(borrador.lineas?.length ? borrador.lineas : [nuevaLinea()])
      setBorrador(borrador)
    } else {
      setPuestoId('')
      setLineas([nuevaLinea()])
      setBorrador(null)
    }

    setError(null)
    setSaving(false)
    setTranscript('')
    setTimeout(() => primerInputRef.current?.focus(), 50)
  }, [open])

  // ── 2. Auto-save (DESPUÉS, y respeta el skip) ──────────────
  useEffect(() => {
    if (!open) return

    if (skipSaveRef.current) {
      skipSaveRef.current = false        // desbloquea para los siguientes cambios
      return
    }

    guardarBorrador(puestoId, lineas)
  }, [lineas, puestoId, open])

  // ── Cerrar con Escape ──────────────────────────────────────
  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  // ── Helpers de líneas ──────────────────────────────────────
  const setLinea    = (id, field, val) =>
    setLineas(prev => prev.map(l => l._id === id ? { ...l, [field]: val } : l))

  const agregarLinea = () =>
    setLineas(prev => [...prev, nuevaLinea()])

  const quitarLinea  = (id) =>
    setLineas(prev => prev.length > 1 ? prev.filter(l => l._id !== id) : prev)

  // ── Validación ─────────────────────────────────────────────
  const lineasValidas = lineas.filter(
    l => l.cliente_nombre.trim() !== '' && Number(l.total) > 0
  )
  const puedeGuardar = puestoId !== '' && lineasValidas.length > 0

  // ── Submit ─────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!puedeGuardar || saving) return
    setSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/creditos', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          puesto_id:     puestoId,
          puesto_nombre: puestoId,
          lineas: lineasValidas.map(l => ({
            cliente_nombre: l.cliente_nombre.trim(),
            total:          Number(l.total),
            nota:           l.nota.trim() || null,
          })),
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al guardar')

      data.forEach(c => onCreado(c))
      limpiarBorrador()
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  // ── Grabación de voz ───────────────────────────────────────
  const iniciarGrabacion = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return setError('Tu navegador no soporta reconocimiento de voz (usa Chrome)')

    const rec = new SR()
    rec.lang           = 'es-PE'
    rec.continuous     = true   // no para en silencio
    rec.interimResults = true   // texto en vivo
    recognitionRef.current = rec

    let acumulado = ''

    const resetSilenceTimer = () => {
      clearTimeout(silenceTimerRef.current)
      silenceTimerRef.current = setTimeout(() => {
        rec.stop()   // → dispara onend normalmente
      }, 3000)       // 3 segundos de silencio
    }

    rec.onstart = () => {
      setGrabando(true)
      setTranscript('')
      acumulado = ''
      resetSilenceTimer() 
    }

    rec.onresult = (e) => {
      resetSilenceTimer()
      let interino = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const texto = e.results[i][0].transcript
        if (e.results[i].isFinal) {
          acumulado += texto + ' '
        } else {
          interino = texto
        }
      }
      setTranscript((acumulado + interino).trim())
    }

    rec.onerror = (e) => {
      clearTimeout(silenceTimerRef.current)
      setGrabando(false)
      setError('Micrófono: ' + e.error)
    }

    rec.onend = () => {
      clearTimeout(silenceTimerRef.current)  // ← limpia el timer al terminar
      setGrabando(false)
      const texto = acumulado.trim()
      if (texto) parsearConIA(texto)         // ← si no hay texto, no llama a Gemini
    }

    rec.start()
  }

  const detenerGrabacion = () => {
    clearTimeout(silenceTimerRef.current)   // ← limpia al detener manualmente
    recognitionRef.current?.stop()
  }
  
  const parsearConIA = async (texto) => {
    setParseando(true)
    setError(null)
    try {
      const res  = await fetch('/api/ia/parse-creditos', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcripcion: texto }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error IA')

      if (data.puesto_id) setPuestoId(data.puesto_id)

      if (data.lineas?.length) {
        setLineas(data.lineas.map(l => ({
          ...nuevaLinea(),
          cliente_nombre: l.cliente_nombre ?? '',
          total:          l.total?.toString() ?? '',
          nota:           l.nota ?? '',
        })))
      }
    } catch (err) {
      setError('IA: ' + err.message)
    } finally {
      setParseando(false)
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-titulo"
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col"
      >

        {/* ── Header ───────────────────────────────────── */}
<div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
  <div>
    <h2 id="modal-titulo" className="text-base font-semibold text-gray-900">
      Nuevo crédito
    </h2>
    <p className="text-xs text-gray-400 mt-0.5">
      {parseando
        ? '🤖 Analizando audio…'
        : lineasValidas.length > 0
          ? `${lineasValidas.length} crédito${lineasValidas.length !== 1 ? 's' : ''} listos para guardar`
          : 'Completa al menos una línea'}
    </p>
    {/* Muestra la transcripción para que el usuario pueda corroborar */}
{transcript && (
  <p className={`text-xs mt-0.5 italic truncate max-w-xs transition-colors
    ${grabando ? 'text-red-400' : 'text-indigo-400'}`}
    title={transcript}
  >
    {grabando ? '🎙 ' : '✓ '} {transcript}
  </p>
)}
  </div>

  <div className="flex items-center gap-2">
    {/* Botón micrófono */}
    <button
      type="button"
      onClick={grabando ? detenerGrabacion : iniciarGrabacion}
      disabled={parseando}
      title={grabando ? 'Detener grabación' : 'Dictar créditos con voz'}
      className={`w-9 h-9 flex items-center justify-center rounded-xl transition
        ${grabando
          ? 'bg-red-500 text-white animate-pulse'
          : 'bg-gray-100 text-gray-500 hover:bg-indigo-100 hover:text-indigo-600'}
        disabled:opacity-40 disabled:cursor-not-allowed`}
    >
      {parseando ? (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
        </svg>
      ) : (
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm-2 4a5 5 0 0010 0h1a6 6 0 01-5.5 5.97V16h2a1 1 0 010 2H7a1 1 0 010-2h2v-2.03A6 6 0 013 8h1z"/>
        </svg>
      )}
    </button>

    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none transition" aria-label="Cerrar">
      ×
    </button>
  </div>
</div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">

          {/* ── Body (scrollable) ────────────────────────── */}
          <div className="px-6 py-5 space-y-5 overflow-y-auto flex-1">

            {/* Puesto compartido */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">
                Puesto <span className="text-red-400">*</span>
                <span className="text-gray-400 font-normal ml-1">— aplica a todos los créditos</span>
              </label>
              <div className="flex gap-2">
                {PUESTOS.map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPuestoId(p)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition ${
                      puestoId === p
                        ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm'
                        : 'border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Líneas de crédito */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-gray-600">
                  Créditos <span className="text-red-400">*</span>
                </label>
                <span className="text-xs text-gray-400">{lineas.length} línea{lineas.length !== 1 ? 's' : ''}</span>
              </div>

              {/* Cabecera de columnas */}
              <div className="grid grid-cols-[1fr_100px_1fr_32px] gap-2 mb-1.5 px-1">
                <span className="text-xs text-gray-400">Cliente</span>
                <span className="text-xs text-gray-400">Monto</span>
                {/* <span className="text-xs text-gray-400">Nota (opcional)</span> */}
                <span />
              </div>

              {/* Filas */}
              <div className="space-y-2">
                {lineas.map((linea, idx) => (
                  <div key={linea._id} className="grid grid-cols-[1fr_100px_1fr_32px] gap-2 items-center">

                    {/* Cliente */}
                    <input
                      ref={idx === 0 ? primerInputRef : null}
                      type="text"
                      placeholder="Nombre cliente"
                      value={linea.cliente_nombre}
                      onChange={e => setLinea(linea._id, 'cliente_nombre', e.target.value)}
                      className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />

                    {/* Monto */}
                    <div className="relative">
                      <span className=" absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">S/</span>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        placeholder="0.00"
                        value={linea.total}
                        onChange={e => setLinea(linea._id, 'total', e.target.value)}
                        className="w-full pl-7 pr-2 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>

                    {/* Nota */}
                    {/* <input
                      type="text"
                      placeholder="Ej: 2 pollos"
                      value={linea.nota}
                      onChange={e => setLinea(linea._id, 'nota', e.target.value)}
                      className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    /> */}

                    {/* Quitar */}
                    <button
                      type="button"
                      onClick={() => quitarLinea(linea._id)}
                      disabled={lineas.length === 1}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition disabled:opacity-0 disabled:pointer-events-none"
                      title="Eliminar línea"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              {/* Agregar línea */}
              <button
                type="button"
                onClick={agregarLinea}
                className="mt-3 w-full py-2 rounded-lg border border-dashed border-gray-300 text-xs text-gray-500 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
              >
                + Agregar línea
              </button>
            </div>

            {/* Error */}
            {error && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                ⚠️ {error}
              </p>
            )}
          </div>

          {/* ── Footer fijo ──────────────────────────────── */}
          <div className="px-6 py-4 border-t border-gray-100 shrink-0">

            {/* Resumen total */}
            {lineasValidas.length > 0 && (
              <div className="flex items-center justify-between text-xs text-gray-500 mb-3 bg-gray-50 rounded-lg px-3 py-2">
                <span>{lineasValidas.length} crédito{lineasValidas.length !== 1 ? 's' : ''} · {puestoId || '—'}</span>
                <span className="font-semibold text-gray-800">
                  Total S/{' '}
                  {lineasValidas
                    .reduce((s, l) => s + Number(l.total), 0)
                    .toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!puedeGuardar || saving}
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
                ) : (
                  `Guardar ${lineasValidas.length > 1 ? `${lineasValidas.length} créditos` : 'crédito'}`
                )}
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  )
}