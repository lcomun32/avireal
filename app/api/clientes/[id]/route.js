import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/clientes/:id
export async function GET(_, { params }) {
  const supabase = await createClient()
  const { id } = await params

  const { data, error } = await supabase
    .from('clientes')
    .select('*, creditos(*)')  // trae créditos relacionados
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

// PUT /api/clientes/:id
export async function PUT(request, { params }) {
  const supabase = await createClient()
  const { id } = await params
  const body = await request.json()

  const { data, error } = await supabase
    .from('clientes')
    .update(body)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// DELETE /api/clientes/:id
export async function DELETE(_, { params }) {
  const supabase = await createClient()
  const { id } = await params

  const { error } = await supabase.from('clientes').delete().eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}