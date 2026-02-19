'use client';

import { useState,useEffect } from 'react';
import { Message, LogEntry, CapturedImage } from './types';

// Import Components
import Header from './components/Header';
import CameraCard from './components/CameraCard';
import LogPanel from './components/LogPanel';
import ChatWidget from './components/ChatWidget';
import Lightbox from './components/Lightbox';

export default function Dashboard() {
  // --- State ทั้งหมด ---
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', content: 'สวัสดีคับ?' }
  ]); 
  const [input, setInput] = useState(''); 
  const [isLoading, setIsLoading] = useState(false); 
  const [isChatOpen, setIsChatOpen] = useState(false); 
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
    
  useEffect(() => {
    const now = new Date();
    const timeString = now.toLocaleTimeString('th-TH', { hour12: false }); 

    setLogs([
      { time: timeString, event: 'System Online' }, // ใช้เวลาจริงตรงนี้
    ]);
  }, []); // [] ด้านหลังแปลว่าทำแค่ครั้งเดียวตอนเปิดเว็บ
  
// --- ระบบดึง Log จาก API หลังบ้านกล้อง (รองรับ 2 กล้อง) ---
  useEffect(() => {
    // 1. สร้างฟังก์ชันย่อยที่รับ Link API เข้ามาเช็ค
    const fetchLogFromCamera = async (apiUrl: string) => {
      try {
        const res = await fetch(apiUrl);
        const data = await res.json();

        // ทะลุเข้าไปดึงข้อมูล
        const latestLog = data.logs ? data.logs[0] : data; 

        // เช็คความถูกต้องและอัปเดต Log
        if (latestLog && latestLog.time && latestLog.event) {
          setLogs(prevLogs => {
            const isDuplicate = prevLogs.some(log => log.time === latestLog.time && log.event === latestLog.event);
            if (!isDuplicate) {
              return [{ time: latestLog.time, event: latestLog.event }, ...prevLogs];
            }
            return prevLogs;
          });
        }
      } catch (error) {
        console.error(`ดึงข้อมูล Log จาก ${apiUrl} ไม่ได้:`, error);
      }
    };

    // 2. ฟังก์ชันหลักสำหรับสั่งดึงทั้ง 2 กล้อง
    const fetchAllCameras = () => {
      fetchLogFromCamera('http://172.20.10.7:5000/logs');   // ลิงก์กล้อง A
      fetchLogFromCamera('http://192.168.1.122:5000/logs'); // ลิงก์กล้อง B
    };

    // 3. ตั้งเวลาให้ดึงข้อมูลทั้ง 2 กล้อง ทุกๆ 5 วินาที
    const interval = setInterval(fetchAllCameras, 5000);
    return () => clearInterval(interval);
  }, []);
  // ---------------------------------------------


  const [capturedImages, setCapturedImages] = useState<CapturedImage[]>([]); 
  const [selectedImage, setSelectedImage] = useState<string | null>(null); 

  // --- Configuration ---
  // const camA_URL = "https://bailey-pert-dishonorably.ngrok-free.dev/video"; 
  // const camA_Capture = "https://bailey-pert-dishonorably.ngrok-free.dev/capture"; 
  const camA_URL = "http://172.20.10.7:5000/video"; 
  const camA_Capture = "http://172.20.10.7:5000/capture"; 

  const camB_URL = "http://192.168.1.122:5000/video"; 
  const camB_Capture = "http://192.168.1.122:5000/capture"; 

  const [isCamAConnected, setIsCamAConnected] = useState(false);
  const [isCamBConnected, setIsCamBConnected] = useState(false);
  
  const [statusA, setStatusA] = useState("DISCONNECTED"); 
  const [statusB, setStatusB] = useState("DISCONNECTED"); 

 // --- แก้ตรงช่วงบรรทัด 49 ถึง 69 ---
  const sendMessage = async () => {
  if (!input.trim()) return;

  // 1. เก็บข้อความไว้ก่อน
  const userMessage = input;

  // 2. เคลียร์ช่องพิมพ์ทันที
  setInput('');

  // 3. สั่งโชว์ข้อความ "ไง" ของเราทันที! (จุดที่ขาดไป)
  setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
  
  // 4. สั่งหมุนติ้วๆ
  setIsLoading(true);

  try {
    const res = await fetch('/api/chat', { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: userMessage }), // ใช้ตัวแปร userMessage แทน input
    });

    const data = await res.json();
    
    // 5. พอ AI ตอบกลับมา ค่อยเอาคำตอบ AI ขึ้นจอ
    setMessages(prev => [...prev, { role: 'ai', content: data.reply }]); // เช็คดีๆว่า role ใน type เป็น 'ai' หรือ 'assistant'
    

  } catch (error) {
    console.error("Error sending message:", error);
    // ถ้า Error ก็บอกหน่อย
    setMessages(prev => [...prev, { role: 'ai', content: "ระบบขัดข้อง ติดต่อ AI ไม่ได้ครับ" }]);
  } finally {
    setIsLoading(false); // หยุดหมุน
  }
};
// ------------------------------------

  // เติม trigger: string = 'Manual' เข้าไปในวงเล็บ (แปลว่าถ้าไม่ส่งอะไรมา ให้ถือว่าคนกดเอง)
  const captureImage = (camName: string, trigger: string = 'Manual') => {
    const now = new Date().toLocaleTimeString('th-TH');
    
    // --- จุดที่แก้: เปลี่ยนคำว่า Manual เป็นตัวแปร trigger ---
    setLogs(prev => [{ time: now, event: `${trigger} Capture from ${camName}` }, ...prev]);
    
    const isOnline = camName.includes('A') ? isCamAConnected : isCamBConnected;
    
    // ดึงลิงก์ /capture มาใช้ตรงๆ เลย 
    const snapshotURL = camName.includes('A') ? camA_Capture : camB_Capture;

    // ใส่ ?t=เวลา เพื่อกัน Browser จำภาพเก่า
    const captureUrl = (isOnline && snapshotURL) ? `${snapshotURL}?t=${Date.now()}` : "/api/placeholder/640/360";

    const newImg: CapturedImage = { id: Date.now(), cam: camName, url: captureUrl };
    setCapturedImages(prev => [newImg, ...prev]);
  };

  // --- Render ---
  return (
    <div className={`min-h-screen p-4 relative font-sans transition-colors duration-300 ${isDarkMode ? 'bg-slate-950 text-slate-200' : 'bg-gray-50 text-gray-800'}`}>

      {/* 1. Header Section */}
      <Header isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        
        {/* Camera Section (Left/Center) */}
        <div className="xl:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* 2. Camera A Card */}
          <CameraCard 
            title="Camera A: Front Door"
            camName="Camera A"
            url={camA_URL}
            isConnected={isCamAConnected}
            setIsConnected={setIsCamAConnected}
            status={statusA}
            onCapture={captureImage}
            capturedImages={capturedImages}
            setSelectedImage={setSelectedImage}
            isDarkMode={isDarkMode}
          />

          {/* 3. Camera B Card */}
          <CameraCard 
            title="Camera B: Common Area"
            camName="Camera B"
            url={camB_URL}
            isConnected={isCamBConnected}
            setIsConnected={setIsCamBConnected}
            status={statusB}
            onCapture={captureImage}
            capturedImages={capturedImages}
            setSelectedImage={setSelectedImage}
            isDarkMode={isDarkMode}
          />
          
        </div>

       {/* 4. Logs Section (Right) */}
        <LogPanel 
          logs={logs} 
          isDarkMode={isDarkMode} 
            
        />
      </div>

      {/* 5. Extras (Modal & Chat) */}
      <Lightbox selectedImage={selectedImage} setSelectedImage={setSelectedImage} />

      <ChatWidget 
        isChatOpen={isChatOpen}
        setIsChatOpen={setIsChatOpen}
        messages={messages}
        input={input}
        setInput={setInput}
        sendMessage={sendMessage}
        isLoading={isLoading}
        isDarkMode={isDarkMode}
      />
    </div>
  );
}

