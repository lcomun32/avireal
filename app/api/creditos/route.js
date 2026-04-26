import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)

  const clienteId = searchParams.get('cliente_id')
  const fechaDesde  = searchParams.get('fecha_desde')  // 👈 nuevo
  const fechaHasta  = searchParams.get('fecha_hasta')  // 👈 nuevo

  

  //const puestoId  = searchParams.get('puesto_id')

  let query = supabase
    .from('creditos_resumen')
    .select('*')
    .order('creado_en', { ascending: false })

  if (clienteId) query = query.eq('cliente_id', clienteId)
  if (fechaDesde) query = query.gte('creado_en', `${fechaDesde}T00:00:00`)
  if (fechaHasta) query = query.lte('creado_en', `${fechaHasta}T23:59:59`)

  //if (puestoId)  query = query.eq('puesto_id', puestoId)

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}


export async function POST(request) {
  const supabase = await createClient()
  const body = await request.json()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .single()

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
        company_id:     profile.company_id,
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
    .insert([{ cliente_id, cliente_nombre, puesto_id, puesto_nombre, total, nota, imagen_url, company_id:     profile.company_id, }])
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(
    { ...data, estado: 'pendiente', total_pagado: 0,
      saldo_pendiente: Number(data.total ?? 0), progreso_pct: 0 },
    { status: 201 }
  )
}

