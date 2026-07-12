# Dashboard de Estación Meteorológica

## Resumen

El Dashboard de la Estación Meteorológica es una aplicación web moderna y de alto rendimiento diseñada para visualizar datos ambientales en tiempo real. Está construida para servir como la interfaz (front-end) de un sistema IoT centrado en un microcontrolador ESP32, el cual recolecta datos de diversos sensores atmosféricos y ambientales (AHT10, BMP280, MQ135 y sensor de lluvia).

El proyecto pone un fuerte énfasis en una interfaz de usuario (UI) limpia, compacta y densa en datos, junto con una experiencia de usuario (UX) robusta para el monitoreo ininterrumpido de métricas meteorológicas críticas.

---

## Características Principales

- **Visualización de Datos en Tiempo Real:** Tarjetas de métricas dinámicas para temperatura, humedad, presión atmosférica, intensidad de lluvia y calidad del aire.
- **Monitoreo del Estado del Sistema:** Indicadores visuales para el estado operativo de todos los componentes de hardware conectados (Sensores, LEDs, OLED, Buzzer).
- **Gráficos de Datos Históricos:** Gráfico de áreas integrado que proporciona una vista histórica de las métricas recolectadas.
- **Persistencia en Base de Datos Real:** Integración con Prisma ORM y SQLite para guardar de forma local y permanente el historial de mediciones atmosféricas y la bitácora del sistema.
- **Centro de Análisis Meteorológico:** Diagnóstico automatizado y correlaciones dinámicas basadas en los datos reales de largo plazo de la base de datos local.
- **Sistema de Alertas:** Sistema de notificaciones en tiempo real para umbrales ambientales críticos (por ejemplo, lluvia intensa).
- **Diseño Responsivo:** Un diseño de cuadrícula altamente optimizado y compacto que se adapta a diversos tamaños de pantalla.

---

## Tecnologías Utilizadas

- **Framework:** Next.js (App Router, React)
- **Lenguaje:** TypeScript
- **Estilos:** Tailwind CSS / CSS Variables / OKLCH
- **Base de Datos:** SQLite local (`dev.db`)
- **ORM:** Prisma Client
- **Visualización de Datos:** Recharts
- **Iconografía:** Lucide React

---

## Arquitectura

La aplicación está diseñada con una estricta separación de responsabilidades para permitir una integración de hardware fluida:

1. **Componentes Presentacionales:** Todos los componentes visuales dependen completamente de un estado centralizado proporcionado por un React hook personalizado (`useWeather`).
2. **Servicio Central (`weatherService.ts`):** Actúa como el gemelo digital del sistema. Coordina el flujo de datos simulados y reales provenientes de la API expuesta por el hardware ESP32.
3. **Persistencia Local (API Routes + Prisma):** Los endpoints `/api/readings` y `/api/events` gestionan de manera asíncrona la escritura y lectura contra SQLite. Esto asegura que la interfaz mantenga su tasa de refresco ultra rápida sin verse afectada por la latencia del disco.

---

## Documentación Adicional

- **Guía de Instalación:** Consulte [`INSTALLATION.md`](file:///c:/Users/Samira/Downloads/meteorological-dashboard-design/INSTALLATION.md) para obtener instrucciones sobre cómo ejecutar este proyecto localmente.
- **Persistencia e Integración de Base de Datos:** Consulte [`PERSISTENCE.md`](file:///c:/Users/Samira/Downloads/meteorological-dashboard-design/PERSISTENCE.md) para entender la estructura de SQLite, esquema y API Routes.
- **Integración de Hardware:** Consulte [`HARDWARE_INTEGRATION.md`](file:///c:/Users/Samira/Downloads/meteorological-dashboard-design/HARDWARE_INTEGRATION.md) para detalles técnicos sobre cómo conectar el ESP32 y reemplazar los datos simulados.
