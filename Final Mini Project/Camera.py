import cv2
import os

print("Loading camera.py from:", os.path.abspath(__file__))

# Load OpenCV's built-in face detector
face_cascade = cv2.CascadeClassifier(
    cv2.data.haarcascades +
    "haarcascade_frontalface_default.xml"
)

class VideoCamera:

    def __init__(self):

        self.video = cv2.VideoCapture(0, cv2.CAP_DSHOW)

        self.video.set(cv2.CAP_PROP_FRAME_WIDTH,640)
        self.video.set(cv2.CAP_PROP_FRAME_HEIGHT,480)

        self.face_count = 0

    def __del__(self):
        self.video.release()

    def get_frame(self):

        success, image = self.video.read()

        if not success:
            return None

        # Mirror camera
        image = cv2.flip(image,1)

        gray = cv2.cvtColor(image,cv2.COLOR_BGR2GRAY)

        faces = face_cascade.detectMultiScale(
            gray,
            scaleFactor=1.2,
            minNeighbors=5,
            minSize=(50,50)
        )

        self.face_count = len(faces)

        for(x,y,w,h) in faces:

            cv2.rectangle(
                image,
                (x,y),
                (x+w,y+h),
                (0,255,0),
                2
            )

            cv2.putText(
                image,
                "Face",
                (x,y-10),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                (0,255,0),
                2
            )

        cv2.putText(
            image,
            f"Faces: {self.face_count}",
            (10,30),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.8,
            (255,255,0),
            2
        )

        ret,buffer=cv2.imencode(".jpg",image)

        return buffer.tobytes()


camera = VideoCamera()


def generate_frames():

    while True:

        frame = camera.get_frame()

        if frame is None:
            continue

        yield(
            b'--frame\r\n'
            b'Content-Type: image/jpeg\r\n\r\n'+
            frame+
            b'\r\n'
        )
