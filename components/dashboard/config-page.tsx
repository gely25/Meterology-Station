"use client"

import { useState, useEffect } from "react"
import { Panel, PanelHeader } from "./panel"
import { Save, RefreshCw, Server, Moon, Sun, Monitor, Wifi, WifiOff, AlertTriangle, CheckCircle2, CheckCircle, Info, Cpu } from "lucide-react"
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

        <Panel>
          <PanelHeader icon={<RefreshCw className="size-4 text-emerald-500" />} title="Sincronización" subtitle="Frecuencia de lectura de datos" accent="var(--color-emerald-500)" />
          <div className="mt-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Intervalo de Actualización</label>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-foreground">{config.interval} ms</span>
                {config.interval >= 1000 && config.interval <= 2000 && (
                  <span className="text-[10px] font-semibold text-emerald-500 border border-emerald-500/30 bg-emerald-500/10 rounded-md px-1.5 py-0.5">✓ Recomendado</span>
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

            {/* ── Contextual hints by zone ── */}
            {(() => {
              const iv = config.interval
              if (iv < 500) return (
                <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/8 px-3 py-2.5 text-xs text-red-400">
                  <AlertTriangle className="size-4 shrink-0 mt-0.5 text-red-400" />
                  <div className="flex flex-col gap-0.5">
                    <span className="font-bold uppercase tracking-wide">⚡ Frecuencia muy alta</span>
                    <span className="text-muted-foreground">El ESP32 puede saturarse con peticiones tan frecuentes. Puede causar pérdida de paquetes, retrasos y calentamiento del módulo WiFi. Se recomienda mínimo 500 ms.</span>
                  </div>
                </div>
              )
              if (iv >= 500 && iv < 1000) return (
                <div className="flex items-start gap-2 rounded-xl border border-warning/30 bg-warning/8 px-3 py-2.5 text-xs text-warning">
                  <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                  <div className="flex flex-col gap-0.5">
                    <span className="font-bold uppercase tracking-wide">⚠ Alta frecuencia</span>
                    <span className="text-muted-foreground">Puede incrementar el tráfico de red y el consumo del ESP32. Funcional para monitoreo intensivo, pero puede generar inestabilidad en redes saturadas.</span>
                  </div>
                </div>
              )
              if (iv >= 1000 && iv <= 2000) return (
                <div className="flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/8 px-3 py-2.5 text-xs text-emerald-400">
                  <CheckCircle className="size-4 shrink-0 mt-0.5" />
                  <div className="flex flex-col gap-0.5">
                    <span className="font-bold uppercase tracking-wide">✓ Zona óptima ({iv === 1000 ? '1 s · ideal' : `${iv} ms`})</span>
                    <span className="text-muted-foreground">Balance perfecto entre actualización en tiempo real y estabilidad del sistema. Recomendado para uso continuo y monitoreo cotidiano.</span>
                  </div>
                </div>
              )
              if (iv > 2000 && iv <= 5000) return (
                <div className="flex items-start gap-2 rounded-xl border border-sky-500/30 bg-sky-500/8 px-3 py-2.5 text-xs text-sky-400">
                  <Info className="size-4 shrink-0 mt-0.5" />
                  <div className="flex flex-col gap-0.5">
                    <span className="font-bold uppercase tracking-wide">ℹ Frecuencia moderada</span>
                    <span className="text-muted-foreground">Adecuado para condiciones climáticas estables o para reducir el consumo de red. Los cambios bruscos de temperatura o lluvia pueden tardar más en reflejarse.</span>
                  </div>
                </div>
              )
              if (iv > 5000 && iv <= 8000) return (
                <div className="flex items-start gap-2 rounded-xl border border-indigo-500/30 bg-indigo-500/8 px-3 py-2.5 text-xs text-indigo-400">
                  <Info className="size-4 shrink-0 mt-0.5" />
                  <div className="flex flex-col gap-0.5">
                    <span className="font-bold uppercase tracking-wide">↓ Frecuencia baja</span>
                    <span className="text-muted-foreground">Útil en condiciones muy estables o en redes con ancho de banda muy limitado. El historial y las gráficas tendrán menos resolución de datos.</span>
                  </div>
                </div>
              )
              return (
                <div className="flex items-start gap-2 rounded-xl border border-muted/40 bg-muted/10 px-3 py-2.5 text-xs text-muted-foreground">
                  <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                  <div className="flex flex-col gap-0.5">
                    <span className="font-bold uppercase tracking-wide text-foreground/70">↓↓ Frecuencia muy baja ({iv / 1000}s)</span>
                    <span>El dashboard se actualizará muy esporádicamente. No recomendado para monitoreo activo. Las alertas críticas pueden llegar con retraso significativo.</span>
                  </div>
                </div>
              )
            })()}

            {/* ── System Read Statistics ── */}
            {(() => {
              const perMin  = Math.floor(60_000 / config.interval)
              const perHour = Math.floor(3_600_000 / config.interval)
              const perDay  = Math.floor(86_400_000 / config.interval)
              const iv = config.interval
              const zoneSub = iv < 500 ? "⚡ Muy alta frecuencia" : iv < 1000 ? "Alta frecuencia" : iv <= 2000 ? "✓ Zona recomendada" : iv <= 5000 ? "Frecuencia moderada" : iv <= 8000 ? "Baja frecuencia" : "⚠ Muy baja frecuencia"
              const stats = [
                { label: "Intervalo actual",  value: `${config.interval} ms`, sub: zoneSub },
                { label: "Lecturas / minuto", value: perMin.toLocaleString(),  sub: "req/min" },
                { label: "Lecturas / hora",   value: perHour.toLocaleString(), sub: "req/h" },
                { label: "Lecturas / día",    value: perDay.toLocaleString(),  sub: "req/día" },
              ]
              return (
                <div className="mt-1.5 grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {stats.map(s => (
                    <div key={s.label} className="flex flex-col gap-0.5 rounded-xl border border-border/60 bg-background/50 px-3 py-2.5">
                      <span className="text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground">{s.label}</span>
                      <span className="text-base font-bold text-foreground leading-tight">{s.value}</span>
                      <span className="text-[9px] text-muted-foreground/70">{s.sub}</span>
                    </div>
                  ))}
                </div>
              )
            })()}
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

      {/* ── FLOATING TOAST NOTIFICATION ── */}
      {(hasChanges && !saved) && (
        <div className="fixed top-20 right-6 z-50 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-card p-4 shadow-xl shadow-amber-500/5 max-w-sm animate-slide-in-right">
          <AlertTriangle className="size-5 shrink-0 text-amber-500 mt-0.5" />
          <div className="flex-1 flex flex-col gap-0.5 pr-2">
            <span className="text-xs font-bold text-foreground">Cambios pendientes</span>
            <span className="text-[11px] text-muted-foreground leading-snug">Tienes modificaciones en la configuración del ESP32 sin aplicar.</span>
          </div>
        </div>
      )}

      {saved && (
        <div className="fixed top-20 right-6 z-50 flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-card p-4 shadow-xl shadow-emerald-500/5 max-w-sm animate-slide-in-right">
          <CheckCircle2 className="size-5 shrink-0 text-emerald-500 mt-0.5" />
          <div className="flex-1 flex flex-col gap-0.5 pr-2">
            <span className="text-xs font-bold text-foreground">Ajustes guardados</span>
            <span className="text-[11px] text-muted-foreground leading-snug">La configuración ha sido sincronizada con el firmware correctamente.</span>
          </div>
        </div>
      )}

      {/* ── SAVE BAR ── */}
      <div className="flex items-center justify-between pt-2 border-t border-border/10">
        {/* Left side: status indicator */}
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className={cn("size-3.5 transition-colors", hasChanges ? "text-muted-foreground/35" : "text-emerald-500")} />
          <span className={cn("text-xs font-semibold transition-colors", hasChanges ? "text-muted-foreground/60" : "text-emerald-500/80")}>
            {hasChanges ? "Esperando aplicación de cambios" : "Configuración sincronizada"}
          </span>
        </div>

        {/* Right side: save button */}
        <button
          onClick={handleSave}
          disabled={!hasChanges}
          className={cn(
            "flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold tracking-widest transition-all",
            saved
              ? "bg-emerald-500 text-white cursor-default"
              : hasChanges
                ? "bg-sky-500 hover:bg-sky-600 text-white shadow-lg shadow-sky-500/20"
                : "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
          )}
        >
          {saved
            ? <><CheckCircle2 className="size-4" /> GUARDADO</>
            : hasChanges
              ? <><Save className="size-4" /> GUARDAR CAMBIOS</>
              : <><Save className="size-4" /> SIN CAMBIOS</>}
        </button>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(24px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .animate-slide-in-right {
          animation: slideInRight 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
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
