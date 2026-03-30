import { NextResponse } from 'next/server'

//const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${process.env.GEMINI_API_KEY}`
const PUESTOS_VALIDOS = ['P1', 'P4', 'P5']

const SYSTEM_PROMPT = `
Eres un asistente de caja de mercado peruano. El usuario dicta créditos de clientes en voz (español peruano).
Extrae todos los créditos mencionados. Devuelve SOLO un JSON válido, sin markdown, sin explicaciones.

Estructura exacta:
{
  "puesto_id": "P1" | "P4" | "P5" | null,
  "lineas": [
    { "cliente_nombre": "string", "total": number, "nota": "string | null" }
  ]
}
Reglas:
- Si no mencionan puesto, usa P1.
- Todos los nombres empiezan por mayuscula SIN tildes ni diacríticos (la base de datos no los usa).
- "total" es siempre número positivo (ej: 25.50). "soles", "sol", "S/" indican monto.
- "nota" es opcional, null si no hay.
- Extrae TODOS los clientes mencionados, uno por línea.
- El separador del monto o total es un "."
`.trim()


const normalizar = (str = '') =>
  str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

// ── Sanitiza un nombre: sin tildes, Title Case ─────────────────
const sanitizarNombre = (nombre = '') =>
  normalizar(nombre)
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')

export async function POST(request) {
  const { transcripcion } = await request.json()

  if (!transcripcion?.trim()) {
    return NextResponse.json({ error: 'Transcripción vacía' }, { status: 400 })
  }

  const res = await fetch(GEMINI_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ parts: [{ text: transcripcion }] }],
      generationConfig: {
        responseMimeType: 'application/json',  // fuerza JSON puro
        temperature: 0.1,                      // respuestas más deterministas
      },
    }),
  })

  const geminiData = await res.json()

  if (!res.ok) {
    const msg = geminiData.error?.message ?? 'Error Gemini'
    return NextResponse.json({ error: msg }, { status: res.status })
  }

  try {
    const text   = geminiData.candidates[0].content.parts[0].text
    const parsed = JSON.parse(text)

    // Sanitizar puesto por si Gemini inventa uno
    if (Array.isArray(parsed.lineas)) {
      parsed.lineas = parsed.lineas.map(l => ({
        ...l,
        cliente_nombre: sanitizarNombre(l.cliente_nombre ?? ''),
        total:          Math.abs(Number(l.total) || 0),   // siempre positivo
        nota:           l.nota?.trim() || null,
      }))
    }

    return NextResponse.json(parsed)
  } catch {
    return NextResponse.json({ error: 'Respuesta inesperada de Gemini' }, { status: 500 })
  }
}