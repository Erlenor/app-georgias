"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

const NAV_LINKS = [
  { href: "/generator", label: "Generator", icon: "✦" },
  { href: "/personas", label: "Personas", icon: "🎭" },
  { href: "/agents", label: "Agents", icon: "🤖" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  return (
    <nav className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/generator" className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xl text-emerald-400">✦</span>
            <span className="text-white font-bold text-lg tracking-tight">App Georgias</span>
          </Link>

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  pathname === link.href || pathname.startsWith(link.href + "/")
                    ? "bg-slate-800 text-white"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                }`}
              >
                <span className="text-base">{link.icon}</span>
                {link.label}
              </Link>
            ))}
          </div>

          {/* User */}
          {user && (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-white text-sm font-medium">{user.name}</span>
                <span className="text-slate-500 text-xs">{user.role}</span>
              </div>
              {user.picture && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.picture}
                  alt={user.name}
                  className="w-8 h-8 rounded-full ring-2 ring-slate-700"
                />
              )}
              <button
                onClick={() => void logout()}
                className="text-slate-400 hover:text-white text-sm px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors"
              >
                Sign out
              </button>
            </div>
          )}

          {/* Mobile nav */}
          <div className="flex md:hidden items-center gap-2">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`p-2 rounded-lg text-lg transition-colors ${
                  pathname === link.href
                    ? "bg-slate-800 text-white"
                    : "text-slate-500 hover:text-white"
                }`}
                title={link.label}
              >
                {link.icon}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}
