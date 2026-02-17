
# Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process 
# Web API => http://localhost:5000/video

from flask import Flask, Response
from flask_cors import CORS, cross_origin
import cv2
from ultralytics import YOLO
from fastmcp import FastMCP
import requests

mcp = FastMCP("Security-Cam")

# Load YOLO model 
model = YOLO("yolov8n.pt")

# T-SIMCAM URL
CAMERA_URL = "http://172.20.10.2/stream"
# CAMERA_URL = "http://192.168.1.43/stream"

# create a flask app
app = Flask(__name__)
CORS(app)

def generate_frames():
    cap = cv2.VideoCapture(CAMERA_URL)
    while True:
        ret, frame = cap.read()
        if not ret:
            break

        results = model.predict(frame, classes=[0], conf=0.55)
        frame = results[0].plot() 

        # Encode the frame in JPEG format
        ret, buffer = cv2.imencode('.jpg', frame)
        frame_bytes = buffer.tobytes()

        # Yield the frame in byte format
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')

    cap.release()


@mcp.tool()
def capture_security_image() -> str:
    """Takes a live photo from the ESP32-CAM and returns the local file path."""
    # Your existing logic to grab a frame from the stream
    img_path = "storage/person_detected.jpg" 
    # ... save image ...
    return img_path

@mcp.tool()
def check_detection_logs(time_query: str) -> list:
    """Searches the local storage for images matching a specific time."""
    # Logic to filter files in your /storage folder
    return ["person_detected_16-00.jpg"]

@app.route('/video')
def video():
    return Response(generate_frames(),
                    mimetype='multipart/x-mixed-replace; boundary=frame')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)