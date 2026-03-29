import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/clientes
export async function GET() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/clientes
export async function POST(request) {
  const supabase = await createClient()
  const body = await request.json()

  const { nombre, dni, telefono, email, direccion } = body

  const { data, error } = await supabase
    .from('clientes')
    .insert([{ nombre, dni, telefono, email, direccion }])
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}