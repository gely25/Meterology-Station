import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export function Panel({
  children,
  className,
  glow,
}: {
  children: ReactNode
  className?: string
  glow?: string
}) {
  return (
    <section
      className={cn(
        "relative rounded-2xl border border-border bg-card/80 p-4 backdrop-blur-sm",
        "shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset,0_10px_30px_-15px_rgba(0,0,0,0.8)]",
        className,
      )}
      style={glow ? { boxShadow: `0 0 0 1px ${glow}22, 0 10px 40px -20px ${glow}55` } : undefined}
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
  icon: ReactNode
  title: string
  subtitle?: string
  accent: string
  right?: ReactNode
}) {
  return (
    <header className="mb-3 flex items-start justify-between gap-2">
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <h2 className="text-sm font-semibold leading-tight tracking-wide text-foreground">{title}</h2>
          {subtitle ? (
            <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
      </div>
      {right}
    </header>
  )
}
