import { NextResponse } from 'next/server'

const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${process.env.GEMINI_API_KEY}`
const PUESTOS_VALIDOS = ['P1', 'P4', 'P5']
const METODOS_VALIDOS = ['efectivo', 'yape', 'transferencia', 'otro']

const SYSTEM_PROMPT = `
Eres un asistente de caja de mercado peruano. El usuario dicta pagos de clientes en voz (español peruano).
Extrae todos los pagos mencionados. Devuelve SOLO un JSON válido, sin markdown, sin explicaciones.

Estructura exacta:
{
  "puesto_id": "P1" | "P4" | "P5" | null,
  "lineas": [
    { "cliente_nombre": "string", "monto": number, "metodo": "efectivo" | "yape" | "transferencia" | "otro", "observacion": "string | null" }
  ]
}

Reglas de extracción:
- Si no mencionan puesto, usa P1.
- "monto" es siempre número positivo (ej: 25.50). "soles", "sol", "S/" indican monto.
- "metodo" por defecto es "efectivo" si no se menciona. "yape", "yapeo", "yapié" → "yape". "transferencia", "transfe" → "transferencia".
- "observacion" es opcional, null si no hay.
- Extrae TODOS los clientes mencionados, uno por línea.
- El separador decimal es "." (nunca coma).

Reglas de formato de nombres:
- Escribe los nombres SIN tildes ni diacríticos (la base de datos no los usa).
  Ejemplos: "María" → "Maria", "Ángel" → "Angel", "Ramírez" → "Ramirez"
- Primera letra de cada palabra en mayúscula, resto en minúscula.
- Elimina caracteres especiales.
- Si el usuario dice un apodo o nombre incompleto, escríbelo tal como se oye.
`.trim()

const normalizar = (str = '') =>
  str.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

const sanitizarNombre = (nombre = '') =>
  normalizar(nombre)
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')

export async function POST(request) {
  const { transcripcion } = await request.json()

  if (!transcripcion?.trim())
    return NextResponse.json({ error: 'Transcripción vacía' }, { status: 400 })

  const res = await fetch(GEMINI_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ parts: [{ text: transcripcion }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.1 },
    }),
  })

  const geminiData = await res.json()
  if (!res.ok)
    return NextResponse.json({ error: geminiData.error?.message ?? 'Error Gemini' }, { status: res.status })

  try {
    const text   = geminiData.candidates[0].content.parts[0].text
    const parsed = JSON.parse(text)

    if (parsed.puesto_id && !PUESTOS_VALIDOS.includes(parsed.puesto_id))
      parsed.puesto_id = null

    if (Array.isArray(parsed.lineas)) {
      parsed.lineas = parsed.lineas.map(l => ({
        ...l,
        cliente_nombre: sanitizarNombre(l.cliente_nombre ?? ''),
        monto:          Math.abs(Number(l.monto) || 0),
        metodo:         METODOS_VALIDOS.includes(l.metodo) ? l.metodo : 'efectivo',
        observacion:    l.observacion?.trim() || null,
      }))
    }

    return NextResponse.json(parsed)
  } catch {
    return NextResponse.json({ error: 'Respuesta inesperada de Gemini' }, { status: 500 })
  }
}