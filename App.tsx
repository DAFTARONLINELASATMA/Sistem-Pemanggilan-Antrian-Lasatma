import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { Smartphone, Monitor, UserCog, ExternalLink } from 'lucide-react';
import { Header } from './components/Header';
import { QueueCard } from './components/QueueCard';
import { ControlPanel } from './components/ControlPanel';
import { QueueState, BroadcastAction, CounterMap, CounterData } from './types';

// Broadcast Channel untuk komunikasi antar tab
const bc = new BroadcastChannel('lapas_queue_channel');

const App: React.FC = () => {
  // Mode Aplikasi
  const [appMode, setAppMode] = useState<'LANDING' | 'DASHBOARD' | 'CONTROL'>('LANDING');

  // --- 1. SMART LAUNCHER LOGIC ---
  // Cek URL saat pertama kali load. Jika ada ?mode=CONTROL, langsung masuk mode petugas.
  useLayoutEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'CONTROL') {
      setAppMode('CONTROL');
      document.body.classList.remove('overflow-hidden');
      document.body.classList.add('overflow-auto');
    }
  }, []);

  // Fungsi untuk membuka Panel Petugas sebagai Popup (Floating Window)
  const openControlPopup = () => {
    const width = 400;
    const height = 700;
    const left = window.screen.width - width - 50;
    const top = 100;
    
    // Gunakan URL dasar (origin) + parameter mode untuk menghindari error 404 pada routing Vercel
    const url = new URL(window.location.origin);
    url.searchParams.set('mode', 'CONTROL');
    
    window.open(
      url.toString(),
      'LapasControlPanel', // Nama unik agar tidak membuka double window
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=no,location=no,toolbar=no,menubar=no,popup=yes`
    );
  };

  // --- TV Scaling Logic (Only used in Dashboard Mode) ---
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    if (appMode !== 'DASHBOARD') return;

    const handleResize = () => {
      const targetWidth = 1920;
      const targetHeight = 1080;
      const currentWidth = window.innerWidth;
      const currentHeight = window.innerHeight;
      const scaleX = currentWidth / targetWidth;
      const scaleY = currentHeight / targetHeight;
      setScale(Math.min(scaleX, scaleY));
    };

    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [appMode]);

  // --- Central Queue State ---
  const [visitQueue, setVisitQueue] = useState<QueueState>({
    currentNumber: 0, lastCalled: null, totalServed: 0, activeCounter: null
  });

  const [foodQueue, setFoodQueue] = useState<QueueState>({
    currentNumber: 0, lastCalled: null, totalServed: 0, activeCounter: null
  });

  // State untuk status per Loket (1-5)
  const [counterStatus, setCounterStatus] = useState<CounterMap>({
    1: null, 2: null, 3: null, 4: null, 5: null
  });

  // Ref untuk logic Sequence (Nomor Tertinggi yang pernah keluar)
  const sequenceRef = useRef<{ visit: number; food: number }>({ visit: 0, food: 0 });
  
  // Ref untuk History Per Loket
  const historyRef = useRef<Record<number, { type: 'VISIT'|'FOOD', number: number } | null>>({
    1: null, 2: null, 3: null, 4: null, 5: null
  });

  // Refs untuk akses state di dalam callback
  const visitQueueRef = useRef(visitQueue);
  const foodQueueRef = useRef(foodQueue);
  const counterStatusRef = useRef(counterStatus);

  useEffect(() => {
    visitQueueRef.current = visitQueue;
  }, [visitQueue]);

  useEffect(() => {
    foodQueueRef.current = foodQueue;
  }, [foodQueue]);
  
  useEffect(() => {
    counterStatusRef.current = counterStatus;
  }, [counterStatus]);

  // --- Audio Logic ---
  const speak = useCallback((text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'id-ID';
      utterance.rate = 0.85;
      const voices = window.speechSynthesis.getVoices();
      const indoVoice = voices.find(v => v.lang.includes('id'));
      if (indoVoice) utterance.voice = indoVoice;
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  const announceQueue = useCallback((prefix: string, number: number, counter: number | null) => {
    const counterText = counter ? `Loket ${counter}` : 'Loket Petugas';
    const text = `Nomor Antrian... ${prefix}... ${number}... Silakan menuju... ${counterText}`;
    speak(text);
  }, [speak]);

  // --- SERVER LOGIC (Hanya aktif jika mode DASHBOARD) ---
  useEffect(() => {
    if (appMode !== 'DASHBOARD') return;

    const handleClientRequest = (event: MessageEvent<BroadcastAction>) => {
      const action = event.data;
      const getCurrentTime = () => new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

      const broadcastSync = (v: QueueState, f: QueueState, c: CounterMap) => {
        bc.postMessage({ type: 'SYNC_STATE', payload: { visit: v, food: f, counters: c } });
      };

      const updateCounterStatus = (counterId: number, type: 'VISIT'|'FOOD', number: number) => {
        const newData: CounterData = { service: type, number, timestamp: getCurrentTime() };
        const newMap = { ...counterStatusRef.current, [counterId]: newData };
        setCounterStatus(newMap);
        historyRef.current[counterId] = { type, number };
        return newMap;
      };

      if (action.type === 'REQUEST_NEXT_VISIT') {
        const nextNum = sequenceRef.current.visit + 1;
        sequenceRef.current.visit = nextNum;

        const prev = visitQueueRef.current;
        const newVisitState = {
            ...prev,
            currentNumber: nextNum,
            totalServed: prev.totalServed + 1,
            activeCounter: action.payload.counterId,
            lastCalled: getCurrentTime()
        };
        setVisitQueue(newVisitState);

        const newCounters = updateCounterStatus(action.payload.counterId, 'VISIT', nextNum);
        broadcastSync(newVisitState, foodQueueRef.current, newCounters);
        announceQueue('D', nextNum, action.payload.counterId);
      }
      else if (action.type === 'REQUEST_RECALL_VISIT') {
        const counterId = action.payload.counterId;
        const lastHistory = historyRef.current[counterId];

        if (lastHistory && lastHistory.type === 'VISIT') {
            const numToCall = lastHistory.number;
            const newCounters = updateCounterStatus(counterId, 'VISIT', numToCall);
            const newVisitState = { ...visitQueueRef.current, lastCalled: getCurrentTime(), activeCounter: counterId };
            setVisitQueue(newVisitState);
            broadcastSync(newVisitState, foodQueueRef.current, newCounters);
            announceQueue('D', numToCall, counterId);
        }
      }
      else if (action.type === 'REQUEST_RESET_VISIT') {
        sequenceRef.current.visit = 0;
        const newState = { currentNumber: 0, lastCalled: null, totalServed: 0, activeCounter: null };
        setVisitQueue(newState);
        const newCounters = { ...counterStatusRef.current };
        Object.keys(newCounters).forEach(k => {
            const key = Number(k);
            if (newCounters[key]?.service === 'VISIT') newCounters[key] = null;
        });
        setCounterStatus(newCounters);
        broadcastSync(newState, foodQueueRef.current, newCounters);
      }
      else if (action.type === 'REQUEST_NEXT_FOOD') {
        const nextNum = sequenceRef.current.food + 1;
        sequenceRef.current.food = nextNum;
        const prev = foodQueueRef.current;
        const newFoodState = {
            ...prev,
            currentNumber: nextNum,
            totalServed: prev.totalServed + 1,
            activeCounter: action.payload.counterId,
            lastCalled: getCurrentTime()
        };
        setFoodQueue(newFoodState);
        const newCounters = updateCounterStatus(action.payload.counterId, 'FOOD', nextNum);
        broadcastSync(visitQueueRef.current, newFoodState, newCounters);
        announceQueue('A', nextNum, action.payload.counterId);
      }
      else if (action.type === 'REQUEST_RECALL_FOOD') {
        const counterId = action.payload.counterId;
        const lastHistory = historyRef.current[counterId];
        if (lastHistory && lastHistory.type === 'FOOD') {
            const numToCall = lastHistory.number;
            const newCounters = updateCounterStatus(counterId, 'FOOD', numToCall);
            const newFoodState = { ...foodQueueRef.current, lastCalled: getCurrentTime(), activeCounter: counterId };
            setFoodQueue(newFoodState);
            broadcastSync(visitQueueRef.current, newFoodState, newCounters);
            announceQueue('A', numToCall, counterId);
        }
      }
      else if (action.type === 'REQUEST_RESET_FOOD') {
        sequenceRef.current.food = 0;
        const newState = { currentNumber: 0, lastCalled: null, totalServed: 0, activeCounter: null };
        setFoodQueue(newState);
        const newCounters = { ...counterStatusRef.current };
        Object.keys(newCounters).forEach(k => {
            const key = Number(k);
            if (newCounters[key]?.service === 'FOOD') newCounters[key] = null;
        });
        setCounterStatus(newCounters);
        broadcastSync(visitQueueRef.current, newState, newCounters);
      }
      else if (action.type === 'REQUEST_INITIAL_STATE') {
         broadcastSync(visitQueueRef.current, foodQueueRef.current, counterStatusRef.current);
      }
    };

    bc.onmessage = handleClientRequest;

    return () => {
      bc.onmessage = null; 
    };
  }, [appMode, announceQueue]);


  // --- RENDER HELPERS ---
  
  // Konten Marquee yang akan diduplikasi agar seamless
  const MarqueeContent = () => (
    <div className="flex items-center gap-24 px-12">
        <span>SELAMAT DATANG DI LAPAS KELAS I MADIUN</span>
        <span className="text-yellow-400">❖</span>
        <span>MOHON MENYIAPKAN KTP/SIM/PASPOR ASLI</span>
        <span className="text-yellow-400">❖</span>
        <span>MAKANAN WAJIB MENGGUNAKAN WADAH TRANSPARAN</span>
        <span className="text-yellow-400">❖</span>
        <span>JAGALAH KEBERSIHAN DAN KETERTIBAN SELAMA KUNJUNGAN</span>
        <span className="text-yellow-400">❖</span>
    </div>
  );

  if (appMode === 'CONTROL') {
    return <ControlPanel channel={bc} />;
  }

  if (appMode === 'LANDING') {
    return (
        <div className="h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center p-6 font-sans text-white">
            <div className="max-w-4xl w-full text-center">
                <img 
                    src="https://lapasmataram.com/wp-content/uploads/2025/06/2-logo.png" 
                    alt="Logo" 
                    className="h-32 mx-auto mb-8 drop-shadow-2xl animate-in fade-in zoom-in duration-700"
                />
                <h1 className="text-4xl font-black uppercase tracking-widest mb-2 text-yellow-400">Sistem Antrian Terpadu</h1>
                <h2 className="text-2xl font-light uppercase tracking-wide mb-12">Lapas Kelas I Madiun</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl mx-auto">
                    <button 
                        onClick={() => setAppMode('DASHBOARD')}
                        className="group relative bg-white/10 backdrop-blur-md border-2 border-white/20 hover:border-blue-400 hover:bg-blue-600/30 rounded-3xl p-8 transition-all hover:scale-105 active:scale-95 text-left"
                    >
                        <div className="bg-blue-500 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:rotate-6 transition-transform">
                            <Monitor size={32} className="text-white" />
                        </div>
                        <h3 className="text-2xl font-bold mb-2">Layar Antrian (TV)</h3>
                        <p className="text-gray-400 group-hover:text-blue-200 text-sm leading-relaxed">
                            Server Utama. Halaman ini wajib dibuka terlebih dahulu agar sistem berjalan.
                        </p>
                    </button>

                    <button 
                        onClick={openControlPopup}
                        className="group relative bg-white/10 backdrop-blur-md border-2 border-white/20 hover:border-orange-400 hover:bg-orange-600/30 rounded-3xl p-8 transition-all hover:scale-105 active:scale-95 text-left"
                    >
                        <div className="bg-orange-500 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:-rotate-6 transition-transform">
                            <UserCog size={32} className="text-white" />
                        </div>
                        <h3 className="text-2xl font-bold mb-2">Panel Petugas</h3>
                        <p className="text-gray-400 group-hover:text-orange-200 text-sm leading-relaxed">
                            Buka Jendela Remote Kontrol (Floating Window).
                        </p>
                    </button>
                </div>
                
                <p className="mt-12 text-gray-500 text-sm">© 2025 Kementerian Imigrasi Dan Pemasyarakatan Republik Indonesia</p>
            </div>
        </div>
    );
  }

  // --- RENDER: DASHBOARD MODE (TV) ---
  return (
    <>
      <div className="fixed inset-0 z-[9999] bg-gray-900 text-white flex flex-col items-center justify-center p-8 text-center hidden portrait:flex">
         <div className="relative mb-8">
           <div className="absolute inset-0 bg-blue-500 rounded-full blur-xl opacity-20 animate-pulse"></div>
           <Smartphone size={80} className="text-blue-400 animate-[spin_3s_ease-in-out_infinite]" />
        </div>
        <h2 className="text-3xl font-bold mb-4 uppercase tracking-widest text-blue-100">Rotasi Layar Diperlukan</h2>
        <p className="text-lg text-gray-400 max-w-md leading-relaxed">Mode TV Display membutuhkan layar Landscape.</p>
      </div>

      <div className="w-screen h-screen bg-gray-900 overflow-hidden flex items-center justify-center portrait:hidden">
        <div 
          style={{ 
            width: '1920px', 
            height: '1080px', 
            transform: `scale(${scale})`,
            transformOrigin: 'center center'
          }}
          className="relative bg-slate-100 font-sans shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Background Layers */}
          <div className="absolute inset-0 z-0">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-100 via-blue-50 to-slate-200"></div>
              <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>
              <div className="absolute inset-0 flex items-center justify-center opacity-[0.05] pointer-events-none grayscale">
                  <img src="https://lapasmataram.com/wp-content/uploads/2025/06/2-logo.png" alt="Watermark" className="w-[70%] h-auto object-contain" />
              </div>
          </div>

          <div className="relative z-10 flex flex-col h-full">
              <Header />

              <main className="flex-1 px-10 py-6 flex flex-col h-full justify-between overflow-hidden">
                  <div className="h-full flex flex-col">
                      
                  {/* Running Text / Marquee (SEAMLESS LOOP FIX) */}
                  <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white p-4 rounded-2xl mb-6 overflow-hidden shadow-2xl border-4 border-blue-400/50 flex-shrink-0 flex">
                      <div className="animate-marquee whitespace-nowrap text-3xl font-black tracking-widest flex items-center shrink-0 min-w-full drop-shadow-md">
                          <MarqueeContent />
                      </div>
                      <div className="animate-marquee whitespace-nowrap text-3xl font-black tracking-widest flex items-center shrink-0 min-w-full drop-shadow-md">
                          <MarqueeContent />
                      </div>
                  </div>

                  {/* Main Content: UNIFIED QUEUE BOARD */}
                  <div className="flex-1 min-h-0 mb-8">
                      <QueueCard
                          counterStatus={counterStatus}
                          visitTotal={visitQueue.totalServed}
                          foodTotal={foodQueue.totalServed}
                      />
                  </div>

                  {/* Footer Info (Aligned) */}
                  <div className="grid grid-cols-3 gap-6 opacity-95 flex-shrink-0 pb-2">
                      <div className="bg-white/90 backdrop-blur-md p-6 rounded-2xl shadow-xl border-l-[12px] border-lapas-blue flex flex-col justify-center">
                          <h4 className="font-extrabold text-gray-800 mb-1 text-xl tracking-tight uppercase">Sesi 1</h4>
                          <p className="text-blue-800 font-black text-4xl">08.30 - 11.30 WIB</p>
                      </div>
                      <div className="bg-white/90 backdrop-blur-md p-6 rounded-2xl shadow-xl border-l-[12px] border-orange-600 flex flex-col justify-center">
                          <h4 className="font-extrabold text-gray-800 mb-1 text-xl tracking-tight uppercase">Sesi 2 (Khusus Selasa)</h4>
                          <p className="text-orange-800 font-black text-4xl">13.00 - 14.30 WIB</p>
                      </div>
                      <div className="bg-white/90 backdrop-blur-md p-6 rounded-2xl shadow-xl border-l-[12px] border-gray-700 flex flex-col justify-center">
                          <h4 className="font-extrabold text-gray-800 mb-1 text-xl tracking-tight uppercase">Hari Layanan</h4>
                          <p className="text-gray-800 font-black text-4xl">Selasa & Kamis</p>
                      </div>
                  </div>
                  </div>
              </main>
          </div>
        </div>
        <style>{`
          @keyframes marquee { 
            0% { transform: translateX(0); } 
            100% { transform: translateX(-100%); } 
          }
          .animate-marquee { 
            animation: marquee 35s linear infinite; 
          }
        `}</style>
      </div>
    </>
  );
};

export default App;