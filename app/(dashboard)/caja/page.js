'use client'
import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { useCaja, PUESTOS, PRODUCTOS, PROVEEDORES, makeRow,calcularIngresoPorProveedor,calcularBalanza,calcularSimple    } from '@/hooks/useCaja'
import ModalConfiguracion from '@/components/caja/ModalConfiguracion'

const PRECIO_DEFAULT_PROVEEDOR = { Jonas: 8, Dante: 10.6, Externo: 11, Descuento:0, Otro: 10 }

const TIPO_TABLA = {
  INGRESO:  'ingreso',
  COMPLETA: 'completa',
  SIMPLE:   'simple',
  GASTO:    'gasto',
  LECTURA:  'lectura',
  BALANZA:  'balanza',
}

const COLUMNAS_NAV = {
  ingreso:  ['proveedor', 'peso', 'cantJava', 'cantPollos', 'precioKg'],
  completa: ['puesto', 'producto', 'peso', 'precio'],
  simple:   ['puesto', 'total'],
  gasto:    ['puesto', 'concepto', 'total'],
  balanza:  ['puesto', 'producto', 'peso'],
}

const CATEGORIAS = [
  { id: 'ingresoMercaderia', label: 'Ingreso Camal',         tipo: TIPO_TABLA.INGRESO  },
  { id: 'balanza',           label: 'Ingreso Balanza (KG) ', tipo: TIPO_TABLA.BALANZA },
  { id: 'reporte',           label: 'Reporte',               tipo: TIPO_TABLA.SIMPLE },
  { id: 'compras',           label: 'Compras',               tipo: TIPO_TABLA.SIMPLE },
  { id: 'basura',            label: 'Basura',                tipo: TIPO_TABLA.SIMPLE },
  { id: 'error',             label: 'Error',                 tipo: TIPO_TABLA.SIMPLE },
  { id: 'devolucionAyer',    label: 'Devolución Ayer',       tipo: TIPO_TABLA.BALANZA },
  { id: 'devolucionHoy',     label: 'Devolución Hoy',        tipo: TIPO_TABLA.BALANZA },
  { id: 'culqi',             label: 'Culqi',                 tipo: TIPO_TABLA.SIMPLE },
  { id: 'plinYape',          label: 'Plin/Yape',             tipo: TIPO_TABLA.SIMPLE },
  { id: 'caja',              label: 'Caja',                  tipo: TIPO_TABLA.SIMPLE },
  { id: 'gasto',             label: 'Gasto',                 tipo: TIPO_TABLA.GASTO  },
  { id: 'credito',           label: 'Crédito (API)',          tipo: TIPO_TABLA.LECTURA },
  { id: 'pagos',             label: 'Pagos (API)',            tipo: TIPO_TABLA.LECTURA },
]

const PROVEEDOR_COLORES = {
  Jonas:   'bg-blue-50 border-blue-100',
  Dante:   'bg-emerald-50 border-emerald-100',
  Externo: 'bg-amber-50 border-amber-100',
  Descuento: 'bg-red-50 border-red-100',
  Otro:    'bg-purple-50 border-purple-100',
}

const PROVEEDOR_COLORES_TR = {
  Jonas:   'bg-blue-50 hover:bg-blue-100 border-blue-100',
  Dante:   'bg-emerald-50 hover:bg-emerald-100 border-emerald-100',
  Externo: 'bg-amber-50 hover:bg-amber-100 border-amber-100',
  Descuento: 'bg-red-50 hover:bg-red-100 border-red-100',
  Otro:    'bg-purple-50 hover:bg-purple-100 border-purple-100',
}

function StatCard({ icon, label, value, color }) {
  return (
    <div className={`bg-white rounded-xl border ${color.border} shadow-sm p-5`}>
      <div className={`w-10 h-10 rounded-lg ${color.bg} flex items-center justify-center text-xl mb-3`}>
        {icon}
      </div>
      <p className={`text-2xl font-bold ${color.text}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  )
}

const calcularGruposIngreso = (caja, config) => {
  if (!caja?.ingresoMercaderia) return []
  const grupos = {}

  caja.ingresoMercaderia.forEach((row) => {
    const prov = row.proveedor === 'Otro' ? (row.proveedorCustom || 'Otro') : row.proveedor
    if (!prov) return

    const peso   = parseFloat(row.peso)     || 0
    const javas  = parseFloat(row.cantJava) || 0
    const precio = parseFloat(row.precioKg) || 0
    const pollos = parseInt(row.cantPollos) || 0

    const taraVal   = parseFloat(config.TARA_POR_PROVEEDOR?.[row.proveedor] ?? config.TARA_DEFAULT) || 0
    const taraTotal = javas * taraVal
    const pesoNeto  = Math.max(peso - taraTotal, 0)

    const mermaVal  = parseFloat(config.MERMA_POR_PROVEEDOR?.[row.proveedor] ?? 0) || 0
    const merma     = Math.abs(pollos) * mermaVal
    const pesoFinal = Math.max(pesoNeto - merma, 0)

    if (!grupos[prov]) {
      grupos[prov] = { pesoBruto: 0, pesoNeto: 0, merma: 0, pesoFinal: 0, total: 0, pollos: 0 }
    }

    grupos[prov].pesoBruto += peso
    grupos[prov].pesoNeto  += pesoNeto
    grupos[prov].merma     += merma
    grupos[prov].pesoFinal += pesoFinal
    grupos[prov].pollos    += pollos
    grupos[prov].total     += pesoNeto * precio
  })

  if (grupos['Descuento'] && grupos['Jonas']) {
    grupos['Jonas'].total     += grupos['Descuento'].total
    grupos['Jonas'].pollos    += grupos['Descuento'].pollos
    grupos['Jonas'].pesoFinal += grupos['Descuento'].pesoFinal
    delete grupos['Descuento']
  }

  return Object.entries(grupos).map(([proveedor, data]) => ({ proveedor, ...data }))
}




const calcularResumen = (caja, config) => {
  const grupos          = calcularGruposIngreso(caja, config)
  const ingresoMercaderia = grupos.reduce((acc, g) => acc + g.total, 0)

  const reporte        = sumTotal(caja.reporte)
  const compras        = sumTotal(caja.compras)
  const basura         = sumTotal(caja.basura)
  const error          = sumTotal(caja.error)
  const culqi          = sumTotal(caja.culqi)
  const plinYape       = sumTotal(caja.plinYape)
  const efectivoCaja   = sumTotal(caja.caja)
  const gasto          = sumTotal(caja.gasto)
  const credito        = sumTotal(caja.credito)
  const pagos          = sumTotal(caja.pagos)
  const devolucionAyer = sumTotal(caja.devolucionAyer)
  const devolucionHoy  = sumTotal(caja.devolucionHoy)

  const subtotalCaja  = reporte - compras - basura - error
  const subtotalDia   = culqi + plinYape + efectivoCaja - gasto + credito
  const subtotalDianc = culqi + plinYape + efectivoCaja - gasto
  const totalDia      = subtotalCaja - subtotalDia
  const digital       = culqi + plinYape
  const cobrado       = efectivoCaja + digital + pagos
  const devoluciones  = devolucionAyer + devolucionHoy
  const perdidas      = basura + error
  const balance       = cobrado - gasto - credito - devoluciones - perdidas

  return {
    ingresoMercaderia,
    reporte, compras, basura, error,
    culqi, plinYape, efectivoCaja, gasto, credito, pagos,
    devolucionAyer, devolucionHoy,
    subtotalCaja, subtotalDia, subtotalDianc, totalDia,
    digital, cobrado, devoluciones, perdidas, balance,
  }
}




export default function CajaPage() {

  
  const [config, setConfig] = useState({
    TARA_POR_PROVEEDOR: { Jonas: '7.10', Dante: '6.80', Externo: '0', Descuento:'0', Otro: '0' },
    MERMA_POR_PROVEEDOR: { Jonas: '0.300', Dante: '0.320', Externo: '0.300', Descuento:'0', Otro: '0' },

    CANT_JAVA_POR_PROVEEDOR:   { Jonas: '5', Dante: '5', Externo: '0', Descuento:'0', Otro: '0' },   // ← nuevo
    CANT_POLLOS_POR_PROVEEDOR: { Jonas: '35', Dante: '0', Externo: '0', Descuento:'0', Otro: '0' }, // ← nuevo

    TARA_DEFAULT:        '7.10',
    CANT_JAVA_DEFAULT:   '5',
  })


  // ── Detectar móvil por JS (más fiable que Tailwind hidden/sm:block) ──
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])


  const [removingRows, setRemovingRows] = useState(new Set())

  const [precioProveedor, setPrecioProveedor] = useState(PRECIO_DEFAULT_PROVEEDOR)

  const {
    caja, loading, saving, saved, error, resumen,
    updateRow, addRow, addRowWith, removeRow, replaceCategoria, guardar,
  } = useCaja({
    tara:            parseFloat(config.TARA_DEFAULT),
    cantJavaDefault: parseFloat(config.CANT_JAVA_DEFAULT),
    precioKgDefault: precioProveedor['Jonas'] ?? 8.3,
  })

  //console.log(resumen)

  const [expandidos, setExpandidos] = useState(() => {
    try {
      const guardado = localStorage.getItem('caja_expandidos')
      if (guardado) return JSON.parse(guardado)
    } catch {}
    return CATEGORIAS.reduce((acc, cat) => ({ ...acc, [cat.id]: true }), {})
  })

  const [showModalConfig, setShowModalConfig] = useState(true)
  const inputRefs = useRef({})
  const getKey = (catId, rowId, campo) => `${catId}-${rowId}-${campo}`

  useEffect(() => { localStorage.setItem('caja_config', JSON.stringify(config)) }, [config])
  useEffect(() => { localStorage.setItem('caja_precios', JSON.stringify(precioProveedor)) }, [precioProveedor])
  useEffect(() => { localStorage.setItem('caja_expandidos', JSON.stringify(expandidos)) }, [expandidos])

  const toggleCategoria = (id) =>
    setExpandidos((prev) => ({ ...prev, [id]: !prev[id] }))

  const handleChange = (catId, rowId, campo, valor) => {
    updateRow(catId, rowId, campo, valor)

    if (catId === 'ingresoMercaderia' && campo === 'proveedor') {
      // Actualiza precio
      updateRow(catId, rowId, 'precioKg', precioProveedor[valor] ?? '')
      // Actualiza cant. java por proveedor
      updateRow(catId, rowId, 'cantJava', config.CANT_JAVA_POR_PROVEEDOR?.[valor] ?? config.CANT_JAVA_DEFAULT ?? '')
      // Actualiza cant. pollos por proveedor
      updateRow(catId, rowId, 'cantPollos', config.CANT_POLLOS_POR_PROVEEDOR?.[valor] ?? '')
    }
  }

  const handleKeyDown = (e, catId, rowIndex, campo, tipo) => {
    const columnas = COLUMNAS_NAV[tipo]
    if (!columnas) return
    const colIndex = columnas.indexOf(campo)
    let nextRow = rowIndex
    let nextCol = colIndex
    switch (e.key) {
      case 'Enter':
      case 'ArrowDown':  e.preventDefault(); nextRow++; break
      case 'ArrowUp':    e.preventDefault(); nextRow--; break
      case 'ArrowRight': nextCol++; break
      case 'ArrowLeft':  nextCol--; break
      default: return
    }
    const filas = caja?.[catId] ?? []
    if (nextRow < 0 || nextRow >= filas.length) return
    if (nextCol < 0 || nextCol >= columnas.length) return
    inputRefs.current[getKey(catId, filas[nextRow].id, columnas[nextCol])]?.focus()
  }

  const handleRemoveRow = (catId, rowId) => {

    setRemovingRows(prev => new Set([...prev, rowId]))
    setTimeout(() => {
      removeRow(catId, rowId)
      setRemovingRows(prev => {
        const next = new Set(prev)
        next.delete(rowId)
        return next
      })
    }, 320)
  }
  
  const handleAgregarFila = useCallback((catId) => {
    if (catId === 'ingresoMercaderia') {
      const proveedorDefault = 'Jonas'
      addRowWith(catId, {
        proveedor: proveedorDefault,
        cantJava:  config.CANT_JAVA_POR_PROVEEDOR?.[proveedorDefault] ?? config.CANT_JAVA_DEFAULT,
        cantPollos: config.CANT_POLLOS_POR_PROVEEDOR?.[proveedorDefault] ?? '',
        precioKg:  precioProveedor[proveedorDefault] ?? '',
      })
    } else {
      addRow(catId)
    }
  }, [addRow, addRowWith, config, precioProveedor])


  const subtotalesIngreso = useMemo(
    () => calcularGruposIngreso(caja, config),
    [caja, config]
  )

  const ingresoSubtotal = useMemo(
    () => subtotalesIngreso.reduce((acc, g) => acc + g.total, 0),
    [subtotalesIngreso]
  )

  const subtotales = useMemo(() => {
    const result = {}
    CATEGORIAS.forEach(({ id, tipo }) => {
      if (id === 'ingresoMercaderia') {
        result[id] = ingresoSubtotal
      } else if (tipo === TIPO_TABLA.BALANZA) {
        result[id] = (caja?.[id] ?? []).reduce((acc, row) => acc + (parseFloat(row.peso) || 0), 0)
      } else {
        result[id] = (caja?.[id] ?? []).reduce((acc, row) => acc + (parseFloat(row.total) || 0), 0)
      }
    })
    return result
  }, [caja, ingresoSubtotal])
  

  const stats = useMemo(() => {
    if (!caja) return null

    return {
      // ── INGRESO CAMAL ──────────────────────────────────────────
      ingresoMercaderia: calcularIngresoPorProveedor(subtotalesIngreso),
      // Ejemplo de uso:
      // stats.ingresoMercaderia.porProveedor['Jonas'].pesoBruto  → kg bruto Jonas
      // stats.ingresoMercaderia.porProveedor['Jonas'].pesoFinal  → kg final Jonas
      // stats.ingresoMercaderia.porProveedor['Jonas'].aves       → cant. pollos Jonas
      // stats.ingresoMercaderia.porProveedor['Jonas'].total      → S/ valor Jonas
      // stats.ingresoMercaderia.totalBruto                       → total bruto todos
      // stats.ingresoMercaderia.totalFinal                       → total final todos
      // stats.ingresoMercaderia.totalValor                       → S/ total todos

      // ── BALANZAS ───────────────────────────────────────────────
      balanza:         calcularBalanza(caja.balanza),
      devolucionAyer:  calcularBalanza(caja.devolucionAyer),
      devolucionHoy:   calcularBalanza(caja.devolucionHoy),
      // Ejemplo de uso:
      // stats.balanza.porPuesto['P1']           → kg del puesto P1
      // stats.balanza.porProducto['Pierna']     → kg de pierna en total
      // stats.balanza.totalKg                   → kg totales balanza
      // stats.devolucionAyer.totalKg            → kg devueltos ayer

      // ── SIMPLES ────────────────────────────────────────────────
      reporte:    calcularSimple(caja.reporte),
      compras:    calcularSimple(caja.compras),
      basura:     calcularSimple(caja.basura),
      error:      calcularSimple(caja.error),
      culqi:      calcularSimple(caja.culqi),
      plinYape:   calcularSimple(caja.plinYape),
      cajaDinero: calcularSimple(caja.caja),
      gasto:      calcularSimple(caja.gasto),
      credito:    calcularSimple(caja.credito),
      pagos:      calcularSimple(caja.pagos),
      // Ejemplo de uso:
      // stats.reporte.porPuesto['P1']   → S/ del puesto P1 en reporte
      // stats.reporte.total             → S/ total reporte
      // stats.compras.porPuesto['P4']   → S/ compras del puesto P4
    }
  }, [caja, subtotalesIngreso])

const cuadre = useMemo(() => {
  if (!stats) return null

  const costoMercaderiaPrima =  stats.ingresoMercaderia
  const costoMercaderia   = stats.ingresoMercaderia.totalValor
  const ventaTotal        = stats.reporte.total
  const kgVendidos        = stats.balanza.totalKg
  const kgDisponible      = stats.ingresoMercaderia.totalFinal
  const devoluciones      = stats.devolucionAyer.totalKg + stats.devolucionHoy.totalKg
  const gastosTotal       = stats.gasto.total
  const comprasTotal      = stats.compras.total
  const perdidas          = stats.basura.total + stats.error.total
  const cobrado           = stats.culqi.total + stats.plinYape.total + stats.cajaDinero.total + stats.pagos.total
  const creditoPendiente  = stats.credito.total - stats.pagos.total

  const utilidadBruta     = ventaTotal - costoMercaderia
  const utilidadNeta      = utilidadBruta - gastosTotal - comprasTotal - perdidas
  const conversion        = kgDisponible > 0 ? (kgVendidos / kgDisponible) * 100 : 0
  const precioPromedioVenta = kgVendidos > 0 ? ventaTotal / kgVendidos : 0
  const costoPromKg       = kgDisponible > 0 ? costoMercaderia / kgDisponible : 0
  const margenPorKg       = precioPromedioVenta - costoPromKg

  const deberiaHaber      = ventaTotal - comprasTotal - perdidas - (devoluciones * precioPromedioVenta) + stats.pagos.total
  const diferenciaCaja    = cobrado - deberiaHaber

  return {
    costoMercaderiaPrima,
    costoMercaderia,
    ventaTotal,
    kgVendidos,
    kgDisponible,
    devoluciones,         // en kg
    gastosTotal,
    cobrado,
    creditoPendiente,
    utilidadBruta,        // S/ → Reporte - Costo camal
    utilidadNeta,         // S/ → Utilidad bruta - gastos - compras - pérdidas
    conversion,           // % → kg vendidos / kg disponible
    precioPromedioVenta,  // S//kg → precio promedio al que se vendió
    costoPromKg,          // S//kg → costo promedio del camal
    margenPorKg,          // S//kg → ganancia por kg vendido
    diferenciaCaja,       // S/ → 0 = cuadre perfecto, positivo = sobra, negativo = falta
  }
}, [stats])
  console.log("STATS: ",cuadre)


  const fmt = (n) => (n || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })

  const renderInput = (catId, row, index, campo, tipo, extra = {}) => (
    <input
      type="text"
      inputMode="decimal"
      value={row[campo] ?? ''}
      onChange={(e) => {
        const value = e.target.value.replace(/[^0-9.]/g, '')
        handleChange(catId, row.id, campo, value)
      }}
      onFocus={(e) => {
        const input = e.target
        if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
          setTimeout(() => { input.setSelectionRange(0, input.value.length) }, 50)
        } else {
          input.select()
        }
      }}
      onKeyDown={(e) => handleKeyDown(e, catId, index, campo, tipo)}
      ref={(el) => (inputRefs.current[getKey(catId, row.id, campo)] = el)}
      className="w-full pl-3 pr-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent border-gray-200 bg-white text-gray-900"
      {...extra}
    />
  )

  const renderInputInt = (catId, row, index, campo, tipo, extra = {}) => (
    <input
      type="number"
      step={1}
      inputMode="decimal"
      value={row[campo] ?? ''}
  onChange={(e) => {
    let value = e.target.value

    // Permitir números, punto y signo negativo
    value = value.replace(/[^0-9.-]/g, '')

    // Solo un "-" al inicio
    if (value.includes('-')) {
      value = value.replace(/(?!^)-/g, '')
    }

    // Solo un punto decimal
    const parts = value.split('.')
    if (parts.length > 2) {
      value = parts[0] + '.' + parts.slice(1).join('')
    }

    handleChange(catId, row.id, campo, value)
  }}
      onFocus={(e) => {
        const input = e.target
        if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
          setTimeout(() => { input.setSelectionRange(0, input.value.length) }, 50)
        } else {
          input.select()
        }
      }}
      onKeyDown={(e) => handleKeyDown(e, catId, index, campo, tipo)}
      ref={(el) => (inputRefs.current[getKey(catId, row.id, campo)] = el)}
      className="w-full pl-3 pr-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent border-gray-200 bg-white text-gray-900"
      {...extra}
    />
  )

  const renderInputInt2 = (catId, row, index, campo, tipo, extra = {}) => (
    <input
      type="number"
      step={1}
      value={row[campo] ?? ''}
      onChange={(e) => handleChange(catId, row.id, campo, e.target.value)}
      onKeyDown={(e) => handleKeyDown(e, catId, index, campo, tipo)}
      ref={(el) => (inputRefs.current[getKey(catId, row.id, campo)] = el)}
      className="w-full pl-8 pr-7 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent border-gray-200 bg-white text-gray-900"
      {...extra}
    />
  )

  // ─── MÓVIL: render de cada registro como card ────────────────
const renderCardMovil = (cat, row, index) => {

  const isRemoving = removingRows.has(row.id)


  const colorClass = cat.tipo === TIPO_TABLA.INGRESO
    ? (PROVEEDOR_COLORES[row.proveedor] ?? 'bg-gray-50 border-gray-200')
    : 'bg-gray-50 border-gray-200'

  // Grid 3 columnas con inline style — 100% fiable sin depender de Tailwind purge
  const grid3 = { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }

  // Input compacto para móvil
  const inputCls = "w-full px-1 py-1.5 border rounded text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400 border-gray-200 bg-white"
  const labelCls = "text-[10px] text-gray-400 font-medium block mb-0.5"

  return (
      <div
    key={row.id}
    className={`rounded-lg border p-2 mb-2 ${colorClass}`}
    style={{
      transition: 'opacity 0.3s ease, transform 0.3s ease, max-height 0.35s ease, padding 0.3s ease, margin 0.3s ease',
      opacity:    isRemoving ? 0 : 1,
      transform:  isRemoving ? 'scale(0.95) translateX(10px)' : 'scale(1) translateX(0)',
      maxHeight:  isRemoving ? '0px' : '300px',
      overflow:   'hidden',
      padding:    isRemoving ? '0' : undefined,
      marginBottom: isRemoving ? '0' : undefined,
    }}
  >

      {/* INGRESO: 2 filas × 3 cols */}
      {cat.tipo === TIPO_TABLA.INGRESO && (
        <div style={grid3}>
          <div>
            <span className={labelCls}>Proveedor</span>
            <select value={row.proveedor || ''}
              onChange={(e) => handleChange(cat.id, row.id, 'proveedor', e.target.value)}
              className="w-full px-1 py-1.5 border rounded text-xs  border-gray-200  focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white">
              <option value="">Seleccionar...</option>
              {PROVEEDORES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            {row.proveedor === 'Otro' && (
              <input type="text" placeholder="Especificar"
                value={row.proveedorCustom || ''}
                onChange={(e) => handleChange(cat.id, row.id, 'proveedorCustom', e.target.value)}
                className={inputCls + ' mt-1'} />
            )}
          </div>
          <div>
            <span className={labelCls}>Peso</span>
            <input type="text" inputMode="decimal"
              value={row.peso ?? ''}
              onChange={(e) => handleChange(cat.id, row.id, 'peso', e.target.value.replace(/[^0-9.]/g, ''))}
              onFocus={(e) => setTimeout(() => e.target.select(), 50)}
              ref={(el) => (inputRefs.current[getKey(cat.id, row.id, 'peso')] = el)}
              className={inputCls} />
          </div>
          <div>
            <span className={labelCls}>Cant. Java</span>
            <input type="number" step={1}
              value={row.cantJava ?? ''}
              onChange={(e) => handleChange(cat.id, row.id, 'cantJava', e.target.value)}
              onFocus={(e) => setTimeout(() => e.target.select(), 50)}
              ref={(el) => (inputRefs.current[getKey(cat.id, row.id, 'cantJava')] = el)}
              className={inputCls} />
          </div>
          <div>
            <span className={labelCls}>Cant. Pollos</span>
            <input type="number" step={1}
              value={row.cantPollos ?? ''}
              onChange={(e) => handleChange(cat.id, row.id, 'cantPollos', e.target.value)}
              onFocus={(e) => setTimeout(() => e.target.select(), 50)}
              ref={(el) => (inputRefs.current[getKey(cat.id, row.id, 'cantPollos')] = el)}
              className={inputCls} />
          </div>
          <div>
            <span className={labelCls}>Precio/Kg</span>
            <input type="text" inputMode="decimal"
              value={row.precioKg ?? ''}
              onChange={(e) => handleChange(cat.id, row.id, 'precioKg', e.target.value.replace(/[^0-9.]/g, ''))}
              onFocus={(e) => setTimeout(() => e.target.select(), 50)}
              ref={(el) => (inputRefs.current[getKey(cat.id, row.id, 'precioKg')] = el)}
              className={inputCls} />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: '4px' }}>
            <button onClick={() => handleRemoveRow(cat.id, row.id)}
              className="text-red-400 hover:text-red-600 text-base font-bold ">✕</button>
          </div>
        </div>
      )}

      {/* BALANZA */}
      {cat.tipo === TIPO_TABLA.BALANZA && (
        <div style={grid3}>
          <div>
            <span className={labelCls}>Puesto</span>
            <select value={row.puesto || ''}
              onChange={(e) => handleChange(cat.id, row.id, 'puesto', e.target.value)}
              className="w-full px-1 py-1.5 border rounded text-xs border-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white">
              {PUESTOS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <span className={labelCls}>Producto</span>
            <select value={row.producto || ''}
              onChange={(e) => handleChange(cat.id, row.id, 'producto', e.target.value)}
              className="w-full border rounded p-1 text-xs bg-white">
              {PRODUCTOS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <span className={labelCls}>Peso</span>
            <input type="text" inputMode="decimal"
              value={row.peso ?? ''}
              onChange={(e) => handleChange(cat.id, row.id, 'peso', e.target.value.replace(/[^0-9.]/g, ''))}
              onFocus={(e) => setTimeout(() => e.target.select(), 50)}
              ref={(el) => (inputRefs.current[getKey(cat.id, row.id, 'peso')] = el)}
              className={inputCls} />
          </div>
          <div  style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: '4px' }}>
            <button onClick={() => handleRemoveRow(cat.id, row.id)}
              className="text-red-400 hover:text-red-600 text-base font-bold">✕</button>
          </div>
        </div>
      )}

      {/* COMPLETA: 2 filas × 3 cols */}
      {cat.tipo === TIPO_TABLA.COMPLETA && (
        <div style={grid3}>
          <div>
            <span className={labelCls}>Puesto</span>
            <select value={row.puesto || ''}
              onChange={(e) => handleChange(cat.id, row.id, 'puesto', e.target.value)}
              className="w-full px-1 py-1.5 border rounded text-xs  border-gray-200  focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white">
              {PUESTOS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <span className={labelCls}>Producto</span>
            <select value={row.producto || ''}
              onChange={(e) => handleChange(cat.id, row.id, 'producto', e.target.value)}
              className="w-full border rounded p-1 text-xs bg-white">
              {PRODUCTOS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <span className={labelCls}>Peso</span>
            <input type="text" inputMode="decimal"
              value={row.peso ?? ''}
              onChange={(e) => handleChange(cat.id, row.id, 'peso', e.target.value.replace(/[^0-9.]/g, ''))}
              onFocus={(e) => setTimeout(() => e.target.select(), 50)}
              className={inputCls} />
          </div>
          <div>
            <span className={labelCls}>Precio</span>
            <input type="text" inputMode="decimal"
              value={row.precio ?? ''}
              onChange={(e) => handleChange(cat.id, row.id, 'precio', e.target.value.replace(/[^0-9.]/g, ''))}
              onFocus={(e) => setTimeout(() => e.target.select(), 50)}
              className={inputCls} />
          </div>
          <div>
            <span className={labelCls}>Total</span>
            <p className="text-xs font-medium text-gray-700 py-1.5">
              S/ {(parseFloat(row.total) || 0).toFixed(2)}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: '4px' }}>
            <button onClick={() => handleRemoveRow(cat.id, row.id)}
              className="text-red-400 hover:text-red-600 text-base font-bold">✕</button>
          </div>
        </div>
      )}

      {/* SIMPLE: 1 fila × 3 cols */}
      {cat.tipo === TIPO_TABLA.SIMPLE && (
        <div style={grid3}>
          <div>
            <span className={labelCls}>Puesto</span>
            <select value={row.puesto || ''}
              onChange={(e) => handleChange(cat.id, row.id, 'puesto', e.target.value)}
              className="w-full px-1 py-1.5 border rounded text-xs  border-gray-200  focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white">
              {PUESTOS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <span className={labelCls}>Total</span>
            <input type="text" inputMode="decimal"
              value={row.total ?? ''}
              onChange={(e) => handleChange(cat.id, row.id, 'total', e.target.value.replace(/[^0-9.]/g, ''))}
              onFocus={(e) => setTimeout(() => e.target.select(), 50)}
              className={inputCls} />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: '4px' }}>
            <button onClick={() => handleRemoveRow(cat.id, row.id)}
              className="text-red-400 hover:text-red-600 text-base font-bold">✕</button>
          </div>
        </div>
      )}

      {/* GASTO: 2 filas */}
      {cat.tipo === TIPO_TABLA.GASTO && (
        <div style={grid3}>
          <div>
            <span className={labelCls}>Puesto</span>
            <select value={row.puesto || ''}
              onChange={(e) => handleChange(cat.id, row.id, 'puesto', e.target.value)}
              className="w-full border rounded p-1 text-xs bg-white">
              {PUESTOS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <span className={labelCls}>Concepto</span>
            <input type="text" value={row.concepto || ''}
              onChange={(e) => handleChange(cat.id, row.id, 'concepto', e.target.value)}
              placeholder="Descripción"
              className={inputCls} />
          </div>
          <div>
            <span className={labelCls}>Total</span>
            <input type="text" inputMode="decimal"
              value={row.total ?? ''}
              onChange={(e) => handleChange(cat.id, row.id, 'total', e.target.value.replace(/[^0-9.]/g, ''))}
              onFocus={(e) => setTimeout(() => e.target.select(), 50)}
              className={inputCls} />
          </div>
          <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
            <button onClick={() => handleRemoveRow(cat.id, row.id)}
              className="text-red-400 hover:text-red-600 text-xs">✕ Eliminar</button>
          </div>
        </div>
      )}

      {/* LECTURA */}
      {cat.tipo === TIPO_TABLA.LECTURA && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2px 4px' }}>
          <span className="text-gray-600 text-sm">{row.puesto}</span>
          <span className="font-medium text-sm">S/ {(parseFloat(row.total) || 0).toFixed(2)}</span>
        </div>
      )}

    </div>
  )
}

  // ─── DESKTOP: render de cada fila como <tr> ──────────────────
  const renderFilaDesktop = (cat, row, index) => {
    const isRemoving = removingRows.has(row.id)
    const rowColorClass = cat.tipo === TIPO_TABLA.INGRESO
      ? (PROVEEDOR_COLORES_TR[row.proveedor] ?? 'hover:bg-gray-50')
      : 'hover:bg-gray-50'

    return (
        <tr
          key={row.id}
          className={`border-b last:border-0 border-gray-200 transition-colors ${rowColorClass}`}
          style={{
            transition: 'opacity 0.3s ease, transform 0.3s ease',
            opacity:    isRemoving ? 0 : 1,
            //transform:  isRemoving ? 'translatex(20px)' : 'translateX(0)',
          }}
        >

        {/* INGRESO */}
        {cat.tipo === TIPO_TABLA.INGRESO && <>
          <td className="px-2 py-2 w-[170px] max-w-[180px]">
            <select value={row.proveedor || ''}
              onChange={(e) => handleChange(cat.id, row.id, 'proveedor', e.target.value)}
              className="w-full px-1 py-2 border text-sm  rounded-lg border-gray-200  focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
              <option value="">Seleccionar...</option>
              {PROVEEDORES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            {row.proveedor === 'Otro' && (
              <input type="text" placeholder="Especificar"
                value={row.proveedorCustom || ''}
                onChange={(e) => handleChange(cat.id, row.id, 'proveedorCustom', e.target.value)}
                className="w-full mt-2 px-1 py-2 border rounded-lg   border-gray-200  focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" />
            )}
          </td>
          <td className="px-2 py-2">{renderInput(cat.id, row, index, 'peso', cat.tipo)}</td>
          <td className="px-2 py-2">{renderInputInt(cat.id, row, index, 'cantJava', cat.tipo)}</td>
          <td className="px-2 py-2">{renderInputInt(cat.id, row, index, 'cantPollos', cat.tipo)}</td>
          <td className="px-2 py-2">{renderInput(cat.id, row, index, 'precioKg', cat.tipo)}</td>
          <td className="px-2 py-2 ">
            <button onClick={() => handleRemoveRow(cat.id, row.id)} className="text-red-400 hover:text-red-600 pr-2">✕</button>
          </td>
        </>}

        {/* BALANZA */}
        {cat.tipo === TIPO_TABLA.BALANZA && <>
          <td className="px-2 py-2">
            <select value={row.puesto || ''}
              onChange={(e) => handleChange(cat.id, row.id, 'puesto', e.target.value)}
              className="w-full border rounded p-1 text-sm">
              {PUESTOS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </td>
          <td className="px-2 py-2">
            <select value={row.producto || ''}
              onChange={(e) => handleChange(cat.id, row.id, 'producto', e.target.value)}
              className="w-full border rounded p-1 text-sm">
              {PRODUCTOS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            {row.producto === 'Otros' && (
              <input type="text" placeholder="Especificar"
                value={row.productoCustom || ''}
                onChange={(e) => handleChange(cat.id, row.id, 'productoCustom', e.target.value)}
                className="w-full border rounded p-1 text-sm mt-1" />
            )}
          </td>

          <td className="px-2 py-2">{renderInput(cat.id, row, index, 'peso', cat.tipo)}</td>
          <td className="px-2 py-2">
            <button onClick={() => handleRemoveRow(cat.id, row.id)} className="text-red-400 hover:text-red-600">✕</button>
          </td>
        </>}


        {/* COMPLETA */}
        {cat.tipo === TIPO_TABLA.COMPLETA && <>
          <td className="px-2 py-2">
            <select value={row.puesto || ''}
              onChange={(e) => handleChange(cat.id, row.id, 'puesto', e.target.value)}
              className="w-full border rounded p-1 text-sm">
              {PUESTOS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </td>
          <td className="px-2 py-2">
            <select value={row.producto || ''}
              onChange={(e) => handleChange(cat.id, row.id, 'producto', e.target.value)}
              className="w-full border rounded p-1 text-sm">
              {PRODUCTOS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            {row.producto === 'Otros' && (
              <input type="text" placeholder="Especificar"
                value={row.productoCustom || ''}
                onChange={(e) => handleChange(cat.id, row.id, 'productoCustom', e.target.value)}
                className="w-full border rounded p-1 text-sm mt-1" />
            )}
          </td>
          <td className="px-2 py-2">{renderInput(cat.id, row, index, 'peso', cat.tipo)}</td>
          <td className="px-2 py-2">{renderInput(cat.id, row, index, 'precio', cat.tipo)}</td>
          <td className="px-2 py-2 font-medium text-gray-700">
            S/ {(parseFloat(row.total) || 0).toFixed(2)}
          </td>
          <td className="px-2 py-2">
            <button onClick={() => handleRemoveRow(cat.id, row.id)} className="text-red-400 hover:text-red-600">✕</button>
          </td>
        </>}

        {/* SIMPLE */}
        {cat.tipo === TIPO_TABLA.SIMPLE && <>
          <td className="px-2 py-2">
            <select value={row.puesto || ''}
              onChange={(e) => handleChange(cat.id, row.id, 'puesto', e.target.value)}
              className="w-full border rounded p-1 text-sm">
              {PUESTOS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </td>
          <td className="px-2 py-2">{renderInput(cat.id, row, index, 'total', cat.tipo)}</td>
          <td className="px-2 py-2">
            <button onClick={() => handleRemoveRow(cat.id, row.id)} className="text-red-400 hover:text-red-600">✕</button>
          </td>
        </>}

        {/* GASTO */}
        {cat.tipo === TIPO_TABLA.GASTO && <>
          <td className="px-2 py-2">
            <select value={row.puesto || ''}
              onChange={(e) => handleChange(cat.id, row.id, 'puesto', e.target.value)}
              className="w-full border rounded p-1 text-sm">
              {PUESTOS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </td>
          <td className="px-2 py-2">
            <input type="text" value={row.concepto || ''}
              onChange={(e) => handleChange(cat.id, row.id, 'concepto', e.target.value)}
              placeholder="Descripción"
              className="w-full pl-8 pr-7 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent border-gray-200 bg-white text-gray-900" />
          </td>
          <td className="px-2 py-2">{renderInput(cat.id, row, index, 'total', cat.tipo)}</td>
          <td className="px-2 py-2">
            <button onClick={() => handleRemoveRow(cat.id, row.id)} className="text-red-400 hover:text-red-600">✕</button>
          </td>
        </>}

        {/* LECTURA */}
        {cat.tipo === TIPO_TABLA.LECTURA && <>
          <td className="px-2 py-2 text-gray-600">{row.puesto}</td>
          <td className="px-2 py-2 font-medium">S/ {(parseFloat(row.total) || 0).toFixed(2)}</td>
          <td></td>
        </>}

      </tr>
    )
  }

  // ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Caja</h1>
          <p className="text-sm text-gray-500 mt-0.5">Control de ingresos, gastos y cuadre diario</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={guardar} disabled={saving}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition shadow-sm disabled:opacity-50">
            <span>{saved ? '✓' : '💾'}</span>
            {saving ? 'Guardando...' : saved ? 'Guardado' : 'Guardar Caja'}
          </button>
          <button onClick={() => setShowModalConfig(true)}
            className="inline-flex items-center justify-center w-10 h-10 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition"
            title="Configuración">⚙️</button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-lg">⚠️ {error}</div>
      )}

      {/* ── Stats ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon="📊" label="Total Calculado" value={`S/ ${fmt(stats.ingresoMercaderia.porProveedor['Jonas'].total )}`}
          color={{ border: 'border-emerald-100', bg: 'bg-emerald-50', text: 'text-emerald-700' }} />
        <StatCard icon="💳" label="Créditos del Día" value={`S/ ${fmt(resumen.credito)}`}
          color={{ border: 'border-amber-100', bg: 'bg-amber-50', text: 'text-amber-700' }} />
        <StatCard icon="💵" label="Pagos Recibidos" value={`S/ ${fmt(resumen.pagos)}`}
          color={{ border: 'border-blue-100', bg: 'bg-blue-50', text: 'text-blue-700' }} />
        <StatCard icon="📉" label="Gastos y Compras" value={`S/ ${fmt(resumen.compras + resumen.gasto)}`}
          color={{ border: 'border-red-100', bg: 'bg-red-50', text: 'text-red-700' }} />
      </div>

      {/* ── Secciones Dinámicas ─────────────────────────────── */}
      <div className="space-y-4">
        {CATEGORIAS.map((cat) => {
          const filas = caja?.[cat.id] ?? []

          return (
            <div key={cat.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">

              {/* Cabecera colapsable */}
              <div
                className="flex flex-col sm:flex-row sm:justify-between sm:items-center bg-gray-50 px-4 py-3 border-b border-gray-200 cursor-pointer hover:bg-gray-100 transition gap-2"
                onClick={() => toggleCategoria(cat.id)}
              >
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                  <span className="text-gray-400">{expandidos[cat.id] ? '▼' : '▶'}</span>
                  {cat.label}
                </h3>
                <div className="flex gap-3 items-center justify-between sm:justify-end">
                  <span className="font-bold text-gray-700 text-sm">
                    {cat.tipo === TIPO_TABLA.BALANZA
                      ? `Total: ${(subtotales[cat.id] || 0).toFixed(2)} kg`
                      : `Subtotal: S/ ${(subtotales[cat.id] || 0).toFixed(2)}`
                    }
                  </span>
                  {cat.tipo !== TIPO_TABLA.LECTURA && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleAgregarFila(cat.id)
                        setExpandidos((p) => ({ ...p, [cat.id]: true }))
                      }}
                      className="bg-gray-800 text-white text-xs px-3 py-1.5 rounded hover:bg-gray-700 transition"
                    >+ Agregar</button>
                  )}
                </div>
              </div>

              {/* Contenido */}
              {expandidos[cat.id] && (
                <div className="p-4">

                  {/* ══ MÓVIL: cards ══ */}
                  {isMobile && (
                    <div>
                      {filas.length === 0
                        ? <p className="text-center text-gray-400 py-4 italic text-sm">No hay registros</p>
                        : filas.map((row, index) => renderCardMovil(cat, row, index))
                      }
                    </div>
                  )}

                  {/* ══ DESKTOP: tabla ══ */}
                  {!isMobile && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                          <tr>
                            {cat.tipo === TIPO_TABLA.INGRESO && <>
                              <th className="px-3 py-2">Proveedor</th>
                              <th className="px-3 py-2">Peso Bruto</th>
                              <th className="px-3 py-2">Cant. x Java</th>
                              <th className="px-3 py-2">Cant. Total</th>
                              <th className="px-3 py-2">Precio x Kg</th>
                              <th className="px-3 py-2"></th>
                            </>}

                            {cat.tipo === TIPO_TABLA.BALANZA && <>
                              <th className="px-3 py-2">Puesto</th>
                              <th className="px-3 py-2">Producto</th>
                              <th className="px-3 py-2">Peso</th>
                              <th className="px-3 py-2"></th>
                            </>}
                            {cat.tipo === TIPO_TABLA.COMPLETA && <>
                              <th className="px-3 py-2">Puesto</th>
                              <th className="px-3 py-2">Producto</th>
                              <th className="px-3 py-2">Peso</th>
                              <th className="px-3 py-2">Precio</th>
                              <th className="px-3 py-2">Total</th>
                              <th className="px-3 py-2"></th>
                            </>}
                            {(cat.tipo === TIPO_TABLA.SIMPLE || cat.tipo === TIPO_TABLA.LECTURA) && <>
                              <th className="px-3 py-2">Puesto</th>
                              <th className="px-3 py-2">Total</th>
                              <th className="px-3 py-2"></th>
                            </>}
                            {cat.tipo === TIPO_TABLA.GASTO && <>
                              <th className="px-3 py-2">Puesto</th>
                              <th className="px-3 py-2">Concepto</th>
                              <th className="px-3 py-2">Total</th>
                              <th className="px-3 py-2"></th>
                            </>}
                          </tr>
                        </thead>
                        <tbody>
                          {filas.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="text-center text-gray-400 py-4 italic">
                                No hay registros
                              </td>
                            </tr>
                          ) : filas.map((row, index) => renderFilaDesktop(cat, row, index))}
                        </tbody>
                      </table>
                    </div>
                  )}

              <div className="flex justify-end mt-3 pt-3 border-t border-gray-100">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleAgregarFila(cat.id)
                        setExpandidos((p) => ({ ...p, [cat.id]: true }))
                      }}
                      className="bg-gray-800 text-white text-xs px-3 py-1.5 rounded hover:bg-gray-700 transition"
                    >+ Agregar Final</button>
              </div>


                  {/* Resumen ingreso */}
                  {cat.id === 'ingresoMercaderia' && subtotalesIngreso.length > 0 && (
                    <div className="mt-4 bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                      <h4 className="text-sm font-semibold text-indigo-800 mb-2">Resumen por Proveedor</h4>
                      <div className="space-y-2">
                        {subtotalesIngreso.map((res) => (
                          <div key={res.proveedor}
                            className="grid grid-cols-2 sm:flex sm:justify-between text-sm text-indigo-900  border-indigo-200/50  gap-x-2 gap-y-0.5">
                            <span className="font-medium">{res.proveedor}</span>
                            <span className="font-medium">Bruto: {res.pesoBruto.toFixed(2)} kg</span>
                            <span className="font-medium">Neto(B-Tara): {res.pesoNeto.toFixed(2)} kg</span>
                            <span className="font-medium text-orange-600">Merma: -{res.merma.toFixed(2)} kg</span>  {/* ← nuevo */}
                            <span className="font-medium">Final (N-M): {res.pesoFinal.toFixed(2)} kg</span>   {/* ← nuevo */}
                            <span className="font-medium">Aves: {res.pollos}</span>
                            <span className=" font-bold col-span-2 sm:col-span-1">Total: S/ {res.total.toFixed(2)}</span>
                          </div>
                        ))}

                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-center  border-t border-gray-100">
                <button onClick={() => toggleCategoria(cat.id)}
                  className="flex w-full items-center justify-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-100 px-3 py-1.5 rounded-lg transition">
                  <span>▲</span> {cat.label}
                </button>
              </div>

            </div>
          )
        })}
      </div>

      {/* ── Modal Config ────────────────────────────────────── */}
      {showModalConfig && (
        <ModalConfiguracion
          config={config}
          precioProveedor={precioProveedor}
          onSave={(newConfig, newPrecios) => {
            setConfig(newConfig)
            setPrecioProveedor(newPrecios)
            const filasActualizadas = (caja?.ingresoMercaderia ?? []).map((row) => ({
              ...row,
              precioKg: newPrecios[row.proveedor] ?? row.precioKg,
              cantJava: newConfig.CANT_JAVA_DEFAULT ?? row.cantJava,
            }))
            replaceCategoria('ingresoMercaderia', filasActualizadas)
            setShowModalConfig(false)
          }}
          onClose={() => setShowModalConfig(false)}
        />
      )}

    </div>
  )
}