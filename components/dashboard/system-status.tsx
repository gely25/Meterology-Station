import { Thermometer, Gauge, CloudRain, MonitorSmartphone, Cpu, Wind, Lightbulb, BellRing } from "lucide-react"
import { Panel } from "./panel"
import type { WeatherData } from "@/types/weather"

export function SystemStatus({ data, className }: { data: WeatherData; className?: string }) {
  const getStatus = (status: 'operativo' | 'error' | 'desconectado') => {
    if (data.conexionESP32 === 'desconectado') return "Desconectado"
    return status === 'operativo' ? "Operativo" : status === 'error' ? "Error" : "Desconectado"
  }
  
  const getActive = (status: 'operativo' | 'error' | 'desconectado') => {
    if (data.conexionESP32 === 'desconectado') return false
    return status === 'operativo'
  }

  const rows = [
    { icon: Cpu, name: "ESP32", status: data.conexionESP32 === 'conectado' ? "Conectado" : "Desconectado", active: data.conexionESP32 === 'conectado' },
    { icon: Thermometer, name: "AHT10", status: getStatus(data.estadoAHT10), active: getActive(data.estadoAHT10) },
    { icon: Gauge, name: "BMP280", status: getStatus(data.estadoBMP280), active: getActive(data.estadoBMP280) },
    { icon: Wind, name: "MQ135", status: getStatus(data.estadoMQ135), active: getActive(data.estadoMQ135) },
    { icon: CloudRain, name: "Sensor de lluvia", status: getStatus(data.estadoSensorLluvia), active: getActive(data.estadoSensorLluvia) },
    { icon: MonitorSmartphone, name: "OLED", status: getStatus(data.estadoOLED), active: getActive(data.estadoOLED) },
    { icon: Lightbulb, name: "LED Verde", status: getStatus(data.estadoLedVerde), active: getActive(data.estadoLedVerde) },
    { icon: Lightbulb, name: "LED Rojo", status: getStatus(data.estadoLedRojo), active: getActive(data.estadoLedRojo) },
    { icon: BellRing, name: "Buzzer", status: getStatus(data.estadoBuzzer), active: getActive(data.estadoBuzzer) },
  ]

  return (
    <Panel className={className || "h-full"}>
      <h2 className="mb-1.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Estado del Sistema</h2>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1">
        {rows.map((row) => {
          const Icon = row.icon
          return (
            <li
              key={row.name}
              className="flex items-center justify-between rounded-lg border border-border bg-panel/60 px-2 py-0.5"
            >
              <span className="flex items-center gap-2.5">
                <Icon className="size-4 text-muted-foreground" />
                <span className="text-sm text-foreground">{row.name}</span>
              </span>
              <span className={`flex items-center gap-2 text-xs font-semibold ${row.active ? 'text-success' : 'text-alert'}`}>
                {row.status}
                <span className={`size-2 rounded-full ${row.active ? 'bg-success shadow-[0_0_6px] shadow-success' : 'bg-alert shadow-[0_0_6px] shadow-alert'}`} />
              </span>
            </li>
          )
        })}
      </ul>
    </Panel>
  )
}
