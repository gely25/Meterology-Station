"use client"

import { TopNavigation } from "@/components/dashboard/top-bar"
import { TemperatureCard, HumidityCard, RainCard, ConditionCard } from "@/components/dashboard/metric-cards"
import { PressureCard, AltitudeCard, LocalTimeCard } from "@/components/dashboard/secondary-cards"
import { RealtimeChart } from "@/components/dashboard/realtime-chart"
import { SystemStatus } from "@/components/dashboard/system-status"
import { FooterBar } from "@/components/dashboard/footer-bar"
import { AlertBanner, AlertToast, NotificationPanel, useNotifications } from "@/components/dashboard/alert-system"
import { useWeather } from "@/hooks/useWeather"
import { useState } from "react"
import { Panel } from "@/components/dashboard/panel"

export default function Page() {
  const data = useWeather()
  const [activeView, setActiveView] = useState("dashboard")
  const [notifOpen, setNotifOpen] = useState(false)
  const notifications = useNotifications(data)

  if (!data) return null;

  return (
    <div className="min-h-screen bg-background p-3 md:p-5">
      <div className="mx-auto flex flex-col w-full overflow-hidden rounded-3xl border border-border bg-card/40">
        <TopNavigation
          data={data}
          active={activeView}
          onNavigate={setActiveView}
          onBellClick={() => setNotifOpen(true)}
        />

        <main className="flex min-w-0 flex-1 flex-col">
          <div className="flex flex-col gap-4 p-4 md:p-5">
            {activeView === 'dashboard' ? (
              <>
                {/* Row 1: Hero — Estado del Clima + Temperatura */}
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                  <ConditionCard data={data} />
                  <TemperatureCard data={data} className="lg:col-span-2 h-full" />
                </div>

                {/* Row 2: Humedad, Lluvia, Presión, Altitud */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <HumidityCard data={data} />
                  <RainCard data={data} />
                  <PressureCard data={data} />
                  <AltitudeCard data={data} />
                </div>

                {/* Row 3: Historial + Estado del Sistema + Reloj */}
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                  <div className="lg:col-span-2">
                    <RealtimeChart data={data} />
                  </div>
                  <div className="flex flex-col gap-4">
                    <SystemStatus data={data} />
                    <LocalTimeCard />
                  </div>
                </div>
              </>
            ) : (
              <Panel className="flex flex-col items-center justify-center py-32 text-center">
                <h2 className="text-2xl font-bold text-muted-foreground uppercase mb-2">Módulo en Desarrollo</h2>
                <p className="text-muted-foreground">La vista para <strong>{activeView.toUpperCase()}</strong> estará disponible próximamente.</p>
              </Panel>
            )}

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
