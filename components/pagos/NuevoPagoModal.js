'use client'
import { useState, useEffect, useRef } from 'react'

const PUESTOS      = ['P1', 'P4', 'P5']
const METODOS      = ['efectivo', 'yape', 'transferencia', 'otro']
const METODO_ICON  = { efectivo: '💵', yape: '📲', transferencia: '🏦', otro: '💳' }
const BORRADOR_KEY = 'pagos_borrador'

const guardarBorrador = (puestoId, lineas) => {
  const tieneContenido = lineas.some(l => l.cliente_nombre.trim() !== '' || Number(l.monto) > 0)
  if (!tieneContenido) return limpiarBorrador()
  localStorage.setItem(BORRADOR_KEY, JSON.stringify({ puestoId, lineas, guardadoEn: Date.now() }))
}
const limpiarBorrador = () => localStorage.removeItem(BORRADOR_KEY)
const leerBorrador    = () => {
  try { const r = localStorage.getItem(BORRADOR_KEY); return r ? JSON.parse(r) : null }
  catch { return null }
}

const nuevaLinea = () => ({
  _id:            'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 5),
  cliente_nombre: '',
  monto:          '',
  metodo:         'efectivo',
  observacion:    '',
})

export default function NuevoPagoModal({ open, onClose, onCreado }) {
  const [puestoId,   setPuestoId]  = useState('')
  const [lineas,     setLineas]    = useState([nuevaLinea()])
  const [saving,     setSaving]    = useState(false)
  const [resultados, setResultados]= useState([])   // { nombre, ok, resumen, error }
  const [error,      setError]     = useState(null)
  const [grabando,   setGrabando]  = useState(false)
  const [parseando,  setParseando] = useState(false)
  const [transcript, setTranscript]= useState('')

  const primerInputRef  = useRef(null)
  const recognitionRef  = useRef(null)
  const skipSaveRef     = useRef(false)
  const silenceTimerRef = useRef(null)
  const grabandoRef     = useRef(false)
  const acumuladoRef    = useRef('')

  // ── Restaurar borrador ─────────────────────────────────────
  useEffect(() => {
    if (!open) return
    const borrador = leerBorrador()
    skipSaveRef.current = true

    if (borrador) {
      setPuestoId(borrador.puestoId ?? '')
      setLineas(borrador.lineas?.length ? borrador.lineas : [nuevaLinea()])
    } else {
      setPuestoId('')
      setLineas([nuevaLinea()])
    }

    setResultados([])
    setError(null)
    setSaving(false)
    setTranscript('')
    setTimeout(() => primerInputRef.current?.focus(), 50)
  }, [open])

  // ── Auto-save ──────────────────────────────────────────────
  useEffect(() => {
    if (!open) return
    if (skipSaveRef.current) { skipSaveRef.current = false; return }
    guardarBorrador(puestoId, lineas)
  }, [lineas, puestoId, open])

  // ── Escape ─────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return
    const h = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [open, onClose])

  // ── Helpers líneas ─────────────────────────────────────────
  const setLinea     = (id, changes) =>
    setLineas(prev => prev.map(l => l._id === id ? { ...l, ...changes } : l))
  const agregarLinea = () => setLineas(prev => [...prev, nuevaLinea()])
  const quitarLinea  = (id) =>
    setLineas(prev => prev.length > 1 ? prev.filter(l => l._id !== id) : prev)

  const lineasValidas = lineas.filter(
    l => l.cliente_nombre.trim() !== '' && Number(l.monto) > 0
  )
  const puedeGuardar = puestoId !== '' && lineasValidas.length > 0

  // ── Submit ─────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!puedeGuardar || saving) return
    setSaving(true)
    setError(null)
    setResultados([])

    const resultados = []

    for (const linea of lineasValidas) {
      try {
        const res = await fetch('/api/pagos', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            puesto_id:      puestoId,
            cliente_nombre: linea.cliente_nombre.trim(),
            monto:          Number(linea.monto),
            metodo:         linea.metodo,
            observacion:    linea.observacion.trim() || null,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Error al registrar')

        resultados.push({ nombre: linea.cliente_nombre, ok: true, resumen: data.resumen })
        onCreado?.(data.pago)
      } catch (err) {
        resultados.push({ nombre: linea.cliente_nombre, ok: false, error: err.message })
      }
    }

    setSaving(false)
    setResultados(resultados)

    const todoOk = resultados.every(r => r.ok)
    if (todoOk) {
      limpiarBorrador()
      setTimeout(() => onClose(), 1200)   // cierre suave tras ver el resumen
    }
  }

  // ── Grabación ──────────────────────────────────────────────
  const iniciarGrabacion = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return setError('Tu navegador no soporta reconocimiento de voz (usa Chrome)')

    const rec = new SR()
    rec.lang = 'es-PE'; rec.continuous = true; rec.interimResults = true
    recognitionRef.current = rec
    grabandoRef.current    = true
    acumuladoRef.current   = ''

    const resetTimer = () => {
      clearTimeout(silenceTimerRef.current)
      silenceTimerRef.current = setTimeout(() => { grabandoRef.current = false; rec.stop() }, 3000)
    }

    rec.onstart  = () => { setGrabando(true); setTranscript(''); resetTimer() }
    rec.onresult = (e) => {
      resetTimer()
      let final = '', interim = ''
      for (let i = 0; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript + ' '
        else interim = e.results[i][0].transcript
      }
      acumuladoRef.current = final.trim()
      setTranscript((final + interim).trim())
    }
    rec.onerror  = (e) => {
      if (e.error === 'no-speech') return
      grabandoRef.current = false
      clearTimeout(silenceTimerRef.current)
      setGrabando(false)
      setError('Micrófono: ' + e.error)
    }
    rec.onend = () => {
      if (grabandoRef.current) { try { rec.start() } catch {} return }
      clearTimeout(silenceTimerRef.current)
      setGrabando(false)
      if (acumuladoRef.current) parsearConIA(acumuladoRef.current)
    }
    rec.start()
  }

  const detenerGrabacion = () => {
    grabandoRef.current = false
    clearTimeout(silenceTimerRef.current)
    recognitionRef.current?.stop()
  }

  // ── Parsear con IA ─────────────────────────────────────────
  const parsearConIA = async (texto) => {
    setParseando(true)
    setError(null)
    try {
      const res  = await fetch('/api/ia/parse-pagos', {
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
          monto:          l.monto?.toString() ?? '',
          metodo:         l.metodo ?? 'efectivo',
          observacion:    l.observacion ?? '',
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
        role="dialog" aria-modal="true" aria-labelledby="modal-pago-titulo"
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col"
      >
        {/* ── Header ────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 id="modal-pago-titulo" className="text-base font-semibold text-gray-900">
              Registrar pago
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {parseando
                ? '🤖 Analizando audio…'
                : lineasValidas.length > 0
                  ? `${lineasValidas.length} pago${lineasValidas.length !== 1 ? 's' : ''} listos para guardar`
                  : 'Completa al menos una línea'}
            </p>
            {transcript && (
              <p className={`text-xs mt-0.5 italic truncate max-w-xs transition-colors
                ${grabando ? 'text-red-400' : 'text-indigo-400'}`} title={transcript}>
                {grabando ? '🎙 ' : '✓ '}{transcript}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={grabando ? detenerGrabacion : iniciarGrabacion}
              disabled={parseando}
              title={grabando ? 'Detener grabación' : 'Dictar pagos con voz'}
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
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none transition">×</button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="px-6 py-5 space-y-5 overflow-y-auto flex-1">

            {/* Puesto */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">
                Puesto <span className="text-red-400">*</span>
                <span className="text-gray-400 font-normal ml-1">— aplica a todos los pagos</span>
              </label>
              <div className="flex gap-2">
                {PUESTOS.map(p => (
                  <button key={p} type="button" onClick={() => setPuestoId(p)}
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

            {/* Líneas */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-gray-600">
                  Pagos <span className="text-red-400">*</span>
                </label>
                <span className="text-xs text-gray-400">{lineas.length} línea{lineas.length !== 1 ? 's' : ''}</span>
              </div>

              {/* Cabecera columnas */}
              <div className="grid grid-cols-[1fr_90px_100px_32px] gap-2 mb-1.5 px-1">
                <span className="text-xs text-gray-400">Cliente</span>
                <span className="text-xs text-gray-400">Monto</span>
                <span className="text-xs text-gray-400">Método</span>
                <span />
              </div>

              <div className="space-y-2">
                {lineas.map((linea, idx) => (
                  <div key={linea._id} className="grid grid-cols-[1fr_90px_100px_32px] gap-2 items-center">

                    {/* Cliente */}
                    <input
                      ref={idx === 0 ? primerInputRef : null}
                      type="text" placeholder="Nombre cliente"
                      value={linea.cliente_nombre}
                      onChange={e => setLinea(linea._id, { cliente_nombre: e.target.value })}
                      className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />

                    {/* Monto */}
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">S/</span>
                      <input
                        type="number" min="0.01" step="0.01" placeholder="0.00"
                        value={linea.monto}
                        onChange={e => setLinea(linea._id, { monto: e.target.value })}
                        className="w-full pl-7 pr-2 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>

                    {/* Método */}
                    <select
                      value={linea.metodo}
                      onChange={e => setLinea(linea._id, { metodo: e.target.value })}
                      className="px-2 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    >
                      {METODOS.map(m => (
                        <option key={m} value={m}>{METODO_ICON[m]} {m}</option>
                      ))}
                    </select>

                    {/* Quitar */}
                    <button
                      type="button" onClick={() => quitarLinea(linea._id)}
                      disabled={lineas.length === 1}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition disabled:opacity-0 disabled:pointer-events-none"
                    >×</button>
                  </div>
                ))}
              </div>

              <button
                type="button" onClick={agregarLinea}
                className="mt-3 w-full py-2 rounded-lg border border-dashed border-gray-300 text-xs text-gray-500 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
              >
                + Agregar línea
              </button>
            </div>

            {/* Resumen de resultados */}
            {resultados.length > 0 && (
              <div className="space-y-1.5">
                {resultados.map((r, i) => (
                  <div key={i} className={`flex items-start gap-2 px-3 py-2 rounded-lg text-xs border ${
                    r.ok
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-red-50 border-red-200 text-red-700'
                  }`}>
                    <span>{r.ok ? '✅' : '❌'}</span>
                    <div>
                      <span className="font-medium">{r.nombre}</span>
                      {r.ok && r.resumen && (
                        <span className="ml-1 text-emerald-600">
                          · S/ {r.resumen.monto_pagado} pagado
                          {r.resumen.deuda_restante > 0
                            ? ` · queda S/ ${r.resumen.deuda_restante}`
                            : ' · deuda saldada 🎉'}
                          {r.resumen.excedente > 0 && ` · excedente S/ ${r.resumen.excedente}`}
                        </span>
                      )}
                      {!r.ok && <span className="ml-1">{r.error}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {error && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                ⚠️ {error}
              </p>
            )}
          </div>

          {/* ── Footer ──────────────────────────────────── */}
          <div className="px-6 py-4 border-t border-gray-100 shrink-0">
            {lineasValidas.length > 0 && !resultados.length && (
              <div className="flex items-center justify-between text-xs text-gray-500 mb-3 bg-gray-50 rounded-lg px-3 py-2">
                <span>{lineasValidas.length} pago{lineasValidas.length !== 1 ? 's' : ''} · {puestoId || '—'}</span>
                <span className="font-semibold text-gray-800">
                  Total S/{' '}
                  {lineasValidas
                    .reduce((s, l) => s + Number(l.monto), 0)
                    .toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}

            <div className="flex gap-3">
              <button type="button" onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition">
                {resultados.length ? 'Cerrar' : 'Cancelar'}
              </button>
                {(resultados.length === 0 || resultados.some(r => !r.ok)) && (
                <button
                    type="submit"
                    disabled={!puedeGuardar || saving}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {saving ? (
                    <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                        </svg>
                        Registrando…
                    </span>
                    ) : `Guardar ${lineasValidas.length > 1 ? `${lineasValidas.length} pagos` : 'pago'}`}
                </button>
                )}
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}