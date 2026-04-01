// 'use client'
// import { useState, useEffect, useRef } from 'react'
// import { useClientes } from '@/hooks/useClientes'   // ← NUEVO

// const PUESTOS      = ['P1', 'P4', 'P5']
// const BORRADOR_KEY = 'creditos_borrador'
// const guardarBorrador = (puestoId, lineas) => {
//   const tieneContenido = lineas.some(
//     l => l.cliente_nombre.trim() !== '' || Number(l.total) > 0
//   )
//   if (!tieneContenido) return limpiarBorrador()
//   localStorage.setItem(BORRADOR_KEY, JSON.stringify({
//     puestoId, lineas, guardadoEn: Date.now(),
//   }))
// }
// const limpiarBorrador = () => localStorage.removeItem(BORRADOR_KEY)
// const leerBorrador    = () => {
//   try {
//     const raw = localStorage.getItem(BORRADOR_KEY)
//     return raw ? JSON.parse(raw) : null
//   } catch { return null }
// }

// const nuevaLinea = () => ({
//   _id:            'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 5),
//   cliente_id:     null,   // ← NUEVO
//   cliente_nombre: '',
//   total:          '',
//   nota:           '',
// })

// export default function NuevoCreditoModal({ open, onClose, onCreado }) {
//   const [puestoId,   setPuestoId]  = useState('')
//   const [lineas,     setLineas]    = useState([nuevaLinea()])
//   const [saving,     setSaving]    = useState(false)
//   const [error,      setError]     = useState(null)
//   const [borrador,   setBorrador]  = useState(null)
//   const [grabando,   setGrabando]  = useState(false)
//   const [parseando,  setParseando] = useState(false)
//   const [transcript, setTranscript]= useState('')

//   // ── NUEVO: clientes del puesto seleccionado ────────────────
//   const { clientes, loading: loadingClientes } = useClientes({ puestoId: puestoId || null })

//   const primerInputRef      = useRef(null)
//   const recognitionRef      = useRef(null)
//   const skipSaveRef         = useRef(false)
//   const skipClientResetRef  = useRef(false)   // ← NUEVO: evita limpiar en restore/IA
//   const silenceTimerRef     = useRef(null)
//   const grabandoRef         = useRef(false)
//   const acumuladoRef        = useRef('')

//   // ── 1. Restaurar borrador al abrir ─────────────────────────
//   useEffect(() => {
//     if (!open) return
//     const borrador = leerBorrador()
//     skipSaveRef.current        = true
//     skipClientResetRef.current = true   // ← NUEVO: no limpiar al setear puestoId

//     if (borrador) {
//       setPuestoId(borrador.puestoId ?? '')
//       setLineas(borrador.lineas?.length ? borrador.lineas : [nuevaLinea()])
//       setBorrador(borrador)
//     } else {
//       setPuestoId('')
//       setLineas([nuevaLinea()])
//       setBorrador(null)
//     }

//     setError(null)
//     setSaving(false)
//     setTranscript('')
//     setTimeout(() => primerInputRef.current?.focus(), 50)
//   }, [open])

//   // ── 2. Auto-save ───────────────────────────────────────────
//   useEffect(() => {
//     if (!open) return
//     if (skipSaveRef.current) { skipSaveRef.current = false; return }
//     guardarBorrador(puestoId, lineas)
//   }, [lineas, puestoId, open])

//   // ── 3. Limpiar clientes al cambiar puesto ─────────────────  ← NUEVO
//   useEffect(() => {
//     if (skipClientResetRef.current) { skipClientResetRef.current = false; return }
//     setLineas(prev => prev.map(l => ({ ...l, cliente_id: null, cliente_nombre: '' })))
//   }, [puestoId])

//   // ── Cerrar con Escape ──────────────────────────────────────
//   useEffect(() => {
//     if (!open) return
//     const handler = (e) => { if (e.key === 'Escape') onClose() }
//     document.addEventListener('keydown', handler)
//     return () => document.removeEventListener('keydown', handler)
//   }, [open, onClose])

//   // ── Helpers de líneas ──────────────────────────────────────
//   // ← MODIFICADO: acepta objeto `changes` en vez de field/val
//   const setLinea     = (id, changes) =>
//     setLineas(prev => prev.map(l => l._id === id ? { ...l, ...changes } : l))
//   const agregarLinea = () =>
//     setLineas(prev => [...prev, nuevaLinea()])
//   const quitarLinea  = (id) =>
//     setLineas(prev => prev.length > 1 ? prev.filter(l => l._id !== id) : prev)

//   // ── Validación ─────────────────────────────────────────────
//   const lineasValidas = lineas.filter(
//     l => l.cliente_nombre.trim() !== '' && Number(l.total) > 0
//   )
//   const puedeGuardar = puestoId !== '' && lineasValidas.length > 0

//   // ── Submit ─────────────────────────────────────────────────
//   const handleSubmit = async (e) => {
//     e.preventDefault()
//     if (!puedeGuardar || saving) return
//     setSaving(true)
//     setError(null)

//     try {
//       const res = await fetch('/api/creditos', {
//         method:  'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({
//           puesto_id:     puestoId,
//           puesto_nombre: puestoId,
//           lineas: lineasValidas.map(l => ({
//             cliente_id:     l.cliente_id ?? null,   // ← NUEVO
//             cliente_nombre: l.cliente_nombre.trim(),
//             total:          Number(l.total),
//             nota:           l.nota.trim() || null,
//           })),
//         }),
//       })

//       const data = await res.json()
//       if (!res.ok) throw new Error(data.error ?? 'Error al guardar')

//       data.forEach(c => onCreado(c))
//       limpiarBorrador()
//       onClose()
//     } catch (err) {
//       setError(err.message)
//     } finally {
//       setSaving(false)
//     }
//   }

//   // ── Grabación de voz ───────────────────────────────────────
//   const iniciarGrabacion = () => {
//     const SR = window.SpeechRecognition || window.webkitSpeechRecognition
//     if (!SR) return setError('Tu navegador no soporta reconocimiento de voz (usa Chrome)')

//     const rec = new SR()
//     rec.lang           = 'es-PE'
//     rec.continuous     = true
//     rec.interimResults = true
//     recognitionRef.current = rec
//     grabandoRef.current    = true
//     acumuladoRef.current   = ''

//     const resetSilenceTimer = () => {
//       clearTimeout(silenceTimerRef.current)
//       silenceTimerRef.current = setTimeout(() => {
//         grabandoRef.current = false
//         rec.stop()
//       }, 3000)
//     }

//     rec.onstart  = () => { setGrabando(true); setTranscript(''); resetSilenceTimer() }
//     rec.onresult = (e) => {
//       resetSilenceTimer()
//       let finalText = '', interino = ''
//       for (let i = 0; i < e.results.length; i++) {
//         if (e.results[i].isFinal) finalText += e.results[i][0].transcript + ' '
//         else interino = e.results[i][0].transcript
//       }
//       acumuladoRef.current = finalText.trim()
//       setTranscript((finalText + interino).trim())
//     }
//     rec.onerror  = (e) => {
//       if (e.error === 'no-speech') return
//       grabandoRef.current = false
//       clearTimeout(silenceTimerRef.current)
//       setGrabando(false)
//       setError('Micrófono: ' + e.error)
//     }
//     rec.onend = () => {
//       if (grabandoRef.current) {
//         try { rec.start() } catch { /* ya iniciando */ }
//         return
//       }
//       clearTimeout(silenceTimerRef.current)
//       setGrabando(false)
//       const texto = acumuladoRef.current
//       if (texto) parsearConIA(texto)
//     }

//     rec.start()
//   }

//   const detenerGrabacion = () => {
//     grabandoRef.current = false
//     clearTimeout(silenceTimerRef.current)
//     recognitionRef.current?.stop()
//   }

//   // ── Parsear con IA ─────────────────────────────────────────
//   const parsearConIA = async (texto) => {
//     setParseando(true)
//     setError(null)
//     try {
//       const res  = await fetch('/api/ia/parse-creditos', {
//         method:  'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ transcripcion: texto }),
//       })
//       const data = await res.json()
//       if (!res.ok) throw new Error(data.error ?? 'Error IA')

//       // ← NUEVO: marcar skip ANTES de setear puestoId para no limpiar las lineas que llegan
//       skipClientResetRef.current = true
//       if (data.puesto_id) setPuestoId(data.puesto_id)

//       if (data.lineas?.length) {
//         setLineas(data.lineas.map(l => {
//           // intentar matchear el nombre que devuelve la IA contra la lista cargada
//           const match = clientes.find(c =>
//             c.nombre.toLowerCase() === l.cliente_nombre?.toLowerCase().trim()
//           )
//           return {
//             ...nuevaLinea(),
//             cliente_id:     match?.id     ?? null,
//             cliente_nombre: match?.nombre ?? l.cliente_nombre ?? '',
//             total:          l.total?.toString() ?? '',
//             nota:           l.nota ?? '',
//           }
//         }))
//       }
//     } catch (err) {
//       setError('IA: ' + err.message)
//     } finally {
//       setParseando(false)
//     }
//   }

//   if (!open) return null

//   return (
//     <div
//       className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
//       onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
//     >
//       <div
//         role="dialog" aria-modal="true" aria-labelledby="modal-titulo"
//         className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col"
//       >
//         {/* ── Header ───────────────────────────────────── */}
//         <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
//           <div>
//             <h2 id="modal-titulo" className="text-base font-semibold text-gray-900">
//               Nuevo crédito
//             </h2>
//             <p className="text-xs text-gray-400 mt-0.5">
//               {parseando
//                 ? '🤖 Analizando audio…'
//                 : lineasValidas.length > 0
//                   ? `${lineasValidas.length} crédito${lineasValidas.length !== 1 ? 's' : ''} listos para guardar`
//                   : 'Completa al menos una línea'}
//             </p>
//             {transcript && (
//               <p className={`text-xs mt-0.5 italic truncate max-w-xs transition-colors
//                 ${grabando ? 'text-red-400' : 'text-indigo-400'}`} title={transcript}>
//                 {grabando ? '🎙 ' : '✓ '}{transcript}
//               </p>
//             )}
//           </div>

//           <div className="flex items-center gap-2">
//             <button
//               type="button"
//               onClick={grabando ? detenerGrabacion : iniciarGrabacion}
//               disabled={parseando}
//               title={grabando ? 'Detener grabación' : 'Dictar créditos con voz'}
//               className={`w-9 h-9 flex items-center justify-center rounded-xl transition
//                 ${grabando
//                   ? 'bg-red-500 text-white animate-pulse'
//                   : 'bg-gray-100 text-gray-500 hover:bg-indigo-100 hover:text-indigo-600'}
//                 disabled:opacity-40 disabled:cursor-not-allowed`}
//             >
//               {parseando ? (
//                 <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
//                   <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
//                   <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
//                 </svg>
//               ) : (
//                 <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
//                   <path d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm-2 4a5 5 0 0010 0h1a6 6 0 01-5.5 5.97V16h2a1 1 0 010 2H7a1 1 0 010-2h2v-2.03A6 6 0 013 8h1z"/>
//                 </svg>
//               )}
//             </button>
//             <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none transition" aria-label="Cerrar">×</button>
//           </div>
//         </div>

//         <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
//           <div className="px-6 py-5 space-y-5 overflow-y-auto flex-1">

//             {/* Puesto compartido */}
//             <div>
//               <label className="block text-xs font-medium text-gray-600 mb-2">
//                 Puesto <span className="text-red-400">*</span>
//                 <span className="text-gray-400 font-normal ml-1">— aplica a todos los créditos</span>
//               </label>
//               <div className="flex gap-2">
//                 {PUESTOS.map(p => (
//                   <button
//                     key={p} type="button" onClick={() => setPuestoId(p)}
//                     className={`flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition ${
//                       puestoId === p
//                         ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm'
//                         : 'border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600'
//                     }`}
//                   >
//                     {p}
//                   </button>
//                 ))}
//               </div>
//             </div>

//             {/* Líneas de crédito */}
//             <div>
//               <div className="flex items-center justify-between mb-2">
//                 <label className="text-xs font-medium text-gray-600">
//                   Créditos <span className="text-red-400">*</span>
//                 </label>
//                 <span className="text-xs text-gray-400">{lineas.length} línea{lineas.length !== 1 ? 's' : ''}</span>
//               </div>

//               <div className="grid grid-cols-[1fr_100px_32px] gap-2 mb-1.5 px-1">
//                 <span className="text-xs text-gray-400">Cliente</span>
//                 <span className="text-xs text-gray-400">Monto</span>
//                 <span />
//               </div>

//               <div className="space-y-2">
//                 {lineas.map((linea, idx) => (
//                   <div key={linea._id} className="grid grid-cols-[1fr_100px_32px] gap-2 items-center">

//                     {/* ── Cliente: SELECT filtrado por puesto ── ← NUEVO */}
//                     <div className="relative">
//                       <select
//                         ref={idx === 0 ? primerInputRef : null}
//                         value={linea.cliente_id ?? ''}
//                         disabled={!puestoId}
//                         onChange={e => {
//                           const found = clientes.find(c => c.id === e.target.value)
//                           setLinea(linea._id, {
//                             cliente_id:     found?.id     ?? null,
//                             cliente_nombre: found?.nombre ?? '',
//                           })
//                         }}
//                         className={`w-full px-3 py-2 border rounded-lg text-sm appearance-none
//                           focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
//                           ${!puestoId
//                             ? 'border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed'
//                             : 'border-gray-200 bg-white text-gray-900'}
//                           ${linea.cliente_nombre && !linea.cliente_id
//                             ? 'border-amber-300 bg-amber-50'   // IA asignó nombre sin match exacto
//                             : ''}`}
//                       >
//                         <option value="">
//                           {!puestoId
//                             ? 'Seleccione puesto primero'
//                             : loadingClientes
//                               ? 'Cargando…'
//                               : 'Seleccione cliente'}
//                         </option>
//                         {clientes.map(c => (
//                           <option key={c.id} value={c.id}>{c.nombre}</option>
//                         ))}
//                       </select>
//                       {/* Icono chevron */}
//                       <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">▾</span>
//                     </div>

//                     {/* Monto */}
//                     <div className="relative">
//                       <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">S/</span>
//                       <input
//                         type="number" min="0.01" step="0.01" placeholder="0.00"
//                         value={linea.total}
//                         onChange={e => setLinea(linea._id, { total: e.target.value })}
//                         className="w-full pl-7 pr-2 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
//                       />
//                     </div>

//                     {/* Quitar */}
//                     <button
//                       type="button" onClick={() => quitarLinea(linea._id)}
//                       disabled={lineas.length === 1}
//                       className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition disabled:opacity-0 disabled:pointer-events-none"
//                       title="Eliminar línea"
//                     >×</button>
//                   </div>
//                 ))}
//               </div>

//               {/* IA: aviso si hay líneas con nombre sin match ── ← NUEVO */}
//               {lineas.some(l => l.cliente_nombre && !l.cliente_id) && (
//                 <p className="mt-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
//                   ⚠️ La IA detectó nombres que no coinciden exactamente con clientes de este puesto. Selecciónalos manualmente.
//                 </p>
//               )}

//               <button
//                 type="button" onClick={agregarLinea}
//                 className="mt-3 w-full py-2 rounded-lg border border-dashed border-gray-300 text-xs text-gray-500 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
//               >
//                 + Agregar línea
//               </button>
//             </div>

//             {error && (
//               <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
//                 ⚠️ {error}
//               </p>
//             )}
//           </div>

//           {/* ── Footer fijo ──────────────────────────────── */}
//           <div className="px-6 py-4 border-t border-gray-100 shrink-0">
//             {lineasValidas.length > 0 && (
//               <div className="flex items-center justify-between text-xs text-gray-500 mb-3 bg-gray-50 rounded-lg px-3 py-2">
//                 <span>{lineasValidas.length} crédito{lineasValidas.length !== 1 ? 's' : ''} · {puestoId || '—'}</span>
//                 <span className="font-semibold text-gray-800">
//                   Total S/{' '}
//                   {lineasValidas
//                     .reduce((s, l) => s + Number(l.total), 0)
//                     .toLocaleString('es-PE', { minimumFractionDigits: 2 })}
//                 </span>
//               </div>
//             )}
//             <div className="flex gap-3">
//               <button type="button" onClick={onClose}
//                 className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition">
//                 Cancelar
//               </button>
//               <button type="submit" disabled={!puedeGuardar || saving}
//                 className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed">
//                 {saving ? (
//                   <span className="flex items-center justify-center gap-2">
//                     <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
//                       <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
//                       <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
//                     </svg>
//                     Guardando…
//                   </span>
//                 ) : `Guardar ${lineasValidas.length > 1 ? `${lineasValidas.length} créditos` : 'crédito'}`}
//               </button>
//             </div>
//           </div>
//         </form>
//       </div>
//     </div>
//   )
// }


'use client'
import { useState, useEffect, useRef, useMemo } from 'react'   // ← useMemo añadido
import { useClientes } from '@/hooks/useClientes'
import { precalentarPuestos } from '@/hooks/useClientes'

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
const leerBorrador    = () => {
  try {
    const raw = localStorage.getItem(BORRADOR_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

const nuevaLinea = () => ({
  _id:            'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 5),
  cliente_id:     null,
  cliente_nombre: '',
  total:          '',
  nota:           '',
})


// ── Resalta la parte del texto que coincide con la búsqueda ──
function Highlight({ text, query }) {
  if (!query.trim()) return <>{text}</>
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return <>{text}</>
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-indigo-100 text-indigo-800 font-semibold rounded px-0.5 not-italic">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  )
}


// ── Buscador tipo Google para clientes ───────────────────────
function ClienteSearchInput({ clienteId, clienteNombre, clientes, disabled, puestoId, onChange, inputRef }) {
  const [query,  setQuery]  = useState(clienteNombre || '')
  const [open,   setOpen]   = useState(false)
  const [cursor, setCursor] = useState(-1)

  // Sync cuando la IA o el restore cambian clienteNombre desde fuera
  // useEffect(() => {
  //   setQuery(clienteNombre || '')
  // }, [clienteNombre])


  // ── NUEVO: re-valida cuando cambia el puesto (nueva lista de clientes) ──
  useEffect(() => {
    if (!query.trim()) return
    const match = clientes.find(
      c => c.nombre.toLowerCase() === query.toLowerCase()
    )
    if (match && !clienteId) {
      onChange({ cliente_id: match.id, cliente_nombre: match.nombre })
    } else if (!match && clienteId) {
      onChange({ cliente_id: null, cliente_nombre: query })
    }
  }, [clienteId, clientes, onChange, query])


  const filtered = useMemo(() => {
    if (!query.trim()) return []
    return clientes
      .filter(c => c.nombre.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 10)
  }, [query, clientes])

  const noEncontrado = open && query.trim() !== '' && filtered.length === 0

  const selectCliente = (c) => {
    setQuery(c.nombre)
    setOpen(false)
    setCursor(-1)
    onChange({ cliente_id: c.id, cliente_nombre: c.nombre })
  }

  const handleChange = (e) => {
    const val = e.target.value
    setQuery(val)
    setCursor(-1)
    setOpen(true)
    // Mientras escribe, limpiar el id hasta que haya match
    onChange({ cliente_id: null, cliente_nombre: val })
  }

  const handleKeyDown = (e) => {
    if (!open) { if (e.key === 'ArrowDown') setOpen(true); return }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setCursor(prev => Math.min(prev + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setCursor(prev => Math.max(prev - 1, -1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (cursor >= 0 && filtered[cursor]) selectCliente(filtered[cursor])
      else if (filtered.length === 1)      selectCliente(filtered[0])
    } else if (e.key === 'Escape') {
      setOpen(false)
      setCursor(-1)
    }
  }

  const handleBlur = () => {
    // Pequeño delay para que el click en la lista se registre antes del cierre
    setTimeout(() => {
      setOpen(false)
      setCursor(-1)
      // Si el texto escrito coincide exactamente (case-insensitive), confirmar el match
      if (query.trim()) {
        const match = clientes.find(
          c => c.nombre.toLowerCase() === query.toLowerCase()
        )
        if (match) onChange({ cliente_id: match.id, cliente_nombre: match.nombre })
      }
    }, 150)
  }

  const sinMatch = !!query.trim() && !clienteId

  return (
    <div className="relative">
      {/* Input con icono lupa */}
      <div className="relative">
        <svg
          className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400"
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"/>
        </svg>

        <input
          ref={inputRef}
          type="text"
          value={query}
          disabled={disabled}
          autoComplete="off"
          spellCheck={false}
          placeholder={disabled ? 'Seleccione puesto primero' : 'Buscar cliente…'}
          onChange={handleChange}
          onFocus={() => { if (query.trim()) setOpen(true) }}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={`w-full pl-8 pr-7 py-2 border rounded-lg text-sm
            focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
            ${disabled
              ? 'border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed'
              : sinMatch
                ? 'border-red-300 bg-red-50 text-gray-900'
                : clienteId
                  ? 'border-green-400 bg-white text-gray-900'
                  : 'border-gray-200 bg-white text-gray-900'}`}
        />

        {/* Indicador: ✓ si tiene match, ✕ si no */}
        {!disabled && query.trim() !== '' && (
          <span className={`absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold
            ${clienteId ? 'text-green-500' : 'text-red-400'}`}>
            {clienteId ? '✓' : '✕'}
          </span>
        )}
      </div>

      {/* Dropdown de sugerencias */}
      {open && !disabled && query.trim() !== '' && (
        <ul className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-52 overflow-y-auto">
          {filtered.length > 0
            ? filtered.map((c, i) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onMouseDown={() => selectCliente(c)}
                    className={`w-full text-left px-3 py-2 text-sm transition
                      ${i === cursor
                        ? 'bg-indigo-600 text-white'
                        : 'text-gray-800 hover:bg-indigo-50 hover:text-indigo-700'}`}
                  >
                    {i === cursor
                      ? c.nombre
                      : <Highlight text={c.nombre} query={query} />}
                  </button>
                </li>
              ))
            : (
              <li className="px-3 py-2.5 text-sm text-red-500 flex items-center gap-2">
                <span>😕</span>
                <span>
                  <strong className="font-semibold">{query}</strong>
                  {' '}no se encuentra en {puestoId || 'este puesto'}
                </span>
              </li>
            )
          }
        </ul>
      )}
    </div>
  )
}


// ════════════════════════════════════════════════════════════
export default function NuevoCreditoModal({ open, onClose, onCreado }) {
  const [puestoId,   setPuestoId]  = useState('')
  const [lineas,     setLineas]    = useState([nuevaLinea()])
  const [saving,     setSaving]    = useState(false)
  const [error,      setError]     = useState(null)
  const [borrador,   setBorrador]  = useState(null)
  const [grabando,   setGrabando]  = useState(false)
  const [parseando,  setParseando] = useState(false)
  const [transcript, setTranscript]= useState('')

  const { clientes, loading: loadingClientes } = useClientes({ puestoId: puestoId || null })

  const primerInputRef      = useRef(null)
  const recognitionRef      = useRef(null)
  const skipSaveRef         = useRef(false)
  const skipClientResetRef  = useRef(false)
  const silenceTimerRef     = useRef(null)
  const grabandoRef         = useRef(false)
  const acumuladoRef        = useRef('')

  // ── 1. Restaurar borrador al abrir ─────────────────────────
  useEffect(() => {
    if (!open) return

    precalentarPuestos(PUESTOS)
    
    const borrador = leerBorrador()
    skipSaveRef.current        = true
    skipClientResetRef.current = true

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

  // ── 2. Auto-save ───────────────────────────────────────────
  useEffect(() => {
    if (!open) return
    if (skipSaveRef.current) { skipSaveRef.current = false; return }
    guardarBorrador(puestoId, lineas)
  }, [lineas, puestoId, open])

  // ── 3. Limpiar clientes al cambiar puesto ──────────────────
  useEffect(() => {
    if (skipClientResetRef.current) { skipClientResetRef.current = false; return }
    setLineas(prev => prev.map(l => ({ ...l, cliente_id: null, cliente_nombre: '' })))
  }, [puestoId])

  // ── Cerrar con Escape ──────────────────────────────────────
  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  // ── Helpers ────────────────────────────────────────────────
  const setLinea     = (id, changes) =>
    setLineas(prev => prev.map(l => l._id === id ? { ...l, ...changes } : l))
  const agregarLinea = () => setLineas(prev => [...prev, nuevaLinea()])
  const quitarLinea  = (id) =>
    setLineas(prev => prev.length > 1 ? prev.filter(l => l._id !== id) : prev)

const lineasValidas = lineas.filter(
  l => l.cliente_nombre.trim() !== '' && Number(l.total) > 0
)

// ── NUEVO ──────────────────────────────────────────────────────
// Líneas válidas que tienen nombre pero sin match confirmado en el puesto
const hayClientesSinMatch = lineasValidas.some(l => !l.cliente_id)

const puedeGuardar = puestoId !== ''
  && lineasValidas.length > 0
  && !hayClientesSinMatch   // ← bloquea si hay nombres sin match

  // ── Submit ─────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!puedeGuardar || saving) return

    if (hayClientesSinMatch) {
      setError('Corrige los clientes no encontrados antes de guardar.')
      setSaving(false)
      return
    }

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
            cliente_id:     l.cliente_id ?? null,
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
    rec.continuous     = true
    rec.interimResults = true
    recognitionRef.current = rec
    grabandoRef.current    = true
    acumuladoRef.current   = ''
    const resetSilenceTimer = () => {
      clearTimeout(silenceTimerRef.current)
      silenceTimerRef.current = setTimeout(() => {
        grabandoRef.current = false
        rec.stop()
      }, 3000)
    }
    rec.onstart  = () => { setGrabando(true); setTranscript(''); resetSilenceTimer() }
    rec.onresult = (e) => {
      resetSilenceTimer()
      let finalText = '', interino = ''
      for (let i = 0; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalText += e.results[i][0].transcript + ' '
        else interino = e.results[i][0].transcript
      }
      acumuladoRef.current = finalText.trim()
      setTranscript((finalText + interino).trim())
    }
    rec.onerror = (e) => {
      if (e.error === 'no-speech') return
      grabandoRef.current = false
      clearTimeout(silenceTimerRef.current)
      setGrabando(false)
      setError('Micrófono: ' + e.error)
    }
    rec.onend = () => {
      if (grabandoRef.current) { try { rec.start() } catch { } return }
      clearTimeout(silenceTimerRef.current)
      setGrabando(false)
      const texto = acumuladoRef.current
      if (texto) parsearConIA(texto)
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
      const res  = await fetch('/api/ia/parse-creditos', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcripcion: texto }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error IA')
      skipClientResetRef.current = true
      if (data.puesto_id) setPuestoId(data.puesto_id)
      if (data.lineas?.length) {
        setLineas(data.lineas.map(l => {
          const match = clientes.find(
            c => c.nombre.toLowerCase() === l.cliente_nombre?.toLowerCase().trim()
          )
          return {
            ...nuevaLinea(),
            cliente_id:     match?.id     ?? null,
            cliente_nombre: match?.nombre ?? l.cliente_nombre ?? '',
            total:          l.total?.toString() ?? '',
            nota:           l.nota ?? '',
          }
        }))
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
        role="dialog" aria-modal="true" aria-labelledby="modal-titulo"
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
            <button onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl leading-none transition"
              aria-label="Cerrar">×
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="px-6 py-5 space-y-5 overflow-y-auto flex-1">

            {/* Puesto */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">
                Puesto <span className="text-red-400">*</span>
                <span className="text-gray-400 font-normal ml-1">— aplica a todos los créditos</span>
              </label>
              <div className="flex gap-2">
                {PUESTOS.map(p => (
                  <button
                    key={p} type="button" onClick={() => setPuestoId(p)}
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
                  Créditos <span className="text-red-400">*</span>
                </label>
                <span className="text-xs text-gray-400">
                  {lineas.length} línea{lineas.length !== 1 ? 's' : ''}
                  {loadingClientes && puestoId && (
                    <span className="ml-2 text-indigo-400 animate-pulse">· cargando clientes…</span>
                  )}
                </span>
              </div>

              <div className="grid grid-cols-[1fr_100px_32px] gap-2 mb-1.5 px-1">
                <span className="text-xs text-gray-400">Cliente</span>
                <span className="text-xs text-gray-400">Monto</span>
                <span />
              </div>

              <div className="space-y-2">
                {lineas.map((linea, idx) => (
                  <div key={linea._id} className="grid grid-cols-[1fr_100px_32px] gap-2 items-center">

                    {/* ── Buscador de cliente ── */}
                    <ClienteSearchInput
                      clienteId={linea.cliente_id}
                      clienteNombre={linea.cliente_nombre}
                      clientes={clientes}
                      disabled={!puestoId || loadingClientes}
                      puestoId={puestoId}
                      onChange={changes => setLinea(linea._id, changes)}
                      inputRef={idx === 0 ? primerInputRef : null}
                    />

                    {/* Monto */}
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">S/</span>
                      <input
                        type="number" min="0.01" step="0.01" placeholder="0.00"
                        value={linea.total}
                        onChange={e => setLinea(linea._id, { total: e.target.value })}
                        className="w-full pl-7 pr-2 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>

                    {/* Quitar */}
                    <button
                      type="button" onClick={() => quitarLinea(linea._id)}
                      disabled={lineas.length === 1}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition disabled:opacity-0 disabled:pointer-events-none"
                      title="Eliminar línea"
                    >×</button>
                  </div>
                ))}
              </div>

              {/* Aviso IA: nombres sin match */}
              {/* {lineas.some(l => l.cliente_nombre && !l.cliente_id) && (
                <p className="mt-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
                  ⚠️ No existe el cliente en el puesto {puestoId || 'este puesto'} — corrígelos en el buscador.
                </p>
              )} */}

              {/* Aviso bloqueante: nombres sin match */}
              {lineas.some(l => l.cliente_nombre && !l.cliente_id) && (
                <p className="mt-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5 flex items-start gap-1.5">
                  <span className="mt-0.5 shrink-0">🚫</span>
                  <span>
                    {hayClientesSinMatch
                      ? <>No se puede guardar: hay clientes no encontrados en <strong>{puestoId || 'este puesto'}</strong>. Corrígelos en el buscador.</>
                      : <>La IA detectó nombres que no coinciden exactamente. Selecciónalos manualmente.</>
                    }
                  </span>
                </p>
              )}

              <button
                type="button" onClick={agregarLinea}
                className="mt-3 w-full py-2 rounded-lg border border-dashed border-gray-300 text-xs text-gray-500 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
              >
                + Agregar línea
              </button>
            </div>

            {error && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                ⚠️ {error}
              </p>
            )}
          </div>

          {/* ── Footer ───────────────────────────────────── */}
          <div className="px-6 py-4 border-t border-gray-100 shrink-0">
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
              <button type="button" onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition">
                Cancelar
              </button>
              
              
              {/* <button type="submit" disabled={!puedeGuardar || saving}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed">
                {saving ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                    Guardando…
                  </span>
                ) : `Guardar ${lineasValidas.length > 1 ? `${lineasValidas.length} créditos` : 'crédito'}`}
              </button> */}

              <button
                type="submit"
                disabled={!puedeGuardar || saving}
                title={
                  hayClientesSinMatch
                    ? 'Hay clientes no encontrados en este puesto'
                    : !puestoId
                      ? 'Selecciona un puesto primero'
                      : undefined
                }
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
                ) : hayClientesSinMatch
                    ? '🚫 Clientes no encontrados'
                    : `Guardar ${lineasValidas.length > 1 ? `${lineasValidas.length} créditos` : 'crédito'}`
                }
              </button>



            </div>
          </div>
        </form>
      </div>
    </div>
  )
}