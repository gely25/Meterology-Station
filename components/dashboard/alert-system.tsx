"use client"

import { useState, useEffect, useRef } from "react"
import { TriangleAlert, X, Bell } from "lucide-react"
import type { WeatherData } from "@/types/weather"
import { cn } from "@/lib/utils"

// ─── Types ───────────────────────────────────────────────────────────────────
import type { SystemEvent } from "@/types/weather"

// ─── Alert Banner (Disabled per request) ──────────────────────────────────────
export function AlertBanner({ data }: { data: WeatherData }) {
  if (!data.alertaActiva) return null
  return (
    <div className="animate-slide-down mb-4 flex items-center justify-center gap-2 rounded-xl bg-alert/15 border border-alert/30 py-2.5 px-4">
      <TriangleAlert className="size-4 text-alert" strokeWidth={2.5} />
      <p className="text-xs font-bold uppercase tracking-wider text-alert">{data.alertaActiva}</p>
    </div>
  )
}

// ─── Alert Toast (Premium disappearing pop-up window) ─────────────────────────
export function AlertToast({ data }: { data: WeatherData }) {
  const [visible, setVisible] = useState(false)
  const prevAlerta = useRef<string | null>(null)

  useEffect(() => {
    if (data.alertaActiva && data.alertaActiva !== prevAlerta.current) {
      setVisible(true)
      const timer = setTimeout(() => setVisible(false), 5000)
      prevAlerta.current = data.alertaActiva
      return () => clearTimeout(timer)
    }
    if (!data.alertaActiva) {
      setVisible(false)
    }
    prevAlerta.current = data.alertaActiva
  }, [data.alertaActiva])

  if (!visible || !data.alertaActiva) return null

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-slide-down">
      <div className="flex items-center gap-3 rounded-2xl border border-alert/30 bg-card/95 backdrop-blur px-5 py-3 shadow-[0_8px_32px_-12px_rgba(239,68,68,0.5)]">
        <span className="grid size-8 place-items-center rounded-full bg-alert/15 text-alert animate-pulse">
          <TriangleAlert className="size-4" strokeWidth={2.5} />
        </span>
        <div className="flex flex-col">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Nueva Alerta</p>
          <p className="text-sm font-semibold text-foreground">{data.alertaActiva}</p>
        </div>
        <button onClick={() => setVisible(false)} className="ml-2 rounded-full p-1 text-muted-foreground hover:bg-muted transition-colors">
          <X className="size-4" />
        </button>
      </div>
    </div>
  )
}

// ─── Bell Icon with Badge (Flashing/Blinking Red when Alerting) ────────────────
export function NotificationBell({ data, onClick }: { data: WeatherData; onClick: () => void }) {
  const hasAlert = !!data.alertaActiva
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative grid size-9 place-items-center rounded-xl transition-all duration-300",
        hasAlert 
          ? "text-alert bg-alert/15 shadow-[0_0_12px_rgba(239,68,68,0.4)] animate-pulse" 
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
      aria-label="Notificaciones"
    >
      <Bell className={cn("size-5", hasAlert && "animate-bounce")} />
      {hasAlert && (
        <span className="absolute top-1.5 right-1.5 size-2.5 rounded-full bg-alert border-2 border-background" />
      )}
    </button>
  )
}

// ─── Notification Panel ───────────────────────────────────────────────────────
export function NotificationPanel({
  open,
  onClose,
  notifications,
}: {
  open: boolean
  onClose: () => void
  notifications: SystemEvent[]
}) {
  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]" onClick={onClose} />
      <div className="fixed top-0 right-0 z-50 h-full w-80 animate-slide-in-panel bg-card border-l border-border shadow-[0_0_40px_-8px_rgba(0,0,0,0.3)] flex flex-col">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <Bell className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-bold tracking-wide text-foreground">Registro de Eventos</h2>
          </div>
          <button
            onClick={onClose}
            className="grid size-7 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-2 py-8">
              <Bell className="size-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Sin eventos recientes</p>
            </div>
          ) : (
            notifications.map((n) => {
              const bg = n.type === 'alert' ? 'bg-alert/15' : n.type === 'success' ? 'bg-success/15' : n.type === 'warning' ? 'bg-orange-500/15' : 'bg-muted';
              const color = n.type === 'alert' ? 'text-alert' : n.type === 'success' ? 'text-success' : n.type === 'warning' ? 'text-orange-500' : 'text-muted-foreground';
              
              return (
                <div
                  key={n.id}
                  className="flex items-start gap-3 rounded-xl border border-border bg-panel/60 px-3 py-3 animate-fade-in"
                >
                  <span className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg ${bg}`}>
                    {n.type === 'alert' || n.type === 'warning'
                      ? <TriangleAlert className={`size-3.5 ${color}`} />
                      : <Bell className={`size-3.5 ${color}`} />
                    }
                  </span>
                  <div>
                    <p className="text-xs font-medium text-foreground leading-snug">{n.message}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{n.time}</p>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </>
  )
}

// ─── Hook: useNotifications ───────────────────────────────────────────────────
export function useNotifications(data: WeatherData | null) {
  // We no longer manage state locally, we just stream the events from the central service
  return data?.events || []
}
