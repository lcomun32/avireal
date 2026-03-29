// lib/api.js
const base = '/api'  // rutas internas de Next.js

export const getClientes    = ()     => fetch(`${base}/clientes`).then(r => r.json())
export const createCliente  = (body) => fetch(`${base}/clientes`, { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } }).then(r => r.json())
export const getCreditos    = (clienteId) => fetch(`${base}/creditos${clienteId ? `?cliente_id=${clienteId}` : ''}`).then(r => r.json())
export const createPago     = (body) => fetch(`${base}/pagos`, { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } }).then(r => r.json())