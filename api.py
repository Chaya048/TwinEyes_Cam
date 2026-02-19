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
import telebot
from datetime import datetime

app = Flask(__name__)
CORS(app)

# โหลด Model
print("Loading YOLO model...")
model = YOLO("yolov8n.pt") 

# Telegram Bot Setup
bot = telebot.TeleBot("8404110212:AAF87c4lqYeUGO2uFFkv3FiReKRvgPiGUUo")
CHAT_ID = '7703000808'

# --- CONFIG ---
# CAMERA_URL = "http://192.168.1.43/stream" # WiFi หอ
CAMERA_URL = 'http://172.20.10.2/stream'

STORAGE_DIR = os.path.abspath("storage")
if not os.path.exists(STORAGE_DIR):
    os.makedirs(STORAGE_DIR)

global_frame = None       
global_yolo_result = [] 
frame_lock = threading.Lock()

# ตัวแปรควบคุมการเซฟภาพ
last_save_time = 0
SAVE_COOLDOWN = 300 

logs_system = []

def update_camera_feed():
    global global_frame, global_yolo_result, last_save_time, logs_system
    
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
        results = model.predict(frame, classes=[0], conf=0.65, verbose=False)
        
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
                time_str = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
                filename = f"person_{time_str}.jpg"
                file_path = os.path.join(STORAGE_DIR, filename)
                cv2.imwrite(file_path, annotated_frame)
                print(f"Auto-saved: {filename}")
                last_save_time = current_time

                # ส่งรูปไป Telegram
                bot.send_message(CHAT_ID, "🚨 ตรวจพบคนในกล้อง A!")
                with open(file_path, "rb") as photo:
                  bot.send_photo(CHAT_ID, photo)

                # แจ้งเตือนหน้าเว็บ
                logs_system.append({"event": "พบคนในกล้อง A", "time": datetime.now().strftime("%H:%M:%S")})
        
        time.sleep(0.01)

t = threading.Thread(target=update_camera_feed, daemon=True)
t.start()

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

@app.route('/capture', methods=['GET'])
def capture():
    """Route สำหรับดึงภาพล่าสุด (ใช้สำหรับ Tool)"""
    with frame_lock:
        if global_frame is None:
            return "Error: No camera feed available.", 503
        
        # Encode เป็น JPG เพื่อส่งผ่าน HTTP
        ret, buffer = cv2.imencode('.jpg', global_frame)
    if ret:
        return Response(buffer.tobytes(), mimetype='image/jpeg')
    else:
        return "Error encoding image.", 500

@app.route('/logs', methods=['GET'])
def logs():
    """Route สำหรับดึง Log ล่าสุด (ใช้สำหรับ Tool)"""
    return jsonify({
    "logs": logs_system[-1:]
    })

    
@app.route('/chat', methods=['POST'])
def chat_with_ai():
    user_question = request.json.get('message')
    
    # ---------------------------------------------------------
    # STEP 1: AI บรรณารักษ์ - ค้นหาไฟล์ที่ตรงกับเวลาที่ User ถาม
    # ---------------------------------------------------------
    # ดึงรายชื่อไฟล์มาแค่ 50 ไฟล์ล่าสุด
    try:
        saved_files = sorted(os.listdir(STORAGE_DIR))[-50:] 
        files_str = "\n".join(saved_files) if saved_files else "No files saved yet."
    except Exception as e:
        files_str = "Error reading storage."

    current_time_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    router_prompt = f"""
    You are a professional security file dispatcher. 
    Current System Time: {current_time_str}
    User Question: "{user_question}"
    
    Here is a list of available image files (format: person_YYYY-MM-DD_HH-MM-SS.jpg):
    {files_str}
    
    DECISION RULES:
    1. LIVE: Choose this ONLY if the user asks about "now", "current", "live", "at the moment", or "right now".
    2. FILENAME: If the user asks about a specific time (e.g., "10 mins ago", "last night", "at 8 PM"), find the file with the timestamp CLOSEST to that request.
    3. GENERAL: Choose this if the user is just saying hello, asking a general question, or anything NOT related to looking at a camera/time.
    4. NOT_FOUND: Choose this only if they ask for a past time but the file list is empty or no files match that period.

    CRITICAL: You must reason internally: Does the user want the present or the past?
    Reply with ONLY the filename, "LIVE", "GENERAL", or "NOT_FOUND". Do not add any other words. No explanation.
    """

    router_payload = {
        "model": "gemma3:4b", 
        "messages": [{"role": "user", "content": router_prompt}],
        "stream": False
    }

    print("🕵️‍♂️ Step 1: Asking AI to find the right image...")
    try:
        router_response = requests.post("http://localhost:11434/api/chat", json=router_payload).json()
        selected_file = router_response.get('message', {}).get('content', '').strip()
    except Exception as e:
        return jsonify({"reply": f"Router Error: {str(e)}"})

    print(f"📁 AI Selected File: {selected_file}")

    # ---------------------------------------------------------
    # STEP 2: เตรียมรูปภาพ (จากกล้องสด หรือ จากไฟล์ที่เซฟไว้)
    # ---------------------------------------------------------
    img_b64 = ""
    system_context = ""

    if selected_file == "LIVE":
        # ดึงภาพสด
        with frame_lock:
            if global_frame is not None:
                resized_frame = cv2.resize(global_frame, (640, 480))
                _, buffer = cv2.imencode('.jpg', resized_frame)
                img_b64 = base64.b64encode(buffer).decode('utf-8')
                system_context = f"Showing LIVE camera. Current YOLO detection: {json.dumps(global_yolo_result)}"
            else:
                return jsonify({"reply": "กล้องสดไม่มีสัญญาณครับ"})
                
    elif selected_file == "NOT_FOUND":
        return jsonify({"reply": "ไม่พบข้อมูลภาพที่มีคนในช่วงเวลาที่คุณถามหาครับ (อาจจะไม่มีคนเดินผ่านเลยในเวลานั้น)"})
    
    elif selected_file == "GENERAL":
        system_context = "User asked a general question not related to the camera feed. No image to show."
        
    else:
        # ดึงภาพจาก Storage ตามที่ AI เลือก
        file_path = os.path.join(STORAGE_DIR, selected_file)
        if os.path.exists(file_path):
            img = cv2.imread(file_path)
            resized_frame = cv2.resize(img, (640, 480))
            _, buffer = cv2.imencode('.jpg', resized_frame)
            img_b64 = base64.b64encode(buffer).decode('utf-8')
            system_context = f"Showing recorded image from past: {selected_file}."
        else:
            return jsonify({"reply": f"เกิดข้อผิดพลาด: AI เลือกไฟล์ {selected_file} แต่หาไฟล์ไม่เจอในเครื่อง"})

    # ---------------------------------------------------------
    # STEP 3: AI รปภ. - วิเคราะห์รูปภาพแล้วตอบ User
    # ---------------------------------------------------------
    guard_prompt = f"""
    Role: You are an Elite AI Security Specialist in a high-tech command center. You are vigilant, professional, and observant.

    Instructions:
    1. Multi-Functional Response: 
    - If user asked about an image: Act as a CCTV Analyst. Describe the scene, people, objects, and actions with professional precision. Focus on "Who, What, Where, and Activity."
    - If user asked a general question, not about an image: Act as a knowledgeable Security Assistant. Answer general questions or provide information directly and helpfully.

    2. Language & Tone:
    - Always respond in the SAME LANGUAGE as the user. If the user asks in Thai, respond in Thai. If they ask in English, respond in English.
    - Tone: Professional, alert, yet approachable. Do not use robotic jargon like "bounding boxes," "AI models," or "confidence scores."

    3. Detail & Conciseness:
    - Image Analysis: Be descriptive but efficient. Provide enough detail to paint a clear picture of the visual evidence without being overly wordy.
    - General Queries: Provide direct and accurate answers. Keep it "Goldilocks style"—neither too short nor too long.

    Context: {system_context}

    Example Style (Image): "Area monitored. I see one person in a black jacket standing near the entrance. They are looking at a mobile device. The area is otherwise clear. Standing by."
    Example Style (General): "Acknowledged. I can certainly help you with that information. [Insert direct answer]. Is there anything else you need me to monitor?"
    """

    if selected_file == "GENERAL":
        vision_payload = {
            "model": "gemma3:4b",
            "messages": [
                { "role": "system", "content": guard_prompt },
                { "role": "user", "content": user_question}
            ],
            "stream": False
        }
    else:
        vision_payload = {
            "model": "gemma3:4b",
            "messages": [
                { "role": "system", "content": guard_prompt },
                { "role": "user", "content": user_question, "images": [img_b64] }
            ],
            "stream": False
        }

    print("👁️ Step 2: Asking AI to analyze the image...")
    try:
        final_response = requests.post("http://localhost:11434/api/chat", json=vision_payload).json()
        ai_reply = final_response.get('message', {}).get('content', "ไม่สามารถวิเคราะห์ภาพได้ครับ")
    except Exception as e:
        ai_reply = f"Vision Error: {str(e)}"

    return jsonify({"reply": ai_reply})

# ==========================================
# 4. RUN SERVER
# ==========================================

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000, debug=True, use_reloader=False)
