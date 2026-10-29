import { AlertTriangle, CheckCircle2, MessageCircle } from "lucide-react";
import { SOURCES, type SourceId } from "@/lib/sources";
import type { Guidance } from "@/lib/stats";

export function PageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h1 className="font-serif text-3xl font-semibold tracking-tight">{title}</h1>
      {subtitle && <p className="mt-1.5 text-muted">{subtitle}</p>}
    </div>
  );
}

const GUIDANCE_STYLE: Record<Guidance, { box: string; icon: typeof CheckCircle2; title: string; short: string }> = {
  steady: { box: "bg-steady-soft text-steady", icon: CheckCircle2, title: "Steady", short: "Steady" },
  discuss: { box: "bg-discuss-soft text-discuss", icon: MessageCircle, title: "Worth mentioning to your care team", short: "Mention" },
  urgent: { box: "bg-urgent-soft text-urgent", icon: AlertTriangle, title: "Contact your care team today", short: "Call today" },
};

export function GuidanceBadge({ level, compact }: { level: Guidance; compact?: boolean }) {
  const s = GUIDANCE_STYLE[level];
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${s.box}`}>
      <Icon size={14} />
      {compact ? s.short : s.title}
    </span>
  );
}

export function guidanceTitle(level: Guidance) {
  return GUIDANCE_STYLE[level].title;
}

export function Cite({ ids }: { ids: SourceId[] }) {
  return (
    <span className="text-xs text-muted">
      {ids.map((id, i) => (
        <span key={id}>
          {i > 0 && " · "}
          <a href={SOURCES[id].url} target="_blank" rel="noreferrer" className="underline decoration-dotted underline-offset-2">
            {SOURCES[id].publisher}
          </a>
        </span>
      ))}
    </span>
  );
}

export function Disclaimer() {
  return (
    <p className="text-xs leading-relaxed text-muted">
      Between Cycles tracks visible changes in photos. It does not diagnose, grade or treat anything, and it is not a
      substitute for your care team. If something worries you, contact them, whatever the app says.
    </p>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 text-muted" role="status">
      <span className="size-5 animate-spin rounded-full border-2 border-line border-t-primary" />
      {label}
    </div>
  );
}
