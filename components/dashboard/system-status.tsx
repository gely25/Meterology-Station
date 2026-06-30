import { Thermometer, Gauge, CloudRain, MonitorSmartphone, Cpu } from "lucide-react"
import { Panel } from "./panel"
import type { WeatherData } from "@/types/weather"

export function SystemStatus({ data }: { data: WeatherData }) {
  const rows = [
    { icon: Thermometer, name: "AHT10", status: data.estadoAHT10 === 'operativo' ? "Operativo" : "Error", active: data.estadoAHT10 === 'operativo' },
    { icon: Gauge, name: "BMP280", status: data.estadoBMP280 === 'operativo' ? "Operativo" : "Error", active: data.estadoBMP280 === 'operativo' },
    { icon: CloudRain, name: "Sensor de lluvia", status: data.estadoSensorLluvia === 'operativo' ? "Operativo" : "Error", active: data.estadoSensorLluvia === 'operativo' },
    { icon: MonitorSmartphone, name: "Pantalla OLED", status: data.estadoOLED === 'activa' ? "Activa" : "Inactiva", active: data.estadoOLED === 'activa' },
    { icon: Cpu, name: "ESP32", status: data.conexionESP32 === 'conectado' ? "Conectado" : "Desconectado", active: data.conexionESP32 === 'conectado' },
  ]

  return (
    <Panel className="h-full">
      <h2 className="mb-3 text-sm font-semibold tracking-wide text-foreground">ESTADO DEL SISTEMA</h2>
      <ul className="flex flex-col gap-2.5">
        {rows.map((row) => {
          const Icon = row.icon
          return (
            <li
              key={row.name}
              className="flex items-center justify-between rounded-lg border border-border bg-panel/60 px-3 py-2.5"
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
