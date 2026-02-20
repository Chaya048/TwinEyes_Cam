// components/ChatWidget.tsx
import React from 'react';
import { Message } from '../types';

type ChatWidgetProps = {
  isChatOpen: boolean;
  setIsChatOpen: (value: boolean) => void;
  messages: Message[];
  input: string;
  setInput: (value: string) => void;
  sendMessage: () => void;
  isLoading: boolean;
  isDarkMode: boolean;
};

export default function ChatWidget({
  isChatOpen,
  setIsChatOpen,
  messages,
  input,
  setInput,
  sendMessage,
  isLoading,
  isDarkMode
}: ChatWidgetProps) {
  return (
    <>
      {/* Chat Button */}
      <button 
        onClick={() => setIsChatOpen(!isChatOpen)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-tr from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-full shadow-lg shadow-blue-500/40 flex items-center justify-center transition-all active:scale-95 z-50 group hover:-translate-y-1"
      >
        {isChatOpen ? (
          <span className="text-2xl font-bold leading-none">&times;</span>
        ) : (
          <span className="text-3xl group-hover:scale-110 transition-transform inline-block">💬</span>
        )}
      </button>

      {/* Chat Window */}
      {isChatOpen && (
        <div className={`fixed bottom-24 right-6 w-[380px] md:w-[480px] h-[600px] max-h-[80vh] rounded-2xl border shadow-2xl flex flex-col z-50 overflow-hidden animate-in slide-in-from-bottom-5 ring-1 ring-black/5 ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'}`}>
          <div className="p-4 bg-gradient-to-r from-blue-600 to-indigo-600 flex justify-between items-center text-white shadow-md">
            <div className="flex items-center gap-2">
                <div className="p-1 bg-white/20 rounded-lg">
                </div>
                <h2 className="font-bold tracking-wide text-white">AI Assistant</h2>
            </div>
            <button onClick={() => setIsChatOpen(false)} className="text-white opacity-70 hover:opacity-100 transition-transform hover:rotate-90">✕</button>
          </div>
          <div className={`flex-1 p-4 overflow-y-auto space-y-4 scrollbar-thin scrollbar-thumb-slate-600 ${isDarkMode ? 'bg-slate-950' : 'bg-gray-50'}`}>
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-3.5 rounded-2xl text-sm shadow-sm ${
                  msg.role === 'user' 
                    ? 'bg-blue-600 text-white rounded-br-none' 
                    : (isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-gray-200 text-gray-800') + ' border rounded-bl-none'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {isLoading && (
               <div className="flex justify-start">
                  <div className={`text-xs px-3 py-2 rounded-full animate-pulse ${isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-gray-200 text-gray-500'}`}>AI is thinking...</div>
               </div>
            )}
          </div>
          <div className={`p-4 border-t ${isDarkMode ? 'border-slate-700 bg-slate-900' : 'border-gray-200 bg-white'}`}>
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="ถาม AI..."
                className={`flex-1 border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 ${isDarkMode ? 'bg-slate-800 border-slate-600 text-white placeholder-slate-400' : 'bg-gray-100 border-gray-300 text-gray-800 placeholder-gray-400'}`}
              />
              <button onClick={sendMessage} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl font-bold disabled:opacity-50 shadow-sm transition-colors">ส่ง</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}