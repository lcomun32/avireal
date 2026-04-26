"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";


const navLinks = [
    { href: "/clientes", label: "Clientes", icon: "👥" },
    { href: "/creditos", label: "Créditos", icon: "💳" },
    { href: "/pagos", label: "Pagos", icon: "💰" },
    { href: "/caja", label: "Caja", icon: "🔖" },
];

export default function Navbar({ user, onLogout }) {
    const [open, setOpen] = useState(false);

    const pathname = usePathname();

    return (
        <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2 shrink-0">
                        <div className="w-8 h-8  rounded-lg flex items-center justify-center text-white text-sm font-bold">
                            <Image
                                src="/logo.png" 
                                alt="Avireal logo"
                                width={250}
                                height={10}
                                className="rounded-full "
                                priority 
                            />
                        </div>
                        <span className="text-lg font-bold text-yellow-600 block">
                            Avireal
                        </span>
                    </Link>

                    {/* Links desktop */}
                    <nav className="hidden md:flex items-center gap-1">
                    {navLinks.map((link) => {
                        const isActive = pathname === link.href;

                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all
                                    ${
                                        isActive
                                            ? "bg-indigo-100 text-indigo-700"
                                            : "text-gray-600 hover:text-indigo-600 hover:bg-indigo-50"
                                    }`}
                            >
                                <span>{link.icon}</span>
                                {link.label}
                            </Link>
                        );
                    })}
                    </nav>

                    {/* Usuario + Logout desktop */}
                    <div className="hidden md:flex items-center gap-3">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-semibold text-sm">
                                {user?.nombre?.charAt(0).toUpperCase() ?? "A"}
                            </div>
                            <span className="text-sm text-gray-600 max-w-[140px] truncate">
                                {user?.email}
                            </span>
                        </div>
                        <button
                            onClick={onLogout}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-all border border-red-100"
                        >
                            <span>🚪</span> Salir
                        </button>
                    </div>

                    {/* Hamburger mobile */}
                    <button
                        className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition"
                        onClick={() => setOpen(!open)}
                        aria-label="Menú"
                    >
                        {open ? (
                            <svg
                                className="w-6 h-6"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            </svg>
                        ) : (
                            <svg
                                className="w-6 h-6"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M4 6h16M4 12h16M4 18h16"
                                />
                            </svg>
                        )}
                    </button>
                </div>
            </div>

            {/* Menú móvil */}
            {open && (
                <div className="md:hidden bg-white border-t border-gray-100 px-4 pt-3 pb-4 space-y-1">
                  {navLinks.map((link) => {
                      const isActive = pathname === link.href;

                      return (
                          <Link
                              key={link.href}
                              href={link.href}
                              onClick={() => setOpen(false)}
                              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition
                                  ${
                                      isActive
                                          ? "bg-indigo-100 text-indigo-700"
                                          : "text-gray-700 hover:bg-indigo-50 hover:text-indigo-600"
                                  }`}
                          >
                              <span className="text-base">{link.icon}</span>
                              {link.label}
                          </Link>
                      );
                  })}

                    <div className="pt-3 mt-2 border-t border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-semibold text-sm">
                                {user?.nombre?.charAt(0) ?? "A"}
                            </div>
                            <span className="text-sm text-gray-500 truncate max-w-[160px]">
                                {user?.email}
                            </span>
                        </div>
                        <button
                            onClick={() => {
                                setOpen(false);
                                onLogout();
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 border border-red-100"
                        >
                            🚪 Salir
                        </button>
                    </div>
                </div>
            )}
        </header>
    );
}
