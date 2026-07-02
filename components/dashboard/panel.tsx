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
        "relative rounded-2xl transition-all duration-300",
        "p-3 md:p-4",
        // Glass: semi-transparent bg + blur
        "bg-card/70 backdrop-blur-md",
        // Border: bright top edge + subtle outer ring → glass look
        "border border-white/[0.08]",
        // Inner top-edge highlight (simulates glass thickness)
        "ring-1 ring-inset ring-white/[0.06]",
        // Shadow: lift the card off the background
        variant === "default" && "shadow-[0_4px_32px_-4px_rgba(0,0,0,0.45),0_1px_0_0_rgba(255,255,255,0.08)_inset]",
        variant === "hero"    && "shadow-[0_8px_48px_-8px_rgba(0,0,0,0.55),0_1px_0_0_rgba(255,255,255,0.10)_inset]",
        className,
      )}
      style={glow ? { boxShadow: `0 0 0 1px ${glow}22, 0 12px 40px -16px ${glow}55` } : undefined}
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
