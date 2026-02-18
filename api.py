# ==========================================
# 1. INSTALL DEPENDENCIES (รันครั้งแรกครั้งเดียว)
# ==========================================
# !pip install flask flask-cors ultralytics opencv-python-headless pyngrok requests

import cv2
from flask import Flask, request, jsonify, Response
from flask_cors import CORS
from ultralytics import YOLO
import time
import os
import base64
import requests
import threading
import json
from pyngrok import ngrok # แก้จาก import ngrok เป็น from pyngrok

# Setup Flask & YOLO
app = Flask(__name__)
CORS(app)

# โหลด Model (ใช้รุ่น Nano เพื่อความเร็ว)
print("Loading YOLO model...")
model = YOLO("yolov8n.pt") 

# --- CONFIG ---
# สำคัญ: ถ้าอยู่บน Colab URL นี้ต้องเป็น Public URL (เช่น ngrok)
# แต่ถ้ารันบนเครื่องตัวเอง ใช้ Local IP ได้เลย
CAMERA_URL = "http://192.168.1.43/stream" 

STORAGE_DIR = os.path.abspath("storage")
if not os.path.exists(STORAGE_DIR):
    os.makedirs(STORAGE_DIR)

# --- GLOBAL STATE ---
global_frame = None       # ภาพดิบ (หรือภาพวาดกรอบแล้ว)
global_yolo_result = []   # ผล Detection
frame_lock = threading.Lock()

# ตัวแปรควบคุมการเซฟภาพ
last_save_time = 0
SAVE_COOLDOWN = 300 

# ==========================================
# 2. BACKGROUND THREAD (หัวใจสำคัญที่แก้เพิ่ม)
# ==========================================
def update_camera_feed():
    """
    ฟังก์ชันนี้จะรันตลอดเวลาใน Background เพื่อ:
    1. อ่านภาพจากกล้อง
    2. รัน YOLO
    3. อัปเดต global_frame ให้พร้อมสำหรับ Web และ AI
    """
    global global_frame, global_yolo_result, last_save_time
    
    print(f"Connecting to camera: {CAMERA_URL}")
    cap = cv2.VideoCapture(CAMERA_URL)
    
    while True:
        ret, frame = cap.read()
        if not ret:
            # ถ้ากล้องหลุด ให้พยายามต่อใหม่
            print("Camera disconnected, retrying in 2s...")
            time.sleep(2)
            cap = cv2.VideoCapture(CAMERA_URL)
            continue

        # รัน YOLO
        results = model.predict(frame, classes=[0], conf=0.55, verbose=False)
        
        # ดึงข้อมูล Detection เพื่อส่งให้ AI
        detections = []
        for box in results[0].boxes:
            detections.append({
                "class": model.names[int(box.cls)],
                "conf": float(box.conf),
                "bbox": box.xyxy.tolist()
            })

        # วาดกรอบลงบนภาพ
        annotated_frame = results[0].plot()

        # Update Global State (ต้อง Lock เพื่อความปลอดภัยของ Thread)
        with frame_lock:
            global_frame = annotated_frame.copy()
            global_yolo_result = detections

        # Logic Auto-Save
        if len(detections) > 0:
            current_time = time.time()
            if current_time - last_save_time > SAVE_COOLDOWN:
                filename = f"person_{int(current_time)}.jpg"
                file_path = os.path.join(STORAGE_DIR, filename)
                cv2.imwrite(file_path, annotated_frame)
                print(f"Auto-saved: {filename}")
                last_save_time = current_time
        
        # ใส่ sleep นิดหน่อยเพื่อไม่ให้กิน CPU เกินไป (ปรับได้)
        time.sleep(0.01)

# เริ่มต้น Thread ทันที
t = threading.Thread(target=update_camera_feed, daemon=True)
t.start()

# ==========================================
# 3. FLASK ROUTES
# ==========================================

@app.route('/video')
def video():
    """Route สำหรับ Stream ภาพขึ้นหน้าเว็บ"""
    def generate():
        while True:
            with frame_lock:
                if global_frame is None:
                    continue
                # Encode เป็น JPG เพื่อส่งผ่าน HTTP
                ret, buffer = cv2.imencode('.jpg', global_frame)
            
            if ret:
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')
            time.sleep(0.05) # Limit FPS streaming

    return Response(generate(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/chat', methods=['POST'])
def chat_with_ai():
    """Route สำหรับคุยกับ AI"""
    user_question = request.json.get('message')
    
    img_b64 = ""
    current_detections = []
    
    # ดึงข้อมูลล่าสุดจาก Global State
    with frame_lock:
        if global_frame is not None:
            # Resize ภาพก่อนส่ง AI เพื่อลด Latency (สำคัญมากบน Colab)
            resized_frame = cv2.resize(global_frame, (640, 480))
            _, buffer = cv2.imencode('.jpg', resized_frame)
            img_b64 = base64.b64encode(buffer).decode('utf-8')
            current_detections = global_yolo_result
    
    if not img_b64:
        return jsonify({"reply": "Error: No camera feed available."})

    # Prompt Engineering
    # Prompt แบบกระชับและเข้าประเด็น
    system_prompt = f"""
    Role: You are a concise security guard AI monitoring a camera feed.
    
    Context from YOLO System: {json.dumps(current_detections)}
    
    Rules:
    1. Answer ONLY what the user asks.
    2. Keep responses short (under 20 words if possible).
    3. Do NOT mention technical terms like "confidence score", "bounding box", or "YOLO".
    4. If the user asks "what do you see?", just list the main objects/people clearly.
    5. Be direct and professional.
    6. Always answer in User's language.
    """

    payload = {
        "model": "llava:7b", 
        "messages": [
            { "role": "system", "content": system_prompt },
            { 
                "role": "user", 
                "content": user_question, 
                "images": [img_b64] 
            }
        ],
        "stream": False
    }

    try:
        # ยิงไปที่ Local Ollama
        print("Sending to Ollama...")
        
        # เพิ่ม timeout เผื่อเครื่องประมวลผลช้า (30-60 วินาที)
        response = requests.post("http://localhost:11434/api/chat", json=payload, timeout=60).json()
        
        # --- จุดที่แก้: ปริ้นท์ออกมาดูเลยว่า Ollama ส่งอะไรกลับมา ---
        print("🔴 Debug Ollama Response:", response) 

        if 'error' in response:
            ai_reply = f"System Error: {response['error']}"
        else:
            ai_reply = response.get('message', {}).get('content', "No content received.")

    except requests.exceptions.Timeout:
        ai_reply = "Error: AI took too long to respond (Timeout)."
    except Exception as e:
        ai_reply = f"Error connecting to AI: {str(e)}"
        print(f"🔴 Exception details: {e}")

    return jsonify({"reply": ai_reply})


# ==========================================
# 4. RUN SERVER
# ==========================================
# ใส่ Authtoken ของ ngrok ที่นี่ (สมัครฟรีที่ ngrok.com)
# ngrok.set_auth_token("YOUR_NGROK_TOKEN")

# เปิด Public URL
if __name__ == "__main__":
    public_url = ngrok.connect(5000).public_url
    print(f"🚀 Web App URL: {public_url}")
    print(f"🎥 Video Stream: {public_url}/video")   

    app.run(host="0.0.0.0", port=5000, debug=True, use_reloader=False)
