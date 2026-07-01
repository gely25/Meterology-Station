"use client"

import { TopNavigation } from "@/components/dashboard/top-bar"
import { TemperatureCard, HumidityCard, RainCard, ConditionCard } from "@/components/dashboard/metric-cards"
import { PressureCard, AirQualityCard, LocalTimeCard } from "@/components/dashboard/secondary-cards"
import { RealtimeChart } from "@/components/dashboard/realtime-chart"
import { SystemStatus } from "@/components/dashboard/system-status"
import { FooterBar } from "@/components/dashboard/footer-bar"
import { AlertBanner, AlertToast, NotificationPanel, useNotifications } from "@/components/dashboard/alert-system"
import { useWeather } from "@/hooks/useWeather"
import { ConfigPage } from "@/components/dashboard/config-page"
import { useState } from "react"
import { Panel } from "@/components/dashboard/panel"

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
          <div className="flex flex-col gap-1 p-1 md:p-1.5">
            {activeView === 'dashboard' ? (
              <>
                {/* Row 1: Hero — Estado del Clima + Temperatura */}
                <div className="grid grid-cols-1 gap-1 lg:grid-cols-3">
                  <ConditionCard data={data} />
                  <TemperatureCard data={data} className="lg:col-span-2 h-full" />
                </div>

                {/* Row 2: Humedad, Lluvia, Presión, Calidad del Aire */}
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 xl:grid-cols-4">
                  <HumidityCard data={data} />
                  <RainCard data={data} />
                  <PressureCard data={data} />
                  <AirQualityCard data={data} />
                </div>

                {/* Row 3: Historial + Estado del Sistema + Reloj */}
                <div className="grid grid-cols-1 gap-1 lg:grid-cols-3">
                  <div className="lg:col-span-2">
                    <RealtimeChart data={data} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <SystemStatus data={data} />
                    <LocalTimeCard />
                  </div>
                </div>
              </>
            ) : activeView === 'historial' ? (
              <div className="flex-1 min-h-[500px]">
                <RealtimeChart data={data} />
              </div>
            ) : activeView === 'configuracion' ? (
              <div className="flex-1">
                <ConfigPage />
              </div>
            ) : null}

            <FooterBar data={data} />
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
