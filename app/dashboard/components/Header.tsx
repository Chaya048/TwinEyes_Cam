// components/Header.tsx
import React from 'react';

type HeaderProps = {
  isDarkMode: boolean;
  setIsDarkMode: (value: boolean) => void;
};

export default function Header({ isDarkMode, setIsDarkMode }: HeaderProps) {
  return (
    <header className={`mb-6 flex justify-between items-center border-b pb-4 px-6 py-4 rounded-xl shadow-sm transition-colors duration-300 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'}`}>
      <div className="flex items-center gap-4">
          <h1 className={`text-3xl font-bold ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>TwinEyes</h1>
      </div>
      
      <div className="flex items-center gap-4">
          {/* ปุ่ม Toggle Dark Mode */}
          <button 
              onClick={() => setIsDarkMode(!isDarkMode)} 
              className={`p-2 rounded-full transition-colors ${isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-yellow-400 border border-slate-700' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}
              title="Toggle Dark Mode"
          >
            {isDarkMode ? (
                <span className="text-xl">☀️</span>
            ) : (
                <span className="text-xl">🌙</span>
            )}
          </button>

          <div className={`text-sm flex items-center gap-2 font-medium ${isDarkMode ? 'text-emerald-400' : 'text-green-600'}`}>
              <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              System Online
          </div>
      </div>
    </header>
  );
}