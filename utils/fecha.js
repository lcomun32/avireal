// utils/fecha.js
export function formatFechaPeru(fecha, tipo = 'fecha') {
  if (!fecha) return '—'

  // 🔧 Limpiar zona (tratar todo como Perú)
  let limpia = fecha
    .replace('Z', '')
    .replace('+00:00', '')
    .split('.')[0]

  const isoLocal = limpia.replace(' ', 'T')
  const f = new Date(isoLocal)

  const formatos = {
    'fecha-hora': {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    },
    'fecha': {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    },
    'hora': {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    },
    'completo': {
      year: 'numeric',
      month: 'long',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    },
    'corto': {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }
  }

  return f.toLocaleString('es-PE', formatos[tipo] || formatos['fecha-hora'])
}