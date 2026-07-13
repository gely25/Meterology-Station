"use client"

import { useState, useEffect } from "react"
import { CloudSun, Wifi, WifiOff, Home, LineChart, Settings, Bell, Shield } from "lucide-react"
import type { WeatherData, SystemEvent } from "@/types/weather"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "@/components/theme-toggle"
import { NotificationBell, NotificationCenter } from "./alert-system"

const navItems = [
  { id: "dashboard", label: "DASHBOARD", icon: Home },
  { id: "historial", label: "HISTORIAL", icon: LineChart },
  { id: "eventos", label: "EVENTOS", icon: Bell },
  { id: "decisiones", label: "ANÁLISIS", icon: Shield },
  { id: "configuracion", label: "CONFIGURACIÓN", icon: Settings },
]

function RelativeUpdateTime({ updated }: { updated: string }) {
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    const parseTime = (timeStr: string) => {
      if (!timeStr) return 0
      const parts = timeStr.split(':').map(Number)
      if (parts.length < 3) return 0
      const [h, m, s] = parts
      return h * 3600 + m * 60 + s
    }

    const updateDiff = () => {
      const now = new Date()
      const currentSecs = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()
      const updatedSecs = parseTime(updated)
      let diff = currentSecs - updatedSecs
      if (diff < 0) diff += 24 * 3600 // Day rollover
      setSeconds(diff)
    }

    updateDiff()
    const timer = setInterval(updateDiff, 1000)
    return () => clearInterval(timer)
  }, [updated])

  return (
    <p className="text-[8px] font-medium tracking-widest text-muted-foreground/70 uppercase">
      Hace {seconds}s
    </p>
  )
}

export function TopNavigation({
  data,
  active,
  onNavigate,
  notifications,
}: {
  data: WeatherData
  active: string
  onNavigate: (id: string) => void
  notifications: SystemEvent[]
}) {
  const { hora, fecha, conexionESP32 } = data;
  const [notifOpen, setNotifOpen] = useState(false)

  return (
    <header className="flex flex-col xl:flex-row items-center justify-between gap-1.5 border-b border-border/60 px-4 py-1 bg-sidebar shadow-[0_6px_18px_-6px_rgba(0,0,0,0.55)] relative z-30">
      {/* Branding */}
      <div className="flex items-center gap-2 w-full xl:w-auto justify-between xl:justify-start">
        <div className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-xl bg-accent-soft text-accent">
            <CloudSun className="size-5.5" />
          </span>
          <div>
            <h1 className="text-[15px] font-extrabold tracking-tight text-foreground">ESTACIÓN METEOROLÓGICA IoT</h1>
            <p className="text-[10px] font-semibold tracking-widest text-accent">GRUPO 6</p>
          </div>
        </div>
      </div>

      {/* Nav Links */}
      <nav className="flex items-center gap-1.5 overflow-x-auto w-full xl:w-auto pb-2 xl:pb-0 scrollbar-hide">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = active === item.id
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-bold tracking-widest transition-all duration-200 whitespace-nowrap",
                isActive
                  ? "bg-accent-soft text-accent ring-1 ring-accent/30 opacity-100 shadow-sm"
                  : "text-muted-foreground/75 hover:bg-muted/40 hover:text-foreground opacity-60 hover:opacity-100"
              )}
            >
              <Icon className="size-3.5 shrink-0" strokeWidth={2.5} />
              {item.label}
            </button>
          )
        })}
      </nav>

      {/* Status */}
      <div className="flex items-center gap-3 w-full xl:w-auto justify-end">
        <div className="text-right leading-tight hidden sm:block">
          <p className="font-mono text-lg font-bold tracking-widest text-foreground tabular-nums">{hora}</p>
          <p className="text-[9px] font-medium tracking-wide text-muted-foreground">{fecha}</p>
          <RelativeUpdateTime updated={data.ultimaActualizacion} />
        </div>
        <div className="flex flex-col items-center justify-center mx-2 hidden sm:flex">
          {conexionESP32 === 'conectado' ? (
            <Wifi className={`size-5 ${data.wifiCalidad === 'Excelente' || data.wifiCalidad === 'Muy buena' ? 'text-success' : data.wifiCalidad === 'Buena' ? 'text-yellow-400' : 'text-orange-400'}`} />
          ) : (
            <WifiOff className="size-5 text-alert" />
          )}
          <span className="text-[8px] font-bold uppercase mt-0.5 text-muted-foreground">{data.wifiCalidad}</span>
        </div>

        {/* Notification Bell + Dropdown Container */}
        <div className="relative">
          <NotificationBell
            data={data}
            onClick={() => setNotifOpen(prev => !prev)}
            isOpen={notifOpen}
          />
          <NotificationCenter
            open={notifOpen}
            onClose={() => setNotifOpen(false)}
            data={data}
            notifications={notifications}
            onNavigate={(view) => { onNavigate(view); setNotifOpen(false) }}
          />
        </div>

        <ThemeToggle />
      </div>
    </header>
  )
}