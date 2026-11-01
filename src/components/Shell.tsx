"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, FlaskConical, Home, LineChart, Sparkles } from "lucide-react";
import { useApiStatus } from "@/lib/useStatus";
import type { Profile } from "@/lib/store";

const NAV: { href: string; label: string; icon: typeof Home; also?: string }[] = [
  { href: "/today", label: "Today", icon: Home },
  { href: "/journey", label: "Journey", icon: LineChart },
  { href: "/products", label: "Products", icon: FlaskConical },
  { href: "/hair", label: "Hair", icon: Sparkles, also: "/prepare" },
  { href: "/report", label: "Report", icon: FileText },
];

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2">
      <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden>
        <circle cx="16" cy="16" r="14" fill="none" stroke="var(--primary)" strokeWidth="2.5" />
        <path d="M16 2 A14 14 0 0 1 16 30" fill="var(--primary)" opacity="0.85" />
      </svg>
      <span className="font-serif text-lg font-semibold tracking-tight">Between Cycles</span>
    </Link>
  );
}

export function Shell({ profile, children }: { profile?: Profile; children: React.ReactNode }) {
  const path = usePathname();
  const status = useApiStatus();
  return (
    <div className="min-h-dvh pb-24 md:pb-10">
      <header className="no-print sticky top-0 z-20 border-b border-line bg-bg/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <Logo />
          <div className="flex items-center gap-2 text-xs">
            {profile?.demo && (
              <span className="rounded-full bg-discuss-soft px-2.5 py-1 font-medium text-discuss">Demo data</span>
            )}
            {status && !status.live && (
              <span className="rounded-full bg-surface-2 px-2.5 py-1 text-muted" title="No API key configured">
                Offline mode
              </span>
            )}
          </div>
        </div>
        <nav className="mx-auto hidden max-w-3xl gap-1 px-4 pb-2 md:flex">
          {NAV.map(({ href, label, icon: Icon, also }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm ${
                path.startsWith(href) || (also && path.startsWith(also)) ? "bg-primary-soft font-semibold text-primary" : "text-muted hover:text-ink"
              }`}
            >
              <Icon size={16} />
              {label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>

      <nav className="no-print fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface md:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5">
          {NAV.map(({ href, label, icon: Icon, also }) => (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] ${
                path.startsWith(href) || (also && path.startsWith(also)) ? "font-semibold text-primary" : "text-muted"
              }`}
            >
              <Icon size={20} />
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
