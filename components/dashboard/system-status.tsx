import { Thermometer, Gauge, CloudRain, MonitorSmartphone, Cpu, Wind, Lightbulb, BellRing, Wifi, Clock, Activity } from "lucide-react"
import { Panel } from "./panel"
import { cn } from "@/lib/utils"
import type { WeatherData } from "@/types/weather"

// ─── WiFi signal bar ──────────────────────────────────────────────────────────
function WifiSignalBar({ rssi }: { rssi: number }) {
  // rssi ranges: -50 dBm excellent, -70 good, -80 fair, -90 poor
  const bars = rssi >= -50 ? 4 : rssi >= -65 ? 3 : rssi >= -75 ? 2 : rssi >= -85 ? 1 : 0
  const colors = ['bg-alert', 'bg-orange-400', 'bg-yellow-400', 'bg-success', 'bg-success']
  return (
    <div className="flex items-end gap-0.5 h-3.5">
      {[1, 2, 3, 4].map(b => (
        <div
          key={b}
          className={`w-1 rounded-sm transition-all ${b <= bars ? colors[bars] : 'bg-muted/40'}`}
          style={{ height: `${25 * b}%` }}
        />
      ))}
    </div>
  )
}

export function SystemStatus({ data, className }: { data: WeatherData; className?: string }) {
  const esp32Connected = data.conexionESP32 === 'conectado'

  const getStatusInfo = (status: 'operativo' | 'error' | 'desconectado') => {
    if (!esp32Connected) return {
      label: 'Sin conexión',
      textClass: 'text-alert',
      dotClass: 'bg-alert shadow-[0_0_5px] shadow-alert',
    }
    if (status === 'operativo') return {
      label: 'Operativo',
      textClass: 'text-success',
      dotClass: 'bg-success shadow-[0_0_5px] shadow-success animate-pulse',
    }
    if (status === 'error') return {
      label: 'Error',
      textClass: 'text-warning',
      dotClass: 'bg-warning shadow-[0_0_5px] shadow-warning',
    }
    return {
      label: 'Sin conexión',
      textClass: 'text-alert',
      dotClass: 'bg-alert shadow-[0_0_5px] shadow-alert',
    }
  }

  const hardware = [
    { icon: Cpu,               name: "ESP32",            statusInfo: { label: esp32Connected ? 'Conectado' : 'Sin conexión', textClass: esp32Connected ? 'text-success' : 'text-alert', dotClass: esp32Connected ? 'bg-success shadow-[0_0_5px] shadow-success animate-pulse' : 'bg-alert shadow-[0_0_5px] shadow-alert' } },
    { icon: Thermometer,       name: "AHT10",            statusInfo: getStatusInfo(data.estadoAHT10) },
    { icon: Gauge,             name: "BMP280",           statusInfo: getStatusInfo(data.estadoBMP280) },
    { icon: Wind,              name: "MQ135",            statusInfo: getStatusInfo(data.estadoMQ135) },
    { icon: CloudRain,         name: "Sensor de lluvia", statusInfo: getStatusInfo(data.estadoSensorLluvia) },
  ]

  const peripherals = [
    { icon: MonitorSmartphone, name: "OLED",      statusInfo: getStatusInfo(data.estadoOLED) },
    { icon: Lightbulb,         name: "LED Verde",  statusInfo: getStatusInfo(data.estadoLedVerde) },
    { icon: Lightbulb,         name: "LED Rojo",   statusInfo: getStatusInfo(data.estadoLedRojo) },
    { icon: BellRing,          name: "Buzzer",     statusInfo: getStatusInfo(data.estadoBuzzer) },
  ]

  const rssiLabel = data.wifiCalidad || 'Sin conexión'

  return (
    <Panel className={cn("flex flex-col justify-between", className)}>
      <div>
        <h2 className="mb-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Estado del Sistema</h2>
        
        <div className="flex flex-col gap-3">
          {/* Hardware block */}
          <div>
            <h3 className="mb-1.5 text-[8px] font-extrabold uppercase tracking-wider text-muted-foreground/60">Hardware</h3>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1">
              {hardware.map((row) => {
                const Icon = row.icon
                return (
                  <li
                    key={row.name}
                    className="flex items-center justify-between rounded-lg border border-border bg-panel/60 px-2 py-0.5"
                  >
                    <span className="flex items-center gap-2">
                      <Icon className="size-3.5 text-muted-foreground" />
                      <span className="text-[11px] font-semibold text-foreground">{row.name}</span>
                    </span>
                    <span className={cn("flex items-center gap-1.5 text-[10px] font-bold", row.statusInfo.textClass)}>
                      {row.statusInfo.label}
                      <span className={cn("size-1.5 rounded-full", row.statusInfo.dotClass)} />
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>

          {/* Peripherals block */}
          <div>
            <h3 className="mb-1.5 text-[8px] font-extrabold uppercase tracking-wider text-muted-foreground/60">Periféricos</h3>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1">
              {peripherals.map((row) => {
                const Icon = row.icon
                return (
                  <li
                    key={row.name}
                    className="flex items-center justify-between rounded-lg border border-border bg-panel/60 px-2 py-0.5"
                  >
                    <span className="flex items-center gap-2">
                      <Icon className="size-3.5 text-muted-foreground" />
                      <span className="text-[11px] font-semibold text-foreground">{row.name}</span>
                    </span>
                    <span className={cn("flex items-center gap-1.5 text-[10px] font-bold", row.statusInfo.textClass)}>
                      {row.statusInfo.label}
                      <span className={cn("size-1.5 rounded-full", row.statusInfo.dotClass)} />
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      </div>

      {/* Connectivity metrics */}
      <div className="mt-2 pt-2 border-t border-border grid grid-cols-1 sm:grid-cols-3 gap-1.5">
        <div className="flex flex-col rounded-lg border border-border bg-panel/60 px-2 py-1.5">
          <span className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground mb-1 flex items-center gap-1">
            <Wifi className="size-3" /> WiFi RSSI
          </span>
          <div className="flex items-center gap-2">
            <WifiSignalBar rssi={data.wifiRSSI || -90} />
            <span className="text-[10px] font-bold text-foreground">{data.wifiRSSI ? `${data.wifiRSSI} dBm` : 'N/D'}</span>
          </div>
          <span className="text-[8px] text-muted-foreground mt-0.5">{rssiLabel}</span>
        </div>

        <div className="flex flex-col rounded-lg border border-border bg-panel/60 px-2 py-1.5">
          <span className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground mb-1 flex items-center gap-1">
            <Clock className="size-3" /> Uptime ESP32
          </span>
          <span className="text-[11px] font-bold text-foreground font-digital">{data.uptime || 'N/D'}</span>
          <span className="text-[8px] text-muted-foreground mt-0.5">{esp32Connected ? 'Desde ' + data.hora : 'Sin conexión'}</span>
        </div>

        <div className="flex flex-col rounded-lg border border-border bg-panel/60 px-2 py-1.5">
          <span className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground mb-1 flex items-center gap-1">
            <Activity className="size-3" /> Latencia
          </span>
          <span className="text-[11px] font-bold text-foreground">
            {esp32Connected && data.latency ? `${data.latency} ms` : 'N/D'}
          </span>
          <span className="text-[8px] text-muted-foreground mt-0.5">Tiempo respuesta</span>
        </div>
      </div>

      {/* ── Visual status legend ── */}
      <div className="mt-2 pt-2 border-t border-border/40 flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-[7.5px] font-extrabold uppercase tracking-wider text-muted-foreground/50 mr-1">Estado:</span>
        {[
          { label: 'Operativo',         dot: 'bg-success shadow-[0_0_4px] shadow-success' },
          { label: 'Esperando lectura', dot: 'bg-sky-400 shadow-[0_0_4px] shadow-sky-400' },
          { label: 'Error',             dot: 'bg-warning shadow-[0_0_4px] shadow-warning' },
          { label: 'Sin conexión',      dot: 'bg-alert shadow-[0_0_4px] shadow-alert' },
        ].map(s => (
          <span key={s.label} className="flex items-center gap-1">
            <span className={cn("size-1.5 rounded-full shrink-0", s.dot)} />
            <span className="text-[7.5px] font-semibold text-muted-foreground/60">{s.label}</span>
          </span>
        ))}
      </div>
    </Panel>
  )
}
