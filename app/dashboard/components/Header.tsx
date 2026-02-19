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
                  // Sun Icon
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                  </svg>
              ) : (
                  // Moon Icon
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                  </svg>
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