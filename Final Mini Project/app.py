from flask import Flask, render_template, jsonify, Response
from camera import generate_frames
import serial
import time
from camera import camera

app = Flask(__name__)

# ---------- Arduino ----------
try:
    arduino = serial.Serial("COM13", 115200, timeout=1)
    time.sleep(2)
    connected = True
except:
    arduino = None
    connected = False

distance = 0
status = "WAITING"


# ---------- Home ----------
@app.route("/")
def home():
    return render_template("index.html")


# ---------- Live Data ----------
@app.route("/data")
def data():
    global distance, status, connected

    if arduino:
        while arduino.in_waiting:
            try:
                line = arduino.readline().decode(errors="ignore").strip()
                print(line)

                if line.startswith("DIST:"):
                    distance = int(line.split(":")[1])

                elif line.startswith("STATUS:"):
                    status = line.split(":")[1]

            except Exception as e:
                print(e)

    return jsonify({
        "distance": distance,
        "status": status,
        "connected": connected,
        "faces": camera.face_count
    })


# ---------- Webcam ----------
@app.route("/video_feed")
def video_feed():
    return Response(
        generate_frames(),
        mimetype="multipart/x-mixed-replace; boundary=frame"
    )


if __name__ == "__main__":
    app.run(debug=False)
