import { CloudSun, Wifi, WifiOff, Home, RadioTower, LineChart, Bell, Settings, Info } from "lucide-react"
import type { WeatherData } from "@/types/weather"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "@/components/theme-toggle"

const navItems = [
  { id: "dashboard", label: "DASHBOARD", icon: Home },
  { id: "sensores", label: "SENSORES", icon: RadioTower },
  { id: "historial", label: "HISTORIAL", icon: LineChart },
  { id: "alertas", label: "ALERTAS", icon: Bell },
  { id: "configuracion", label: "AJUSTES", icon: Settings },
]

export function TopNavigation({ data, active, onNavigate }: { data: WeatherData, active: string, onNavigate: (id: string) => void }) {
  const { hora, fecha, conexionESP32 } = data;
  return (
    <header className="flex flex-col xl:flex-row items-center justify-between gap-4 border-b border-border px-5 py-3 bg-sidebar">
      {/* Branding */}
      <div className="flex items-center gap-3 w-full xl:w-auto justify-between xl:justify-start">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-xl bg-humidity/15 text-humidity">
            <CloudSun className="size-7" />
          </span>
          <div>
            <h1 className="text-[17px] font-extrabold tracking-tight text-foreground">ESTACIÓN METEOROLÓGICA IoT</h1>
            <p className="text-xs font-semibold tracking-widest text-humidity">GRUPO 6</p>
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
                "flex items-center gap-2 rounded-xl px-4 py-2.5 text-[11px] font-bold tracking-widest transition-colors whitespace-nowrap",
                isActive
                  ? "bg-humidity/15 text-humidity ring-1 ring-humidity/40"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              )}
            >
              <Icon className="size-4 shrink-0" strokeWidth={2.5} />
              {item.label}
            </button>
          )
        })}
      </nav>

      {/* Status */}
      <div className="flex items-center gap-5 w-full xl:w-auto justify-end">
        <div className="flex items-center gap-2 rounded-xl border border-border bg-card/80 px-4 py-2">
          <span className={`size-2 rounded-full shadow-[0_0_8px] ${conexionESP32 === 'conectado' ? 'bg-success shadow-success' : 'bg-alert shadow-alert'}`} />
          <div className="leading-tight">
            <p className="text-[11px] font-bold text-foreground">ESP32</p>
            <p className="text-[9px] font-medium tracking-wide text-muted-foreground uppercase">{conexionESP32}</p>
          </div>
        </div>
        <div className="text-right leading-tight hidden sm:block">
          <p className="font-mono text-xl font-bold tracking-widest text-foreground tabular-nums">{hora}</p>
          <p className="text-[10px] font-medium tracking-widest text-muted-foreground">{fecha}</p>
        </div>
        {conexionESP32 === 'conectado' ? <Wifi className="size-5 text-muted-foreground" /> : <WifiOff className="size-5 text-alert" />}
        <ThemeToggle />
      </div>
    </header>
  )
}
