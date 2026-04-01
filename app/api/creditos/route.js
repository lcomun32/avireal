import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)

  const clienteId = searchParams.get('cliente_id')
  //const puestoId  = searchParams.get('puesto_id')

  let query = supabase
    .from('creditos_resumen')
    .select('*')
    .order('creado_en', { ascending: false })

  if (clienteId) query = query.eq('cliente_id', clienteId)
  //if (puestoId)  query = query.eq('puesto_id', puestoId)

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}


// export async function GET(request) {
//   const supabase = await createClient()
//   const { searchParams } = new URL(request.url)
//   const clienteId = searchParams.get('cliente_id')

//   let query = supabase
//     .from('creditos')
//     .select('*')
//     .order('creado_en', { ascending: false })

//   if (clienteId) query = query.eq('cliente_id', clienteId)

//   const { data: creditos, error } = await query
//   if (error) return NextResponse.json({ error: error.message }, { status: 500 })
//   if (!creditos.length) return NextResponse.json([])

//   // ── 1. Pagos aplicados por crédito ───────────────────────────
//   const creditoIds = creditos.map(c => c.id)

//   const { data: pagoCreditoData } = await supabase
//     .from('pago_credito')
//     .select('credito_id, monto_aplicado, pago_id')
//     .in('credito_id', creditoIds)

//   const totalPagadoMap    = {}  // { credito_id: number }
//   const pagoIdsPorCredito = {}  // { credito_id: pago_id[] }

//   for (const pc of (pagoCreditoData ?? [])) {
//     totalPagadoMap[pc.credito_id] = (totalPagadoMap[pc.credito_id] ?? 0) + Number(pc.monto_aplicado ?? 0)
//     if (!pagoIdsPorCredito[pc.credito_id]) pagoIdsPorCredito[pc.credito_id] = []
//     pagoIdsPorCredito[pc.credito_id].push(pc.pago_id)
//   }

//   // ── 2. Fecha del último pago por crédito ─────────────────────
//   const todosLosPagoIds = [...new Set((pagoCreditoData ?? []).map(pc => pc.pago_id).filter(Boolean))]
//   const ultimoPagoMap = {}  // { credito_id: fecha }

//   if (todosLosPagoIds.length) {
//     const { data: pagosData } = await supabase
//       .from('pagos')
//       .select('id, fecha')
//       .in('id', todosLosPagoIds)

//     for (const pago of (pagosData ?? [])) {
//       for (const [creditoId, pagoIds] of Object.entries(pagoIdsPorCredito)) {
//         if (pagoIds.includes(pago.id)) {
//           const actual = ultimoPagoMap[creditoId]
//           if (!actual || new Date(pago.fecha) > new Date(actual)) {
//             ultimoPagoMap[creditoId] = pago.fecha
//           }
//         }
//       }
//     }
//   }

//   const MS_POR_DIA = 1000 * 60 * 60 * 24
//   const hoy = Date.UTC(
//     new Date().getFullYear(),
//     new Date().getMonth(),
//     new Date().getDate()
//   )

//   // ── 3. Enriquecer + calcular estado dinámico ─────────────────
// const formatted = creditos.map(c => {
//   const total_pagado    = totalPagadoMap[c.id] ?? 0
//   const saldo_pendiente = Math.max(0, Number(c.total ?? 0) - total_pagado)
//   const progreso_pct    = c.total > 0 ? Math.round((total_pagado / Number(c.total)) * 100) : 0

//   // ✅ Calcular días desde la fecha del crédito (usando UTC para ignorar hora)
//   const fechaRef   = new Date(c.creado_en )
//   const fechaUTC   = Date.UTC(fechaRef.getFullYear(), fechaRef.getMonth(), fechaRef.getDate())
//   const diasPasados = Math.floor((hoy - fechaUTC) / MS_POR_DIA)

//   // pagado  → liquidado
//   // vencido → pendiente con 3+ días sin pagar
//   // pendiente → debe algo pero tiene menos de 3 días
//   const estado =
//     saldo_pendiente === 0  ? 'pagado'    :
//     diasPasados    >= 3    ? 'vencido'   :
//                              'pendiente'

//     return {
//       ...c,
//       total_pagado,
//       saldo_pendiente,
//       progreso_pct,
//       dias_pendiente: saldo_pendiente > 0 ? diasPasados : 0,
//       estado,                              // ✅ sobreescribe cualquier valor residual de la tabla
//       ultimo_pago_fecha: ultimoPagoMap[c.id] ?? null,
//       clientes: {
//         nombre: c.cliente_nombre,
//         dni: null,
//       },
//     }
//   })

//   return NextResponse.json(formatted)
// }

export async function POST(request) {
  const supabase = await createClient()
  const body = await request.json()

  // ── MODO BATCH (formulario / audio-IA) ──────────────────────
  if (Array.isArray(body.lineas)) {
    const { puesto_id, puesto_nombre, lineas } = body

    if (!puesto_id || !lineas.length) {
      return NextResponse.json({ error: 'puesto_id y lineas son requeridos' }, { status: 400 })
    }

    const rows = lineas
      .filter(l => l.cliente_nombre?.trim() && Number(l.total) > 0)
      .map(l => ({
        cliente_id:     l.cliente_id     ?? null,
        cliente_nombre: l.cliente_nombre.trim(),
        puesto_id,
        puesto_nombre,
        total:          Number(l.total),
        nota:           l.nota?.trim()   || null,
        imagen_url:     l.imagen_url     ?? null,
      }))

    if (!rows.length) {
      return NextResponse.json({ error: 'No hay líneas válidas' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('creditos')
      .insert(rows)   // Supabase batch nativo — 1 sola llamada a la DB
      .select()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const formatted = data.map(c => ({
      ...c,
      estado:          'pendiente',
      total_pagado:    0,
      saldo_pendiente: Number(c.total ?? 0),
      progreso_pct:    0,
      clientes: { nombre: c.cliente_nombre, dni: null },
    }))

    return NextResponse.json(formatted, { status: 201 })
  }

  // ── MODO SINGLE (retro-compatibilidad) ─────────────────────
  const { cliente_id, puesto_id, puesto_nombre, total, nota, imagen_url } = body
  let cliente_nombre = body.cliente_nombre ?? null

  if (cliente_id && !cliente_nombre) {
    const { data: cliente } = await supabase
      .from('clientes').select('nombre').eq('id', cliente_id).single()
    if (cliente) cliente_nombre = cliente.nombre
  }

  const { data, error } = await supabase
    .from('creditos')
    .insert([{ cliente_id, cliente_nombre, puesto_id, puesto_nombre, total, nota, imagen_url }])
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(
    { ...data, estado: 'pendiente', total_pagado: 0,
      saldo_pendiente: Number(data.total ?? 0), progreso_pct: 0 },
    { status: 201 }
  )
}

// import { createClient } from '@/lib/supabase/server'
// import { NextResponse } from 'next/server'

// export async function GET(request) {
//   const supabase = await createClient()
//   const { searchParams } = new URL(request.url)
//   const clienteId = searchParams.get('cliente_id')

//   let query = supabase
//     .from('creditos')
//     .select('*')
//     .order('creado_en', { ascending: false })

//   if (clienteId) query = query.eq('cliente_id', clienteId)

//   const { data, error } = await query
//   if (error) return NextResponse.json({ error: error.message }, { status: 500 })

//   const formatted = data.map(c => ({
//     ...c,
//     clientes: {
//       nombre: c.cliente_nombre,
//       dni: null,
//     },
//   }))

//   return NextResponse.json(formatted)
// }

// export async function POST(request) {
//   const supabase = await createClient()
//   const body = await request.json()

//   const {
//     cliente_id,
//     puesto_id,
//     puesto_nombre,
//     total,
//     nota,
//     imagen_url,
//     estado,
//   } = body

//   let cliente_nombre = body.cliente_nombre ?? null

//   if (cliente_id && !cliente_nombre) {
//     const { data: cliente } = await supabase
//       .from('clientes')
//       .select('nombre')
//       .eq('id', cliente_id)
//       .single()

//     if (cliente) cliente_nombre = cliente.nombre
//   }

//   const { data, error } = await supabase
//     .from('creditos')
//     .insert([{
//       cliente_id,
//       cliente_nombre,
//       puesto_id,
//       puesto_nombre,
//       total,
//       nota,
//       imagen_url,
//       estado: estado ?? 'pendiente',
//     }])
//     .select()
//     .single()

//   if (error) return NextResponse.json({ error: error.message }, { status: 500 })
//   return NextResponse.json(data, { status: 201 })
// }

//VERSION OK
// import { createClient } from '@/lib/supabase/server'
// import { NextResponse } from 'next/server'

// export async function GET(request) {
//   const supabase = await createClient()
//   const { searchParams } = new URL(request.url)
//   const clienteId = searchParams.get('cliente_id')

//   // Sin FK: los campos cliente_nombre y cliente_dni ya están en la tabla
//   let query = supabase
//     .from('creditos')
//     .select('*')
//     .order('created_at', { ascending: false })

//   if (clienteId) query = query.eq('cliente_id', clienteId)

//   const { data, error } = await query
//   if (error) return NextResponse.json({ error: error.message }, { status: 500 })

//   // Formateamos para mantener la misma estructura que espera el frontend
//   const formatted = data.map(c => ({
//     ...c,
//     clientes: {          // el hook y los componentes esperan c.clientes.nombre
//       nombre: c.cliente_nombre,
//       dni:    c.cliente_dni,
//     }
//   }))

//   return NextResponse.json(formatted)
// }

// export async function POST(request) {
//   const supabase = await createClient()
//   const body = await request.json()

//   const { cliente_id, monto_total, cuotas, tasa_interes, fecha_inicio, estado } = body

//   // Si viene cliente_id, buscamos nombre y dni para desnormalizar
//   let cliente_nombre = body.cliente_nombre ?? null
//   let cliente_dni    = body.cliente_dni    ?? null

//   if (cliente_id && !cliente_nombre) {
//     const { data: cliente } = await supabase
//       .from('clientes')
//       .select('nombre, dni')
//       .eq('id', cliente_id)
//       .single()

//     if (cliente) {
//       cliente_nombre = cliente.nombre
//       cliente_dni    = cliente.dni
//     }
//   }

//   const { data, error } = await supabase
//     .from('creditos')
//     .insert([{
//       cliente_id,
//       cliente_nombre,
//       cliente_dni,
//       monto_total,
//       saldo_pendiente: monto_total,   // al crear, saldo = monto total
//       cuotas,
//       tasa_interes,
//       fecha_inicio,
//       estado: estado ?? 'activo'
//     }])
//     .select()
//     .single()

//   if (error) return NextResponse.json({ error: error.message }, { status: 500 })
//   return NextResponse.json(data, { status: 201 })
// }

// SIN JOIN CON FK
// import { createClient } from '@/lib/supabase/server'
// import { NextResponse } from 'next/server'

// export async function GET(request) {
//   const supabase = await createClient()
//   const { searchParams } = new URL(request.url)
//   const clienteId = searchParams.get('cliente_id')

//   let query = supabase
//     .from('creditos')
//     .select('*, clientes(nombre, dni)')
//     .order('created_at', { ascending: false })

//   if (clienteId) query = query.eq('cliente_id', clienteId)

//   const { data, error } = await query
//   if (error) return NextResponse.json({ error: error.message }, { status: 500 })
//   return NextResponse.json(data)
// }

// export async function POST(request) {
//   const supabase = await createClient()
//   const body = await request.json()

//   const { cliente_id, monto_total, cuotas, tasa_interes, fecha_inicio, estado } = body

//   const { data, error } = await supabase
//     .from('creditos')
//     .insert([{ cliente_id, monto_total, cuotas, tasa_interes, fecha_inicio, estado: estado ?? 'activo' }])
//     .select()
//     .single()

//   if (error) return NextResponse.json({ error: error.message }, { status: 500 })
//   return NextResponse.json(data, { status: 201 })
// }