'use client'
import { useState } from 'react'

const PROVEEDOR_BADGE = {
  Jonas:   'text-blue-700 bg-blue-50 border-blue-200',
  Dante:   'text-emerald-700 bg-emerald-50 border-emerald-200',
  Externo: 'text-amber-700 bg-amber-50 border-amber-200',
  Otro:    'text-purple-700 bg-purple-50 border-purple-200',
}

// Merma defecto en kg por pollo/gallina
const MERMA_DEFAULT = { Jonas: '0.300', Dante: '0.320', Externo: '0.300', Otro: '0' }

export default function ModalConfiguracion({ config, precioProveedor, onSave, onClose }) {
  const [localConfig, setLocalConfig] = useState({ ...config })
  const [localPrecios, setLocalPrecios] = useState({ ...precioProveedor })

  const [taras, setTaras] = useState(
    () => config.TARA_POR_PROVEEDOR ?? { Jonas: '7.10', Dante: '7.50', Externo: '7.10', Otro: '0' }
  )

  const [mermas, setMermas] = useState(
    () => config.MERMA_POR_PROVEEDOR ?? MERMA_DEFAULT
  )

  const handleTaraChange  = (prov, val) => setTaras((prev)  => ({ ...prev, [prov]: val }))
  const handleMermaChange = (prov, val) => setMermas((prev) => ({ ...prev, [prov]: val }))

  const handleSave = () => {
    onSave(
      { ...localConfig, TARA_POR_PROVEEDOR: taras, MERMA_POR_PROVEEDOR: mermas },
      localPrecios
    )
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 shrink-0">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            ⚙️ Configuración
          </h2>
          <button onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold leading-none">×</button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-6 overflow-y-auto">

          {/* ── Parámetros Generales ── */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Parámetros Generales
            </h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cant. Javas por defecto (al agregar fila)
              </label>
              <input
                type="number" step="1"
                value={localConfig.CANT_JAVA_DEFAULT ?? ''}
                onChange={(e) => setLocalConfig({ ...localConfig, CANT_JAVA_DEFAULT: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* ── Tara por Proveedor ── */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Tara por Proveedor (kg/java)
            </h3>
            <div className="space-y-2">
              {Object.entries(taras).map(([prov, val]) => (
                <div key={prov} className="flex items-center gap-3">
                  <span className={`w-20 text-sm font-medium px-2 py-1 rounded text-center border shrink-0 ${PROVEEDOR_BADGE[prov] ?? 'text-gray-700 bg-gray-100 border-gray-200'}`}>
                    {prov}
                  </span>
                  <input
                    type="number" step="0.01" value={val}
                    onChange={(e) => handleTaraChange(prov, e.target.value)}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-xs text-gray-400 w-8 shrink-0">kg</span>
                </div>
              ))}
            </div>
          </div>



          {/* ── Precio por Proveedor ── */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Precio por Proveedor (S/ × kg)
            </h3>
            <div className="space-y-3">
              {Object.entries(localPrecios).map(([prov, precio]) => (
                <div key={prov} className="flex items-center gap-3">
                  <span className={`w-20 text-sm font-medium px-2 py-1 rounded text-center border shrink-0 ${PROVEEDOR_BADGE[prov] ?? 'text-gray-700 bg-gray-100 border-gray-200'}`}>
                    {prov}
                  </span>
                  <input
                    type="number" step="0.1" value={precio}
                    onChange={(e) => setLocalPrecios({ ...localPrecios, [prov]: e.target.value })}
                    onBlur={(e) => setLocalPrecios({ ...localPrecios, [prov]: parseFloat(e.target.value) || 0 })}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-xs text-gray-400 w-10 shrink-0">S//kg</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Merma por Proveedor ── */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
              Merma por Proveedor (kg/pollo)
            </h3>
            <p className="text-xs text-gray-400 mb-3">
              Kg descontados por cada ave ingresada. Otro no aplica merma.
            </p>
            <div className="space-y-2">
              {Object.entries(mermas).map(([prov, val]) => (
                <div key={prov} className="flex items-center gap-3">
                  <span className={`w-20 text-sm font-medium px-2 py-1 rounded text-center border shrink-0 ${PROVEEDOR_BADGE[prov] ?? 'text-gray-700 bg-gray-100 border-gray-200'}`}>
                    {prov}
                  </span>
                  <input
                    type="number" step="0.001" value={val}
                    disabled={prov === 'Otro'}
                    onChange={(e) => handleMermaChange(prov, e.target.value)}
                    className={`flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 border-gray-300
                      ${prov === 'Otro' ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : ''}`}
                  />
                  <span className="text-xs text-gray-400 w-16 shrink-0">kg/pollo</span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 shrink-0">
          <button onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
            Cancelar
          </button>
          <button onClick={handleSave}
            className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-semibold">
            Guardar cambios
          </button>
        </div>

      </div>
    </div>
  )
}