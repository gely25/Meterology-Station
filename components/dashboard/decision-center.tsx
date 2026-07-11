"use client"

import { useMemo } from "react"
import { Shield, CheckCircle2, AlertTriangle, AlertCircle, Info, Download, ChevronRight } from "lucide-react"
import { Panel, PanelHeader } from "./panel"
import type { WeatherData } from "@/types/weather"
import { evaluateDecisions } from "@/lib/decisionEngine"
import { exportToCSV } from "@/lib/exporter"
import { cn } from "@/lib/utils"

export function DecisionCenterView({ data }: { data: WeatherData }) {
  const { history, events } = data

  // Memoizar el cálculo para no degradar rendimiento de renders rápidos
  const report = useMemo(() => {
    return evaluateDecisions(history, events)
  }, [history, events])

  const IconStatus = useMemo(() => {
    switch (report.status) {
      case "Riesgo Alto": return AlertCircle
      case "Riesgo Moderado": return AlertTriangle
      case "Atención": return Info
      default: return CheckCircle2
    }
  }, [report.status])

  return (
    <div className="h-full flex flex-col min-h-0 gap-3.5 select-none animate-fade-in">
      
      {/* HEADER BAR */}
      <div className="px-5 py-4 border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-background/50 rounded-xl border border-border/40">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-xl bg-card border border-border shadow-sm">
            <Shield className="size-5 text-accent" />
          </div>
          <div>
            <h2 className="text-lg font-bold leading-tight tracking-wide text-foreground">Centro de Decisiones</h2>
            <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">Interpretación inteligente de la estación</p>
          </div>
        </div>

        {/* Dropdown Menu de Exportación Consolidada Profesional */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportToCSV(history, events, "consolidado")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors text-xs font-bold text-foreground cursor-pointer shadow-sm"
          >
            <Download className="size-3.5" />
            <span>Exportar Informe (.CSV / Excel)</span>
          </button>
        </div>
      </div>

      {/* 3 BLOCKS LAYOUT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 flex-1 min-h-0 overflow-y-auto pr-1">
        
        {/* BLOCK 1: Estado General */}
        <Panel className="flex flex-col justify-between p-5 min-h-[220px]">
          <div>
            <PanelHeader 
              icon={<Shield className="size-4 text-accent" />} 
              title="Estado General" 
              subtitle="Diagnóstico del periodo" 
              accent="var(--accent)" 
            />
            <div className={cn("mt-4 p-4 rounded-xl border flex flex-col gap-2 items-center text-center", report.statusColor)}>
              <IconStatus className="size-8 animate-pulse-slow" />
              <span className="text-xl font-extrabold tracking-widest uppercase leading-none mt-1">{report.status}</span>
              <p className="text-xs font-medium leading-relaxed text-muted-foreground mt-2 max-w-[90%]">{report.statusReason}</p>
            </div>
          </div>
          <div className="text-[9px] font-semibold text-muted-foreground/45 border-t border-border/10 pt-3 text-center uppercase tracking-widest">
            Actualizado en tiempo real
          </div>
        </Panel>

        {/* BLOCK 2: Hallazgos */}
        <Panel className="flex flex-col justify-between p-5 min-h-[220px]">
          <div>
            <PanelHeader 
              icon={<Info className="size-4 text-sky-400" />} 
              title="Hallazgos del Periodo" 
              subtitle="Eventos y patrones detectados" 
              accent="var(--color-sky-400)" 
            />
            <div className="mt-3 flex flex-col gap-2.5 max-h-[240px] overflow-y-auto pr-1">
              {report.findings.map((f, i) => (
                <div key={i} className="flex items-start gap-2 text-xs font-semibold text-foreground leading-normal border-b border-border/10 pb-2 last:border-0 last:pb-0">
                  <ChevronRight className="size-3.5 shrink-0 text-sky-500 mt-0.5" />
                  <p className="flex-1">{f}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="text-[9px] font-semibold text-muted-foreground/45 border-t border-border/10 pt-3 text-center uppercase tracking-widest">
            Análisis correlacionado
          </div>
        </Panel>

        {/* BLOCK 3: Acciones sugeridas */}
        <Panel className="flex flex-col justify-between p-5 min-h-[220px]">
          <div>
            <PanelHeader 
              icon={<AlertTriangle className="size-4 text-amber-400" />} 
              title="Acciones Sugeridas" 
              subtitle="Recomendaciones operativas" 
              accent="var(--color-amber-400)" 
            />
            <div className="mt-3 flex flex-col gap-2.5 max-h-[240px] overflow-y-auto pr-1">
              {report.recommendations.map((r, i) => (
                <div key={i} className="flex items-start gap-2 text-xs font-bold text-foreground leading-normal border-b border-border/10 pb-2 last:border-0 last:pb-0">
                  <span className="size-1.5 rounded-full bg-amber-500 shrink-0 mt-2" />
                  <p className="flex-1 text-muted-foreground hover:text-foreground transition-colors">{r}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="text-[9px] font-semibold text-muted-foreground/45 border-t border-border/10 pt-3 text-center uppercase tracking-widest">
            Basado en umbrales de seguridad
          </div>
        </Panel>

      </div>
    </div>
  )
}
