"use client"

import { TopNavigation } from "@/components/dashboard/top-bar"
import { TemperatureCard, HumidityCard, RainCard, ConditionCard } from "@/components/dashboard/metric-cards"
import { PressureCard, AltitudeCard, AlertCard, LocalTimeCard } from "@/components/dashboard/secondary-cards"
import { RealtimeChart } from "@/components/dashboard/realtime-chart"
import { SystemStatus } from "@/components/dashboard/system-status"
import { FooterBar } from "@/components/dashboard/footer-bar"
import { useWeather } from "@/hooks/useWeather"
import { useState } from "react"
import { Panel } from "@/components/dashboard/panel"

export default function Page() {
  const data = useWeather()
  const [activeView, setActiveView] = useState("dashboard")

  if (!data) return null;

  return (
    <div className="min-h-screen bg-background p-3 md:p-5">
      <div className="mx-auto flex flex-col w-full overflow-hidden rounded-3xl border border-border bg-card/40">
        <TopNavigation data={data} active={activeView} onNavigate={setActiveView} />

        <main className="flex min-w-0 flex-1 flex-col">

          <div className="flex flex-col gap-4 p-4 md:p-5">
            {activeView === 'dashboard' ? (
              <>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <TemperatureCard data={data} />
                  <HumidityCard data={data} />
                  <RainCard data={data} />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <PressureCard data={data} />
                  <AltitudeCard data={data} />
                  <ConditionCard data={data} />
                  <div className="flex flex-col gap-4">
                    <AlertCard data={data} />
                    <LocalTimeCard />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                  <SystemStatus data={data} />
                  <div className="lg:col-span-2">
                    <RealtimeChart data={data} />
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
    </div>
  )
}
