"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { TriangleAlert, X, Bell, Info, CheckCircle2, Clock, ArrowRight, ExternalLink } from "lucide-react"
import type { WeatherData, SystemEvent } from "@/types/weather"
import { cn } from "@/lib/utils"
import { THRESHOLDS } from "@/lib/thresholds"

// ─── Derive active alerts from live data ──────────────────────────────────────
interface DerivedAlert {
  title: string
  description: string
  severity: 'critical' | 'warning' | 'info'
  module?: string // view name to navigate to
  icon: string
  timestamp: number
}

function deriveAlerts(data: WeatherData): DerivedAlert[] {
  const alerts: DerivedAlert[] = []
  const now = Date.now()

  // 1. Alertas combinadas cruzadas (Mayor prioridad)
  if (data.nivelLluvia >= THRESHOLDS.rain.detected && data.presion < THRESHOLDS.pressure.min) {
    alerts.push({
      title: 'Alerta de Tormenta Inminente',
      description: `Baja presión (${data.presion.toFixed(1)} hPa) y lluvia detectada. Probable tormenta severa.`,
      severity: 'critical',
      module: 'dashboard',
      icon: '⛈️🌪️',
      timestamp: now,
    })
  } else if (data.temperatura > THRESHOLDS.temperature.max && data.humedad > THRESHOLDS.humidity.comfortMax) {
    alerts.push({
      title: 'Riesgo de Estrés Térmico Alto',
      description: `Combinación de temperatura (${data.temperatura.toFixed(1)}°C) y humedad (${data.humedad.toFixed(0)}%) críticas para cultivos.`,
      severity: 'warning',
      module: 'dashboard',
      icon: '🥵🔥',
      timestamp: now,
    })
  }

  // 2. Alertas individuales tradicionales
  if (data.nivelLluvia >= THRESHOLDS.rain.heavy && !alerts.some(a => a.title.includes('Tormenta'))) {
    alerts.push({
      title: 'Lluvia intensa detectada',
      description: 'Buzzer y LED de alerta activos. Nivel: ' + data.nivelLluvia + '%',
      severity: 'critical',
      module: 'dashboard',
      icon: '⛈',
      timestamp: now,
    })
  }

  if (data.calidadAire >= THRESHOLDS.airQuality.bad) {
    alerts.push({
      title: 'Calidad del aire muy mala',
      description: 'MQ135: ' + data.calidadAire + ' ppm. Evitar exposición prolongada.',
      severity: 'critical',
      module: 'dashboard',
      icon: '🏭',
      timestamp: now,
    })
  }

  if (data.estadoBMP280 === 'desconectado' && data.conexionESP32 === 'conectado') {
    alerts.push({
      title: 'Sensor BMP280 desconectado',
      description: 'Presión atmosférica no disponible.',
      severity: 'warning',
      module: 'configuracion',
      icon: '📡',
      timestamp: now,
    })
  }

  if (data.estadoAHT10 === 'desconectado' && data.conexionESP32 === 'conectado') {
    alerts.push({
      title: 'Sensor AHT10 desconectado',
      description: 'Temperatura y humedad no disponibles.',
      severity: 'warning',
      module: 'configuracion',
      icon: '🌡',
      timestamp: now,
    })
  }

  if (data.conexionESP32 === 'desconectado') {
    alerts.push({
      title: 'ESP32 sin conexión',
      description: 'El microcontrolador no responde. Verificar alimentación y red.',
      severity: 'critical',
      module: 'configuracion',
      icon: '⚡',
      timestamp: now,
    })
  }

  if (data.alertaActiva && alerts.length === 0) {
    alerts.push({
      title: 'Alerta del sistema',
      description: data.alertaActiva,
      severity: 'critical',
      module: 'eventos',
      icon: '⚠️',
      timestamp: now,
    })
  }

  return alerts
}

// ─── Time-ago helper ──────────────────────────────────────────────────────────
function timeAgo(ts: number): string {
  const diff = Math.max(0, Math.floor((Date.now() - ts) / 1000))
  if (diff < 5) return 'ahora'
  if (diff < 60) return `hace ${diff}s`
  if (diff < 3600) return `hace ${Math.floor(diff / 60)}min`
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`
  return `hace ${Math.floor(diff / 86400)}d`
}

// ─── Severity helpers ─────────────────────────────────────────────────────────
const severityConfig = {
  critical: {
    bg: 'bg-rose-50 dark:bg-rose-300/10',
    border: 'border-rose-200 dark:border-rose-300/25',
    text: 'text-rose-400 dark:text-rose-300',
    dot: 'bg-rose-300 shadow-[0_0_6px] shadow-rose-300/50',
    label: 'Crítica',
    Icon: TriangleAlert,
  },
  warning: {
    bg: 'bg-amber-50 dark:bg-amber-200/10',
    border: 'border-amber-200 dark:border-amber-200/25',
    text: 'text-amber-400 dark:text-amber-200',
    dot: 'bg-amber-300 shadow-[0_0_6px] shadow-amber-300/50',
    label: 'Advertencia',
    Icon: TriangleAlert,
  },
  info: {
    bg: 'bg-sky-50 dark:bg-sky-300/10',
    border: 'border-sky-200 dark:border-sky-300/25',
    text: 'text-sky-400 dark:text-sky-300',
    dot: 'bg-sky-300 shadow-[0_0_6px] shadow-sky-300/50',
    label: 'Informativa',
    Icon: Info,
  },
}

function eventToSeverity(type: string): 'critical' | 'warning' | 'info' {
  if (type === 'alert') return 'critical'
  if (type === 'warning') return 'warning'
  return 'info'
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
      <div className="flex items-center gap-3 rounded-2xl border border-rose-200 dark:border-rose-300/30 bg-card/95 backdrop-blur px-5 py-3 shadow-[0_8px_32px_-12px_rgba(253,164,175,0.4)]">
        <span className="grid size-8 place-items-center rounded-full bg-rose-50 dark:bg-rose-300/15 text-rose-400 dark:text-rose-300 animate-pulse">
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

// ─── NotificationBell — with badge + critical pulse ───────────────────────────
export function NotificationBell({
  data,
  onClick,
  isOpen,
}: {
  data: WeatherData
  onClick: () => void
  isOpen: boolean
}) {
  const alerts = deriveAlerts(data)
  const criticalCount = alerts.filter(a => a.severity === 'critical').length
  const totalCount = alerts.length

  return (
    <button
      onClick={onClick}
      className={cn(
        "relative grid size-9 place-items-center rounded-xl transition-all duration-300",
        isOpen
          ? "bg-sky-50 dark:bg-sky-300/15 text-sky-400 dark:text-sky-300 ring-1 ring-sky-200 dark:ring-sky-300/30"
          : criticalCount > 0
            ? "text-rose-400 dark:text-rose-300 bg-rose-50 dark:bg-rose-300/10 hover:bg-rose-100 dark:hover:bg-rose-300/20"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
      aria-label="Centro de notificaciones"
    >
      <Bell
        className={cn("size-5 transition-transform", criticalCount > 0 && !isOpen && "animate-[bellRing_1s_ease-in-out_infinite]")}
        strokeWidth={2.2}
      />
      {totalCount > 0 && (
        <span
          className={cn(
            "absolute -top-0.5 -right-0.5 flex items-center justify-center rounded-full text-[8px] font-black border-2 border-background transition-all",
            criticalCount > 0
              ? "bg-rose-300 text-rose-950 min-w-[18px] h-[18px] px-1 shadow-[0_0_8px_rgba(253,164,175,0.5)] animate-pulse"
              : "bg-amber-200 text-amber-950 min-w-[16px] h-[16px] px-0.5"
          )}
        >
          {totalCount}
        </span>
      )}
    </button>
  )
}

// ─── Notification Center Dropdown ─────────────────────────────────────────────
export function NotificationCenter({
  open,
  onClose,
  data,
  notifications,
  onNavigate,
}: {
  open: boolean
  onClose: () => void
  data: WeatherData
  notifications: SystemEvent[]
  onNavigate: (view: string) => void
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [now, setNow] = useState(Date.now())

  // Update time-ago every 10s
  useEffect(() => {
    if (!open) return
    const t = setInterval(() => setNow(Date.now()), 10_000)
    return () => clearInterval(t)
  }, [open])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    // Delay binding to avoid the opening click from closing it
    const t = setTimeout(() => document.addEventListener('mousedown', handler), 50)
    return () => {
      clearTimeout(t)
      document.removeEventListener('mousedown', handler)
    }
  }, [open, onClose])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  const alerts = deriveAlerts(data)
  const criticalCount = alerts.filter(a => a.severity === 'critical').length
  const warningCount = alerts.filter(a => a.severity === 'warning').length
  const infoCount = alerts.filter(a => a.severity === 'info').length

  // Merge alerts with recent events from the event log (last 20)
  const recentEvents = (notifications || []).slice(0, 20)

  return (
    <>
      {/* Scrim — separates the flyout from the dashboard behind it */}
      <div
        className="fixed inset-0 z-[90] bg-background/40 backdrop-blur-[2px] animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={panelRef}
        className="absolute top-full right-0 mt-2 w-[380px] max-h-[520px] z-[100] flex flex-col rounded-2xl border border-border bg-card shadow-[0_16px_48px_-12px_rgba(0,0,0,0.55)] animate-slide-down overflow-hidden"
      >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-lg bg-sky-50 dark:bg-sky-300/15">
            <Bell className="size-3.5 text-sky-400 dark:text-sky-300" strokeWidth={2.5} />
          </span>
          <div>
            <h2 className="text-[13px] font-extrabold tracking-wide text-foreground">Centro de notificaciones</h2>
            <p className="text-[9px] font-medium text-muted-foreground tracking-wider uppercase">
              {alerts.length > 0 ? `${alerts.length} alerta${alerts.length !== 1 ? 's' : ''} activa${alerts.length !== 1 ? 's' : ''}` : 'Sin alertas activas'}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="grid size-7 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Severity counters */}
      {alerts.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/60 bg-panel/40">
          {[
            { label: 'Críticas', count: criticalCount, color: 'text-rose-400 dark:text-rose-300', bg: 'bg-rose-50 dark:bg-rose-300/15', dot: 'bg-rose-300' },
            { label: 'Advertencias', count: warningCount, color: 'text-amber-400 dark:text-amber-200', bg: 'bg-amber-50 dark:bg-amber-200/15', dot: 'bg-amber-300' },
            { label: 'Informativas', count: infoCount, color: 'text-sky-400 dark:text-sky-300', bg: 'bg-sky-50 dark:bg-sky-300/15', dot: 'bg-sky-300' },
          ].map(s => (
            <div
              key={s.label}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-2.5 py-1",
                s.count > 0 ? s.bg : 'bg-muted/40'
              )}
            >
              <span className={cn("size-1.5 rounded-full", s.count > 0 ? s.dot : 'bg-muted-foreground/30')} />
              <span className={cn("text-[10px] font-bold", s.count > 0 ? s.color : 'text-muted-foreground/50')}>
                {s.count}
              </span>
              <span className="text-[9px] font-medium text-muted-foreground/60">{s.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Alert list */}
      <div className="flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-1.5 scrollbar-hide" style={{ maxHeight: 340 }}>
        {/* Active alerts first */}
        {alerts.length > 0 && (
          <div className="mb-1">
            <p className="text-[8px] font-extrabold uppercase tracking-widest text-muted-foreground/50 px-1 mb-1.5">
              Alertas activas
            </p>
            {alerts.map((alert, i) => {
              const cfg = severityConfig[alert.severity]
              const SevIcon = cfg.Icon
              return (
                <div
                  key={`alert-${i}`}
                  className={cn(
                    "flex items-start gap-2.5 rounded-xl border p-3 mb-1.5 transition-colors hover:bg-muted/40",
                    cfg.bg, cfg.border
                  )}
                >
                  <span className={cn("mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg", cfg.bg)}>
                    <SevIcon className={cn("size-3.5", cfg.text)} strokeWidth={2.5} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={cn("text-[11px] font-bold", cfg.text)}>{alert.title}</p>
                      <span className="text-[8px] font-medium text-muted-foreground/50 whitespace-nowrap flex items-center gap-0.5">
                        <Clock className="size-2.5" />
                        {timeAgo(alert.timestamp)}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">{alert.description}</p>
                    {alert.module && (
                      <button
                        onClick={() => { onNavigate(alert.module!); onClose() }}
                        className={cn(
                          "mt-1.5 flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider transition-colors hover:underline",
                          cfg.text
                        )}
                      >
                        Ir al módulo <ArrowRight className="size-2.5" />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Recent events from log */}
        {recentEvents.length > 0 && (
          <div>
            <p className="text-[8px] font-extrabold uppercase tracking-widest text-muted-foreground/50 px-1 mb-1.5">
              Eventos recientes
            </p>
            {recentEvents.map((evt) => {
              const sev = eventToSeverity(evt.type)
              const cfg = severityConfig[sev]
              const SevIcon = sev === 'info' ? (evt.type === 'success' ? CheckCircle2 : Info) : cfg.Icon
              const sevColor = evt.type === 'success' ? 'text-emerald-400 dark:text-emerald-300' : cfg.text
              const sevBg = evt.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-300/10' : cfg.bg
              const ts = (evt.timestamp && evt.timestamp > 0) ? evt.timestamp : undefined
              return (
                <div
                  key={evt.id}
                  className="flex items-start gap-2.5 rounded-xl border border-border/50 bg-panel/30 p-2.5 mb-1 transition-colors hover:bg-muted/30"
                >
                  <span className={cn("mt-0.5 grid size-6 shrink-0 place-items-center rounded-md", sevBg)}>
                    <SevIcon className={cn("size-3", sevColor)} strokeWidth={2.2} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10.5px] font-semibold text-foreground leading-snug">{evt.message}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[8.5px] text-muted-foreground/60">{evt.time}</span>
                      {ts && (
                        <span className="text-[8px] text-muted-foreground/40 flex items-center gap-0.5">
                          <Clock className="size-2" />{timeAgo(ts)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Empty state */}
        {alerts.length === 0 && recentEvents.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
            <span className="grid size-12 place-items-center rounded-2xl bg-muted/50">
              <Bell className="size-6 text-muted-foreground/40" />
            </span>
            <p className="text-sm font-medium text-muted-foreground/70">Sin notificaciones</p>
            <p className="text-[10px] text-muted-foreground/40">Las alertas aparecerán aquí automáticamente</p>
          </div>
        )}
      </div>

      {/* Footer link */}
      <div className="border-t border-border px-4 py-2.5">
        <button
          onClick={() => { onNavigate('eventos'); onClose() }}
          className="flex items-center justify-center gap-1.5 w-full rounded-lg py-1.5 text-[10px] font-bold uppercase tracking-widest text-sky-400 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-300/10 transition-colors"
        >
          <ExternalLink className="size-3" />
          Ver todas las notificaciones
        </button>
      </div>
      </div>
    </>
  )
}

// ─── Hook: useNotifications ───────────────────────────────────────────────────
export function useNotifications(data: WeatherData | null) {
  return data?.events || []
}