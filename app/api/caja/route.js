import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// ── GET: cargar caja por fecha ────────────────────────────
export async function GET(request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const fecha = searchParams.get('fecha')

  if (!fecha) {
    return NextResponse.json({ error: 'Falta parámetro fecha' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('caja_registros')           // 👈 ajusta al nombre real de tu tabla
    .select('*')
    .eq('fecha', fecha)
    .maybeSingle()                    // devuelve null si no existe, sin error

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data ?? null)
}


export async function POST(request) {
  const supabase = await createClient()
  const body = await request.json()

  const { fecha, total, resumen, detalle } = body

  if (!fecha) {
    return NextResponse.json({ error: 'Falta campo fecha' }, { status: 400 })
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (profileError || !profile?.company_id) {
    return NextResponse.json(
      { error: 'No se encontró company_id del usuario' },
      { status: 403 }
    )
  }

  const { data, error } = await supabase
    .from('caja_registros')
    .upsert(
      {
        fecha,
        total,
        resumen,
        detalle,
        company_id: profile.company_id,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'fecha',
      }
    )
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

// // ── POST: guardar/actualizar caja ─────────────────────────
// export async function POST(request) {
//   const supabase = await createClient()
//   const body = await request.json()

//   const { fecha, total, resumen, detalle } = body

//   if (!fecha) {
//     return NextResponse.json({ error: 'Falta campo fecha' }, { status: 400 })
//   }

//   const { data, error } = await supabase
//     .from('caja_registros')           // 👈 ajusta al nombre real de tu tabla
//     .upsert(
//       { fecha, total, resumen, detalle },
//       { onConflict: 'fecha' }         // si ya existe el registro de hoy, lo actualiza
//     )
//     .select()
//     .single()

//   if (error) {
//     return NextResponse.json({ error: error.message }, { status: 500 })
//   }

//   return NextResponse.json(data)
// }