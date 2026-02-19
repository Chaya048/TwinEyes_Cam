// components/Lightbox.tsx
import React from 'react';

type LightboxProps = {
  selectedImage: string | null;
  setSelectedImage: (url: string | null) => void;
};

export default function Lightbox({ selectedImage, setSelectedImage }: LightboxProps) {
  if (!selectedImage) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in" onClick={() => setSelectedImage(null)}>
      <div className="relative max-w-5xl max-h-screen">
        <img src={selectedImage} className="max-w-full max-h-[90vh] rounded-lg shadow-2xl border-2 border-slate-500/30" alt="Enlarged" />
        <button onClick={() => setSelectedImage(null)} className="absolute -top-10 right-0 text-white font-bold text-xl hover:text-red-400 transition-colors">✕ Close</button>
      </div>
    </div>
  );
}