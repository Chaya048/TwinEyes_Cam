'use client';

import { useState } from 'react';

type Message = {
  role: 'user' | 'ai';
  content: string;
};

type LogEntry = {
  time: string;
  event: string;
};

type CapturedImage = {
  id: number;
  cam: string;
  url: string;
};

export default function Dashboard() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', content: 'สวัสดีครับ ระบบ TwinEyes พร้อมทำงาน มีอะไรให้ช่วยไหมครับ?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // State สำหรับ Log
  const [logs, setLogs] = useState<LogEntry[]>([
    { time: '10:00:01', event: 'System Online' },
    { time: '10:05:20', event: 'Person Detected at Front Door' }
  ]);

  // State สำหรับเก็บรูปที่ Capture
  const [capturedImages, setCapturedImages] = useState<CapturedImage[]>([]);

  // --- NEW: State สำหรับรูปที่ถูกเลือกเพื่อขยายใหญ่ ---
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const newMsg: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, newMsg]);
    setInput('');
    setIsLoading(true);

    try {
      await new Promise(r => setTimeout(r, 1000));
      const aiResponse: Message = { 
        role: 'ai', 
        content: `รับทราบครับ! ผมกำลังตรวจสอบภาพจากกล้อง... (AI Response: ${newMsg.content})` 
      };
      setMessages(prev => [...prev, aiResponse]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const captureImage = (camName: string) => {
    const now = new Date().toLocaleTimeString();
    
    // 1. เพิ่ม Log
    setLogs(prev => [{ time: now, event: `Manual Capture from ${camName}` }, ...prev]);
    
    // 2. สร้าง URL สำหรับดึงภาพจริง
    // ใช้ Date.now() ต่อท้าย เพื่อให้ได้ภาพใหม่เสมอ ไม่ซ้ำกับ cache เดิม
    const captureUrl = camName.includes('A') 
      ? `http://192.168.1.166/capture?t=${Date.now()}` 
      : "/api/placeholder/640/360"; // กล้อง B ยังไม่มี ก็ใช้ภาพจำลองไปก่อน

    // 3. เพิ่มรูปลง Gallery
    const newImg: CapturedImage = {
      id: Date.now(),
      cam: camName,
      url: captureUrl
    };
    setCapturedImages(prev => [newImg, ...prev]);
  };

  return (
    // ปรับ Background เป็นสีสว่าง (bg-gray-50) และ Text เป็นสีเข้ม (text-gray-800)
    <div className="min-h-screen bg-gray-50 text-gray-800 p-4 relative font-sans">
      
      {/* Header */}
      <header className="mb-6 flex justify-between items-center border-b border-gray-200 pb-4 bg-white px-6 py-4 rounded-xl shadow-sm">
        <h1 className="text-3xl font-bold text-blue-600">TwinEyes Dashboard</h1>
        <div className="text-sm text-green-600 flex items-center gap-2 font-medium">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
          System Online
        </div>
      </header>

      {/* Main Content */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        
        {/* --- Camera Feeds Section --- */}
        <div className="xl:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Camera A */}
          <div className="bg-white rounded-xl p-5 shadow-md border border-gray-200 flex flex-col h-full hover:shadow-lg transition-shadow">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-xl font-semibold flex items-center gap-2 text-gray-700">
                Camera A: Front Door
                <span className="text-xs bg-green-100 text-green-700 border border-green-200 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                  ONLINE
                </span>
              </h2>
              <button 
                onClick={() => captureImage('Camera A')}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded transition-colors flex items-center gap-1 shadow-sm"
              >
                Capture
              </button>
            </div>
            
            <div className="aspect-video bg-black rounded-lg overflow-hidden border border-gray-300 relative group shadow-inner">
              <img src="http://192.168.1.166:81/stream" alt="Cam A" className="w-full h-full object-cover" />
              <div className="absolute top-2 right-2 flex gap-1">
                 <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div>
              </div>
            </div>
            <div className="mt-2 text-xs text-orange-500 font-semibold font-mono mb-4 flex items-center gap-1">
               Status: Person Detected
            </div>

            {/* --- พื้นที่แสดงรูปที่ Capture (Camera A) --- */}
            <div className="mt-auto pt-4 border-t border-gray-100">
               <h3 className="text-sm text-gray-500 mb-2 font-medium">Recent Captures (Click to enlarge)</h3>
               <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300">
                  {capturedImages.filter(img => img.cam === 'Camera A').length === 0 ? (
                    <div className="w-full h-20 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-400 text-xs">
                       No images captured
                    </div>
                  ) : (
                    capturedImages.filter(img => img.cam === 'Camera A').map((img) => (
                      <div 
                        key={img.id} 
                        // เพิ่ม onClick เพื่อขยายรูป
                        onClick={() => setSelectedImage(img.url)}
                        className="min-w-[100px] h-[70px] bg-gray-100 rounded border border-gray-200 overflow-hidden relative cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all"
                      >
                          <img src={img.url} className="w-full h-full object-cover hover:scale-110 transition-transform duration-300" />
                      </div>
                    ))
                  )}
               </div>
            </div>
          </div>

          {/* Camera B */}
          <div className="bg-white rounded-xl p-5 shadow-md border border-gray-200 flex flex-col h-full hover:shadow-lg transition-shadow">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-xl font-semibold flex items-center gap-2 text-gray-700">
                Camera B: Common Area
                <span className="text-xs bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                  OFFLINE
                </span>
              </h2>
              <button 
                onClick={() => captureImage('Camera B')}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded transition-colors flex items-center gap-1 shadow-sm"
              >
                Capture
              </button>
            </div>
            
            <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden border border-gray-300 relative flex items-center justify-center shadow-inner">
              <div className="text-center">
                <div className="text-4xl mb-2 opacity-50 grayscale">🚫</div>
                <span className="text-gray-400 text-sm font-medium">Signal Lost</span>
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-400 font-mono mb-4">Status: Disconnected</div>

            {/* --- พื้นที่แสดงรูปที่ Capture (Camera B) --- */}
            <div className="mt-auto pt-4 border-t border-gray-100">
               <h3 className="text-sm text-gray-500 mb-2 font-medium">Recent Captures (Click to enlarge)</h3>
               <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300">
                  {capturedImages.filter(img => img.cam === 'Camera B').length === 0 ? (
                    <div className="w-full h-20 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-400 text-xs">
                       No images captured
                    </div>
                  ) : (
                    capturedImages.filter(img => img.cam === 'Camera B').map((img) => (
                      <div 
                        key={img.id} 
                        onClick={() => setSelectedImage(img.url)}
                        className="min-w-[100px] h-[70px] bg-gray-100 rounded border border-gray-200 overflow-hidden relative cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all"
                      >
                          <img src={img.url} className="w-full h-full object-cover hover:scale-110 transition-transform duration-300" />
                      </div>
                    ))
                  )}
               </div>
            </div>
          </div>
        </div>

        {/* --- Security Event Log --- */}
        <div className="xl:col-span-1 bg-white rounded-xl p-5 shadow-md border border-gray-200 h-full max-h-[80vh] flex flex-col">
          <h2 className="text-xl font-semibold mb-4 text-blue-600 flex items-center gap-2 border-b border-gray-100 pb-2">
          Security Logs
          </h2>
          <div className="space-y-3 overflow-y-auto flex-1 pr-2 custom-scrollbar">
            {logs.map((log, i) => (
              <div key={i} className="border-l-4 border-blue-500 pl-3 py-2 bg-gray-50 rounded-r hover:bg-blue-50 transition">
                <span className="text-blue-600 text-[11px] font-bold font-mono block mb-0.5">{log.time}</span>
                <p className="text-gray-700 text-xs leading-relaxed font-medium">{log.event}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* --- Image Lightbox Modal (NEW FEATURE) --- */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedImage(null)} // คลิกพื้นหลังเพื่อปิด
        >
          <div className="relative max-w-5xl max-h-screen">
            <img 
              src={selectedImage} 
              className="max-w-full max-h-[90vh] rounded-lg shadow-2xl border-2 border-white/20" 
              alt="Enlarged capture"
            />
            <button 
              onClick={() => setSelectedImage(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 font-bold text-xl"
            >
              ✕ Close
            </button>
          </div>
        </div>
      )}

      {/* --- Floating Action Button --- */}
      <button 
        onClick={() => setIsChatOpen(!isChatOpen)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-tr from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-full shadow-lg shadow-blue-500/40 flex items-center justify-center transition-all active:scale-95 z-50 group hover:-translate-y-1"
      >
        {isChatOpen ? (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7 group-hover:scale-110 transition-transform">
            <path fillRule="evenodd" d="M4.804 21.644A6.707 6.707 0 006 21.75a6.721 6.721 0 003.583-1.029c.774.182 1.584.279 2.417.279 5.322 0 9.75-3.97 9.75-9 0-5.03-4.428-9-9.75-9s-9.75 3.97-9.75 9c0 2.409 1.025 4.587 2.674 6.192.232.226.277.428.254.543a3.73 3.73 0 01-.814 1.686.75.75 0 00.44 1.223zM8.25 10.875a1.125 1.125 0 100 2.25 1.125 1.125 0 000-2.25zM10.875 12a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0zm4.875-1.125a1.125 1.125 0 100 2.25 1.125 1.125 0 000-2.25z" clipRule="evenodd" />
          </svg>
        )}
      </button>

      {/* --- AI Chat Pop-up Window --- */}
      {isChatOpen && (
        <div className="fixed bottom-24 right-6 
            w-[380px] md:w-[480px] h-[600px] max-h-[80vh]  /* <-- ปรับขนาด Chat ให้ใหญ่ขึ้นตามคำขอ */
            bg-white rounded-2xl border border-gray-200 shadow-2xl flex flex-col z-50 overflow-hidden animate-in slide-in-from-bottom-5 ring-1 ring-black/5">
          
          {/* Pop-up Header */}
          <div className="p-4 bg-gradient-to-r from-blue-600 to-indigo-600 flex justify-between items-center shadow-md">
            <div className="flex items-center gap-2">
                <div className="p-1 bg-white/20 rounded-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-white">
                        <path d="M10 2a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 2zM10 15a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 15zM10 7a3 3 0 100 6 3 3 0 000-6zM15.657 5.404a.75.75 0 10-1.06-1.06l-1.061 1.06a.75.75 0 001.06 1.06l1.06-1.06zM6.464 14.596a.75.75 0 10-1.06-1.06l-1.06 1.06a.75.75 0 001.06 1.06l1.06-1.06zM18 10a.75.75 0 01-.75.75h-1.5a.75.75 0 010-1.5h1.5A.75.75 0 0118 10zM5 10a.75.75 0 01-.75.75h-1.5a.75.75 0 010-1.5h1.5A.75.75 0 015 10zM14.596 15.657a.75.75 0 001.06 1.06l1.06-1.061a.75.75 0 10-1.06-1.06l-1.06 1.06zM5.404 6.464a.75.75 0 001.06 1.06l1.06-1.06a.75.75 0 10-1.061-1.06l-1.06 1.06z" />
                    </svg>
                </div>
                <h2 className="font-bold text-white tracking-wide">AI Assistant</h2>
            </div>
            <button onClick={() => setIsChatOpen(false)} className="text-white opacity-70 hover:opacity-100 hover:rotate-90 transition-transform">✕</button>
          </div>
          
          {/* Chat History */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-gray-50 scrollbar-thin scrollbar-thumb-gray-300">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-3.5 rounded-2xl text-sm shadow-sm ${
                  msg.role === 'user' 
                    ? 'bg-blue-600 text-white rounded-br-none' 
                    : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {isLoading && (
               <div className="flex justify-start">
                   <div className="bg-gray-200 text-gray-500 text-xs px-3 py-2 rounded-full animate-pulse">AI is thinking...</div>
               </div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-gray-200 bg-white">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="ถาม AI เกี่ยวกับกล้อง..."
                className="flex-1 bg-gray-100 border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-gray-800 placeholder-gray-400 transition-all"
              />
              <button 
                onClick={sendMessage}
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700 px-5 py-2 rounded-xl text-white font-bold disabled:opacity-50 transition-colors shadow-sm"
              >
                ส่ง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}