"use client"

import { Activity, ShieldCheck, ShieldAlert, Cpu, Wifi, Clock, RefreshCw, AlertTriangle } from "lucide-react"
import type { WeatherData } from "@/types/weather"
import { cn } from "@/lib/utils"

export function MonitoringCenter({ data, onNavigate }: { data: WeatherData; onNavigate?: (view: string) => void }) {
  // 1. Calculate operational and error sensors
  // We have 4 main sensors: AHT10, BMP280, MQ135, Sensor de Lluvia
  const sensors = [
    { name: "AHT10", status: data.estadoAHT10 },
    { name: "BMP280", status: data.estadoBMP280 },
    { name: "MQ135", status: data.estadoMQ135 },
    { name: "Lluvia", status: data.estadoSensorLluvia },
  ]
  const totalSensors = sensors.length
  const operativeSensors = sensors.filter(s => s.status === "operativo").length
  const errorSensors = totalSensors - operativeSensors

  // 2. Derive General Status
  let generalStatus = "OPERATIVO"
  let statusColor = "text-emerald-500"
  let statusBg = "bg-emerald-500/10 border-emerald-500/25"
  let statusDesc = "Sistema operando normalmente"
  let StatusIcon = ShieldCheck

  if (data.conexionESP32 === "desconectado") {
    generalStatus = "DESCONECTADO"
    statusColor = "text-red-500"
    statusBg = "bg-red-500/10 border-red-500/25"
    statusDesc = "Sin conexión con el ESP32"
    StatusIcon = ShieldAlert
  } else if (errorSensors > 0) {
    generalStatus = "FALLO PARCIAL"
    statusColor = "text-amber-500"
    statusBg = "bg-amber-500/10 border-amber-500/25"
    statusDesc = `${errorSensors} sensor(es) con falla`
    StatusIcon = ShieldAlert
  }

  // 3. Count alerts
  const criticalCount = data.nivelLluvia >= 70 ? 1 : 0
  const warningCount = (data.calidadAire >= 1800 ? 1 : 0) + (data.nivelLluvia > 20 && data.nivelLluvia < 70 ? 1 : 0)

  // 4. Derive latency classification
  const latency = data.latency ?? 0
  let latencyText = `${latency} ms`
  if (data.conexionESP32 === "desconectado") latencyText = "—"

  return (
    <div className="rounded-2xl border border-border bg-card/65 p-4 shadow-sm select-none transition-all">
      {/* Header Row */}
      <div className="flex items-center justify-between pb-3 border-b border-border/40">
        <div className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-lg bg-sky-500/15 text-sky-500">
            <Cpu className="size-4" />
          </span>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Centro de Monitoreo</h3>
            <p className="text-[10px] text-muted-foreground">Resumen ejecutivo del estado del hardware y ambiente</p>
          </div>
        </div>
        {onNavigate && (
          <button
            onClick={() => onNavigate("configuracion")}
            className="text-[10px] font-bold text-sky-500 hover:text-sky-400 uppercase tracking-widest hover:underline underline-offset-2 flex items-center gap-1"
          >
            Ver detalles &rsaquo;
          </button>
        )}
      </div>

      {/* Grid of indicators */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 pt-3">
        
        {/* 1. Estado General */}
        <div className={cn("rounded-xl border p-2.5 flex flex-col gap-1 transition-colors", statusBg)}>
          <div className="flex items-center gap-1.5">
            <StatusIcon className={cn("size-3.5", statusColor)} />
            <span className="text-[9px] font-extrabold uppercase tracking-wider text-muted-foreground">Estado General</span>
          </div>
          <span className={cn("text-xs font-extrabold tracking-wide uppercase", statusColor)}>{generalStatus}</span>
          <span className="text-[9px] text-muted-foreground/80 truncate leading-none">{statusDesc}</span>
        </div>

        {/* 2. Sensores */}
        <div className="rounded-xl border border-border/50 bg-background/30 p-2.5 flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Activity className="size-3.5 text-sky-500" />
            <span className="text-[9px] font-extrabold uppercase tracking-wider">Sensores</span>
          </div>
          <span className="text-xs font-extrabold text-foreground tracking-wide">
            {operativeSensors} / {totalSensors}
          </span>
          <span className={cn("text-[9px] font-bold leading-none", errorSensors > 0 ? "text-amber-500" : "text-emerald-500")}>
            {errorSensors > 0 ? `${errorSensors} con error` : "Todos operativos"}
          </span>
        </div>

        {/* 3. Alertas Activas */}
        <div className="rounded-xl border border-border/50 bg-background/30 p-2.5 flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <AlertTriangle className="size-3.5 text-amber-500" />
            <span className="text-[9px] font-extrabold uppercase tracking-wider">Alertas Activas</span>
          </div>
          <span className={cn("text-xs font-extrabold tracking-wide", criticalCount > 0 ? "text-red-500" : "text-foreground")}>
            {criticalCount} Crítica{criticalCount !== 1 && "s"}
          </span>
          <span className="text-[9px] font-semibold text-muted-foreground/80 leading-none">
            {warningCount} Advertencia{warningCount !== 1 && "s"}
          </span>
        </div>

        {/* 4. Conectividad / Latencia */}
        <div className="rounded-xl border border-border/50 bg-background/30 p-2.5 flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Wifi className="size-3.5 text-indigo-500" />
            <span className="text-[9px] font-extrabold uppercase tracking-wider">Conectividad</span>
          </div>
          <span className="text-xs font-extrabold text-foreground tracking-wide uppercase">
            {data.conexionESP32 === "conectado" ? data.wifiCalidad : "SIN SEÑAL"}
          </span>
          <span className="text-[9px] text-muted-foreground/80 leading-none font-mono">
            {data.conexionESP32 === "conectado" ? `${data.wifiRSSI} dBm · ${latencyText}` : "Desconectado"}
          </span>
        </div>

        {/* 5. Tiempo Activo */}
        <div className="rounded-xl border border-border/50 bg-background/30 p-2.5 flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="size-3.5 text-purple-500" />
            <span className="text-[9px] font-extrabold uppercase tracking-wider">Tiempo Activo</span>
          </div>
          <span className="text-xs font-extrabold text-foreground tracking-wide">{data.uptime}</span>
          <span className="text-[9px] text-muted-foreground/80 leading-none truncate">
            {data.conexionESP32 === "conectado" ? "Operando continuo" : "Sistema inactivo"}
          </span>
        </div>

        {/* 6. Última Sincronización */}
        <div className="rounded-xl border border-border/50 bg-background/30 p-2.5 flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <RefreshCw className="size-3.5 text-emerald-500 animate-spin-slow" />
            <span className="text-[9px] font-extrabold uppercase tracking-wider">Última Sincro</span>
          </div>
          <span className="text-xs font-extrabold text-foreground tracking-wide">Activo</span>
          <span className="text-[9px] text-muted-foreground/80 leading-none font-mono">{data.hora}</span>
        </div>

      </div>

      <style>{`
        .animate-spin-slow {
          animation: spin 6s linear infinite;
        }
      `}</style>
    </div>
  )
}
