// components/LogPanel.tsx
import React from 'react';
import { LogEntry } from '../types';

type LogPanelProps = {
  logs: LogEntry[];
  isDarkMode: boolean;
};



export default function LogPanel({ logs, isDarkMode }: LogPanelProps) {
  return (
    <div className={`xl:col-span-1 rounded-xl p-5 shadow-md border h-full max-h-[80vh] flex flex-col transition-all duration-300 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'}`}>
      <h2 className={`text-xl font-semibold mb-4 border-b pb-2 ${isDarkMode ? 'text-blue-400 border-slate-800' : 'text-blue-600 border-gray-100'}`}>Event Logs</h2>
      <div className="space-y-3 overflow-y-auto flex-1 pr-2 custom-scrollbar">
        {logs.map((log, i) => (
          <div key={i} className={`border-l-4 border-blue-500 pl-3 py-2 rounded-r transition ${isDarkMode ? 'bg-slate-800/50 hover:bg-slate-800' : 'bg-gray-50 hover:bg-blue-50'}`}>
            <span className={`text-[11px] font-bold font-mono block mb-0.5 ${isDarkMode ? 'text-blue-300' : 'text-blue-600'}`}>{log.time}</span>
            <p className={`text-xs font-medium ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>{log.event}</p>
          </div>
        ))}
      </div>
    </div>
  );
}





