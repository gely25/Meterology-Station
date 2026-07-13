"use client"

import { Activity, ShieldCheck, ShieldAlert, Cpu, Wifi, Clock, RefreshCw, AlertTriangle, AlertCircle } from "lucide-react"
import type { WeatherData } from "@/types/weather"
import { cn } from "@/lib/utils"
import { Panel } from "./panel"
import { calcRiskIndex } from "@/lib/riskEngine"

export function MonitoringCenter({ data, onNavigate }: { data: WeatherData; onNavigate?: (view: string) => void }) {
  const sensors = [
    { name: "AHT10", status: data.estadoAHT10 },
    { name: "BMP280", status: data.estadoBMP280 },
    { name: "MQ135", status: data.estadoMQ135 },
    { name: "Lluvia", status: data.estadoSensorLluvia },
  ]
  const totalSensors = sensors.length
  const isESPConnected = data.conexionESP32 === "conectado"
  const operativeSensors = isESPConnected ? sensors.filter(s => s.status === "operativo").length : 0
  const errorSensors = isESPConnected ? (totalSensors - operativeSensors) : totalSensors

  const risk = calcRiskIndex(data)

  const criticalCount = data.nivelLluvia >= 70 ? 1 : 0
  const warningCount = (data.calidadAire >= 1800 ? 1 : 0) + (data.nivelLluvia > 20 && data.nivelLluvia < 70 ? 1 : 0)
  const latency = data.latency ?? 0
  const latencyText = data.conexionESP32 === "desconectado" ? "—" : `${latency} ms`

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3.5 w-full select-none">
      
      {/* 1. Estado General (Dynamic Risk Index) */}
      <Panel className={cn(
        "flex flex-col justify-between p-4 min-h-[112px] border hover:border-accent/40 shadow-sm transition-all duration-300 group hover:shadow-md",
        risk.level === "critical" ? "border-rose-200 dark:border-rose-300/25 bg-rose-50 dark:bg-rose-300/5" :
        risk.level === "high" ? "border-amber-200 dark:border-amber-200/25 bg-amber-50 dark:bg-amber-200/5" :
        risk.level === "moderate" ? "border-sky-200 dark:border-sky-300/25 bg-sky-50 dark:bg-sky-300/5" :
        "border-border/50 bg-card"
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={cn(
              "flex items-center justify-center size-6 rounded-md border transition-transform group-hover:scale-105",
              risk.level === "critical" ? "bg-rose-100 dark:bg-rose-300/15 border-rose-200 dark:border-rose-300/30" :
              risk.level === "high" ? "bg-amber-100 dark:bg-amber-200/15 border-amber-200 dark:border-amber-200/30" :
              risk.level === "moderate" ? "bg-sky-100 dark:bg-sky-300/15 border-sky-200 dark:border-sky-300/30" :
              "bg-emerald-100 dark:bg-emerald-300/15 border-emerald-200 dark:border-emerald-300/30"
            )}>
              <ShieldCheck className={cn(
                "size-3.5",
                risk.level === "critical" ? "text-rose-400 dark:text-rose-300 animate-pulse" :
                risk.level === "high" ? "text-amber-400 dark:text-amber-200" :
                risk.level === "moderate" ? "text-sky-400 dark:text-sky-300" :
                "text-emerald-400 dark:text-emerald-300"
              )} />
            </span>
            <span className="text-[10px] font-semibold tracking-wide text-muted-foreground/70">Riesgo ambiental</span>
          </div>
          {data.conexionESP32 === "conectado" && (
            <span className="text-[9px] font-mono font-semibold text-muted-foreground/50">{risk.score}pt</span>
          )}
        </div>
        <div className="mt-2 flex flex-col gap-0.5">
          <span className={cn(
            "font-mono text-[15px] font-bold tracking-tight uppercase leading-none",
            risk.level === "critical" ? "text-rose-400 dark:text-rose-300" :
            risk.level === "high" ? "text-amber-400 dark:text-amber-200" :
            risk.level === "moderate" ? "text-sky-400 dark:text-sky-300" :
            "text-emerald-400 dark:text-emerald-300"
          )}>
            {risk.label}
          </span>
          <span className="text-[10.5px] text-muted-foreground/70 font-normal leading-snug truncate">
            {risk.description}
          </span>
        </div>
      </Panel>

      {/* 2. Sensores */}
      <Panel className="flex flex-col justify-between p-4 min-h-[112px] border border-border/50 hover:border-accent/40 bg-card shadow-sm transition-all duration-300 group hover:shadow-md">
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center size-6 rounded-md border bg-sky-100 dark:bg-sky-300/15 border-sky-200 dark:border-sky-300/30 transition-transform group-hover:scale-105">
            <Activity className="size-3.5 text-sky-400 dark:text-sky-300" />
          </span>
          <span className="text-[10px] font-semibold tracking-wide text-muted-foreground/70">Sensores</span>
        </div>
        <div className="mt-2 flex flex-col gap-0.5">
          <span className="font-mono text-[15px] font-bold text-foreground tracking-tight leading-none">
            {operativeSensors} <span className="text-muted-foreground/40 font-normal">/</span> {totalSensors}
          </span>
          <span className={cn("text-[10.5px] font-medium leading-snug truncate", !isESPConnected ? "text-rose-400 dark:text-rose-300" : errorSensors > 0 ? "text-amber-400 dark:text-amber-200" : "text-emerald-400 dark:text-emerald-300")}>
            {!isESPConnected ? "Sin conexión" : errorSensors > 0 ? `${errorSensors} error` : "Operativos"}
          </span>
        </div>
      </Panel>

      {/* 3. Alertas */}
      <Panel className="flex flex-col justify-between p-4 min-h-[112px] border border-border/50 hover:border-accent/40 bg-card shadow-sm transition-all duration-300 group hover:shadow-md">
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center size-6 rounded-md border bg-amber-100 dark:bg-amber-200/15 border-amber-200 dark:border-amber-200/30 transition-transform group-hover:scale-105">
            <AlertTriangle className="size-3.5 text-amber-400 dark:text-amber-200" />
          </span>
          <span className="text-[10px] font-semibold tracking-wide text-muted-foreground/70">Alertas</span>
        </div>
        <div className="mt-2 flex flex-col gap-0.5">
          <span className={cn(
            "font-mono text-[13px] font-bold tracking-tight leading-none uppercase",
            criticalCount > 0 
              ? "text-rose-400 dark:text-rose-300 animate-pulse" 
              : warningCount > 0 
                ? "text-amber-400 dark:text-amber-200 animate-pulse-slow" 
                : "text-emerald-400 dark:text-emerald-300"
          )}>
            {criticalCount > 0 ? "Alerta activa" : warningCount > 0 ? "Advertencia" : "Sin alertas"}
          </span>
          <span className="text-[10.5px] text-muted-foreground/70 font-normal leading-snug truncate">
            {criticalCount > 0 
              ? `${criticalCount} crítica${criticalCount !== 1 ? 's' : ''}` 
              : warningCount > 0 
                ? `${warningCount} advertencia${warningCount !== 1 ? 's' : ''}` 
                : "Parámetros en rango"}
          </span>
        </div>
      </Panel>

      {/* 4. Conectividad */}
      <Panel className="flex flex-col justify-between p-4 min-h-[112px] border border-border/50 hover:border-accent/40 bg-card shadow-sm transition-all duration-300 group hover:shadow-md">
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center size-6 rounded-md border bg-indigo-100 dark:bg-indigo-300/15 border-indigo-200 dark:border-indigo-300/30 transition-transform group-hover:scale-105">
            <Wifi className="size-3.5 text-indigo-400 dark:text-indigo-300" />
          </span>
          <span className="text-[10px] font-semibold tracking-wide text-muted-foreground/70">Conectividad</span>
        </div>
        <div className="mt-2 flex flex-col gap-0.5">
          <span className="font-mono text-[15px] font-bold text-foreground tracking-tight uppercase leading-none">
            {data.conexionESP32 === "conectado" ? data.wifiCalidad : "Offline"}
          </span>
          <span className="text-[10.5px] text-muted-foreground/70 font-mono font-medium leading-snug truncate">
            {data.conexionESP32 === "conectado" ? `${data.wifiRSSI} dBm · ${latencyText}` : "Desconectado"}
          </span>
        </div>
      </Panel>

      {/* 5. Uptime */}
      <Panel className="flex flex-col justify-between p-4 min-h-[112px] border border-border/50 hover:border-accent/40 bg-card shadow-sm transition-all duration-300 group hover:shadow-md">
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center size-6 rounded-md border bg-violet-100 dark:bg-violet-300/15 border-violet-200 dark:border-violet-300/30 transition-transform group-hover:scale-105">
            <Clock className="size-3.5 text-violet-400 dark:text-violet-300" />
          </span>
          <span className="text-[10px] font-semibold tracking-wide text-muted-foreground/70">Uptime</span>
        </div>
        <div className="mt-2 flex flex-col gap-0.5">
          <span className="font-mono text-[15px] font-bold text-foreground tracking-tight leading-none">
            {data.uptime}
          </span>
          <span className="text-[10.5px] text-muted-foreground/70 font-normal leading-snug truncate">
            {data.conexionESP32 === "conectado" ? "Operando continuo" : "Inactivo"}
          </span>
        </div>
      </Panel>

      {/* 6. Última Sincro */}
      <Panel className="flex flex-col justify-between p-4 min-h-[112px] border border-border/50 hover:border-accent/40 bg-card shadow-sm transition-all duration-300 group hover:shadow-md">
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center size-6 rounded-md border bg-emerald-100 dark:bg-emerald-300/15 border-emerald-200 dark:border-emerald-300/30 transition-transform group-hover:scale-105">
            <RefreshCw className="size-3.5 text-emerald-400 dark:text-emerald-300 animate-spin-slow" />
          </span>
          <span className="text-[10px] font-semibold tracking-wide text-muted-foreground/70">Última sincro</span>
        </div>
        <div className="mt-2 flex flex-col gap-0.5">
          <span className="font-mono text-[15px] font-bold text-foreground tracking-tight leading-none">
            Activo
          </span>
          <span className="text-[10.5px] text-muted-foreground/70 font-mono font-medium leading-snug truncate">
            {data.hora}
          </span>
        </div>
      </Panel>

      <style>{`
        .animate-spin-slow {
          animation: spin 8s linear infinite;
        }
      `}</style>
    </div>
  )
}