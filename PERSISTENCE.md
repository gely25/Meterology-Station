# Persistencia de Datos e Integración de Base de Datos (Prisma + SQLite)

Este documento detalla la arquitectura de persistencia e integración de base de datos que se ha implementado en la aplicación de la Estación Meteorológica para almacenar lecturas de sensores y bitácoras de eventos.

---

## 🛠️ Tecnologías Utilizadas

- **Base de Datos:** SQLite (`dev.db` guardado localmente).
- **ORM:** Prisma Client v5.
- **Framework backend:** Next.js App Router API Routes.

---

## 📐 Estructura de Datos (Esquema de Base de Datos)

El archivo [`prisma/schema.prisma`](file:///c:/Users/Samira/Downloads/meteorological-dashboard-design/prisma/schema.prisma) define dos modelos principales optimizados para velocidad en consultas temporales:

### 1. `Reading` (Historial de Sensores)
Almacena cada paquete de lectura meteorológica.

- `id`: Identificador numérico autoincrementable.
- `timestamp` (Integer): Unix Epoch en milisegundos. *[Indexado para consultas rápidas de rangos]*.
- `time` (String): Hora formateada (`HH:mm:ss`) para coincidir con la visualización local.
- `temperature` (Float): Temperatura medida en °C.
- `humidity` (Float): Porcentaje de humedad relativa.
- `pressure` (Float): Presión atmosférica en hPa.
- `rain` (Float): Porcentaje de intensidad de lluvia (escala de 0.0 a 10.0).
- `airQuality` (Float): Calidad del aire en ppm (MQ135).

### 2. `Event` (Bitácora del Sistema)
Almacena todas las alertas de sensores, actuadores y estado de red.

- `id` (String): Identificador único (UUID o aleatorio generado en frontend/firmware).
- `timestamp` (Integer): Unix Epoch en milisegundos. *[Indexado]*.
- `time` (String): Hora simplificada (`HH:mm`) del suceso.
- `type` (String): Categoría del evento (`info`, `alert`, `success`, `warning`).
- `message` (String): Mensaje detallado del estado o alerta.

---

## 🔗 Endpoints de la API

Se crearon dos rutas dinámicas en Next.js localizadas en `/app/api`:

### readings: `/api/readings`
- **`GET`**: 
  - Retorna lecturas en base a un rango de tiempo (`?from=<timestamp>&to=<timestamp>`).
  - Si no se proveen parámetros, retorna las últimas 10,000 lecturas ordenadas por fecha para renderizar de inmediato en el cliente.
- **`POST`**:
  - Inserta una nueva lectura. Mapea campos automáticamente de formatos de frontend (`HistoryPoint`) o formatos del payload directo del hardware ESP32 (`temperatura`, `humedad`, `presion`, etc. detallados en `HARDWARE_INTEGRATION.md`).

### events: `/api/events`
- **`GET`**: Retorna los eventos registrados. Si no hay parámetros de búsqueda, limita a los últimos 200 para evitar sobrecarga.
- **`POST`**: Guarda un nuevo registro de evento/alerta del sistema en la base de datos.

---

## ⚡ Estrategia de Sincronización y Rendimiento

Para asegurar que la interfaz visual no sufra de latencia al consultar datos en tiempo real cada segundo (1000ms), se utiliza la técnica de **Fire-and-Forget (Dispara y Olvida)**:

1. **Escritura No Bloqueante (POST):**
   - Cuando `WeatherService` lee un dato nuevo (ya sea simulado o enviado por el ESP32), actualiza el estado interno de React e inmediatamente inicia una petición `fetch('/api/readings')` en segundo plano sin esperar (`await`) su respuesta. 
   - Cualquier error de red o DB se captura en un bloque `.catch()` para logguearlo, garantizando que el flujo principal de actualización de la UI continúe inmune.
2. **Hidratación Async al Arranque (GET):**
   - Al cargar la página, el singleton de `WeatherService` llama a `hydrateFromDatabase()`.
   - Recupera el historial histórico y los últimos eventos registrados en la base de datos de manera asíncrona.
   - De estar vacía la base de datos, recurre al comportamiento por defecto o boot sequence predeterminado del firmware.
3. **Mapeo de Puntos en Memoria:**
   - La aplicación mantiene una ventana deslizante de **3,600 elementos en memoria** (aproximadamente una hora a intervalos de 1s) para que el gráfico en vivo responda de inmediato, mientras que el resto de los datos históricos del ciclo viven guardados de forma segura en la base de datos SQLite.

---

## 🚀 Comandos Útiles para el Desarrollador

Para gestionar la base de datos local desde tu consola:

- **Ver el panel de administración visual (Prisma Studio):**
  ```bash
  npx prisma studio
  ```
- **Aplicar cambios del esquema a la DB:**
  ```bash
  npx prisma migrate dev --name <nombre_migracion>
  ```
- **Regenerar el cliente de Prisma:**
  ```bash
  npx prisma generate
  ```
