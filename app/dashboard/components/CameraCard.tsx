// components/CameraCard.tsx
import React from 'react';
import { CapturedImage } from '../types';

type CameraCardProps = {
  title: string;
  camName: string; // "Camera A" or "Camera B"
  url: string;
  isConnected: boolean;
  setIsConnected: (status: boolean) => void;
  status: string;
  onCapture: (camName: string) => void;
  capturedImages: CapturedImage[];
  setSelectedImage: (url: string) => void;
  isDarkMode: boolean;
};

export default function CameraCard({
  title,
  camName,
  url,
  isConnected,
  setIsConnected,
  status,
  onCapture,
  capturedImages,
  setSelectedImage,
  isDarkMode
}: CameraCardProps) {

  const getStatusColor = (status: string) => {
    if (status.includes("DETECTED")) return "text-orange-500"; 
    if (status.includes("DISCONNECTED") || status.includes("OFFLINE")) return "text-slate-500"; 
    return "text-emerald-500"; 
  };

  const recentImages = capturedImages.filter(img => img.cam === camName);

  return (
    <div className={`rounded-xl p-5 shadow-md border flex flex-col h-full hover:shadow-lg transition-all duration-300 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'}`}>
      <div className="flex justify-between items-center mb-3">
        <h2 className={`text-xl font-semibold flex items-center gap-2 ${isDarkMode ? 'text-slate-100' : 'text-gray-700'}`}>
          {title}
          <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${isConnected ? (isDarkMode ? 'bg-emerald-900/50 text-emerald-400' : 'bg-green-100 text-green-600') : (isDarkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-600')}`}>
            {isConnected ? 'ONLINE' : 'OFFLINE'}
          </span>
        </h2>
        <button onClick={() => onCapture(camName)} className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 py-1.5 rounded transition-colors shadow-sm">Capture</button>
      </div>
      
      <div className={`aspect-video rounded-lg overflow-hidden border relative group shadow-inner ${isDarkMode ? 'bg-black border-slate-700' : 'bg-black border-gray-300'}`}>
        {url && (
          <img 
              src={url} 
              alt={camName} 
              className={`w-full h-full object-cover ${isConnected ? 'block' : 'hidden'}`}
              onLoad={() => setIsConnected(true)}
              onError={() => setIsConnected(false)}
          />
        )}
        {(!url || !isConnected) && (
          <div className={`w-full h-full flex items-center justify-center absolute top-0 left-0 ${isDarkMode ? 'bg-slate-950 text-slate-600' : 'bg-gray-900 text-gray-500'}`}>
            <div className="text-center">
              <span>Signal Lost</span>
            </div>
          </div>
        )}
      </div>

      <div className={`mt-auto pt-4 border-t ${isDarkMode ? 'border-slate-800' : 'border-gray-100'}`}>
          <h3 className={`text-sm mb-2 font-medium ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Recent Captures (Click to enlarge)</h3>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-600">
            {recentImages.length > 0 ? (
              recentImages.map((img) => (
                <div key={img.id} onClick={() => setSelectedImage(img.url)} className={`min-w-[100px] h-[70px] rounded border overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-gray-100 border-gray-200'}`}>
                    <img src={img.url} className="w-full h-full object-cover hover:scale-110 transition-transform" />
                </div>
              ))
            ) : (
              <div className={`w-full py-4 rounded-lg text-center text-[10px] ${isDarkMode ? 'text-slate-500 bg-slate-800/50' : 'text-gray-400 bg-gray-50'}`}>
                  No images captured
              </div>
            )}
          </div>
      </div>
    </div>
  );
}
