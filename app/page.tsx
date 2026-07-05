"use client"

import { TopNavigation } from "@/components/dashboard/top-bar"
import { TemperatureCard, HumidityCard, RainCard, ConditionCard } from "@/components/dashboard/metric-cards"
import { PressureCard, AirQualityCard } from "@/components/dashboard/secondary-cards"
import { SystemStatus } from "@/components/dashboard/system-status"
import { HistoryView } from "@/components/dashboard/history-view"
import { EventsView } from "@/components/dashboard/events-view"

import { AlertBanner, AlertToast, NotificationPanel, useNotifications } from "@/components/dashboard/alert-system"
import { useWeather } from "@/hooks/useWeather"
import { ConfigPage } from "@/components/dashboard/config-page"
import { useState } from "react"

import { MonitoringCenter } from "@/components/dashboard/monitoring-center"

export default function Page() {
  const data = useWeather()
  const [activeView, setActiveView] = useState("dashboard")
  const [notifOpen, setNotifOpen] = useState(false)
  const notifications = useNotifications(data)

  if (!data) return null;

  return (
    <div className="h-screen overflow-hidden bg-background p-1 flex flex-col">
      <div className="mx-auto flex flex-col w-full h-full overflow-hidden rounded-3xl border border-border bg-card/40">
        <TopNavigation
          data={data}
          active={activeView}
          onNavigate={setActiveView}
          onBellClick={() => setNotifOpen(true)}
        />

        <main className="flex min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">
          <div className="flex flex-1 flex-col gap-3 p-3 md:p-4 h-full">
            {activeView === 'dashboard' ? (
              <>
                <AlertBanner data={data} onNavigate={setActiveView} />
                
                <MonitoringCenter data={data} onNavigate={setActiveView} />

                {/* Full-height flex column — rows share the available space */}
                <div className="flex-1 flex flex-col gap-3 min-h-0">

                  {/* Row 1: Estado del Clima · Temperatura · Humedad  (~55%) */}
                  <div className="flex-[5.5] min-h-0 grid grid-cols-1 gap-3 lg:grid-cols-3">
                    <ConditionCard    data={data} className="h-full" />
                    <TemperatureCard  data={data} className="h-full" />
                    <HumidityCard     data={data} className="h-full" />
                  </div>

                  {/* Row 2: Lluvia · Presión · Calidad del Aire · Sistema  (~45%) */}
                  <div className="flex-[4.5] min-h-0 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <RainCard        data={data} className="h-full" />
                    <PressureCard    data={data} className="h-full" />
                    <AirQualityCard  data={data} className="h-full" />
                    <SystemStatus    data={data} className="h-full" />
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
              <div className="flex-1">
                <ConfigPage />
              </div>
            ) : null}
          </div>
        </main>
      </div>

      {/* Toast notification */}
      <AlertToast data={data} />

      {/* Notification panel */}
      <NotificationPanel
        open={notifOpen}
        onClose={() => setNotifOpen(false)}
        notifications={notifications}
      />
    </div>
  )
}

