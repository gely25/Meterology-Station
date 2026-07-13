"use client"

import { useState, useEffect } from "react"
import { Panel, PanelHeader } from "./panel"
import { Save, RefreshCw, Server, Moon, Sun, Monitor, Wifi, WifiOff, AlertTriangle, CheckCircle2, CheckCircle, Info, Cpu, Palette, Sliders, RotateCcw } from "lucide-react"
import { weatherService, AppConfig } from "@/services/weatherService"
import { useWeather } from "@/hooks/useWeather"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"
import { THRESHOLDS, saveThresholds, DEFAULT_THRESHOLDS } from "@/lib/thresholds"

// ─── helpers ──────────────────────────────────────────────────────────────────

function freshThresholds() {
  return {
    temperature: { min: THRESHOLDS.temperature.min, max: THRESHOLDS.temperature.max },
    humidity: { min: THRESHOLDS.humidity.min, comfortMax: THRESHOLDS.humidity.comfortMax, max: THRESHOLDS.humidity.max },
    pressure: { min: THRESHOLDS.pressure.min, max: THRESHOLDS.pressure.max },
    rain: { detected: THRESHOLDS.rain.detected, heavy: THRESHOLDS.rain.heavy },
    airQuality: { excellent: THRESHOLDS.airQuality.excellent, acceptable: THRESHOLDS.airQuality.acceptable, regular: THRESHOLDS.airQuality.regular, bad: THRESHOLDS.airQuality.bad },
  }
}

function defaultThresholds() {
  return {
    temperature: { min: DEFAULT_THRESHOLDS.temperature.min, max: DEFAULT_THRESHOLDS.temperature.max },
    humidity: { min: DEFAULT_THRESHOLDS.humidity.min, comfortMax: DEFAULT_THRESHOLDS.humidity.comfortMax, max: DEFAULT_THRESHOLDS.humidity.max },
    pressure: { min: DEFAULT_THRESHOLDS.pressure.min, max: DEFAULT_THRESHOLDS.pressure.max },
    rain: { detected: DEFAULT_THRESHOLDS.rain.detected, heavy: DEFAULT_THRESHOLDS.rain.heavy },
    airQuality: { excellent: DEFAULT_THRESHOLDS.airQuality.excellent, acceptable: DEFAULT_THRESHOLDS.airQuality.acceptable, regular: DEFAULT_THRESHOLDS.airQuality.regular, bad: DEFAULT_THRESHOLDS.airQuality.bad },
  }
}

// ─── component ────────────────────────────────────────────────────────────────

export function ConfigPage({ accentTheme, onAccentThemeChange }: { accentTheme: string; onAccentThemeChange: (theme: string) => void }) {
  const { theme, setTheme } = useTheme()
  const data = useWeather()

  // ── ESP32 / service config ──────────────────────────────────────────────────
  const [config, setConfig] = useState<AppConfig>(() => weatherService.getConfig())
  const [savedConfig, setSavedConfig] = useState<AppConfig>(() => weatherService.getConfig())

  // ── Thresholds ──────────────────────────────────────────────────────────────
  const [localThresholds, setLocalThresholds] = useState(() => freshThresholds())
  const [savedThresholds, setSavedThresholds] = useState(() => freshThresholds())

  // ── UI state ────────────────────────────────────────────────────────────────
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const initial = weatherService.getConfig()
    setConfig(initial)
    setSavedConfig(initial)
  }, [])

  // ── Validation ──────────────────────────────────────────────────────────────
  const getThresholdErrors = () => {
    const errors: string[] = []
    if (localThresholds.temperature.min >= localThresholds.temperature.max)
      errors.push("Temperatura: La temperatura mínima recomendada debe ser menor que la máxima.")
    if (localThresholds.humidity.min < 0 || localThresholds.humidity.comfortMax < 0 || localThresholds.humidity.max < 0)
      errors.push("Humedad: Los valores no pueden ser negativos.")
    if (localThresholds.humidity.min > 100 || localThresholds.humidity.comfortMax > 100 || localThresholds.humidity.max > 100)
      errors.push("Humedad: Los valores no pueden superar el 100%.")
    if (localThresholds.humidity.min >= localThresholds.humidity.max)
      errors.push("Humedad: La humedad mínima debe ser menor que la máxima.")
    if (localThresholds.humidity.comfortMax <= localThresholds.humidity.min || localThresholds.humidity.comfortMax >= localThresholds.humidity.max)
      errors.push("Humedad: El umbral de confort debe estar entre la humedad mínima y la máxima.")
    if (localThresholds.pressure.min < 0 || localThresholds.pressure.max < 0)
      errors.push("Presión: Los valores no pueden ser negativos.")
    if (localThresholds.pressure.min >= localThresholds.pressure.max)
      errors.push("Presión: La presión mínima debe ser menor que la máxima.")
    if (localThresholds.rain.detected < 0 || localThresholds.rain.heavy < 0)
      errors.push("Sensor de Lluvia: Los valores no pueden ser negativos.")
    if (localThresholds.rain.detected > 100 || localThresholds.rain.heavy > 100)
      errors.push("Sensor de Lluvia: Los valores no pueden superar el 100%.")
    if (localThresholds.rain.detected >= localThresholds.rain.heavy)
      errors.push("Sensor de Lluvia: El umbral de detección debe ser menor que el de lluvia intensa.")
    if (localThresholds.airQuality.excellent < 0 || localThresholds.airQuality.acceptable < 0 || localThresholds.airQuality.regular < 0 || localThresholds.airQuality.bad < 0)
      errors.push("Calidad del Aire: Los valores no pueden ser negativos.")
    if (localThresholds.airQuality.excellent >= localThresholds.airQuality.acceptable)
      errors.push("Calidad del Aire: El nivel 'Excelente' debe ser menor que el 'Buena'.")
    if (localThresholds.airQuality.acceptable >= localThresholds.airQuality.regular)
      errors.push("Calidad del Aire: El nivel 'Buena' debe ser menor que el 'Moderada'.")
    if (localThresholds.airQuality.regular >= localThresholds.airQuality.bad)
      errors.push("Calidad del Aire: El nivel 'Moderada' debe ser menor que el 'Crítica'.")
    return errors
  }

  const thresholdErrors = getThresholdErrors()

  // ── Change detection ────────────────────────────────────────────────────────
  const configChanged = JSON.stringify(config) !== JSON.stringify(savedConfig)
  const thresholdsChanged = JSON.stringify(localThresholds) !== JSON.stringify(savedThresholds)
  const hasChanges = configChanged || thresholdsChanged

  // ── Handlers ────────────────────────────────────────────────────────────────
  const updateConfig = (patch: Partial<AppConfig>) =>
    setConfig(prev => ({ ...prev, ...patch }))

  /** Save both ESP32 config and thresholds in a single action */
  const handleSave = () => {
    if (thresholdErrors.length > 0) return
    // Save ESP32 config
    weatherService.saveConfig(config)
    setSavedConfig({ ...config })
    // Save thresholds (dispatches 'thresholds-updated' event internally)
    saveThresholds(localThresholds)
    setSavedThresholds({ ...localThresholds })
    // Fire a single success event
    weatherService.forceEvent('Configuración del sistema guardada exitosamente', 'success')
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  /** Reset threshold form fields to factory defaults — does NOT save */
  const handleResetThresholds = () => {
    setLocalThresholds(defaultThresholds())
    // Note: we do NOT call saveThresholds here. The user must press GUARDAR CAMBIOS.
  }

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto w-full animate-fade-in pb-10">

      {/* ── Page Header ── */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Configuración del Sistema</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Las preferencias visuales se aplican al instante. La configuración operativa requiere guardar.
        </p>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          GRUPO 1 — PREFERENCIAS DE LA APLICACIÓN
          Se aplican inmediatamente · No requieren presionar Guardar
      ════════════════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-extrabold tracking-[0.2em] uppercase text-accent">Preferencias de la Aplicación</span>
          <div className="flex-1 h-px bg-border/50" />
          <span className="text-[9px] font-medium text-muted-foreground/60 tracking-wide flex items-center gap-1">
            <CheckCircle2 className="size-3 text-accent/70" />
            Se aplican al instante
          </span>
        </div>
      </div>

      <div className="grid gap-6">

        {/* ── APARIENCIA ── */}
        <Panel>
          <PanelHeader icon={<Moon className="size-4 text-indigo-300" />} title="Apariencia" subtitle="Preferencias visuales de la interfaz" accent="var(--color-indigo-300)" />
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
                    ? "border-indigo-200 dark:border-indigo-300/40 bg-indigo-50 dark:bg-indigo-300/10 text-indigo-400 dark:text-indigo-300"
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

        {/* ── COLOR DE ACENTO ── */}
        <Panel className="border border-border/40 hover:border-accent/40 bg-card/90 shadow-sm transition-all duration-300">
          <PanelHeader
            icon={<Palette className="size-4 text-accent" />}
            title="Color de Acento"
            subtitle="Elige el tono del fondo — se aplica instantáneamente"
            accent="var(--accent)"
          />
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {[
              { id: 'theme-aurora', label: 'Aurora', color: '#1E7F6B', desc: 'Teal/Menta' },
              { id: 'theme-emerald', label: 'Esmeralda', color: '#10B981', desc: 'Verde fresco' },
              { id: 'theme-ocean', label: 'Océano', color: '#0EA5E9', desc: 'Azul cielo' },
              { id: 'theme-sunset', label: 'Atardecer', color: '#F97316', desc: 'Naranja cálido' },
              { id: 'theme-rose', label: 'Rosa', color: '#F43F5E', desc: 'Rojo suave' },
              { id: 'theme-violet', label: 'Violeta', color: '#8B5CF6', desc: 'Morado' },
              { id: 'theme-slate', label: 'Pizarra', color: '#64748B', desc: 'Gris neutro' },
            ].map((themeOpt) => {
              const isActive = accentTheme === themeOpt.id
              return (
                <button
                  key={themeOpt.id}
                  type="button"
                  onClick={() => onAccentThemeChange(themeOpt.id)}
                  className={cn(
                    "relative flex flex-col items-center justify-start gap-1.5 rounded-xl border p-3 text-center transition-all duration-200 cursor-pointer",
                    isActive
                      ? "border-accent bg-accent/8 text-accent shadow-md scale-[1.03]"
                      : "border-border bg-background/30 text-muted-foreground hover:bg-muted/40 hover:text-foreground hover:scale-[1.01]"
                  )}
                >
                  {isActive && (
                    <span className="absolute top-1.5 right-1.5 size-3.5 rounded-full bg-accent flex items-center justify-center">
                      <CheckCircle2 className="size-2.5 text-white" />
                    </span>
                  )}
                  <span className="size-5 rounded-full shadow border border-black/10 mt-0.5" style={{ backgroundColor: themeOpt.color }} />
                  <span className="text-[11px] font-extrabold uppercase tracking-wide leading-none">{themeOpt.label}</span>
                  <span className="text-[9px] font-medium leading-none text-muted-foreground/80">{themeOpt.desc}</span>
                </button>
              )
            })}
          </div>
          <p className="mt-3 text-[10px] text-muted-foreground/60 font-medium flex items-center gap-1.5">
            <CheckCircle2 className="size-3 text-emerald-400 dark:text-emerald-300" />
            El color de fondo y los acentos de toda la interfaz cambian al instante. No requiere guardar.
          </p>
        </Panel>

      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          GRUPO 2 — CONFIGURACIÓN OPERATIVA DEL SISTEMA
          Requieren presionar Guardar cambios para aplicarse
      ════════════════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col gap-1 mt-2">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-extrabold tracking-[0.2em] uppercase text-amber-400 dark:text-amber-200">Configuración Operativa del Sistema</span>
          <div className="flex-1 h-px bg-border/50" />
          <span className="text-[9px] font-medium text-muted-foreground/60 tracking-wide flex items-center gap-1">
            <Save className="size-3 text-amber-400/70 dark:text-amber-200/70" />
            Requiere guardar
          </span>
        </div>
      </div>

      <div className="grid gap-6">

        {/* ── MODO SIMULACIÓN ── */}
        <Panel>
          <PanelHeader icon={<Cpu className="size-4 text-amber-300" />} title="Modo Simulación" subtitle="Generar datos simulados o conectar a hardware real" accent="var(--color-amber-300)" />
          <div className="mt-4">
            <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-background/50">
              <div className="flex flex-col gap-0.5 pr-4">
                <span className="text-sm font-semibold text-foreground">Habilitar datos simulados</span>
                <span className="text-xs text-muted-foreground leading-snug">Cuando está activo, el dashboard muestra datos simulados. Desactívalo para conectar tu ESP32 físico.</span>
              </div>
              <button
                onClick={() => updateConfig({ useSimulation: !config.useSimulation })}
                className={cn(
                  "relative shrink-0 h-6 w-11 rounded-full transition-colors border",
                  config.useSimulation ? "bg-amber-200 dark:bg-amber-300/30 border-amber-300 dark:border-amber-300/50" : "bg-muted border-transparent"
                )}
              >
                <span
                  className={cn(
                    "absolute top-1 left-1 size-4 rounded-full transition-transform shadow",
                    config.useSimulation ? "translate-x-5 bg-amber-400 dark:bg-amber-200" : "translate-x-0 bg-background"
                  )}
                />
              </button>
            </div>
          </div>
        </Panel>

        {/* ── CONEXIÓN ESP32 ── */}
        <Panel>
          <PanelHeader icon={<Server className="size-4 text-sky-300" />} title="Conexión ESP32" subtitle="Parámetros de red HTTP / WebSocket" accent="var(--color-sky-300)" />
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Dirección IP</label>
              <input
                type="text"
                value={config.ip}
                onChange={(e) => updateConfig({ ip: e.target.value })}
                className="rounded-xl border border-border bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-sky-300/50 transition-all"
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
                className="rounded-xl border border-border bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-sky-300/50 transition-all"
                placeholder="Ej: 80"
              />
              <p className="text-[11px] text-muted-foreground">Puerto HTTP o WebSocket utilizado por el ESP32.</p>
            </div>
          </div>
        </Panel>

        {/* ── SINCRONIZACIÓN ── */}
        <Panel>
          <PanelHeader icon={<RefreshCw className="size-4 text-emerald-300" />} title="Sincronización" subtitle="Frecuencia de lectura de datos" accent="var(--color-emerald-300)" />
          <div className="mt-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Intervalo de Actualización</label>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-foreground">{config.interval} ms</span>
                {config.interval >= 1000 && config.interval <= 2000 && (
                  <span className="text-[10px] font-semibold text-emerald-400 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-300/30 bg-emerald-50 dark:bg-emerald-300/10 rounded-md px-1.5 py-0.5">✓ Recomendado</span>
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
              className="w-full accent-emerald-300"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
              <span>Rápido (200ms)</span>
              <span>Lento (10s)</span>
            </div>

            {/* ── Contextual hints by zone ── */}
            {(() => {
              const iv = config.interval
              if (iv < 500) return (
                <div className="flex items-start gap-2 rounded-xl border border-rose-200 dark:border-rose-300/25 bg-rose-50 dark:bg-rose-300/8 px-3 py-2.5 text-xs text-rose-400 dark:text-rose-300">
                  <AlertTriangle className="size-4 shrink-0 mt-0.5 text-rose-400 dark:text-rose-300" />
                  <div className="flex flex-col gap-0.5">
                    <span className="font-bold uppercase tracking-wide">⚡ Frecuencia muy alta</span>
                    <span className="text-muted-foreground">El ESP32 puede saturarse con peticiones tan frecuentes. Puede causar pérdida de paquetes, retrasos y calentamiento del módulo WiFi. Se recomienda mínimo 500 ms.</span>
                  </div>
                </div>
              )
              if (iv >= 500 && iv < 1000) return (
                <div className="flex items-start gap-2 rounded-xl border border-amber-200 dark:border-amber-200/25 bg-amber-50 dark:bg-amber-200/8 px-3 py-2.5 text-xs text-amber-400 dark:text-amber-200">
                  <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                  <div className="flex flex-col gap-0.5">
                    <span className="font-bold uppercase tracking-wide">⚠ Alta frecuencia</span>
                    <span className="text-muted-foreground">Puede incrementar el tráfico de red y el consumo del ESP32. Funcional para monitoreo intensivo, pero puede generar inestabilidad en redes saturadas.</span>
                  </div>
                </div>
              )
              if (iv >= 1000 && iv <= 2000) return (
                <div className="flex items-start gap-2 rounded-xl border border-emerald-200 dark:border-emerald-300/25 bg-emerald-50 dark:bg-emerald-300/8 px-3 py-2.5 text-xs text-emerald-400 dark:text-emerald-300">
                  <CheckCircle className="size-4 shrink-0 mt-0.5" />
                  <div className="flex flex-col gap-0.5">
                    <span className="font-bold uppercase tracking-wide">✓ Zona óptima ({iv === 1000 ? '1 s · ideal' : `${iv} ms`})</span>
                    <span className="text-muted-foreground">Balance perfecto entre actualización en tiempo real y estabilidad del sistema. Recomendado para uso continuo y monitoreo cotidiano.</span>
                  </div>
                </div>
              )
              if (iv > 2000 && iv <= 5000) return (
                <div className="flex items-start gap-2 rounded-xl border border-sky-200 dark:border-sky-300/25 bg-sky-50 dark:bg-sky-300/8 px-3 py-2.5 text-xs text-sky-400 dark:text-sky-300">
                  <Info className="size-4 shrink-0 mt-0.5" />
                  <div className="flex flex-col gap-0.5">
                    <span className="font-bold uppercase tracking-wide">ℹ Frecuencia moderada</span>
                    <span className="text-muted-foreground">Adecuado para condiciones climáticas estables o para reducir el consumo de red. Los cambios bruscos de temperatura o lluvia pueden tardar más en reflejarse.</span>
                  </div>
                </div>
              )
              if (iv > 5000 && iv <= 8000) return (
                <div className="flex items-start gap-2 rounded-xl border border-indigo-200 dark:border-indigo-300/25 bg-indigo-50 dark:bg-indigo-300/8 px-3 py-2.5 text-xs text-indigo-400 dark:text-indigo-300">
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
              const perMin = Math.floor(60_000 / config.interval)
              const perHour = Math.floor(3_600_000 / config.interval)
              const perDay = Math.floor(86_400_000 / config.interval)
              const iv = config.interval
              const zoneSub = iv < 500 ? "⚡ Muy alta frecuencia" : iv < 1000 ? "Alta frecuencia" : iv <= 2000 ? "✓ Zona recomendada" : iv <= 5000 ? "Frecuencia moderada" : iv <= 8000 ? "Baja frecuencia" : "⚠ Muy baja frecuencia"
              const stats = [
                { label: "Intervalo actual", value: `${config.interval} ms`, sub: zoneSub },
                { label: "Lecturas / minuto", value: perMin.toLocaleString(), sub: "req/min" },
                { label: "Lecturas / hora", value: perHour.toLocaleString(), sub: "req/h" },
                { label: "Lecturas / día", value: perDay.toLocaleString(), sub: "req/día" },
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
          <PanelHeader icon={<Wifi className="size-4 text-sky-300" />} title="Reconexión Automática" subtitle="Comportamiento ante pérdida de señal" accent="var(--color-sky-300)" />
          <div className="mt-4">
            <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-background/50">
              <div className="flex flex-col gap-0.5 pr-4">
                <span className="text-sm font-semibold text-foreground">Activar reconexión automática</span>
                <span className="text-xs text-muted-foreground leading-snug">Si se pierde la conexión con el ESP32, el sistema intentará reconectarse automáticamente.</span>
              </div>
              <button
                onClick={() => updateConfig({ autoReconnect: !config.autoReconnect })}
                className={cn(
                  "relative shrink-0 h-6 w-11 rounded-full transition-colors border",
                  config.autoReconnect ? "bg-emerald-200 dark:bg-emerald-300/30 border-emerald-300 dark:border-emerald-300/50" : "bg-muted border-transparent"
                )}
              >
                <span
                  className={cn(
                    "absolute top-1 left-1 size-4 rounded-full transition-transform shadow",
                    config.autoReconnect ? "translate-x-5 bg-emerald-400 dark:bg-emerald-200" : "translate-x-0 bg-background"
                  )}
                />
              </button>
            </div>
          </div>
        </Panel>

        {/* ── UMBRALES OPERATIVOS ── */}
        <Panel className="border border-border/40 hover:border-accent/40 bg-card/90 shadow-sm transition-all duration-300">
          <PanelHeader
            icon={<Sliders className="size-4 text-violet-300" />}
            title="Umbrales Operativos"
            subtitle="Parámetros utilizados para interpretar el estado de los sensores."
            accent="var(--color-violet-300)"
          />
          <div className="mt-4 flex flex-col gap-4">

            {/* Grid de Sensores */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* Tarjeta: Temperatura */}
              <div className="flex flex-col gap-3 rounded-xl border border-border/50 bg-background/30 p-4">
                <div className="flex items-center justify-between border-b border-border/30 pb-2">
                  <span className="text-xs font-extrabold uppercase tracking-widest text-foreground">Temperatura</span>
                  <span className="text-[9px] font-semibold text-muted-foreground bg-muted/30 px-1.5 py-0.5 rounded border border-border/20">Sensor AHT10</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] font-semibold text-muted-foreground">Min. recomendada (°C)</span>
                    <input
                      type="number" step="0.1"
                      value={localThresholds.temperature.min}
                      onChange={e => setLocalThresholds(prev => ({ ...prev, temperature: { ...prev.temperature, min: parseFloat(e.target.value) || 0 } }))}
                      className="rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-violet-300/40"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] font-semibold text-muted-foreground">Max. recomendada (°C)</span>
                    <input
                      type="number" step="0.1"
                      value={localThresholds.temperature.max}
                      onChange={e => setLocalThresholds(prev => ({ ...prev, temperature: { ...prev.temperature, max: parseFloat(e.target.value) || 0 } }))}
                      className="rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-violet-300/40"
                    />
                  </label>
                </div>
              </div>

              {/* Tarjeta: Humedad */}
              <div className="flex flex-col gap-3 rounded-xl border border-border/50 bg-background/30 p-4">
                <div className="flex items-center justify-between border-b border-border/30 pb-2">
                  <span className="text-xs font-extrabold uppercase tracking-widest text-foreground">Humedad</span>
                  <span className="text-[9px] font-semibold text-muted-foreground bg-muted/30 px-1.5 py-0.5 rounded border border-border/20">Sensor AHT10</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <label className="flex flex-col gap-1">
                    <span className="text-[9px] font-semibold text-muted-foreground">Mínima (%)</span>
                    <input
                      type="number" min="0" max="100"
                      value={localThresholds.humidity.min}
                      onChange={e => setLocalThresholds(prev => ({ ...prev, humidity: { ...prev.humidity, min: parseFloat(e.target.value) || 0 } }))}
                      className="rounded-xl border border-border bg-background px-2.5 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-violet-300/40"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[9px] font-semibold text-muted-foreground">Confort Máx. (%)</span>
                    <input
                      type="number" min="0" max="100"
                      value={localThresholds.humidity.comfortMax}
                      onChange={e => setLocalThresholds(prev => ({ ...prev, humidity: { ...prev.humidity, comfortMax: parseFloat(e.target.value) || 0 } }))}
                      className="rounded-xl border border-border bg-background px-2.5 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-violet-300/40"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[9px] font-semibold text-muted-foreground">Máxima (%)</span>
                    <input
                      type="number" min="0" max="100"
                      value={localThresholds.humidity.max}
                      onChange={e => setLocalThresholds(prev => ({ ...prev, humidity: { ...prev.humidity, max: parseFloat(e.target.value) || 0 } }))}
                      className="rounded-xl border border-border bg-background px-2.5 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-violet-300/40"
                    />
                  </label>
                </div>
              </div>

              {/* Tarjeta: Presión */}
              <div className="flex flex-col gap-3 rounded-xl border border-border/50 bg-background/30 p-4">
                <div className="flex items-center justify-between border-b border-border/30 pb-2">
                  <span className="text-xs font-extrabold uppercase tracking-widest text-foreground">Presión</span>
                  <span className="text-[9px] font-semibold text-muted-foreground bg-muted/30 px-1.5 py-0.5 rounded border border-border/20">Sensor BMP280</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] font-semibold text-muted-foreground">Mínima (hPa)</span>
                    <input
                      type="number" min="0" step="0.1"
                      value={localThresholds.pressure.min}
                      onChange={e => setLocalThresholds(prev => ({ ...prev, pressure: { ...prev.pressure, min: parseFloat(e.target.value) || 0 } }))}
                      className="rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-violet-300/40"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] font-semibold text-muted-foreground">Máxima (hPa)</span>
                    <input
                      type="number" min="0" step="0.1"
                      value={localThresholds.pressure.max}
                      onChange={e => setLocalThresholds(prev => ({ ...prev, pressure: { ...prev.pressure, max: parseFloat(e.target.value) || 0 } }))}
                      className="rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-violet-300/40"
                    />
                  </label>
                </div>
              </div>

              {/* Tarjeta: Sensor de Lluvia */}
              <div className="flex flex-col gap-3 rounded-xl border border-border/50 bg-background/30 p-4">
                <div className="flex items-center justify-between border-b border-border/30 pb-2">
                  <span className="text-xs font-extrabold uppercase tracking-widest text-foreground">Sensor de Lluvia</span>
                  <span className="text-[9px] font-semibold text-muted-foreground bg-muted/30 px-1.5 py-0.5 rounded border border-border/20">Sensor Resistivo</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] font-semibold text-muted-foreground">Umbral de detección (%)</span>
                    <input
                      type="number" min="0" max="100"
                      value={localThresholds.rain.detected}
                      onChange={e => setLocalThresholds(prev => ({ ...prev, rain: { ...prev.rain, detected: parseFloat(e.target.value) || 0 } }))}
                      className="rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-violet-300/40"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] font-semibold text-muted-foreground">Umbral lluvia intensa (%)</span>
                    <input
                      type="number" min="0" max="100"
                      value={localThresholds.rain.heavy}
                      onChange={e => setLocalThresholds(prev => ({ ...prev, rain: { ...prev.rain, heavy: parseFloat(e.target.value) || 0 } }))}
                      className="rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-violet-300/40"
                    />
                  </label>
                </div>
              </div>

              {/* Tarjeta completa: Calidad del Aire */}
              <div className="flex flex-col gap-3 rounded-xl border border-border/50 bg-background/30 p-4 md:col-span-2">
                <div className="flex items-center justify-between border-b border-border/30 pb-2">
                  <span className="text-xs font-extrabold uppercase tracking-widest text-foreground">Calidad del Aire (Niveles del Sensor MQ135)</span>
                  <span className="text-[9px] font-semibold text-muted-foreground bg-muted/30 px-1.5 py-0.5 rounded border border-border/20">Sensor MQ135</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] font-semibold text-emerald-400 dark:text-emerald-300">Excelente (ppm)</span>
                    <input
                      type="number" min="0"
                      value={localThresholds.airQuality.excellent}
                      onChange={e => setLocalThresholds(prev => ({ ...prev, airQuality: { ...prev.airQuality, excellent: parseFloat(e.target.value) || 0 } }))}
                      className="rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-violet-300/40"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] font-semibold text-sky-400 dark:text-sky-200">Buena (ppm)</span>
                    <input
                      type="number" min="0"
                      value={localThresholds.airQuality.acceptable}
                      onChange={e => setLocalThresholds(prev => ({ ...prev, airQuality: { ...prev.airQuality, acceptable: parseFloat(e.target.value) || 0 } }))}
                      className="rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-violet-300/40"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] font-semibold text-amber-400 dark:text-amber-200">Moderada (ppm)</span>
                    <input
                      type="number" min="0"
                      value={localThresholds.airQuality.regular}
                      onChange={e => setLocalThresholds(prev => ({ ...prev, airQuality: { ...prev.airQuality, regular: parseFloat(e.target.value) || 0 } }))}
                      className="rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-violet-300/40"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] font-semibold text-rose-400 dark:text-rose-300">Crítica (ppm)</span>
                    <input
                      type="number" min="0"
                      value={localThresholds.airQuality.bad}
                      onChange={e => setLocalThresholds(prev => ({ ...prev, airQuality: { ...prev.airQuality, bad: parseFloat(e.target.value) || 0 } }))}
                      className="rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-violet-300/40"
                    />
                  </label>
                </div>
              </div>

            </div>
          </div>
        </Panel>

        {/* ── INFORMACIÓN DEL SISTEMA ── */}
        <Panel>
          <PanelHeader icon={<Cpu className="size-4 text-muted-foreground" />} title="Información del Sistema" subtitle="Datos de solo lectura del dispositivo conectado" />
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <InfoRow
              label="Estado"
              value={data?.conexionESP32 === 'conectado' ? 'Conectado' : 'Desconectado'}
              valueClass={data?.conexionESP32 === 'conectado' ? 'text-emerald-400 dark:text-emerald-300' : 'text-alert'}
              icon={data?.conexionESP32 === 'conectado'
                ? <CheckCircle2 className="size-3.5 text-emerald-400 dark:text-emerald-300" />
                : <WifiOff className="size-3.5 text-alert" />}
            />
            <InfoRow label="IP del ESP32" value={config.ip} />
            <InfoRow label="Firmware" value="v1.0.0" />
            <InfoRow label="Última conexión" value={data?.ultimaActualizacion ?? '—'} />
          </div>
        </Panel>

      </div>

      {/* ── FLOATING TOAST: cambios pendientes ── */}
      {(hasChanges && !saved) && (
        <div className="fixed top-20 right-6 z-50 flex items-start gap-3 rounded-xl border border-amber-200 dark:border-amber-200/25 bg-card p-4 shadow-xl shadow-amber-200/5 max-w-sm animate-slide-in-right">
          <AlertTriangle className="size-5 shrink-0 text-amber-300 mt-0.5" />
          <div className="flex-1 flex flex-col gap-0.5 pr-2">
            <span className="text-xs font-bold text-foreground">Cambios pendientes</span>
            <span className="text-[11px] text-muted-foreground leading-snug">
              {configChanged && thresholdsChanged
                ? 'Hay cambios en la configuración del ESP32 y en los umbrales sin aplicar.'
                : configChanged
                  ? 'Hay modificaciones en la configuración del ESP32 sin aplicar.'
                  : 'Hay cambios en los umbrales operativos sin aplicar.'}
            </span>
          </div>
        </div>
      )}

      {saved && (
        <div className="fixed top-20 right-6 z-50 flex items-start gap-3 rounded-xl border border-emerald-200 dark:border-emerald-300/25 bg-card p-4 shadow-xl shadow-emerald-200/5 max-w-sm animate-slide-in-right">
          <CheckCircle2 className="size-5 shrink-0 text-emerald-300 mt-0.5" />
          <div className="flex-1 flex flex-col gap-0.5 pr-2">
            <span className="text-xs font-bold text-foreground">Configuración guardada</span>
            <span className="text-[11px] text-muted-foreground leading-snug">La configuración operativa ha sido aplicada en todo el sistema.</span>
          </div>
        </div>
      )}

      {/* ── VALIDATION ERRORS ── */}
      {thresholdErrors.length > 0 && (
        <div className="flex flex-col gap-1.5 rounded-xl border border-rose-200 dark:border-rose-300/25 bg-rose-50 dark:bg-rose-300/5 p-3">
          <div className="flex items-center gap-1.5 text-rose-400 dark:text-rose-300">
            <AlertTriangle className="size-4 shrink-0" />
            <span className="text-xs font-bold uppercase tracking-wider">Validación fallida — corrija los errores antes de guardar:</span>
          </div>
          <ul className="list-disc list-inside text-[11px] text-rose-400/90 dark:text-rose-300/80 leading-relaxed flex flex-col gap-0.5 pl-1">
            {thresholdErrors.map((err, idx) => (
              <li key={idx}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* ── SAVE BAR ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-border/10">

        {/* Left: reset + status */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleResetThresholds}
            title="Vuelve a cargar los valores de fábrica en el formulario. Debes presionar Guardar para aplicarlos."
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-background/50 hover:bg-muted text-xs font-bold text-muted-foreground hover:text-foreground transition-all cursor-pointer whitespace-nowrap"
          >
            <RotateCcw className="size-3.5 shrink-0" />
            Restablecer valores recomendados
          </button>

          <div className="hidden sm:flex items-center gap-1.5">
            <CheckCircle2 className={cn("size-3.5 transition-colors", hasChanges ? "text-muted-foreground/35" : "text-emerald-300")} />
            <span className={cn("text-xs font-semibold transition-colors", hasChanges ? "text-muted-foreground/60" : "text-emerald-400/80 dark:text-emerald-300/80")}>
              {hasChanges ? "Cambios sin guardar" : "Todo sincronizado"}
            </span>
          </div>
        </div>

        {/* Right: primary save */}
        <button
          onClick={handleSave}
          disabled={!hasChanges || thresholdErrors.length > 0}
          className={cn(
            "flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold tracking-widest transition-all w-full sm:w-auto justify-center border",
            saved
              ? "bg-emerald-100 dark:bg-emerald-300/15 border-emerald-300 dark:border-emerald-300/40 text-emerald-600 dark:text-emerald-300 cursor-default"
              : hasChanges && thresholdErrors.length === 0
                ? "bg-sky-100 hover:bg-sky-200 dark:bg-sky-300/15 dark:hover:bg-sky-300/25 border-sky-300 dark:border-sky-300/40 text-sky-600 dark:text-sky-200 shadow-sm"
                : "bg-muted text-muted-foreground border-transparent cursor-not-allowed opacity-50"
          )}
        >
          {saved
            ? <><CheckCircle2 className="size-4" /> GUARDADO</>
            : hasChanges && thresholdErrors.length === 0
              ? <><Save className="size-4" /> GUARDAR CAMBIOS</>
              : thresholdErrors.length > 0
                ? <><AlertTriangle className="size-4" /> CORREGIR ERRORES</>
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