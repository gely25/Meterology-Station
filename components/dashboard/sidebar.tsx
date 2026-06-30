"use client"

import { useState } from "react"
import { Home, RadioTower, LineChart, Bell, Settings, Info, Cpu } from "lucide-react"
import { cn } from "@/lib/utils"

const items = [
  { id: "dashboard", label: "DASHBOARD", icon: Home },
  { id: "sensores", label: "SENSORES", icon: RadioTower },
  { id: "historial", label: "HISTORIAL", icon: LineChart },
  { id: "alertas", label: "ALERTAS", icon: Bell },
  { id: "configuracion", label: "CONFIGURACIÓN", icon: Settings },
  { id: "acerca", label: "ACERCA DEL PROYECTO", icon: Info },
]

export function Sidebar({ active, onNavigate }: { active: string, onNavigate: (id: string) => void }) {

  return (
    <nav className="flex w-56 shrink-0 flex-col gap-1 border-r border-border bg-sidebar p-3">
      <ul className="flex flex-1 flex-col gap-1.5">
        {items.map((item) => {
          const Icon = item.icon
          const isActive = active === item.id
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onNavigate(item.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-xs font-semibold tracking-wide transition-colors",
                  isActive
                    ? "bg-humidity/15 text-humidity ring-1 ring-humidity/40"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
              >
                <Icon className="size-5 shrink-0" strokeWidth={2} />
                <span className="leading-tight">{item.label}</span>
              </button>
            </li>
          )
        })}
      </ul>

      <div className="mt-2 flex items-center gap-3 rounded-xl border border-humidity/30 bg-humidity/10 p-3">
        <Cpu className="size-7 text-humidity" />
        <div>
          <p className="text-sm font-bold text-foreground">ESP32</p>
          <p className="flex items-center gap-1.5 text-[11px] font-medium text-success">
            <span className="size-1.5 rounded-full bg-success" />
            ONLINE
          </p>
        </div>
      </div>
    </nav>
  )
}
