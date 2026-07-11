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
        "flex flex-col justify-between p-4 min-h-[105px] border hover:border-accent/40 shadow-sm transition-all duration-300 group hover:shadow-md",
        risk.level === "critical" ? "border-red-500/40 bg-red-500/5" :
        risk.level === "high" ? "border-amber-500/40 bg-amber-500/5" :
        risk.level === "moderate" ? "border-sky-500/40 bg-sky-500/5" :
        "border-border/50 bg-card"
      )}>
        <div className="flex items-center justify-between text-muted-foreground/80">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className={cn(
              "size-3.5 transition-transform group-hover:scale-110",
              risk.level === "critical" ? "text-red-500 animate-pulse" :
              risk.level === "high" ? "text-amber-500" :
              risk.level === "moderate" ? "text-sky-500" :
              "text-emerald-500"
            )} />
            <span className="text-[9.5px] font-extrabold uppercase tracking-widest">Riesgo Ambiental</span>
          </div>
          {data.conexionESP32 === "conectado" && (
            <span className="text-[9px] font-bold opacity-60">{risk.score} pts</span>
          )}
        </div>
        <div className="mt-2.5 flex flex-col">
          <span className={cn(
            "text-base font-extrabold tracking-wide uppercase leading-tight",
            risk.level === "critical" ? "text-red-500" :
            risk.level === "high" ? "text-amber-500" :
            risk.level === "moderate" ? "text-sky-500" :
            "text-emerald-500"
          )}>
            {risk.label}
          </span>
          <span className="text-[10px] text-muted-foreground mt-1 font-semibold leading-tight truncate">
            {risk.description}
          </span>
        </div>
      </Panel>

      {/* 2. Sensores */}
      <Panel className="flex flex-col justify-between p-4 min-h-[105px] border border-border/50 hover:border-accent/40 bg-card shadow-sm transition-all duration-300 group hover:shadow-md">
        <div className="flex items-center gap-1.5 text-muted-foreground/80">
          <Activity className="size-3.5 text-sky-500 transition-transform group-hover:scale-110" />
          <span className="text-[9.5px] font-extrabold uppercase tracking-widest">Sensores</span>
        </div>
        <div className="mt-2.5 flex flex-col">
          <span className="text-base font-extrabold text-foreground tracking-wide leading-tight">
            {operativeSensors} / {totalSensors}
          </span>
          <span className={cn("text-[10px] font-bold mt-1 leading-tight truncate", !isESPConnected ? "text-red-500" : errorSensors > 0 ? "text-amber-500" : "text-emerald-500")}>
            {!isESPConnected ? "Sin conexión" : errorSensors > 0 ? `${errorSensors} error` : "Operativos"}
          </span>
        </div>
      </Panel>

      {/* 3. Alertas */}
      <Panel className="flex flex-col justify-between p-4 min-h-[105px] border border-border/50 hover:border-accent/40 bg-card shadow-sm transition-all duration-300 group hover:shadow-md">
        <div className="flex items-center gap-1.5 text-muted-foreground/80">
          <AlertTriangle className="size-3.5 text-amber-500 transition-transform group-hover:scale-110" />
          <span className="text-[9.5px] font-extrabold uppercase tracking-widest">Alertas</span>
        </div>
        <div className="mt-2.5 flex flex-col">
          <span className={cn(
            "text-xs font-extrabold tracking-wider leading-tight uppercase",
            criticalCount > 0 
              ? "text-red-500 animate-pulse" 
              : warningCount > 0 
                ? "text-amber-500 animate-pulse-slow" 
                : "text-emerald-500"
          )}>
            {criticalCount > 0 ? "ALERTA ACTIVA" : warningCount > 0 ? "ADVERTENCIA" : "SIN ALERTAS"}
          </span>
          <span className="text-[10px] text-muted-foreground mt-1 font-semibold leading-tight truncate">
            {criticalCount > 0 
              ? `${criticalCount} crítica${criticalCount !== 1 ? 's' : ''}` 
              : warningCount > 0 
                ? `${warningCount} advertencia${warningCount !== 1 ? 's' : ''}` 
                : "Parámetros en rango"}
          </span>
        </div>
      </Panel>

      {/* 4. Conectividad */}
      <Panel className="flex flex-col justify-between p-4 min-h-[105px] border border-border/50 hover:border-accent/40 bg-card shadow-sm transition-all duration-300 group hover:shadow-md">
        <div className="flex items-center gap-1.5 text-muted-foreground/80">
          <Wifi className="size-3.5 text-indigo-500 transition-transform group-hover:scale-110" />
          <span className="text-[9.5px] font-extrabold uppercase tracking-widest">Conectividad</span>
        </div>
        <div className="mt-2.5 flex flex-col">
          <span className="text-base font-extrabold text-foreground tracking-wide uppercase leading-tight">
            {data.conexionESP32 === "conectado" ? data.wifiCalidad : "OFFLINE"}
          </span>
          <span className="text-[10px] text-muted-foreground mt-1 font-mono font-bold leading-tight truncate">
            {data.conexionESP32 === "conectado" ? `${data.wifiRSSI} dBm · ${latencyText}` : "Desconectado"}
          </span>
        </div>
      </Panel>

      {/* 5. Uptime */}
      <Panel className="flex flex-col justify-between p-4 min-h-[105px] border border-border/50 hover:border-accent/40 bg-card shadow-sm transition-all duration-300 group hover:shadow-md">
        <div className="flex items-center gap-1.5 text-muted-foreground/80">
          <Clock className="size-3.5 text-purple-500 transition-transform group-hover:scale-110" />
          <span className="text-[9.5px] font-extrabold uppercase tracking-widest">Uptime</span>
        </div>
        <div className="mt-2.5 flex flex-col">
          <span className="text-base font-extrabold text-foreground tracking-wide leading-tight">
            {data.uptime}
          </span>
          <span className="text-[10px] text-muted-foreground mt-1 font-semibold leading-tight truncate">
            {data.conexionESP32 === "conectado" ? "Operando continuo" : "Inactivo"}
          </span>
        </div>
      </Panel>

      {/* 6. Última Sincro */}
      <Panel className="flex flex-col justify-between p-4 min-h-[105px] border border-border/50 hover:border-accent/40 bg-card shadow-sm transition-all duration-300 group hover:shadow-md">
        <div className="flex items-center gap-1.5 text-muted-foreground/80">
          <RefreshCw className="size-3.5 text-emerald-500 animate-spin-slow transition-transform group-hover:scale-110" />
          <span className="text-[9.5px] font-extrabold uppercase tracking-widest">Última Sincro</span>
        </div>
        <div className="mt-2.5 flex flex-col">
          <span className="text-base font-extrabold text-foreground tracking-wide leading-tight">
            Activo
          </span>
          <span className="text-[10px] text-muted-foreground mt-1 font-mono font-bold leading-tight truncate">
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
