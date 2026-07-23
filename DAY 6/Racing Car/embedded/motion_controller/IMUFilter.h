/**
 * @file IMUFilter.h
 * @brief Complementary filter implementation for IMU sensor fusion.
 * 
 * Combines raw accelerometer components and gyroscope angular velocity inputs
 * to calculate drift-free roll and pitch angles.
 * 
 * @author Sagar Kumar
 * @date 2026
 */

#ifndef IMU_FILTER_H
#define IMU_FILTER_H

#include <Arduino.h>

class ComplementaryFilter {
public:
    /**
     * @brief Construct a new Complementary Filter object
     * @param alpha Integration coefficient weight (gyroscope vs accelerometer)
     */
    ComplementaryFilter(float alpha) : m_alpha(alpha), m_roll(0.0f), m_pitch(0.0f) {}

    /**
     * @brief Resets filter orientation angles to neutral center values.
     */
    void reset() {
        m_roll = 0.0f;
        m_pitch = 0.0f;
    }

    /**
     * @brief Computes fused roll and pitch angles based on current readings.
     * @param ax Raw accelerometer X reading (g)
     * @param ay Raw accelerometer Y reading (g)
     * @param az Raw accelerometer Z reading (g)
     * @param gx Raw gyroscope X reading (deg/sec)
     * @param gy Raw gyroscope Y reading (deg/sec)
     * @param gz Raw gyroscope Z reading (deg/sec)
     * @param dt Sampling period delta time in seconds
     */
    void update(float ax, float ay, float az, float gx, float gy, float gz, float dt) {
        // Calculate roll and pitch angles directly from accelerometer gravity vector
        // Roll: rotation around X axis, pitch: rotation around Y axis
        float accelRoll = atan2(ay, az) * 180.0f / PI;
        float accelPitch = atan2(-ax, sqrt(ay * ay + az * az)) * 180.0f / PI;

        // Apply complementary filter:
        // angle = alpha * (angle + gyro_rate * dt) + (1 - alpha) * accel_angle
        m_roll = m_alpha * (m_roll + gx * dt) + (1.0f - m_alpha) * accelRoll;
        m_pitch = m_alpha * (m_pitch + gy * dt) + (1.0f - m_alpha) * accelPitch;
    }

    /**
     * @brief Get the calculated roll angle (rotation around X-axis)
     * @return roll angle in degrees (-180.0 to 180.0)
     */
    float getRoll() const {
        return m_roll;
    }

    /**
     * @brief Get the calculated pitch angle (rotation around Y-axis)
     * @return pitch angle in degrees (-90.0 to 90.0)
     */
    float getPitch() const {
        return m_pitch;
    }

    /**
     * @brief Manual set function for offset calibrations
     */
    void setAngles(float roll, float pitch) {
        m_roll = roll;
        m_pitch = pitch;
    }

private:
    float m_alpha;
    float m_roll;
    float m_pitch;
};

#endif // IMU_FILTER_H
