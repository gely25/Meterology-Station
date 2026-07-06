import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export function Panel({
  children,
  className,
  glow,
  variant = "default",
}: {
  children?: ReactNode
  className?: string
  glow?: string
  variant?: "default" | "hero"
}) {
  return (
    <section
      className={cn(
        // Base structure
        "relative rounded-xl transition-all duration-300",
        "p-2 md:p-2.5",
        // flatter card background
        "bg-card/90",
        // Border: clean and simple
        "border border-border/40",
        // Shadow: minimal separation
        variant === "default" && "shadow-sm",
        variant === "hero" && "shadow-md",
        className,
      )}
      style={glow ? { boxShadow: `0 0 0 1px ${glow}15, 0 4px 12px -2px ${glow}25` } : undefined}
    >
      {children}
    </section>
  )
}

export function PanelHeader({
  icon,
  title,
  subtitle,
  accent,
  right,
}: {
  icon?: ReactNode
  title: string
  subtitle?: string
  accent?: string
  right?: ReactNode
}) {
  return (
    <header className="mb-3 flex items-start justify-between gap-2">
      <div className="flex items-center gap-2">
        {icon}
        <div>
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{title}</h2>
          {subtitle ? (
            <p className="text-[9px] font-semibold uppercase tracking-widest" style={accent ? { color: accent, opacity: 0.7 } : undefined}>{subtitle}</p>
          ) : null}
        </div>
      </div>
      {right}
    </header>
  )
}
