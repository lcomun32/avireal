import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const creditoId = searchParams.get('credito_id')

  let query = supabase
    .from('pagos')
    .select('*, creditos(monto_total, cliente_id)')
    .order('fecha_pago', { ascending: false })

  if (creditoId) query = query.eq('credito_id', creditoId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request) {
  const supabase = await createClient()
  const body = await request.json()

  const { credito_id, monto_pagado, fecha_pago, metodo_pago, observacion } = body

  const { data, error } = await supabase
    .from('pagos')
    .insert([{ credito_id, monto_pagado, fecha_pago, metodo_pago, observacion }])
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}