// *********************************************************************************************
// lazer-mazer Arduino code
//
// This code reads light sensor data and button presses and sends them to the connected computer over serial
// Author: L3-N0X
// Date: 2025-03-16
// Version: 1.0
// License: MIT
// Repository: https://github.com/L3-N0X/lazer-mazer
//
// *********************************************************************************************

// Configuration
// ---------------------------------------------------------------------------------------------

// Light sensor pins array (LDR = Light Dependent Resistor)
const int lightSensorPins[] = { A0, A1, A2, A3, A4, A5, A6, A7, A8, A9 };

// Control pins
const int gameStartButtonPin = 34;
const int buzzerButtonPin = 40;

// Delay between light sensor readings (ms)
unsigned long delayBetweenReadings = 60;

// Minimum time between button events (ms)
const unsigned long buttonCooldownPeriod = 1200;

// ---------------------------------------------------------------------------------------------


// Timing variables for button debouncing
unsigned long lastGameStartPressTime = 0;
unsigned long lastBuzzerPressTime = 0;

const int numLightSensors = sizeof(lightSensorPins) / sizeof(lightSensorPins[0]);

// Button state tracking
bool gameStartButtonActive = false;
bool buzzerButtonActive = false;
bool eventSent = false;

void setup() {
  // Configure input pins
  pinMode(gameStartButtonPin, INPUT);
  pinMode(buzzerButtonPin, INPUT);

  // Configure all light sensors as inputs
  for (int i = 0; i < numLightSensors; i++) {
    pinMode(lightSensorPins[i], INPUT);
  }

  // Initialize serial communication
  Serial.begin(115200);
}

void loop() {
  unsigned long currentTime = millis();

  eventSent = false;

  // Process game start button with debouncing
  if (digitalRead(gameStartButtonPin) == HIGH) {
    if (!gameStartButtonActive && (currentTime - lastGameStartPressTime > buttonCooldownPeriod)) {
      gameStartButtonActive = true;
      lastGameStartPressTime = currentTime;
      Serial.println("start");
      eventSent = true;
    }
  } else {
    gameStartButtonActive = false;
  }

  // Process buzzer button with debouncing
  if (!eventSent && digitalRead(buzzerButtonPin) == HIGH) {
    if (!buzzerButtonActive && (currentTime - lastBuzzerPressTime > buttonCooldownPeriod)) {
      buzzerButtonActive = true;
      lastBuzzerPressTime = currentTime;
      Serial.println("buzzer");
      eventSent = true;
    }
  } else {
    buzzerButtonActive = false;
  }

  // If no button was pressed, send light sensor data
  if (!eventSent) {
    buzzerButtonActive = false;

    String sensorDataString = "";
    for (int i = 0; i < numLightSensors; i++) {
      sensorDataString += String(analogRead(lightSensorPins[i]));
      if (i < numLightSensors - 1) {
        sensorDataString += ",";
      }
    }
    Serial.println(sensorDataString);
  }

  // Short delay to stabilize readings
  delay(delayBetweenReadings);
}