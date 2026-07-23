/**
 * @file motion_controller.ino
 * @brief Enhanced firmware for the AI Motion Controlled Racing Simulator.
 * 
 * Target Board: Arduino Nano 33 BLE Sense
 * Sensors: LSM9DS1 IMU, APDS9960 gesture/proximity/color
 * Communication: USB CDC Serial at 115200 baud
 * 
 * Implements CRC-8 verification, protocol versioning, millisecond timing alignment,
 * packet indexing, sensor status monitors, and 1-second heartbeat packages.
 * 
 * @author Sagar Kumar
 * @date 2026
 */

#include <Arduino.h>
#include <Arduino_LSM9DS1.h>
#include <Arduino_APDS9960.h>
#include "IMUFilter.h"

// Configuration constants
constexpr byte PROTOCOL_VERSION = 1;
constexpr unsigned long TRANSMIT_INTERVAL_MS = 100; // 10Hz transmission rate
constexpr unsigned long HEARTBEAT_INTERVAL_MS = 1000; // 1Hz heartbeat rate
constexpr float COMP_FILTER_ALPHA = 0.98f;
constexpr int CALIBRATION_SAMPLES = 50;

// Sensor Status Flag Bits
constexpr byte STATUS_IMU_OK = 0x01;
constexpr byte STATUS_APDS_OK = 0x02;

// Global instances
ComplementaryFilter imuFilter(COMP_FILTER_ALPHA);

// Calibration offsets
float axOffset = 0.0f;
float ayOffset = 0.0f;
float azOffset = 0.0f;
float gxOffset = 0.0f;
float gyOffset = 0.0f;
float gzOffset = 0.0f;

// Telemetry state variables
unsigned long lastTransmitTime = 0;
unsigned long lastHeartbeatTime = 0;
unsigned long lastSampleTime = 0;
unsigned long packetSequence = 0;
byte sensorStatusFlags = 0x00;

// Function declarations
void calibrateSensors();
void sendErrorPacket(const char* message);
void transmitData();
void transmitHeartbeat();
byte calculateCRC8(const char* payload);

void setup() {
    // Initialize Serial Port at 115200 Baud
    Serial.begin(115200);
    
    // Wait up to 3 seconds for serial monitor to connect
    unsigned long startWait = millis();
    while (!Serial && (millis() - startWait < 3000)) {
        delay(10);
    }

    // Initialize LSM9DS1 IMU Sensor
    if (IMU.begin()) {
        sensorStatusFlags |= STATUS_IMU_OK;
    } else {
        sendErrorPacket("Failed to initialize LSM9DS1 IMU.");
    }

    // Initialize APDS9960 Gesture/Proximity/Color Sensor
    if (APDS.begin()) {
        sensorStatusFlags |= STATUS_APDS_OK;
    } else {
        sendErrorPacket("Failed to initialize APDS9960 sensor.");
    }

    // Perform Sensor Calibration if IMU is functional
    if (sensorStatusFlags & STATUS_IMU_OK) {
        calibrateSensors();
    }
    
    // Initialize time variables
    lastSampleTime = micros();
    lastTransmitTime = millis();
    lastHeartbeatTime = millis();
}

void loop() {
    unsigned long currentMillis = millis();

    // Calculate precise time delta for IMU integration
    unsigned long currentMicros = micros();
    float dt = (currentMicros - lastSampleTime) / 1000000.0f;
    lastSampleTime = currentMicros;

    // Guard against overflow or long delay pauses
    if (dt <= 0.0f || dt > 0.5f) {
        dt = 0.02f; // Fallback to 50Hz dt estimation
    }

    // Read and update IMU if functional
    float ax = 0.0f, ay = 0.0f, az = 0.0f;
    float gx = 0.0f, gy = 0.0f, gz = 0.0f;

    if ((sensorStatusFlags & STATUS_IMU_OK) && IMU.accelerationAvailable() && IMU.gyroscopeAvailable()) {
        IMU.readAcceleration(ax, ay, az);
        IMU.readGyroscope(gx, gy, gz);

        // Apply calibration offsets
        ax -= axOffset;
        ay -= ayOffset;
        az -= azOffset;
        gx -= gxOffset;
        gy -= gyOffset;
        gz -= gzOffset;

        // Update the sensor fusion complementary filter
        imuFilter.update(ax, ay, az, gx, gy, gz, dt);
    }

    // Read APDS9960 state if functional
    int gesture = -1;
    int proximity = 0;
    int r = 0, g = 0, b = 0, c = 0;

    if (sensorStatusFlags & STATUS_APDS_OK) {
        if (APDS.gestureAvailable()) {
            gesture = APDS.readGesture();
        }
        if (APDS.proximityAvailable()) {
            proximity = APDS.readProximity();
        }
        if (APDS.colorAvailable()) {
            APDS.readColor(r, g, b, c);
        }
    }

    // Enforce 100 ms transmission interval (10 Hz) for primary data
    if (currentMillis - lastTransmitTime >= TRANSMIT_INTERVAL_MS) {
        lastTransmitTime = currentMillis;
        packetSequence++;

        // Formulate and write telemetry packet
        char payload[180];
        snprintf(payload, sizeof(payload), 
                 "IMU,%d,%lu,%lu,%d,%.2f,%.2f,%.3f,%.3f,%.3f,%.2f,%.2f,%.2f,%d,%d,%d,%d,%d,%d",
                 PROTOCOL_VERSION, currentMillis, packetSequence, sensorStatusFlags,
                 imuFilter.getRoll(), imuFilter.getPitch(), ax, ay, az, gx, gy, gz,
                 gesture, proximity, r, g, b, c);

        byte crc = calculateCRC8(payload);

        Serial.print("$");
        Serial.print(payload);
        Serial.print("*");
        if (crc < 0x10) Serial.print("0");
        Serial.println(crc, HEX);
    }

    // Enforce 1000 ms transmission interval (1 Hz) for heartbeat
    if (currentMillis - lastHeartbeatTime >= HEARTBEAT_INTERVAL_MS) {
        lastHeartbeatTime = currentMillis;

        // Formulate and write heartbeat packet
        char hbPayload[80];
        snprintf(hbPayload, sizeof(hbPayload), "HBT,%d,%lu,%lu,%d",
                 PROTOCOL_VERSION, currentMillis, packetSequence, sensorStatusFlags);

        byte crc = calculateCRC8(hbPayload);

        Serial.print("$");
        Serial.print(hbPayload);
        Serial.print("*");
        if (crc < 0x10) Serial.print("0");
        Serial.println(crc, HEX);
    }
}

/**
 * @brief Computes calibration offsets by averaging initial static readings.
 */
void calibrateSensors() {
    float sumAx = 0, sumAy = 0, sumAz = 0;
    float sumGx = 0, sumGy = 0, sumGz = 0;
    int validSamplesCount = 0;

    while (validSamplesCount < CALIBRATION_SAMPLES) {
        if (IMU.accelerationAvailable() && IMU.gyroscopeAvailable()) {
            float ax, ay, az;
            float gx, gy, gz;
            IMU.readAcceleration(ax, ay, az);
            IMU.readGyroscope(gx, gy, gz);

            sumAx += ax;
            sumAy += ay;
            sumAz += az;
            sumGx += gx;
            sumGy += gy;
            sumGz += gz;

            validSamplesCount++;
            delay(30);
        }
    }

    axOffset = sumAx / CALIBRATION_SAMPLES;
    ayOffset = sumAy / CALIBRATION_SAMPLES;
    azOffset = (sumAz / CALIBRATION_SAMPLES) - 1.0f;
    gxOffset = sumGx / CALIBRATION_SAMPLES;
    gyOffset = sumGy / CALIBRATION_SAMPLES;
    gzOffset = sumGz / CALIBRATION_SAMPLES;

    imuFilter.reset();
}

/**
 * @brief Helper to transmit formatted error strings.
 */
void sendErrorPacket(const char* message) {
    char errorPayload[140];
    snprintf(errorPayload, sizeof(errorPayload), "ERR,%d,%lu,0,%d,%s",
             PROTOCOL_VERSION, millis(), sensorStatusFlags, message);
    byte crc = calculateCRC8(errorPayload);
    
    Serial.print("$");
    Serial.print(errorPayload);
    Serial.print("*");
    if (crc < 0x10) Serial.print("0");
    Serial.println(crc, HEX);
}

/**
 * @brief CRC-8 calculation (polynomial 0x07 Dallas/Maxim standard)
 */
byte calculateCRC8(const char* payload) {
    byte crc = 0x00;
    for (size_t i = 0; payload[i] != '\0'; i++) {
        crc ^= (byte)payload[i];
        for (byte j = 0; j < 8; j++) {
            if (crc & 0x80) {
                crc = (crc << 1) ^ 0x07;
            } else {
                crc <<= 1;
            }
        }
    }
    return crc;
}
