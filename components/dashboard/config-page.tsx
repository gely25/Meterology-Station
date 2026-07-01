"use client"

import { useState, useEffect } from "react"
import { Panel, PanelHeader } from "./panel"
import { Settings, Save, RefreshCw, Server, Wifi, Moon, Sun } from "lucide-react"
import { weatherService, AppConfig } from "@/services/weatherService"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"

export function ConfigPage() {
  const { theme, setTheme } = useTheme()
  const [config, setConfig] = useState<AppConfig>(weatherService.getConfig())
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    // Refresh config on mount
    setConfig(weatherService.getConfig())
  }, [])

  const handleSave = () => {
    weatherService.saveConfig(config)
    weatherService.forceEvent('Configuración guardada exitosamente', 'success')
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto w-full animate-fade-in pb-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Configuración del Sistema</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Ajusta los parámetros de conexión con el ESP32 y preferencias de la interfaz.
        </p>
      </div>

      <div className="grid gap-6">
        {/* Network Panel */}
        <Panel>
          <PanelHeader icon={<Server className="size-4 text-sky-500" />} title="Conexión ESP32" subtitle="Parámetros de red HTTP/WS" accent="var(--color-sky-500)" />
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Dirección IP</label>
              <input
                type="text"
                value={config.ip}
                onChange={(e) => setConfig({ ...config, ip: e.target.value })}
                className="rounded-xl border border-border bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-humidity/50"
                placeholder="Ej: 192.168.1.100"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Puerto</label>
              <input
                type="text"
                value={config.port}
                onChange={(e) => setConfig({ ...config, port: e.target.value })}
                className="rounded-xl border border-border bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-humidity/50"
                placeholder="Ej: 80"
              />
            </div>
          </div>
        </Panel>

        {/* Sync Panel */}
        <Panel>
          <PanelHeader icon={<RefreshCw className="size-4 text-green-500" />} title="Sincronización" subtitle="Frecuencia de lectura" accent="var(--color-green-500)" />
          <div className="mt-4 grid grid-cols-1 gap-6">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Intervalo de Actualización (ms)</label>
                <span className="text-xs font-bold text-foreground">{config.interval} ms</span>
              </div>
              <input
                type="range"
                min="500"
                max="10000"
                step="100"
                value={config.interval}
                onChange={(e) => setConfig({ ...config, interval: Number(e.target.value) })}
                className="w-full accent-green-500"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
                <span>Rápido (500ms)</span>
                <span>Lento (10s)</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-background/50">
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-foreground">Reconexión Automática</span>
                <span className="text-xs text-muted-foreground">Intentar reconectar si se pierde la señal WiFi/HTTP</span>
              </div>
              <button
                onClick={() => setConfig({ ...config, autoReconnect: !config.autoReconnect })}
                className={cn(
                  "relative h-6 w-11 rounded-full transition-colors",
                  config.autoReconnect ? "bg-green-500" : "bg-muted"
                )}
              >
                <span
                  className={cn(
                    "absolute top-1 left-1 size-4 rounded-full bg-background transition-transform",
                    config.autoReconnect ? "translate-x-5" : "translate-x-0"
                  )}
                />
              </button>
            </div>
          </div>
        </Panel>

        {/* UI Panel */}
        <Panel>
          <PanelHeader icon={<Moon className="size-4 text-indigo-400" />} title="Apariencia" subtitle="Preferencias visuales" accent="var(--color-indigo-500)" />
          <div className="mt-4 grid grid-cols-3 gap-3">
            {[
              { id: 'light', label: 'Claro', icon: Sun },
              { id: 'dark', label: 'Oscuro', icon: Moon },
              { id: 'system', label: 'Sistema', icon: Settings },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setTheme(t.id)
                  setConfig({ ...config, theme: t.id as any })
                }}
                className={cn(
                  "flex flex-col items-center justify-center gap-2 rounded-xl border p-4 transition-all",
                  (theme === t.id || (theme === undefined && t.id === 'system'))
                    ? "border-indigo-500 bg-indigo-500/10 text-indigo-500"
                    : "border-border bg-background/50 text-muted-foreground hover:bg-muted/50"
                )}
              >
                <t.icon className="size-6" />
                <span className="text-xs font-bold uppercase tracking-wider">{t.label}</span>
              </button>
            ))}
          </div>
        </Panel>
      </div>

      <div className="flex justify-end pt-4">
        <button
          onClick={handleSave}
          className={cn(
            "flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold tracking-widest text-white transition-all",
            saved ? "bg-green-500 hover:bg-green-600" : "bg-sky-500 hover:bg-sky-600 shadow-lg shadow-sky-500/20"
          )}
        >
          {saved ? <RefreshCw className="size-4 animate-spin" /> : <Save className="size-4" />}
          {saved ? "GUARDADO" : "GUARDAR CONFIGURACIÓN"}
        </button>
      </div>
    </div>
  )
}
