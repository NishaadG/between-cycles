"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, FlaskConical, Home, LineChart, Scissors } from "lucide-react";
import { useApiStatus } from "@/lib/useStatus";
import type { Profile } from "@/lib/store";

const NAV: { href: string; label: string; icon: typeof Home; also?: string }[] = [
  { href: "/today", label: "Today", icon: Home },
  { href: "/journey", label: "Journey", icon: LineChart },
  { href: "/products", label: "Products", icon: FlaskConical },
  { href: "/hair", label: "Hair", icon: Scissors, also: "/prepare" },
  { href: "/report", label: "Report", icon: FileText },
];

export function Logo() {
  return (
    <Link href="/" className="flex shrink-0 items-center gap-2">
      <svg width="24" height="24" viewBox="0 0 32 32" aria-hidden>
        <circle cx="16" cy="16" r="13.5" fill="none" stroke="var(--ink)" strokeWidth="3" />
        <path d="M16 2.5 A13.5 13.5 0 0 1 16 29.5 Z" fill="var(--primary)" />
      </svg>
      <span className="text-[15px] font-semibold tracking-[-0.02em]">Between Cycles</span>
    </Link>
  );
}

export function Shell({ profile, children }: { profile?: Profile; children: React.ReactNode }) {
  const path = usePathname();
  const status = useApiStatus();
  const active = (href: string, also?: string) => path.startsWith(href) || (!!also && path.startsWith(also));
  return (
    <div className="min-h-dvh pb-28 md:pb-12">
      <header className="no-print sticky top-0 z-20 border-b border-line/70 bg-bg/80 backdrop-blur-xl backdrop-saturate-150">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-3 px-4">
          <Logo />
          <nav className="hidden items-center gap-0.5 rounded-xl bg-surface-2/80 p-1 md:flex" aria-label="Main">
            {NAV.map(({ href, label, also }) => (
              <Link
                key={href}
                href={href}
                aria-current={active(href, also) ? "page" : undefined}
                className={`rounded-lg px-3 py-1.5 text-[13px] font-medium transition ${
                  active(href, also) ? "bg-surface text-ink shadow-[var(--shadow)]" : "text-muted hover:text-ink"
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className="flex min-w-0 items-center justify-end gap-2 text-xs md:w-32">
            {profile?.demo && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 font-medium text-muted">
                <span className="size-1.5 rounded-full bg-discuss" aria-hidden /> Demo data
              </span>
            )}
            {status && !status.live && (
              <span className="rounded-full border border-line bg-surface px-2.5 py-1 text-muted" title="No API key configured">
                Offline mode
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="rise mx-auto max-w-3xl px-4 py-8">{children}</main>

      <nav
        className="no-print fixed inset-x-3 bottom-3 z-20 rounded-2xl border border-line/80 bg-surface/85 shadow-[var(--shadow-lg)] backdrop-blur-xl md:hidden"
        aria-label="Main"
        style={{ marginBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="grid grid-cols-5 p-1">
          {NAV.map(({ href, label, icon: Icon, also }) => (
            <Link
              key={href}
              href={href}
              aria-current={active(href, also) ? "page" : undefined}
              className={`flex flex-col items-center gap-0.5 rounded-xl py-2 text-[11px] font-medium transition ${
                active(href, also) ? "bg-surface-2 text-ink" : "text-muted"
              }`}
            >
              <Icon size={19} strokeWidth={active(href, also) ? 2.25 : 1.75} />
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
