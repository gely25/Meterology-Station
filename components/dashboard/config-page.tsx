"use client"

import { useState, useEffect } from "react"
import { Panel, PanelHeader } from "./panel"
import { Save, RefreshCw, Server, Moon, Sun, Monitor, Wifi, WifiOff, AlertTriangle, CheckCircle2, Cpu } from "lucide-react"
import { weatherService, AppConfig } from "@/services/weatherService"
import { useWeather } from "@/hooks/useWeather"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"

export function ConfigPage() {
  const { theme, setTheme } = useTheme()
  const data = useWeather()
  const [config, setConfig] = useState<AppConfig>(weatherService.getConfig())
  const [savedConfig, setSavedConfig] = useState<AppConfig>(weatherService.getConfig())
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const initial = weatherService.getConfig()
    setConfig(initial)
    setSavedConfig(initial)
  }, [])

  const hasChanges = JSON.stringify(config) !== JSON.stringify(savedConfig)

  const handleSave = () => {
    weatherService.saveConfig(config)
    weatherService.forceEvent('Configuración guardada exitosamente', 'success')
    setSavedConfig({ ...config })
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const updateConfig = (patch: Partial<AppConfig>) => {
    setConfig(prev => ({ ...prev, ...patch }))
  }

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto w-full animate-fade-in pb-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Configuración del Sistema</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Ajusta los parámetros de conexión con el ESP32 y preferencias de la interfaz.
        </p>
      </div>

      <div className="grid gap-6">
        {/* ── MODO SIMULACIÓN ── */}
        <Panel>
          <PanelHeader icon={<Cpu className="size-4 text-amber-500" />} title="Modo Simulación" subtitle="Generar datos simulados o conectar a hardware real" accent="var(--color-amber-500)" />
          <div className="mt-4">
            <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-background/50">
              <div className="flex flex-col gap-0.5 pr-4">
                <span className="text-sm font-semibold text-foreground">Habilitar datos simulados</span>
                <span className="text-xs text-muted-foreground leading-snug">Cuando está activo, el dashboard muestra datos simulados. Desactívalo para conectar tu ESP32 físico.</span>
              </div>
              <button
                onClick={() => updateConfig({ useSimulation: !config.useSimulation })}
                className={cn(
                  "relative shrink-0 h-6 w-11 rounded-full transition-colors",
                  config.useSimulation ? "bg-amber-500" : "bg-muted"
                )}
              >
                <span
                  className={cn(
                    "absolute top-1 left-1 size-4 rounded-full bg-background transition-transform shadow",
                    config.useSimulation ? "translate-x-5" : "translate-x-0"
                  )}
                />
              </button>
            </div>
          </div>
        </Panel>

        {/* ── CONEXIÓN ESP32 ── */}
        <Panel>
          <PanelHeader icon={<Server className="size-4 text-sky-500" />} title="Conexión ESP32" subtitle="Parámetros de red HTTP / WebSocket" accent="var(--color-sky-500)" />
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Dirección IP</label>
              <input
                type="text"
                value={config.ip}
                onChange={(e) => updateConfig({ ip: e.target.value })}
                className="rounded-xl border border-border bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all"
                placeholder="Ej: 192.168.1.100"
              />
              <p className="text-[11px] text-muted-foreground">Dirección IP local del ESP32.</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Puerto</label>
              <input
                type="text"
                value={config.port}
                onChange={(e) => updateConfig({ port: e.target.value })}
                className="rounded-xl border border-border bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all"
                placeholder="Ej: 80"
              />
              <p className="text-[11px] text-muted-foreground">Puerto HTTP o WebSocket utilizado por el ESP32.</p>
            </div>
          </div>
        </Panel>

        {/* ── SINCRONIZACIÓN ── */}
        <Panel>
          <PanelHeader icon={<RefreshCw className="size-4 text-emerald-500" />} title="Sincronización" subtitle="Frecuencia de lectura de datos" accent="var(--color-emerald-500)" />
          <div className="mt-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Intervalo de Actualización</label>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-foreground">{config.interval} ms</span>
                {config.interval === 1000 && (
                  <span className="text-[10px] font-semibold text-emerald-500 border border-emerald-500/30 bg-emerald-500/10 rounded-md px-1.5 py-0.5">Recomendado</span>
                )}
              </div>
            </div>
            <input
              type="range"
              min="200"
              max="10000"
              step="100"
              value={config.interval}
              onChange={(e) => updateConfig({ interval: Number(e.target.value) })}
              className="w-full accent-emerald-500"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
              <span>Rápido (200ms)</span>
              <span>Lento (10s)</span>
            </div>
            {config.interval < 500 && (
              <div className="flex items-start gap-2 rounded-xl border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
                <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                <span>Intervalos muy bajos pueden aumentar el tráfico de red.</span>
              </div>
            )}
          </div>
        </Panel>

        {/* ── RECONEXIÓN AUTOMÁTICA ── */}
        <Panel>
          <PanelHeader icon={<Wifi className="size-4 text-sky-400" />} title="Reconexión Automática" subtitle="Comportamiento ante pérdida de señal" accent="var(--color-sky-400)" />
          <div className="mt-4">
            <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-background/50">
              <div className="flex flex-col gap-0.5 pr-4">
                <span className="text-sm font-semibold text-foreground">Activar reconexión automática</span>
                <span className="text-xs text-muted-foreground leading-snug">Si se pierde la conexión con el ESP32, el sistema intentará reconectarse automáticamente.</span>
              </div>
              <button
                onClick={() => updateConfig({ autoReconnect: !config.autoReconnect })}
                className={cn(
                  "relative shrink-0 h-6 w-11 rounded-full transition-colors",
                  config.autoReconnect ? "bg-emerald-500" : "bg-muted"
                )}
              >
                <span
                  className={cn(
                    "absolute top-1 left-1 size-4 rounded-full bg-background transition-transform shadow",
                    config.autoReconnect ? "translate-x-5" : "translate-x-0"
                  )}
                />
              </button>
            </div>
          </div>
        </Panel>

        {/* ── APARIENCIA ── */}
        <Panel>
          <PanelHeader icon={<Moon className="size-4 text-indigo-400" />} title="Apariencia" subtitle="Preferencias visuales de la interfaz" accent="var(--color-indigo-500)" />
          <div className="mt-4 grid grid-cols-3 gap-3">
            {[
              { id: 'light', label: 'Claro', icon: Sun, desc: 'Usar siempre el tema claro.' },
              { id: 'dark', label: 'Oscuro', icon: Moon, desc: 'Usar siempre el tema oscuro.' },
              { id: 'system', label: 'Automático', icon: Monitor, desc: 'Seguir automáticamente la configuración del sistema operativo.' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setTheme(t.id)
                  updateConfig({ theme: t.id as AppConfig['theme'] })
                }}
                className={cn(
                  "flex flex-col items-center justify-start gap-2 rounded-xl border p-4 text-left transition-all",
                  (theme === t.id || (theme === undefined && t.id === 'system'))
                    ? "border-indigo-500 bg-indigo-500/10 text-indigo-500"
                    : "border-border bg-background/50 text-muted-foreground hover:bg-muted/50"
                )}
              >
                <t.icon className="size-6 shrink-0" />
                <span className="text-xs font-bold uppercase tracking-wider w-full text-center">{t.label}</span>
                <span className="text-[10px] font-normal leading-snug text-muted-foreground w-full text-center">{t.desc}</span>
              </button>
            ))}
          </div>
        </Panel>

        {/* ── INFORMACIÓN DEL SISTEMA ── */}
        <Panel>
          <PanelHeader icon={<Cpu className="size-4 text-muted-foreground" />} title="Información del Sistema" subtitle="Datos de solo lectura del dispositivo conectado" />
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <InfoRow
              label="Estado"
              value={data?.conexionESP32 === 'conectado' ? 'Conectado' : 'Desconectado'}
              valueClass={data?.conexionESP32 === 'conectado' ? 'text-emerald-500' : 'text-alert'}
              icon={data?.conexionESP32 === 'conectado'
                ? <CheckCircle2 className="size-3.5 text-emerald-500" />
                : <WifiOff className="size-3.5 text-alert" />}
            />
            <InfoRow label="IP del ESP32" value={config.ip} />
            <InfoRow label="Firmware" value="v1.0.0" />
            <InfoRow label="Última conexión" value={data?.ultimaActualizacion ?? '—'} />
          </div>
        </Panel>
      </div>

      {/* ── SAVE BAR ── */}
      <div className="flex items-center justify-between pt-2">
        {hasChanges && !saved ? (
          <p className="text-xs font-semibold text-warning flex items-center gap-1.5">
            <AlertTriangle className="size-3.5" /> Hay cambios sin guardar.
          </p>
        ) : saved ? (
          <p className="text-xs font-semibold text-emerald-500 flex items-center gap-1.5">
            <CheckCircle2 className="size-3.5" /> Configuración guardada correctamente.
          </p>
        ) : (
          <span />
        )}
        <button
          onClick={handleSave}
          disabled={!hasChanges && !saved}
          className={cn(
            "flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold tracking-widest text-white transition-all",
            saved
              ? "bg-emerald-500 cursor-default"
              : hasChanges
                ? "bg-sky-500 hover:bg-sky-600 shadow-lg shadow-sky-500/20"
                : "bg-muted text-muted-foreground cursor-not-allowed"
          )}
        >
          {saved ? <CheckCircle2 className="size-4" /> : <Save className="size-4" />}
          {saved ? "GUARDADO" : "GUARDAR CONFIGURACIÓN"}
        </button>
      </div>
    </div>
  )
}

function InfoRow({ label, value, valueClass, icon }: { label: string; value: string; valueClass?: string; icon?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 p-3 rounded-xl border border-border/50 bg-background/40">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1">
        {icon}
        <span className={cn("text-sm font-bold", valueClass ?? "text-foreground")}>{value}</span>
      </div>
    </div>
  )
}
