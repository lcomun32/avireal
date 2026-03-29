import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const clienteId = searchParams.get('cliente_id')

  // Sin FK: los campos cliente_nombre y cliente_dni ya están en la tabla
  let query = supabase
    .from('creditos')
    .select('*')
    .order('created_at', { ascending: false })

  if (clienteId) query = query.eq('cliente_id', clienteId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Formateamos para mantener la misma estructura que espera el frontend
  const formatted = data.map(c => ({
    ...c,
    clientes: {          // el hook y los componentes esperan c.clientes.nombre
      nombre: c.cliente_nombre,
      dni:    c.cliente_dni,
    }
  }))

  return NextResponse.json(formatted)
}

export async function POST(request) {
  const supabase = await createClient()
  const body = await request.json()

  const { cliente_id, monto_total, cuotas, tasa_interes, fecha_inicio, estado } = body

  // Si viene cliente_id, buscamos nombre y dni para desnormalizar
  let cliente_nombre = body.cliente_nombre ?? null
  let cliente_dni    = body.cliente_dni    ?? null

  if (cliente_id && !cliente_nombre) {
    const { data: cliente } = await supabase
      .from('clientes')
      .select('nombre, dni')
      .eq('id', cliente_id)
      .single()

    if (cliente) {
      cliente_nombre = cliente.nombre
      cliente_dni    = cliente.dni
    }
  }

  const { data, error } = await supabase
    .from('creditos')
    .insert([{
      cliente_id,
      cliente_nombre,
      cliente_dni,
      monto_total,
      saldo_pendiente: monto_total,   // al crear, saldo = monto total
      cuotas,
      tasa_interes,
      fecha_inicio,
      estado: estado ?? 'activo'
    }])
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

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