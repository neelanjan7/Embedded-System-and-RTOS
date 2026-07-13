from flask import Flask, render_template, jsonify
import serial
import time

app = Flask(__name__)

# ----------------------------
# Arduino Serial Connection
# ----------------------------
PORT = "COM28"      # Change if your COM port changes
BAUDRATE = 9600

arduino = serial.Serial(PORT, BAUDRATE, timeout=1)
time.sleep(2)  # Wait for Arduino to reset

# Store the last valid sensor values
last_red = 0
last_green = 0
last_blue = 0


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/sensor")
def sensor():
    global last_red, last_green, last_blue

    try:
        while arduino.in_waiting > 0:

            line = arduino.readline().decode("utf-8").strip()

            # Ignore startup message
            if line == "APDS9960 Ready":
                continue

            # Expected format:
            # R:337,G:307,B:292
            if line.startswith("R:"):

                values = {}

                for item in line.split(","):
                    key, value = item.split(":")
                    values[key] = int(value)

                last_red = values["R"]
                last_green = values["G"]
                last_blue = values["B"]

    except Exception as e:
        print("Serial Error:", e)

    return jsonify({
        "red": last_red,
        "green": last_green,
        "blue": last_blue
    })


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=False)
