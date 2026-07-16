#include <Wire.h>
#include <Adafruit_BMP280.h>
#include <Adafruit_AHTX0.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

#include <WiFi.h>
#include <WebServer.h>
#include <ArduinoJson.h>

// ---------- WiFi credentials ----------
const char* ssid = "assch";
const char* password = "samira25#";

WebServer server(80);

// ---------- Pins ----------
#define PIN_RAIN     4      // Rain sensor (digital) - HL-83 + HL-01 comparator
#define PIN_MQ135    34     // MQ-135 gas sensor (analog, ADC1)
#define PIN_BUZZER   25
#define PIN_LED_RED  27
#define PIN_LED_BLUE 2      // LED Azul para calidad de aire

// ---------- OLED display ----------
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET   -1
#define SCREEN_ADDRESS 0x3C
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

// ---------- MQ135 warm-up ----------
const unsigned long MQ135_WARMUP_MS = 60000UL; // 60 s de precalentamiento
unsigned long bootTime = 0;
bool mq135Ready = false;

// ---------- MQ135 calibration ----------
int mq135Baseline = 0;          // valor de "aire limpio" medido al arrancar

// ---------- Umbrales de clasificacion (relativos al baseline calibrado) ----------
const int MARGIN_MODERADO  = 200;
const int MARGIN_MALO      = 500;
const int MARGIN_PELIGROSO = 900;

// ---------- Suavizado (media movil) ----------
const int MQ135_SAMPLES = 10;
int mq135Buffer[MQ135_SAMPLES];
int mq135Index = 0;
long mq135Sum = 0;
bool mq135BufferFilled = false;

// ---------- Sensor status ----------
bool bmpOK = false;
bool ahtOK = false;
Adafruit_BMP280 bmp;
Adafruit_AHTX0 aht;

// ---------- Buzzer control (non-blocking) ----------
bool buzzerActive = false;
unsigned long buzzerStartTime = 0;
const unsigned long BUZZER_DURATION = 4000; // 4 segundos y se apaga

// ---------- LED de aire: control de parpadeo no-bloqueante ----------
unsigned long lastBlinkTime = 0;
bool ledState = false;

// ---------- OLED screen rotation (non-blocking) ----------
unsigned long lastScreenChange = 0;
const unsigned long SCREEN_INTERVAL = 3000; // 3 seconds per screen
int currentScreen = 0;
const int TOTAL_SCREENS = 3;

// Store latest sensor values globally so the display function can use them
bool g_isRaining = false;
int g_airValue = 0;
String g_airLevel = "Aire limpio";
float g_pressure = 0;
float g_tempBMP = 0;
float g_tempAHT = 0;
float g_humidity = 0;

bool modoAPActivo = false;
unsigned long ultimoIntentoReconexion = 0;
const unsigned long INTERVALO_RECONEXION = 30000; // 30 segundos

// ---------- Helpers MQ135 ----------
int readMQ135Smoothed() {
  int raw = analogRead(PIN_MQ135);

  mq135Sum -= mq135Buffer[mq135Index];
  mq135Buffer[mq135Index] = raw;
  mq135Sum += raw;
  mq135Index = (mq135Index + 1) % MQ135_SAMPLES;
  if (mq135Index == 0) mq135BufferFilled = true;

  int count = mq135BufferFilled ? MQ135_SAMPLES : (mq135Index == 0 ? MQ135_SAMPLES : mq135Index);
  return mq135Sum / count;
}

void calibrateMQ135Baseline() {
  long sum = 0;
  const int N = 20;
  for (int i = 0; i < N; i++) {
    sum += readMQ135Smoothed();
    delay(50);
  }
  mq135Baseline = sum / N;
  Serial.print("MQ135 baseline calibrado: ");
  Serial.println(mq135Baseline);
}

// Clasifica el valor del sensor en una categoria de calidad de aire
String clasificarAire(int valor) {
  int delta = valor - mq135Baseline;
  if (delta < MARGIN_MODERADO) return "Aire limpio";
  else if (delta < MARGIN_MALO) return "Calidad moderada";
  else if (delta < MARGIN_PELIGROSO) return "Calidad mala";
  else return "Peligroso";
}

// Controla el LED Azul segun el nivel de calidad de aire
void controlarLEDAire(String nivel) {
  unsigned long now = millis();

  if (nivel == "Aire limpio") {
    digitalWrite(PIN_LED_BLUE, LOW);
    ledState = false;
  }
  else if (nivel == "Calidad moderada") {
    if (now - lastBlinkTime >= 800) { // parpadeo lento
      ledState = !ledState;
      digitalWrite(PIN_LED_BLUE, ledState);
      lastBlinkTime = now;
    }
  }
  else if (nivel == "Calidad mala") {
    if (now - lastBlinkTime >= 250) { // parpadeo rapido
      ledState = !ledState;
      digitalWrite(PIN_LED_BLUE, ledState);
      lastBlinkTime = now;
    }
  }
  else { // Peligroso
    digitalWrite(PIN_LED_BLUE, HIGH); // fijo encendido
    ledState = true;
  }
}

// ---------- Web server handler ----------
void enviarDatos() {
  StaticJsonDocument<768> doc;

  // Selecciona la temperatura del AHT10 si esta disponible, si no usa la del BMP280
  double tempVal = ahtOK ? g_tempAHT : g_tempBMP;

  doc["temperatura"] = tempVal;
  doc["humedad"]     = ahtOK ? g_humidity : 0.0;
  doc["presion"]     = bmpOK ? g_pressure : 0.0;
  doc["calidadAire"] = g_airValue;
  doc["calidadAireBaseline"] = mq135Baseline;
  doc["nivelLluvia"] = g_isRaining ? 100 : 0;

  // WiFi
  doc["wifiRSSI"]      = WiFi.RSSI();
  doc["conexionESP32"] = "conectado";
  doc["modoRed"]       = modoAPActivo ? "AP" : "STA";

  // Uptime as raw seconds
  doc["uptime"] = millis() / 1000;

  // Estados de hardware
  doc["estadoAHT10"]       = ahtOK      ? "operativo" : "desconectado";
  doc["estadoBMP280"]      = bmpOK      ? "operativo" : "desconectado";
  doc["estadoMQ135"]       = mq135Ready ? "operativo" : "desconectado";
  doc["estadoSensorLluvia"] = "operativo";
  doc["estadoOLED"]        = "operativo";

  // LED Azul (Aire): activo cuando la calidad de aire NO es "Aire limpio"
  // (parpadea en calidad moderada/mala, fijo en peligroso)
  doc["estadoLedVerde"] = (g_airLevel != "Aire limpio") ? "operativo" : "desconectado";

  // LED Rojo (Lluvia): activo cuando llueve
  doc["estadoLedRojo"] = g_isRaining ? "operativo" : "desconectado";

  // Buzzer: activo durante los 4 segundos tras detectar lluvia
  doc["estadoBuzzer"] = buzzerActive ? "operativo" : "desconectado";

  doc["estadoCalidadAire"] = g_airLevel;

  String json;
  serializeJson(doc, json);

  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  server.sendHeader("Pragma", "no-cache");
  server.sendHeader("Expires", "0");
  server.send(200, "application/json", json);
}

void manejarPreflight() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "*");
  server.send(204);
}

void setup() {
  Serial.begin(115200);

  pinMode(PIN_RAIN, INPUT_PULLUP);  // pull-up para evitar lecturas falsas por ruido
  pinMode(PIN_BUZZER, OUTPUT);
  pinMode(PIN_LED_RED, OUTPUT);
  pinMode(PIN_LED_BLUE, OUTPUT);

  digitalWrite(PIN_BUZZER, HIGH); // buzzer apagado al inicio
  digitalWrite(PIN_LED_RED, LOW);
  digitalWrite(PIN_LED_BLUE, LOW);

  analogReadResolution(12);
  analogSetPinAttenuation(PIN_MQ135, ADC_11db);

  for (int i = 0; i < MQ135_SAMPLES; i++) mq135Buffer[i] = 0;

  Wire.begin();

  bmpOK = bmp.begin(0x76);
  if (!bmpOK) {
    Serial.println("Error: BMP280 not detected");
  }

  ahtOK = aht.begin();
  if (!ahtOK) {
    Serial.println("Error: AHT10 not detected");
  }

  if (!display.begin(SSD1306_SWITCHCAPVCC, SCREEN_ADDRESS)) {
    Serial.println("Error: SSD1306 not detected");
  } else {
    display.clearDisplay();
    display.setTextSize(1);
    display.setTextColor(SSD1306_WHITE);
    display.setCursor(0, 0);
    display.println("Weather Station");
    display.println("Calentando MQ135...");
    display.display();
  }

  bootTime = millis();

  for (int i = 0; i < MQ135_SAMPLES; i++) {
    readMQ135Smoothed();
    delay(20);
  }

  // ================= WiFi Connection =================
  Serial.println();
  Serial.println("Conectando al WiFi...");
  WiFi.setSleep(false); // Desactivar modo sleep para evitar desconexiones y timeouts
  WiFi.begin(ssid, password);

  unsigned long inicio = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - inicio < 15000) {
    delay(500);
    Serial.print(".");
  }

  // AP Config fallback values
  const char* ap_ssid = "Estacion_Meteorologica";
  const char* ap_password = "meteorologica";

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.println("WiFi conectado con exito");
    Serial.print("IP del ESP32: ");
    Serial.println(WiFi.localIP());

    server.on("/api/data", HTTP_GET, enviarDatos);
    server.on("/api/data", HTTP_OPTIONS, manejarPreflight);
    server.begin();
    Serial.println("Servidor HTTP iniciado para el dashboard");
  } else {
    Serial.println();
    Serial.println("Fallo al conectar al WiFi. Iniciando en modo Access Point (AP)...");
    WiFi.disconnect();
    WiFi.mode(WIFI_AP_STA); // Modo dual AP + STA para permitir reconexión automática en loop
    WiFi.softAP(ap_ssid, ap_password);
    modoAPActivo = true;

    IPAddress IP = WiFi.softAPIP();
    Serial.print("Red WiFi propia creada. SSID: ");
    Serial.println(ap_ssid);
    Serial.print("IP del ESP32 (AP): ");
    Serial.println(IP);

    if (display.begin(SSD1306_SWITCHCAPVCC, SCREEN_ADDRESS)) {
      display.clearDisplay();
      display.setCursor(0, 0);
      display.println("Modo AP Activo");
      display.print("SSID: ");
      display.println(ap_ssid);
      display.print("IP: ");
      display.println(IP.toString());
      display.display();
      delay(3000);
    }

    server.on("/api/data", HTTP_GET, enviarDatos);
    server.on("/api/data", HTTP_OPTIONS, manejarPreflight);
    server.begin();
    Serial.println("Servidor HTTP iniciado para el dashboard en modo AP");
  }
}

void loop() {
  // ---------- HTTP request handler ----------
  server.handleClient();

  // ---------- Control de Reconexión Automática si está en modo AP ----------
  if (modoAPActivo) {
    if (WiFi.status() == WL_CONNECTED) {
      Serial.println("Reconexión de WiFi detectada! Desactivando modo AP.");
      WiFi.mode(WIFI_STA); // Volvemos a modo estación puro
      modoAPActivo = false;

      IPAddress IP = WiFi.localIP();
      Serial.print("IP asignada por router: ");
      Serial.println(IP);

      display.clearDisplay();
      display.setCursor(0, 0);
      display.println("WiFi Reconectado");
      display.print("IP: ");
      display.println(IP.toString());
      display.display();
      delay(3000);
    } else if (millis() - ultimoIntentoReconexion >= INTERVALO_RECONEXION) {
      ultimoIntentoReconexion = millis();
      Serial.println("Intentando buscar e iniciar conexión con red WiFi en segundo plano...");
      WiFi.begin(ssid, password);
    }
  }

  // ---------- Warm-up del MQ135 ----------
  if (!mq135Ready) {
    if (millis() - bootTime >= MQ135_WARMUP_MS) {
      calibrateMQ135Baseline();
      mq135Ready = true;
    } else {
      unsigned long remaining = (MQ135_WARMUP_MS - (millis() - bootTime)) / 1000;
      display.clearDisplay();
      display.setCursor(0, 0);
      display.println("Calentando MQ135...");
      display.print("Faltan: ");
      display.print(remaining);
      display.println(" s");
      display.display();
      delay(200);
      return;
    }
  }

  // ---------- Rain sensor reading ----------
  bool isRaining = (digitalRead(PIN_RAIN) == LOW);
  Serial.print("GPIO4 = ");
  Serial.print(digitalRead(PIN_RAIN));
  Serial.print(" | isRaining = ");
  Serial.println(isRaining);
  digitalWrite(PIN_LED_RED, isRaining ? HIGH : LOW);

  // ---------- Buzzer logic ----------
  if (isRaining) {
    if (!buzzerActive) {
      buzzerActive = true;
      buzzerStartTime = millis();
      digitalWrite(PIN_BUZZER, LOW);
    }
    else if (millis() - buzzerStartTime >= BUZZER_DURATION) {
      digitalWrite(PIN_BUZZER, HIGH);
    }
  }
  else {
    digitalWrite(PIN_BUZZER, HIGH);
    buzzerActive = false;
  }

  // ---------- MQ-135 reading con suavizado + clasificacion por niveles ----------
  int airValue = readMQ135Smoothed();
  String airLevel = clasificarAire(airValue);
  controlarLEDAire(airLevel);

  // ---------- BMP280 and AHT10 reading ----------
  float pressure = bmpOK ? bmp.readPressure() / 100.0F : 0; // hPa
  float tempBMP  = bmpOK ? bmp.readTemperature() : 0;

  float tempAHT     = 0;
  float humidityVal = 0;
  if (ahtOK) {
    sensors_event_t humidity, temp;
    aht.getEvent(&humidity, &temp);
    tempAHT      = temp.temperature;
    humidityVal  = humidity.relative_humidity;
  }

  // ---------- Update global values ----------
  g_isRaining = isRaining;
  g_airValue  = airValue;
  g_airLevel  = airLevel;
  g_pressure  = pressure;
  g_tempBMP   = tempBMP;
  g_tempAHT   = tempAHT;
  g_humidity  = humidityVal;

  // ---------- Serial monitor ----------
  Serial.print("Rain: "); Serial.print(isRaining ? "YES" : "NO");
  Serial.print(" | Air: "); Serial.print(airValue);
  Serial.print(" (base "); Serial.print(mq135Baseline); Serial.print(")");
  Serial.print(" | Nivel: "); Serial.print(airLevel);
  Serial.print(" | Pressure: "); Serial.print(pressure);
  Serial.print(" hPa | AHT10 Temp: "); Serial.print(tempAHT);
  Serial.print(" C | Humidity: "); Serial.println(humidityVal);

  // ---------- OLED screen rotation ----------
  if (millis() - lastScreenChange >= SCREEN_INTERVAL) {
    currentScreen = (currentScreen + 1) % TOTAL_SCREENS;
    lastScreenChange = millis();
  }
  updateDisplay();

  delay(200);
}

void updateDisplay() {
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 0);

  switch (currentScreen) {
    case 0: // Rain + Air status
      display.println("== STATUS ==");
      display.println();
      display.print("Rain: ");
      display.println(g_isRaining ? "YES" : "NO");
      display.print("Air: ");
      display.println(g_airLevel);
      display.print("Air value: ");
      display.println(g_airValue);
      break;

    case 1: // BMP280 data
      display.println("== BMP280 ==");
      display.println();
      display.print("Temp: ");
      display.print(g_tempBMP);
      display.println(" C");
      display.print("Pressure: ");
      display.print(g_pressure);
      display.println(" hPa");
      break;

    case 2: // AHT10 data
      display.println("== AHT10 ==");
      display.println();
      display.print("Temp: ");
      display.print(g_tempAHT);
      display.println(" C");
      display.print("Humidity: ");
      display.print(g_humidity);
      display.println(" %");
      break;
  }

  display.display();
}