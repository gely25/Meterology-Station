"use client"

import { TopNavigation } from "@/components/dashboard/top-bar"
import { TemperatureCard, HumidityCard, RainCard, ConditionCard } from "@/components/dashboard/metric-cards"
import { PressureCard, AirQualityCard } from "@/components/dashboard/secondary-cards"
import { SystemStatus } from "@/components/dashboard/system-status"
import { HistoryView } from "@/components/dashboard/history-view"
import { EventsView } from "@/components/dashboard/events-view"

import { AlertToast, useNotifications } from "@/components/dashboard/alert-system"
import { useWeather } from "@/hooks/useWeather"
import { ConfigPage } from "@/components/dashboard/config-page"
import { useState, useEffect } from "react"

import { MonitoringCenter } from "@/components/dashboard/monitoring-center"

export default function Page() {
  const data = useWeather()
  const [activeView, setActiveView] = useState("dashboard")
  const notifications = useNotifications(data)
  const [accentTheme, setAccentTheme] = useState<string>("theme-aurora")

  useEffect(() => {
    const saved = localStorage.getItem("agrosmart-color-theme") || "theme-aurora"
    setAccentTheme(saved)
    const themes = ["theme-aurora", "theme-emerald", "theme-ocean", "theme-sunset", "theme-rose", "theme-violet", "theme-slate"]
    document.documentElement.classList.remove(...themes)
    document.documentElement.classList.add(saved)
    document.body.classList.remove(...themes)
    document.body.classList.add(saved)
  }, [])

  const handleThemeChange = (newTheme: string) => {
    setAccentTheme(newTheme)
    localStorage.setItem("agrosmart-color-theme", newTheme)
    const themes = ["theme-aurora", "theme-emerald", "theme-ocean", "theme-sunset", "theme-rose", "theme-violet", "theme-slate"]
    document.documentElement.classList.remove(...themes)
    document.documentElement.classList.add(newTheme)
    document.body.classList.remove(...themes)
    document.body.classList.add(newTheme)
  }

  if (!data) return null;

  return (
    <div className="h-dvh overflow-hidden bg-background p-1 flex flex-col">
      <div className="mx-auto flex flex-col w-full h-full overflow-hidden rounded-3xl border border-border bg-surface">
        <TopNavigation
          data={data}
          active={activeView}
          onNavigate={setActiveView}
          notifications={notifications}
        />

        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="flex flex-1 flex-col gap-3.5 p-2.5 md:p-3 h-full">
            {activeView === 'dashboard' ? (
              <>
                <div className="mt-5 mb-2 shrink-0">
                  <MonitoringCenter data={data} onNavigate={setActiveView} />
                </div>

                {/* Full-height flex column — rows share the available space */}
                <div className="flex-1 flex flex-col gap-3.5 min-h-0">

                  {/* Row 1: Estado del Clima · Temperatura · Humedad  (~48%) */}
                  <div className="flex-[4.8] min-h-0 grid grid-cols-1 gap-3.5 lg:grid-cols-3">
                    <ConditionCard data={data} className="h-full" />
                    <TemperatureCard data={data} className="h-full" />
                    <HumidityCard data={data} />
                  </div>

                  {/* Row 2: Lluvia · Presión · Calidad del Aire · Sistema  (~52%) */}
                  <div className="flex-[5.2] min-h-0 grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
                    <RainCard data={data} />
                    <PressureCard data={data} />
                    <AirQualityCard data={data} className="h-full" />
                    <SystemStatus data={data} className="h-full" />
                  </div>

                </div>
              </>
            ) : activeView === 'historial' ? (
              <div className="flex-1 h-full min-h-0">
                <HistoryView data={data} />
              </div>
            ) : activeView === 'eventos' ? (
              <div className="flex-1 h-full min-h-0">
                <EventsView data={data} />
              </div>
            ) : activeView === 'configuracion' ? (
              <div className="flex-1 overflow-y-auto pr-1">
                <ConfigPage accentTheme={accentTheme} onAccentThemeChange={handleThemeChange} />
              </div>
            ) : null}
          </div>
        </main>
      </div>

      {/* Toast notification */}
      <AlertToast data={data} />
    </div>
  )
}