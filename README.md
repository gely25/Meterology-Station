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

## Nuevas Funcionalidades Implementadas (Última Actualización)

Hemos robustecido el sistema con características profesionales inspiradas en sistemas industriales SCADA y Grafana:

### 1. Conectividad Autónoma: Fallback a Modo Access Point (AP)
Si el ESP32 no logra conectarse a la red WiFi local (por cortes de internet o por estar fuera de rango) durante 15 segundos, inicia automáticamente una **red WiFi propia sin internet**:
* **SSID:** `Estacion_Meteorologica`
* **Contraseña:** `meteorologica`
* **IP del ESP32 (AP):** `192.168.4.1`
* **Pantalla OLED:** Muestra en tiempo real la red y la IP al arrancar para facilitar la conexión.

### 2. Calibración Dinámica de Calidad de Aire (Sensor MQ135)
Para evitar lecturas falsas, el ESP32 transmite el **baseline calibrado** al arrancar (`calidadAireBaseline`). 
* El Dashboard ahora calcula dinámicamente el nivel de contaminación mediante deltas: $\text{Delta} = \text{Valor actual} - \text{Baseline}$.
* Los umbrales de excelente, aceptable, moderado y malo se definen de forma **relativa al baseline** (ej: `+200 ppm` sobre el baseline).

### 3. Personalización de Umbrales en LocalStorage
Los límites de alerta para todos los sensores (temperatura, humedad, presión, lluvia y calidad de aire) son **100% editables desde la pestaña Configuración** de la aplicación web:
* Se guardan localmente en el navegador (`localStorage`).
* Se propagan a todas las tarjetas y gráficos al instante mediante eventos reactivos (`thresholds-updated`).
* Evitan tener que reprogramar el microcontrolador si cambias de entorno o cambian las estaciones de temperatura.

### 4. Resumen Estadístico de Bitácora Estilo SCADA/Grafana
Las tarjetas superiores del historial de eventos se rediseñaron para ser semánticamente correctas:
* **Registros de Bitácora:** Muestra el conteo de logs reales (ej: inicializaciones, desconexiones, etc.) en lugar del término genérico "Total de eventos".
* **Recálculo por Filtro:** Las 3 tarjetas de resumen (Críticos, Advertencias y Registros) se recalculan en tiempo real usando únicamente los registros que coincidan con los filtros aplicados (tiempo, severidad, tipo o búsqueda textual).
* **Descripciones Detalladas:** Cada tarjeta incluye ahora descripciones contextuales discretas de su significado operativo.

### 5. Indicadores Visuales y Anomalías Premium
* **Alertas Personalizadas:** Si hay condiciones anómalas (fuera de los umbrales configurados), el dashboard muestra un contenedor de advertencia premium con iconos SVG específicos (`rojo.svg` para alertas calientes/lluvia, `azul.svg` para frío) y muestra de forma exacta la desviación del umbral (ej: `+2.1°C`, `-1.2 hPa`).
* **Estado de LEDs:** Los periféricos LED del microcontrolador (Azul y Rojo) se muestran como "Operativo" en el panel de estado siempre que el microcontrolador esté conectado.

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
