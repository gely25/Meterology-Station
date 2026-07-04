#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <Adafruit_BMP280.h>
#include <Adafruit_AHTX0.h>

#include <WiFi.h>
#include <WebServer.h>
#include <ArduinoJson.h>

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET -1
#define SCREEN_ADDRESS 0x3C

#define LED_PIN 2
#define LLUVIA_PIN 35
#define BUZZER_PIN 4
#define LED_VERDE_PIN 27   // LED verde de "sensores funcionando"
#define MQ135_PIN 33       // Sensor de calidad de aire (analógico)

#define BMP_ADDRESS 0x76
#define AHT_ADDRESS 0x38

const char* ssid = "HONOR X5c";
const char* password = "samira25#";

WebServer server(80);

// IMPORTANTE:
// Si tu buzzer suena cuando pones HIGH, usa:
// #define BUZZER_ON HIGH
// #define BUZZER_OFF LOW
// Si tu buzzer suena cuando pones LOW, usa esto:
#define BUZZER_ON LOW
#define BUZZER_OFF HIGH

// Umbral para considerar "aire malo" (ajusta esto después de calibrar
// con tus propias lecturas normales en tu ambiente)
#define UMBRAL_GAS_MALO 1800

Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);
Adafruit_BMP280 bmp;
Adafruit_AHTX0 aht;

unsigned long tiempoAnterior = 0;
int pantallaActual = 0; // 0 = lluvia, 1 = BMP280, 2 = AHT10, 3 = MQ135
unsigned long tiempoInicioBuzzer = 0;
bool buzzerActivo = false;
bool lluviaAnterior = false;

unsigned long tiempoChequeoSensores = 0;
bool bmpOK = false;
bool ahtOK = false;

int valorGas = 0;

// Hace un "ping" I2C a una dirección para ver si el dispositivo responde
bool verificarI2C(uint8_t address) {
Wire.beginTransmission(address);
return (Wire.endTransmission() == 0);
}

//enviar datos para la web

void enviarDatos() {
  double tempVal = 0.0;
  double humVal = 0.0;
  double presVal = 0.0;

  if (ahtOK) {
    sensors_event_t humedad, temperatura;
    aht.getEvent(&humedad, &temperatura);
    tempVal = temperatura.temperature;
    humVal = humedad.relative_humidity;
  }

  if (bmpOK) {
    presVal = bmp.readPressure() / 100.0;
    if (!ahtOK) {
      tempVal = bmp.readTemperature();
    }
  }

  StaticJsonDocument<768> doc;

  bool hayLluvia = digitalRead(LLUVIA_PIN) == LOW;

  // Sensores
  doc["temperatura"] = tempVal;
  doc["humedad"] = humVal;
  doc["presion"] = presVal;
  doc["calidadAire"] = valorGas;
  doc["nivelLluvia"] = hayLluvia ? 100 : 0;

// WiFi
doc["wifiRSSI"] = WiFi.RSSI();
doc["conexionESP32"] = "conectado";

// Estados
doc["estadoAHT10"] = ahtOK ? "operativo" : "desconectado";
doc["estadoBMP280"] = bmpOK ? "operativo" : "desconectado";
doc["estadoMQ135"] = valorGas > 0 ? "operativo" : "desconectado";
//doc["estadoMQ135"] = "operativo";
doc["estadoSensorLluvia"] = "operativo";
doc["estadoOLED"] = "operativo";
  doc["estadoLedVerde"] = "operativo";
  doc["estadoLedRojo"] = "operativo";
  doc["estadoBuzzer"] = "operativo";

  String json;
  serializeJson(doc, json);

  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  server.sendHeader("Pragma", "no-cache");
  server.sendHeader("Expires", "0");
  server.send(200, "application/json", json);
}

void setup() {
Serial.begin(115200);
Wire.begin(21, 22);

pinMode(LED_PIN, OUTPUT);
pinMode(LLUVIA_PIN, INPUT);
pinMode(BUZZER_PIN, OUTPUT);
pinMode(LED_VERDE_PIN, OUTPUT);
// MQ135_PIN no necesita pinMode para lectura analógica

digitalWrite(LED_PIN, LOW);
digitalWrite(BUZZER_PIN, BUZZER_OFF);
digitalWrite(LED_VERDE_PIN, LOW); // arranca apagado hasta confirmar sensores

if (!display.begin(SSD1306_SWITCHCAPVCC, SCREEN_ADDRESS)) {
Serial.println("No se encontro la OLED");
while (true);
}

bmpOK = bmp.begin(BMP_ADDRESS);
if (!bmpOK) {
Serial.println("No se encontro el BMP280");
}

Serial.println("Iniciando AHT10...");
ahtOK = aht.begin();
if (!ahtOK) {
  Serial.println("No se encontro el AHT10");
} else {
  Serial.println("AHT10 iniciado correctamente");
}

// Encendido inicial del LED verde si ambos sensores arrancaron bien
digitalWrite(LED_VERDE_PIN, (bmpOK && ahtOK) ? HIGH : LOW);

display.clearDisplay();
display.setTextColor(SSD1306_WHITE);
display.setTextSize(2);
display.setCursor(0, 0);
display.println("Grupo 6");
display.display();
delay(2000);

// Mensaje de calentamiento del MQ135
display.clearDisplay();
display.setTextSize(1);
display.setCursor(0, 0);
display.println("Calentando MQ135...");
display.println("Espera 20-30 seg");
display.display();

Serial.println("Calentando MQ135 (20 segundos)...");
for (int i = 0; i < 20; i++) {
  delay(1000);
  Serial.print(".");
}
Serial.println(" Listo!");

//nuevos terminos para la web

// ================= WIFI =================

Serial.println();
Serial.println("Conectando al WiFi...");

WiFi.begin(ssid, password);


unsigned long inicio = millis();

while (WiFi.status() != WL_CONNECTED && millis() - inicio < 15000) {
  delay(500);
  Serial.print(".");
}

if (WiFi.status() == WL_CONNECTED) {
  Serial.println();
  Serial.println("WiFi conectado");
  Serial.print("IP: ");
  Serial.println(WiFi.localIP());
} else {
  Serial.println();
  Serial.println("No se pudo conectar al WiFi");
}




// ================= SERVIDOR =================



if (WiFi.status() == WL_CONNECTED) {

  server.on("/api/data", HTTP_GET, enviarDatos);

  server.begin();

  Serial.println("Servidor HTTP iniciado");

}

}   // <-- ESTA LLAVE FALTA

void loop() {

if (WiFi.status() == WL_CONNECTED) {
    server.handleClient();
}

int estadoLluvia = digitalRead(LLUVIA_PIN);
bool hayLluvia = (estadoLluvia == LOW);

Serial.print("Estado lluvia: ");
Serial.print(estadoLluvia);
Serial.print(" | Hay lluvia: ");
Serial.println(hayLluvia ? "SI" : "NO");

digitalWrite(LED_PIN, hayLluvia ? HIGH : LOW);

if (hayLluvia && !lluviaAnterior) {
buzzerActivo = true;
tiempoInicioBuzzer = millis();
digitalWrite(BUZZER_PIN, BUZZER_ON);
}

if (buzzerActivo && millis() - tiempoInicioBuzzer >= 4000) {
buzzerActivo = false;
digitalWrite(BUZZER_PIN, BUZZER_OFF);
}

if (!hayLluvia) {
buzzerActivo = false;
digitalWrite(BUZZER_PIN, BUZZER_OFF);
}

lluviaAnterior = hayLluvia;

// Lectura del sensor de gas (cada ciclo, es rápido y no bloquea)
valorGas = analogRead(MQ135_PIN);
Serial.print("Calidad de aire (crudo): ");
Serial.println(valorGas);

// Cada 3 segundos, revisa si los sensores siguen respondiendo
if (millis() - tiempoChequeoSensores >= 3000) {
tiempoChequeoSensores = millis();
bmpOK = verificarI2C(BMP_ADDRESS);
ahtOK = verificarI2C(AHT_ADDRESS);


bool todoOK = bmpOK && ahtOK;
digitalWrite(LED_VERDE_PIN, todoOK ? HIGH : LOW);

if (!todoOK) {
  Serial.print("FALLO -> BMP280: ");
  Serial.print(bmpOK ? "OK" : "DESCONECTADO");
  Serial.print(" | AHT10: ");
  Serial.println(ahtOK ? "OK" : "DESCONECTADO");
}

}

if (millis() - tiempoAnterior >= 2500) {
tiempoAnterior = millis();
pantallaActual++;
if (pantallaActual > 3) {
pantallaActual = 0;
}
}

display.clearDisplay();
display.setTextSize(1);
display.setCursor(0, 0);

if (pantallaActual == 0) {
display.setTextSize(2);
display.println(hayLluvia ? "LLUVIA" : "Sin lluvia");
display.setTextSize(1);
display.setCursor(0, 30);
display.println(hayLluvia ? "Alerta activada" : "Todo normal");
} else if (pantallaActual == 1) {
display.println("Presion / Temp");
display.setCursor(0, 15);
display.print("Temp: ");
display.print(bmp.readTemperature());
display.println(" C");
display.setCursor(0, 30);
display.print("Presion: ");
display.print(bmp.readPressure() / 100.0F);
display.println(" hPa");
} else if (pantallaActual == 2) {
sensors_event_t humedad, temperatura;
aht.getEvent(&humedad, &temperatura);
display.println("Temp / Humedad");
display.setCursor(0, 15);
display.print("Temp: ");
display.print(temperatura.temperature);
display.println(" C");
display.setCursor(0, 30);
display.print("Humedad: ");
display.print(humedad.relative_humidity);
display.println(" %");
} else if (pantallaActual == 3) {
display.println("Calidad de Aire");
display.setCursor(0, 15);
display.print("Valor: ");
display.println(valorGas);
display.setCursor(0, 30);
display.println(valorGas > UMBRAL_GAS_MALO ? "Aire: MALO" : "Aire: OK");
}

display.display();
delay(200);
}