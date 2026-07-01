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
        "relative rounded-2xl border border-border bg-card/90 backdrop-blur-sm transition-shadow duration-300",
        "p-1.5 md:p-2",
        variant === "default" && "shadow-[0_2px_0_0_rgba(255,255,255,0.06)_inset,0_8px_24px_-8px_rgba(0,0,0,0.12)]",
        variant === "hero"    && "shadow-[0_2px_0_0_rgba(255,255,255,0.06)_inset,0_16px_40px_-12px_rgba(0,0,0,0.18)]",
        className,
      )}
      style={glow ? { boxShadow: `0 0 0 1px ${glow}1a, 0 12px 40px -16px ${glow}44` } : undefined}
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
    <header className="mb-1.5 flex items-start justify-between gap-2">
      <div className="flex items-center gap-2">
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
