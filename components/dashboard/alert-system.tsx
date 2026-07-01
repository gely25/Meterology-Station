"use client"

import { useState, useEffect, useRef } from "react"
import { TriangleAlert, X, Bell } from "lucide-react"
import type { WeatherData } from "@/types/weather"
import { cn } from "@/lib/utils"

// ─── Types ───────────────────────────────────────────────────────────────────
interface Notification {
  id: number
  time: string
  message: string
  type: "alert" | "info"
}

// ─── Alert Banner (Disabled per request) ──────────────────────────────────────
export function AlertBanner({ data }: { data: WeatherData }) {
  return null
}

// ─── Alert Toast (Premium disappearing pop-up window) ─────────────────────────
export function AlertToast({ data }: { data: WeatherData }) {
  const [visible, setVisible] = useState(false)
  const [message, setMessage] = useState("")
  const prevAlerta = useRef(data.alerta)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (data.alerta && data.alerta !== prevAlerta.current) {
      setMessage(data.alerta)
      setVisible(true)
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setVisible(false), 5000)
    }
    prevAlerta.current = data.alerta
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [data.alerta])

  if (!visible) return null

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-slide-up w-[360px] max-w-[90vw]">
      <div className="flex items-start gap-4 rounded-2xl border border-alert/30 bg-card/95 backdrop-blur-md shadow-[0_20px_50px_-12px_rgba(239,68,68,0.25)] p-5 border-l-4 border-l-alert">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-alert/15">
          <TriangleAlert className="size-5 text-alert animate-pulse-glow" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-extrabold tracking-wide text-alert uppercase">⚠ ALERTA DE SISTEMA</p>
          <p className="text-xs font-semibold text-muted-foreground mt-1 leading-relaxed">
            {message === "lluvia intensa" || message === "Lluvia intensa" 
              ? "Lluvia intensa detectada. Se activó la alarma sonora. Revise el entorno." 
              : `${message} — revise el entorno.`}
          </p>
        </div>
        <button 
          onClick={() => setVisible(false)} 
          className="shrink-0 rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <X className="size-4.5" />
        </button>
      </div>
    </div>
  )
}

// ─── Bell Icon with Badge (Flashing/Blinking Red when Alerting) ────────────────
export function NotificationBell({ data, onClick }: { data: WeatherData; onClick: () => void }) {
  const hasAlert = !!data.alerta
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
  notifications: Notification[]
}) {
  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]" onClick={onClose} />
      <div className="fixed top-0 right-0 z-50 h-full w-80 animate-slide-in-panel bg-card border-l border-border shadow-[0_0_40px_-8px_rgba(0,0,0,0.3)] flex flex-col">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <Bell className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-bold tracking-wide text-foreground">Notificaciones</h2>
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
              <p className="text-sm text-muted-foreground">Sin notificaciones</p>
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className="flex items-start gap-3 rounded-xl border border-border bg-panel/60 px-3 py-3 animate-fade-in"
              >
                <span className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg ${n.type === 'alert' ? 'bg-alert/15' : 'bg-muted'}`}>
                  {n.type === 'alert'
                    ? <TriangleAlert className="size-3.5 text-alert" />
                    : <Bell className="size-3.5 text-muted-foreground" />
                  }
                </span>
                <div>
                  <p className="text-xs font-medium text-foreground leading-snug">{n.message}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{n.time}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  )
}

// ─── Hook: useNotifications ───────────────────────────────────────────────────
export function useNotifications(data: WeatherData | null) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const prevAlerta = useRef<string | null>(null)
  const idRef = useRef(0)

  useEffect(() => {
    if (!data) return
    const now = new Date()
    const fmt = (d: Date) => d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    setNotifications([
      { id: idRef.current++, time: fmt(new Date(now.getTime() - 2 * 60000)), message: "Sistema iniciado", type: "info" },
      { id: idRef.current++, time: fmt(new Date(now.getTime() - 1 * 60000)), message: "ESP32 conectado", type: "info" },
    ])
    prevAlerta.current = data.alerta
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!data])

  useEffect(() => {
    if (!data) return
    if (data.alerta && data.alerta !== prevAlerta.current) {
      const time = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
      setNotifications(prev => [
        { id: idRef.current++, time, message: data.alerta!, type: "alert" },
        ...prev,
      ])
    }
    prevAlerta.current = data.alerta
  }, [data?.alerta, data])

  return notifications
}
