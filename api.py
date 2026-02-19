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
from pyngrok import ngrok
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
    # ดึงรายชื่อไฟล์ทั้งหมด (เอาแค่ 50 ไฟล์ล่าสุด เพื่อไม่ให้ Prompt ยาวเกินไป)
    try:
        saved_files = sorted(os.listdir(STORAGE_DIR))[-50:] 
        files_str = "\n".join(saved_files) if saved_files else "No files saved yet."
    except Exception as e:
        files_str = "Error reading storage."

    # วันและเวลาปัจจุบัน เพื่อให้ AI รู้ Context ว่า "เมื่อคืน" คือตอนไหน
    current_time_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    router_prompt = f"""
    You are an intelligent file router. Current system time is {current_time_str}.
    The user is asking a question about a camera feed: "{user_question}"
    
    Here is a list of available image files (format: person_YYYY-MM-DD_HH-MM-SS.jpg):
    {files_str}
    
    TASK:
    - If the user asks about the PRESENT/NOW, reply EXACTLY with the word "LIVE".
    - If the user asks about the PAST (e.g., last night, 10 PM), find the closest matching filename from the list and reply with EXACTLY that filename.
    - If they ask about the past but no file is close to that time, reply "NOT_FOUND".
    
    Reply with ONLY the filename, "LIVE", or "NOT_FOUND". Do not add any other words.
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
    Role: You are a concise, professional security AI.
    Context: {system_context}
    
    Rules:
    1. Answer the user's question based ONLY on the provided image.
    2. Answer in Thai language.
    3. Keep it brief, natural, and friendly. Do not mention bounding boxes, AI mechanics, or confidence scores.
    """

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

    # chat_history.append({
    #     'role': 'user',
    #     'content': user_question,
    #     'role': 'assistant',
    #     'content': ai_reply
    # })

    return jsonify({"reply": ai_reply})

# ==========================================
# 4. RUN SERVER
# ==========================================

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000, debug=True, use_reloader=False)
