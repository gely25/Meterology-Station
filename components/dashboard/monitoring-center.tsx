"use client"

import { Activity, ShieldCheck, ShieldAlert, Cpu, Wifi, Clock, RefreshCw, AlertTriangle } from "lucide-react"
import type { WeatherData } from "@/types/weather"
import { cn } from "@/lib/utils"

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

  let generalStatus = "OPERATIVO"
  let statusColor = "text-emerald-500"
  let statusBg = "bg-emerald-500/10 border-emerald-500/20"
  let statusDesc = "Sistema operando normalmente"
  let StatusIcon = ShieldCheck

  if (data.conexionESP32 === "desconectado") {
    generalStatus = "DESCONECTADO"
    statusColor = "text-red-500"
    statusBg = "bg-red-500/10 border-red-500/20"
    statusDesc = "Sin conexión con el ESP32"
    StatusIcon = ShieldAlert
  } else if (errorSensors > 0) {
    generalStatus = "FALLO PARCIAL"
    statusColor = "text-amber-500"
    statusBg = "bg-amber-500/10 border-amber-500/20"
    statusDesc = `${errorSensors} sensor(es) con falla`
    StatusIcon = ShieldAlert
  }

  const criticalCount = data.nivelLluvia >= 70 ? 1 : 0
  const warningCount = (data.calidadAire >= 1800 ? 1 : 0) + (data.nivelLluvia > 20 && data.nivelLluvia < 70 ? 1 : 0)
  const latency = data.latency ?? 0
  const latencyText = data.conexionESP32 === "desconectado" ? "—" : `${latency} ms`

  return (
    <div className="rounded-xl border border-border bg-panel/90 px-4 py-2.5 shadow-md select-none transition-all">
    

      {/* Grid of indicators - Cohesive single panel feel, separated by vertical dividers */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-7 gap-y-2 gap-x-1 pt-2.5">

        {/* 1. Estado General (Takes 2 cols) */}
        <div className="col-span-2 flex flex-col justify-center pr-4 border-r border-border/10">
          <div className="flex items-center gap-1.5 text-muted-foreground/80">
            <StatusIcon className={cn("size-3.5", statusColor)} />
            <span className="text-[9px] font-bold uppercase tracking-wider">Estado General</span>
          </div>
          <span className={cn("text-lg md:text-xl font-extrabold tracking-wide uppercase mt-1 leading-none", statusColor)}>
            {generalStatus}
          </span>
          <span className="text-[10px] text-muted-foreground/80 mt-1 leading-tight truncate">
            {statusDesc}
          </span>
        </div>

        {/* 2. Sensores (1 col) */}
        <div className="col-span-1 flex flex-col justify-center px-4 md:border-r md:border-border/10">
          <div className="flex items-center gap-1.5 text-muted-foreground/60">
            <Activity className="size-3.5 text-sky-500" />
            <span className="text-[9px] font-bold uppercase tracking-wider">Sensores</span>
          </div>
          <span className="text-base md:text-lg font-extrabold text-foreground tracking-wide mt-1 leading-none">
            {operativeSensors} / {totalSensors}
          </span>
          <span className={cn("text-[10px] font-semibold mt-1 leading-tight truncate", !isESPConnected ? "text-red-500" : errorSensors > 0 ? "text-amber-500" : "text-emerald-500")}>
            {!isESPConnected ? "Sin conexión" : errorSensors > 0 ? `${errorSensors} error` : "Operativos"}
          </span>
        </div>

        {/* 3. Alertas (1 col) */}
        <div className="col-span-1 flex flex-col justify-center px-4 xl:border-r xl:border-border/10">
          <div className="flex items-center gap-1.5 text-muted-foreground/60">
            <AlertTriangle className="size-3.5 text-amber-500" />
            <span className="text-[9px] font-bold uppercase tracking-wider">Alertas</span>
          </div>
          <span className={cn("text-base md:text-lg font-extrabold tracking-wide mt-1 leading-none", criticalCount > 0 ? "text-red-500" : "text-foreground")}>
            {criticalCount} Crítica{criticalCount !== 1 && "s"}
          </span>
          <span className="text-[10px] text-muted-foreground/80 mt-1 leading-tight truncate">
            {warningCount} Advertencia{warningCount !== 1 && "s"}
          </span>
        </div>

        {/* 4. Conectividad (1 col) */}
        <div className="col-span-1 flex flex-col justify-center px-4 border-r border-border/10">
          <div className="flex items-center gap-1.5 text-muted-foreground/60">
            <Wifi className="size-3.5 text-indigo-500" />
            <span className="text-[9px] font-bold uppercase tracking-wider">Conectividad</span>
          </div>
          <span className="text-base md:text-lg font-extrabold text-foreground tracking-wide uppercase mt-1 leading-none">
            {data.conexionESP32 === "conectado" ? data.wifiCalidad : "OFFLINE"}
          </span>
          <span className="text-[10px] text-muted-foreground/80 mt-1 leading-tight font-mono truncate">
            {data.conexionESP32 === "conectado" ? `${data.wifiRSSI} dBm · ${latencyText}` : "Desconectado"}
          </span>
        </div>

        {/* 5. Uptime (1 col) */}
        <div className="col-span-1 flex flex-col justify-center px-4 border-r border-border/10">
          <div className="flex items-center gap-1.5 text-muted-foreground/60">
            <Clock className="size-3.5 text-purple-500" />
            <span className="text-[9px] font-bold uppercase tracking-wider">Uptime</span>
          </div>
          <span className="text-base md:text-lg font-extrabold text-foreground tracking-wide mt-1 leading-none">
            {data.uptime}
          </span>
          <span className="text-[10px] text-muted-foreground/80 mt-1 leading-tight truncate">
            {data.conexionESP32 === "conectado" ? "Operando continuo" : "Inactivo"}
          </span>
        </div>

        {/* 6. Última Sincro (1 col) */}
        <div className="col-span-1 flex flex-col justify-center pl-4">
          <div className="flex items-center gap-1.5 text-muted-foreground/60">
            <RefreshCw className="size-3.5 text-emerald-500 animate-spin-slow" />
            <span className="text-[9px] font-bold uppercase tracking-wider">Última Sincro</span>
          </div>
          <span className="text-base md:text-lg font-extrabold text-foreground tracking-wide mt-1 leading-none">
            Activo
          </span>
          <span className="text-[10px] text-muted-foreground/80 mt-1 leading-tight font-mono truncate">
            {data.hora}
          </span>
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
