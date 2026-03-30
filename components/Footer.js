import Image from 'next/image'

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">

          {/* Marca */}
          <div className="flex items-center gap-2 text-gray-600">
            <span className="text-lg">
                          <Image
                            src="/logo.png"   // ← nombre exacto del archivo en /public
                            alt="Avireal logo"
                            width={30}
                            height={40}
                            className="rounded-full "
                            priority                // carga inmediata al ser above the fold
                          />

            </span>
            <span className="font-semibold text-yellow-600">Avireal</span>
            <span className="text-gray-400 text-sm">— Gestión de créditos y pagos</span>
          </div>

          {/* Links */}
          <nav className="flex items-center gap-4 text-sm text-gray-400">
            <a href="/clientes" className="hover:text-indigo-500 transition">Clientes</a>
            <span>·</span>
            <a href="/creditos" className="hover:text-indigo-500 transition">Créditos</a>
            <span>·</span>
            <a href="/pagos" className="hover:text-indigo-500 transition">Pagos</a>
          </nav>

          {/* Copyright */}
          <p className="text-xs text-gray-400">
            © {year} Avireal. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  )
}