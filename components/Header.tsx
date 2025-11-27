import React, { useState, useEffect } from 'react';

export const Header: React.FC = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date);
  };

  return (
    <header className="bg-gradient-to-r from-gray-900 via-lapas-blue to-gray-900 text-white shadow-xl p-6 sticky top-0 z-20 border-b-4 border-yellow-500">
      <div className="container mx-auto max-w-[95%] flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-6">
          <img 
            src="https://lapasmataram.com/wp-content/uploads/2025/06/2-logo.png" 
            alt="Logo Kementerian" 
            className="h-28 w-auto object-contain drop-shadow-lg"
          />
          <div>
            <p className="text-sm md:text-xl text-blue-200 font-bold tracking-[0.2em] uppercase mb-1 drop-shadow-md">Kementerian Imigrasi Dan Pemasyarakatan Republik Indonesia</p>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-wide uppercase text-yellow-50 drop-shadow-lg font-sans">Lapas Kelas I Madiun</h1>
          </div>
        </div>
        
        <div className="flex flex-col items-center justify-center text-center font-sans bg-black/40 px-12 py-4 rounded-2xl border-2 border-white/20 shadow-inner backdrop-blur-md min-w-[360px]">
            <div className="text-3xl md:text-4xl text-blue-200 font-bold mb-2 tracking-wide whitespace-nowrap">{formatDate(currentTime)}</div>
            <div className="text-4xl md:text-6xl font-black text-white tracking-widest drop-shadow-lg tabular-nums">{formatTime(currentTime)}</div>
        </div>
      </div>
    </header>
  );
};