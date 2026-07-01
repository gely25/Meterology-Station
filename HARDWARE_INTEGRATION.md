# Guía de Integración de Hardware

Este documento detalla los pasos necesarios para conectar el panel de control en React (Dashboard) al hardware físico (ESP32).

## Estado Actual (Modo Simulación)

Actualmente, la aplicación se ejecuta en un modo simulado. Todos los datos mostrados en el dashboard son generados localmente por el \`WeatherService\` ubicado en \`/services/weatherService.ts\`.

El servicio simulado utiliza un bucle \`setInterval\` para generar variaciones aleatorias pero realistas en temperatura, humedad, presión y otras métricas. Esto permite que la interfaz gráfica (UI) se diseñe y pruebe sin necesidad del hardware físico.

## Transición al Hardware Real

Para conectar el dashboard al ESP32, usted únicamente necesita modificar la lógica de obtención de datos dentro de \`/services/weatherService.ts\`. No es necesario realizar modificaciones en los componentes visuales ni en los hooks de React.

### 1. Requerimientos de la API del ESP32

El ESP32 debe actuar como un servidor (o enviar datos vía WebSockets) y exponer un endpoint (por ejemplo, \`http://<IP_DEL_ESP32>/api/data\`) que retorne un objeto JSON.

El objeto JSON debe seguir la estructura requerida por la interfaz \`WeatherData\`. Sin embargo, el dashboard solo necesitará estrictamente los valores crudos de los sensores y los estados de conexión; los valores derivados (como el estado del clima en texto o la hora formateada) aún pueden ser calculados por el servicio en el frontend.

#### Ejemplo de Payload JSON Esperado

\`\`\`json
{
  "temperatura": 24.5,
  "humedad": 60.2,
  "presion": 1015.3,
  "calidadAire": 85,
  "nivelLluvia": 0,
  "wifiRSSI": -55,
  "estadoAHT10": "operativo",
  "estadoBMP280": "operativo",
  "estadoMQ135": "operativo",
  "estadoSensorLluvia": "operativo",
  "estadoOLED": "operativo",
  "estadoLedVerde": "operativo",
  "estadoLedRojo": "operativo",
  "estadoBuzzer": "operativo"
}
\`\`\`

### 2. Modificando weatherService.ts

Localice el método \`fetchRealData()\` dentro de \`/services/weatherService.ts\`. 

Actualmente, este método contiene la lógica de generación de datos de prueba. Usted deberá reemplazar esta lógica con una solicitud HTTP real al ESP32.

#### Ejemplo de Implementación (Petición HTTP)

Reemplace el contenido de \`fetchRealData()\` con la siguiente estructura:

\`\`\`typescript
private async fetchRealData() {
  try {
    // 1. Obtener datos desde el ESP32
    const response = await fetch(\`http://\${this.config.ip}:\${this.config.port}/api/data\`);
    
    if (!response.ok) {
      throw new Error("Fallo al obtener datos del ESP32");
    }

    const espData = await response.json();
    
    // 2. Obtener la hora actual
    const now = new Date();
    this.lastFetchTime = Date.now();
    const hora = now.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    
    // 3. Derivar estados necesarios basados en los datos entrantes
    const intenso = espData.nivelLluvia >= 70;
    const estadoLluvia = intenso ? 'Intensa' : espData.nivelLluvia >= 20 ? 'Ligera' : 'Seco';
    const alertaActiva = intenso ? 'LLUVIA INTENSA DETECTADA' : null;
    const estadoClima = this.deriveWeatherState(espData.nivelLluvia, espData.humedad);
    const wifiCalidad = this.deriveWiFiQuality(espData.wifiRSSI);

    // 4. Actualizar el estado de la aplicación
    this.currentData = {
      ...this.currentData,
      temperatura: espData.temperatura,
      humedad: espData.humedad,
      nivelLluvia: espData.nivelLluvia,
      presion: espData.presion,
      calidadAire: espData.calidadAire,
      wifiRSSI: espData.wifiRSSI,
      estadoAHT10: espData.estadoAHT10,
      estadoBMP280: espData.estadoBMP280,
      estadoMQ135: espData.estadoMQ135,
      estadoSensorLluvia: espData.estadoSensorLluvia,
      estadoOLED: espData.estadoOLED,
      estadoLedVerde: espData.estadoLedVerde,
      estadoLedRojo: espData.estadoLedRojo,
      estadoBuzzer: espData.estadoBuzzer,
      hora,
      ultimaActualizacion: hora,
      estadoLluvia,
      estadoClima,
      alertaActiva,
      wifiCalidad,
      conexionESP32: 'conectado'
    };

    // 5. Notificar a los componentes de React sobre el cambio de estado
    this.notify();

  } catch (error) {
    console.error(error);
    this.handleDisconnection();
  }
}
\`\`\`

### 3. Manejo de Desconexiones

El archivo \`weatherService.ts\` ya incluye un mecanismo de tiempo de espera (timeout) dentro del método \`start()\`. Si el método \`fetchRealData()\` arroja un error consecutivamente por una cantidad de tiempo especificada (por ejemplo, si el ESP32 se apaga o pierde señal), el servicio llamará automáticamente a \`this.handleDisconnection()\`.

Esto actualizará el estado \`conexionESP32\` a \`'desconectado'\`, lo cual será detectado por la interfaz gráfica (UI) para reflejarse inmediatamente poniendo el indicador de estado del ESP32 en rojo y marcando todos los sensores como desconectados.
