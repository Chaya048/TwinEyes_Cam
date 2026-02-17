import cv2
from flask import Flask, Response
from flask_cors import CORS
from ultralytics import YOLO

# Setup Flask & YOLO
app = Flask(__name__)
CORS(app)
model = YOLO("yolov8n.pt")
CAMERA_URL = "http://172.20.10.2/stream"

# --- FLASK ROUTES (For the Video Stream) ---

def generate_frames():
    cap = cv2.VideoCapture(CAMERA_URL)
    while True:
        ret, frame = cap.read()
        if not ret:
            break

        results = model.predict(frame, classes=[0], conf=0.55, verbose=False)
        frame = results[0].plot() 

        ret, buffer = cv2.imencode('.jpg', frame)
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')
    cap.release()

@app.route('/video')
def video():
    return Response(generate_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

# --- RUNNING BOTH ---
if __name__ == '__main__':
        app.run(host='0.0.0.0', port=5000)
