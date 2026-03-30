import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const puestoId = searchParams.get('puesto_id')
  const q        = searchParams.get('q')          // búsqueda por nombre/dni

  let query = supabase
    .from('clientes')
    .select('id, nombre, dni, telefono, email, direccion, puesto_id')
    .order('nombre', { ascending: true })

  if (puestoId) query = query.eq('puesto_id', puestoId)

  // búsqueda rápida para el modal (type-ahead)
  if (q) query = query.ilike('nombre', `%${q}%`)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data ?? [])
}

export async function POST(request) {
  const supabase = await createClient()
  const body = await request.json()
  const { nombre, dni, telefono, email, direccion, puesto_id } = body

  if (!nombre?.trim())
    return NextResponse.json({ error: 'nombre es requerido' }, { status: 400 })

  const { data, error } = await supabase
    .from('clientes')
    .insert([{ nombre: nombre.trim(), dni, telefono, email, direccion, puesto_id }])
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data, { status: 201 })
}