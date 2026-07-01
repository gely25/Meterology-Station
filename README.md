# Dashboard de Estación Meteorológica

## Resumen

El Dashboard de la Estación Meteorológica es una aplicación web moderna y de alto rendimiento diseñada para visualizar datos ambientales en tiempo real. Está construida para servir como la interfaz (front-end) de un sistema IoT centrado en un microcontrolador ESP32, el cual recolecta datos de diversos sensores atmosféricos y ambientales.

El proyecto pone un fuerte énfasis en una interfaz de usuario (UI) limpia, compacta y densa en datos, junto con una experiencia de usuario (UX) robusta para el monitoreo ininterrumpido de métricas meteorológicas críticas.

## Características Principales

- Visualización de Datos en Tiempo Real: Tarjetas de métricas dinámicas para temperatura, humedad, presión atmosférica, intensidad de lluvia y calidad del aire.
- Monitoreo del Estado del Sistema: Indicadores visuales para el estado operativo de todos los componentes de hardware conectados (Sensores, LEDs, OLED, Buzzer).
- Gráficos de Datos Históricos: Gráfico de áreas integrado que proporciona una vista histórica de las métricas recolectadas.
- Sistema de Alertas: Sistema de notificaciones en tiempo real para umbrales ambientales críticos (por ejemplo, lluvia intensa).
- Diseño Responsivo: Un diseño de cuadrícula altamente optimizado y compacto que se adapta a diversos tamaños de pantalla.

## Tecnologías Utilizadas

- Framework: Next.js (React)
- Lenguaje: TypeScript
- Estilos: Tailwind CSS
- Visualización de Datos: Recharts
- Iconografía: Lucide React

## Arquitectura

La aplicación está diseñada con una estricta separación de responsabilidades para permitir una integración de hardware fluida en el futuro. Todos los componentes visuales son puramente presentacionales y dependen completamente de un estado centralizado proporcionado por un React hook personalizado (\`useWeather\`).

La lógica central de los datos reside en \`services/weatherService.ts\`, el cual actualmente simula la generación de datos en tiempo real. Este servicio actúa como un gemelo digital y está diseñado para ser reemplazado fácilmente por peticiones HTTP o WebSocket reales una vez que se despliegue el hardware físico.

## Documentación Adicional

- Guía de Instalación: Consulte \`INSTALLATION.md\` para obtener instrucciones sobre cómo ejecutar este proyecto localmente.
- Integración de Hardware: Consulte \`HARDWARE_INTEGRATION.md\` para detalles técnicos sobre cómo conectar el ESP32 y reemplazar los datos simulados.
