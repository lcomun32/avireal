'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'

// ─────────────────────────────────────────────────────────────
// Listas estáticas exportadas (page.js las importa, no redeclara)
// ─────────────────────────────────────────────────────────────
export const PUESTOS    = ['P1', 'P4', 'P5']
export const PRODUCTOS  = ['Pollo entero','Gallina Doble','Gallina Colorada', 'Pierna', 'Pecho especial', 'Pecho chino', 'Molleja', 'Corazón', 'Hígado', 'Menudencia', 'Otros']
export const PROVEEDORES = ['Jonas', 'Dante', 'Externo','Descuento', 'Otro']

// ─────────────────────────────────────────────────────────────
// Config interna
// ─────────────────────────────────────────────────────────────
const EDITABLE_CATS = [
  'ingresoMercaderia', 'compras', 'reporte', 'basura', 'error',
  'culqi', 'plinYape', 'caja', 'gasto',
  'devolucionAyer', 'devolucionHoy','balanza','devolucionAyer', 'devolucionHoy'
]
const READONLY_CATS = ['credito', 'pagos']

// Solo estas categorías calculan total = peso * precio automáticamente
const CATS_CON_TOTAL_AUTO = [  ]

// ─────────────────────────────────────────────────────────────
// Utilidades
// ─────────────────────────────────────────────────────────────
let seed = 0
const uid     = () => `cj_${Date.now()}_${++seed}`
const getToday = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date())
  
const lsKey   = (fecha) => `caja:${fecha}`
const toNum   = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0 }

// ─────────────────────────────────────────────────────────────
// Fábricas de filas
// ─────────────────────────────────────────────────────────────
export const makeRow = {
  ingresoMercaderia: () => ({
    id: uid(),
    peso: '0.00', cantJava: '', cantPollos: '35',
    proveedor: 'Jonas', proveedorCustom: '',
    precioKg: '',
  }),
  reporte:        () => ({ id: uid(), puesto: 'P1', total: '' }),
  compras:        () => ({ id: uid(), puesto: 'P1', total: '' }),
  basura:         () => ({ id: uid(), puesto: 'P1', producto: 'Pollo entero', productoCustom: '', peso: '', precio: '', total: 0 }),
  error:          () => ({ id: uid(), puesto: 'P1', producto: 'Pollo entero', productoCustom: '', peso: '', precio: '', total: 0 }),
  culqi:          () => ({ id: uid(), puesto: 'P1', total: '' }),
  plinYape:       () => ({ id: uid(), puesto: 'P1', total: '' }),
  caja:           () => ({ id: uid(), puesto: 'P1', total: '' }),
  gasto:          () => ({ id: uid(), puesto: 'P1', concepto: '', total: '' }), // ← concepto añadido
  credito:        () => ({ id: uid(), puesto: '', total: 0 }),
  pagos:          () => ({ id: uid(), puesto: '', total: 0 }),
  balanza:        () => ({ id: uid(), puesto: 'P5', producto: 'Pollo entero', peso: '' }),
  devolucionAyer: () => ({ id: uid(), puesto: 'P1', producto: 'Pollo entero', productoCustom: '', peso: '', precio: '', total: 0 }),
  devolucionHoy:  () => ({ id: uid(), puesto: 'P1', producto: 'Pollo entero', productoCustom: '', peso: '', precio: '', total: 0 }),
}


const defaultCaja = (fecha = getToday(), { cantJava = 5.00, precioKg = 8.30 } = {}) => ({
  fecha,
  ingresoMercaderia: [
    // 30 de Jonas
    ...Array.from({ length: 1 }, () => ({
      ...makeRow.ingresoMercaderia(),
      proveedor: 'Jonas',
      cantJava: cantJava,
      precioKg: precioKg,
    })),

    // 2 de otro proveedor
    ...Array.from({ length: 1 }, () => ({
      ...makeRow.ingresoMercaderia(),
      proveedor: 'Dante', 
      cantJava: 0,
      cantPollos: 0,
      precioKg: 0,
    })),

    ...Array.from({ length: 1 }, () => ({
      ...makeRow.ingresoMercaderia(),
      proveedor: 'Externo', 
      cantJava: 0,
      cantPollos: 0,
      precioKg: 0,
    })),
    ],
    reporte:        PUESTOS.map((puesto) => ({ ...makeRow.reporte(),        puesto })),
    compras:        PUESTOS.map((puesto) => ({ ...makeRow.compras(),        puesto })),
    basura:         PUESTOS.map((puesto) => ({ ...makeRow.basura(),         puesto })),
    error:          PUESTOS.map((puesto) => ({ ...makeRow.error(),          puesto })),
    culqi:          PUESTOS.map((puesto) => ({ ...makeRow.culqi(),          puesto })),
    plinYape:       PUESTOS.map((puesto) => ({ ...makeRow.plinYape(),       puesto })),
    caja:           PUESTOS.map((puesto) => ({ ...makeRow.caja(),           puesto })),
    //gasto:          [makeRow.gasto()],
    gasto:           PUESTOS.map((puesto) => ({ ...makeRow.gasto(),         puesto })),
    credito:        [],
    pagos:          [],
    devolucionAyer: PUESTOS.map((puesto) => ({ ...makeRow.devolucionAyer(), puesto })),
    devolucionHoy:  PUESTOS.map((puesto) => ({ ...makeRow.devolucionHoy(),  puesto })),
    balanza:        PUESTOS.map((puesto) => ({ ...makeRow.balanza(),        puesto })), 
  })


// ─────────────────────────────────────────────────────────────
// Normalizadores
// ─────────────────────────────────────────────────────────────
const withAutoTotal = (cat, row) => {
  if (!CATS_CON_TOTAL_AUTO.includes(cat)) return row
  return { ...row, total: toNum(row.peso) * toNum(row.precio) }
}

const normalizeRows = (cat, rows) => {
  if (!Array.isArray(rows)) return []
  return rows.map((row) => {
    const fallback = makeRow[cat]?.() ?? { id: uid() }
    return withAutoTotal(cat, { ...fallback, ...row, id: row?.id ?? fallback.id })
  })
}

const normalizeCaja = (raw, fecha) => {
  const base = defaultCaja(fecha)
  const next = { ...base, fecha }
  Object.keys(base).forEach((cat) => {
    if (cat === 'fecha') return
    next[cat] = normalizeRows(cat, raw?.[cat] ?? base[cat])
  })
  return next
}

// ─────────────────────────────────────────────────────────────
// Mappers API → categorías readonly
// ─────────────────────────────────────────────────────────────
const mapCreditos = (items = []) =>
  items.map((item) => ({
    id: uid(),
    puesto: item.puesto ?? item.puesto_nombre ?? item.cliente_nombre ?? item.nombre ?? '—',
    total: item.total ?? item.saldo ?? item.monto ?? 0,
    raw: item,
  }))

const mapPagos = (items = []) =>
  items.map((item) => ({
    id: uid(),
    puesto: item.puesto ?? item.cliente_nombre ?? item.puesto_nombre ?? item.nombre ?? '—',
    total: item.total ?? item.monto ?? 0,
    raw: item,
  }))

// ─────────────────────────────────────────────────────────────
// calcularResumen — exportada para uso externo si se necesita
// Recibe `tara` para descontar peso de javas en ingreso
// ─────────────────────────────────────────────────────────────
const sumTotal = (rows = []) =>
  rows.reduce((acc, row) => acc + toNum(row.total), 0)


const sumByPuestoSigned = (rows = [], campo = "total", signo = 1) => {
  return rows.reduce((acc, row) => {
    const puesto = row.puesto || "SIN_PUESTO"
    const valor = toNum(row[campo]) * signo

    acc[puesto] = (acc[puesto] || 0) + valor
    return acc
  }, {})
}


const mergeByPuesto = (...objetos) => {
  const result = {}

  objetos.forEach(obj => {
    Object.entries(obj).forEach(([puesto, valor]) => {
      result[puesto] = (result[puesto] || 0) + valor
    })
  })

  return result
}


// ─────────────────────────────────────────────────────────────
// Helpers de análisis por categoría
// ─────────────────────────────────────────────────────────────

// INGRESO: peso bruto/neto/final/aves y valor total por proveedor
export const calcularIngresoPorProveedor = (grupos) => {
  const porProveedor = {}
  grupos.forEach(({ proveedor, pesoBruto, pesoNeto, pesoFinal, pollos, total }) => {
    porProveedor[proveedor] = { pesoBruto, pesoNeto, pesoFinal, aves: pollos, total }
  })
  return {
    porProveedor,
    totalBruto:  grupos.reduce((a, g) => a + g.pesoBruto,  0),
    totalNeto:   grupos.reduce((a, g) => a + g.pesoNeto,   0),
    totalFinal:  grupos.reduce((a, g) => a + g.pesoFinal,  0),
    totalAves:   grupos.reduce((a, g) => a + g.pollos,     0),
    totalValor:  grupos.reduce((a, g) => a + g.total,      0),
  }
}

// BALANZA: peso por puesto, por producto, y total general (en kg)
export const calcularBalanza = (rows = []) => {
  const porPuesto  = {}
  const porProducto = {}
  let totalKg = 0

  rows.forEach((row) => {
    const puesto   = row.puesto   || 'SIN_PUESTO'
    const producto = row.producto || 'SIN_PRODUCTO'
    const peso = toNum(row.peso)
    totalKg += peso
    porPuesto[puesto]     = (porPuesto[puesto]     || 0) + peso
    porProducto[producto] = (porProducto[producto] || 0) + peso
  })

  return { porPuesto, porProducto, totalKg }
}

// SIMPLE/GASTO/LECTURA: total por puesto y total general (en soles)
export const calcularSimple = (rows = []) => {
  const porPuesto = {}
  let total = 0

  rows.reduce((_, row) => {
    const puesto = row.puesto || 'SIN_PUESTO'
    const valor  = toNum(row.total)
    total += valor
    porPuesto[puesto] = (porPuesto[puesto] || 0) + valor
  }, null)

  return { porPuesto, total }
}

export const calcularResumen = (caja, tara = 7.10) => {
  // Ingreso: peso neto descontando TARA por java
  const ingresoMercaderia = caja.ingresoMercaderia.reduce((acc, row) => {
    const pesoNeto = Math.max(toNum(row.peso) - toNum(row.cantJava) * tara, 0)
    return acc + pesoNeto * toNum(row.precioKg)
  }, 0)

  const balanzaPesoBruto = (caja.balanza ?? []).reduce(   // ← nuevo
    (acc, row) => acc + toNum(row.peso), 0
  )

  const reporte      = sumTotal(caja.reporte)
  const compras      = sumTotal(caja.compras)
  const basura       = sumTotal(caja.basura)
  const error        = sumTotal(caja.error)
  const culqi        = sumTotal(caja.culqi)
  const plinYape     = sumTotal(caja.plinYape)
  const efectivoCaja = sumTotal(caja.caja)
  const gasto        = sumTotal(caja.gasto)
  const credito      = sumTotal(caja.credito)
  const pagos        = sumTotal(caja.pagos)
  const devolucionAyer = sumTotal(caja.devolucionAyer)
  const devolucionHoy  = sumTotal(caja.devolucionHoy)

  const subtotalCaja = reporte-compras-basura-error
  const subtotalDia = culqi+plinYape+efectivoCaja-gasto+credito
  const subtotalDianc = culqi+plinYape+efectivoCaja-gasto
  const totalDia = subtotalCaja-subtotalDia


  const digital     = culqi + plinYape
  const cobrado     = efectivoCaja + digital + pagos
  const devoluciones = devolucionAyer + devolucionHoy
  const perdidas    = basura + error
  const balance     = cobrado - gasto - credito - devoluciones - perdidas


  const basuraPorPuesto = sumByPuestoSigned(caja.basura, "total", 1)
  const cajaPorPuesto   = sumByPuestoSigned(caja.error, "total", -1)

  const totalPorPuesto = mergeByPuesto(
    basuraPorPuesto,
    cajaPorPuesto
  )

  return {
    TotalPagar :ingresoMercaderia,
    compras, basura, error,
    culqi, plinYape,
    caja: efectivoCaja,
    gasto, credito, pagos,
    devolucionAyer, devolucionHoy,
    digital, cobrado, devoluciones, perdidas,
    totalRegistro: balance,

    subtotalCaja:subtotalCaja,
    subtotalDia:subtotalDia,
    subtotalDianc:subtotalDianc,

    Vcaja: caja.ingresoMercaderia,

    totalPorPuesto:totalPorPuesto,

    totalDia : totalDia,

    balanzaPesoBruto: balanzaPesoBruto

  }
}

// ─────────────────────────────────────────────────────────────
// Fetch util
// ─────────────────────────────────────────────────────────────
const fetchJSON = async (url, options = {}) => {
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers ?? {}) },
  })
  let data = null
  try { data = await res.json() } catch { /* vacío intencionado */ }
  if (!res.ok) throw new Error(data?.error ?? 'Error de red')
  return data
}

// ─────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────
export function useCaja({
  initialFecha = getToday(),
  autoFetch    = true,
  tara         = 7.10,      // ← nuevo: valor de tara por java (kg)
} = {}) {
  const [fecha,  setFecha]  = useState(initialFecha)
  const [caja,   setCaja]   = useState(() => defaultCaja(initialFecha))
  const [loading, setLoading] = useState(autoFetch)
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [error,   setError]   = useState(null)

  // ── Autosave local ──────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (loading) return  // ← esta línea es la que falta
    localStorage.setItem(lsKey(fecha), JSON.stringify(caja))
  }, [fecha, caja, loading])

  // ── CRUD filas ──────────────────────────────────────────
  const updateRow = useCallback((cat, rowId, field, value) => {
    setCaja((prev) => ({
      ...prev,
      [cat]: prev[cat].map((row) =>
        row.id !== rowId ? row : withAutoTotal(cat, { ...row, [field]: value })
      ),
    }))
  }, [])

  const addRow = useCallback((cat) => {
    setCaja((prev) => ({
      ...prev,
      [cat]: [...prev[cat], makeRow[cat]()],
    }))
  }, [])

  // Permite añadir una fila con valores iniciales personalizados
  const addRowWith = useCallback((cat, overrides = {}) => {
    setCaja((prev) => ({
      ...prev,
      [cat]: [
        ...prev[cat],
        withAutoTotal(cat, { ...makeRow[cat](), ...overrides }),
      ],
    }))
  }, [])

  const removeRow = useCallback((cat, rowId) => {
    setCaja((prev) => ({
      ...prev,
      [cat]: prev[cat].filter((row) => row.id !== rowId),
    }))
  }, [])

  const replaceCategoria = useCallback((cat, rows) => {
    setCaja((prev) => ({
      ...prev,
      [cat]: normalizeRows(cat, rows),
    }))
  }, [])

  // ── Cargar datos ────────────────────────────────────────
  const fetchCaja = useCallback(async (fechaArg = fecha) => {
    setLoading(true)
    setError(null)

    try {
      // 1. Mostrar draft local inmediatamente mientras llega la API
      let localDraft = null
      if (typeof window !== 'undefined') {
        const raw = localStorage.getItem(lsKey(fechaArg))
        if (raw) localDraft = normalizeCaja(JSON.parse(raw), fechaArg)
      }
      setCaja(localDraft ?? defaultCaja(fechaArg))

      // 2. Llamadas en paralelo
      const params = new URLSearchParams({ fecha: fechaArg })
      const [registroRes, creditosRes, pagosRes] = await Promise.allSettled([
        fetchJSON(`/api/caja?${params}`),
        fetchJSON(`/api/creditos?fecha_desde=${fechaArg}&fecha_hasta=${fechaArg}`),
        fetchJSON(`/api/pagos?${params}`),
      ])

      // 3. Construir estado final (sin mutaciones)
      let next = localDraft ?? defaultCaja(fechaArg)

      if (registroRes.status === 'fulfilled') {
        const payload = registroRes.value
        const remoto  = payload?.registro?.data ?? payload?.registro?.detalle
          ?? payload?.data ?? payload?.detalle ?? payload?.registro ?? payload ?? null

        if (remoto) {
          const remoteCaja = normalizeCaja(remoto, fechaArg)
          next = localDraft
            ? { ...remoteCaja, ...localDraft, fecha: fechaArg }
            : remoteCaja
        }
      }

      // credito y pagos siempre vienen de la API (readonly)
      const credito = creditosRes.status === 'fulfilled'
        ? normalizeRows('credito', mapCreditos(
            creditosRes.value?.creditos ?? creditosRes.value?.data ?? creditosRes.value ?? []
          ))
        : []

      const pagos = pagosRes.status === 'fulfilled'
        ? normalizeRows('pagos', mapPagos(
            pagosRes.value?.pagos ?? pagosRes.value?.data ?? pagosRes.value ?? []
          ))
        : []

      setCaja(normalizeCaja({ ...next, credito, pagos }, fechaArg))

    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [fecha])

  // ── Guardar ─────────────────────────────────────────────
  const guardar = useCallback(async () => {
    setSaving(true)
    setSaved(false)
    setError(null)

    try {
      const normalized = normalizeCaja(caja, fecha)
      const resumen    = calcularResumen(normalized, tara) // ← usa tara actual

      const detalle = [
        ...EDITABLE_CATS.map((categoria) => ({ categoria, data: normalized[categoria] })),
        ...READONLY_CATS.map((categoria) => ({ categoria, data: normalized[categoria] })),
      ]

      const data = await fetchJSON('/api/caja', {
        method: 'POST',
        body: JSON.stringify({
          fecha: normalized.fecha,
          total: resumen.totalRegistro,
          resumen,
          detalle,
        }),
      })

      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
      return data
    } catch (e) {
      setError(e.message)
      throw e
    } finally {
      setSaving(false)
    }
  }, [caja, fecha, tara]) // ← tara en dependencias

  // ── Limpiar draft ───────────────────────────────────────
  const clearLocalDraft = useCallback((fechaArg = fecha) => {
    if (typeof window === 'undefined') return
    localStorage.removeItem(lsKey(fechaArg))
  }, [fecha])

  // ── Refetch automático ──────────────────────────────────
  useEffect(() => {
    if (!autoFetch) return
    fetchCaja(fecha)
  }, [fecha, autoFetch, fetchCaja])

  // ── Resumen memoizado ───────────────────────────────────
  // Se recalcula cuando cambia caja o cuando el usuario
  // modifica TARA_VALOR en la configuración
  const resumen = useMemo(() => calcularResumen(caja, tara), [caja, tara])

  return {
    fecha, setFecha,
    caja, setCaja,
    loading, saving, saved, error,
    resumen,
    updateRow, addRow, addRowWith, removeRow, replaceCategoria,
    guardar,
    refetch: fetchCaja,
    clearLocalDraft,
  }
}
