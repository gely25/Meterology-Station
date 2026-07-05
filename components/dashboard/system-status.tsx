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
  const getStatus = (status: 'operativo' | 'error' | 'desconectado') => {
    if (data.conexionESP32 === 'desconectado') return "Desconectado"
    return status === 'operativo' ? "Operativo" : status === 'error' ? "Error" : "Desconectado"
  }
  
  const getActive = (status: 'operativo' | 'error' | 'desconectado') => {
    if (data.conexionESP32 === 'desconectado') return false
    return status === 'operativo'
  }

  const hardware = [
    { icon: Cpu, name: "ESP32", status: data.conexionESP32 === 'conectado' ? "Conectado" : "Desconectado", active: data.conexionESP32 === 'conectado' },
    { icon: Thermometer, name: "AHT10", status: getStatus(data.estadoAHT10), active: getActive(data.estadoAHT10) },
    { icon: Gauge, name: "BMP280", status: getStatus(data.estadoBMP280), active: getActive(data.estadoBMP280) },
    { icon: Wind, name: "MQ135", status: getStatus(data.estadoMQ135), active: getActive(data.estadoMQ135) },
    { icon: CloudRain, name: "Sensor de lluvia", status: getStatus(data.estadoSensorLluvia), active: getActive(data.estadoSensorLluvia) },
  ]

  const peripherals = [
    { icon: MonitorSmartphone, name: "OLED", status: getStatus(data.estadoOLED), active: getActive(data.estadoOLED) },
    { icon: Lightbulb, name: "LED Verde", status: getStatus(data.estadoLedVerde), active: getActive(data.estadoLedVerde) },
    { icon: Lightbulb, name: "LED Rojo", status: getStatus(data.estadoLedRojo), active: getActive(data.estadoLedRojo) },
    { icon: BellRing, name: "Buzzer", status: getStatus(data.estadoBuzzer), active: getActive(data.estadoBuzzer) },
  ]

  const rssiLabel = data.wifiCalidad || 'N/D'

  return (
    <Panel className={cn("flex flex-col justify-between", className)}>
      <div>
        <h2 className="mb-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Estado del Sistema</h2>
        
        <div className="flex flex-col gap-2">
          {/* Hardware block */}
          <div>
            <h3 className="mb-1 text-[8px] font-extrabold uppercase tracking-wider text-muted-foreground/60">Hardware</h3>
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
                    <span className={`flex items-center gap-1.5 text-[10px] font-bold ${row.active ? 'text-success' : 'text-alert'}`}>
                      {row.status}
                      <span className={`size-1.5 rounded-full ${row.active ? 'bg-success shadow-[0_0_5px] shadow-success' : 'bg-alert shadow-[0_0_5px] shadow-alert'}`} />
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>

          {/* Peripherals block */}
          <div>
            <h3 className="mb-1 text-[8px] font-extrabold uppercase tracking-wider text-muted-foreground/60">Periféricos</h3>
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
                    <span className={`flex items-center gap-1.5 text-[10px] font-bold ${row.active ? 'text-success' : 'text-alert'}`}>
                      {row.status}
                      <span className={`size-1.5 rounded-full ${row.active ? 'bg-success shadow-[0_0_5px] shadow-success' : 'bg-alert shadow-[0_0_5px] shadow-alert'}`} />
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
        {/* WiFi RSSI */}
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

        {/* Uptime */}
        <div className="flex flex-col rounded-lg border border-border bg-panel/60 px-2 py-1.5">
          <span className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground mb-1 flex items-center gap-1">
            <Clock className="size-3" /> Uptime ESP32
          </span>
          <span className="text-[11px] font-bold text-foreground font-digital">{data.uptime || 'N/D'}</span>
          <span className="text-[8px] text-muted-foreground mt-0.5">Tiempo activo</span>
        </div>

        {/* Latency */}
        <div className="flex flex-col rounded-lg border border-border bg-panel/60 px-2 py-1.5">
          <span className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground mb-1 flex items-center gap-1">
            <Activity className="size-3" /> Latencia
          </span>
          <span className="text-[11px] font-bold text-foreground">
            {data.conexionESP32 === 'conectado' && data.latency ? `${data.latency} ms` : 'N/D'}
          </span>
          <span className="text-[8px] text-muted-foreground mt-0.5">Tiempo respuesta</span>
        </div>
      </div>
    </Panel>
  )
}
