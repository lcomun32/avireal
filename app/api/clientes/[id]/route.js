import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PATCH(request, { params }) {
  const supabase = await createClient()
  const body = await request.json()

  const { id } = await params

  if (!id) {
    return NextResponse.json(
      { error: 'id de cliente requerido' },
      { status: 400 }
    )
  }

  const {
    nombre,
    dni,
    telefono,
    email,
    direccion,
    puesto_id,
  } = body

  if (!nombre?.trim()) {
    return NextResponse.json(
      { error: 'nombre es requerido' },
      { status: 400 }
    )
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json(
      { error: 'No autenticado' },
      { status: 401 }
    )
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (profileError || !profile?.company_id) {
    return NextResponse.json(
      { error: 'Usuario sin company_id' },
      { status: 400 }
    )
  }

  const payload = {
    nombre: nombre.trim(),
    dni: dni?.trim() || null,
    telefono: telefono?.trim() || null,
    email: email?.trim() || null,
    direccion: direccion?.trim() || null,
    puesto_id: puesto_id || null,
  }

  const { data, error } = await supabase
    .from('clientes')
    .update(payload)
    .eq('id', id)
    .eq('company_id', profile.company_id)
    .select('id, company_id, nombre, dni, telefono, email, direccion, puesto_id')
    .single()

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json(data)
}