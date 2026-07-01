import { RefreshCw, MapPin, Code, Users } from "lucide-react"

const items = [
  { icon: RefreshCw, label: "ACTUALIZACIÓN", value: "Cada 5 segundos", color: "oklch(0.78 0.13 210)" },
  { icon: MapPin, label: "UBICACIÓN", value: "Guayaquil, Ecuador", color: "oklch(0.7 0.16 240)" },
  { icon: Code, label: "VERSIÓN", value: "v1.0.0", color: "oklch(0.78 0.18 150)" },
  { icon: Users, label: "DESARROLLADO POR", value: "Grupo 6", color: "oklch(0.68 0.18 300)" },
]

import type { WeatherData } from "@/types/weather"

export function FooterBar({ data }: { data: WeatherData }) {
  return (
    <footer className="grid grid-cols-2 gap-2 border-t border-border px-1 pt-2 pb-1 md:grid-cols-4">
      {items.map((item) => {
        const Icon = item.icon
        return (
          <div key={item.label} className="flex items-center gap-2 rounded-xl border border-border bg-card/60 px-3 py-1.5">
            <span className="grid size-7 place-items-center rounded-lg" style={{ color: item.color, backgroundColor: `${item.color}1f` }}>
              <Icon className="size-4" />
            </span>
            <div className="leading-tight">
              <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">{item.label}</p>
              <p className="text-sm font-bold text-foreground">{item.value}</p>
            </div>
          </div>
        )
      })}
    </footer>
  )
}
