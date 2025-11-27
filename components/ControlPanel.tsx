import React, { useState, useEffect } from 'react';
import { Megaphone, ChevronRight, Users, Utensils, AlertCircle, Store, ChevronDown, ExternalLink } from 'lucide-react';
import { QueueState, BroadcastAction, CounterMap } from '../types';

interface ControlPanelProps {
  channel: BroadcastChannel;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({ channel }) => {
  // Local State UI
  const [activeTab, setActiveTab] = useState<'VISIT' | 'FOOD'>('VISIT');
  const [selectedCounter, setSelectedCounter] = useState<number>(1);
  const [isConnected, setIsConnected] = useState(false); // Indikator jika TV merespon
  
  // State data yang diterima dari TV (Server)
  const [visitState, setVisitState] = useState<QueueState>({ currentNumber: 0, lastCalled: null, totalServed: 0, activeCounter: null });
  const [foodState, setFoodState] = useState<QueueState>({ currentNumber: 0, lastCalled: null, totalServed: 0, activeCounter: null });
  const [counters, setCounters] = useState<CounterMap>({});

  // Init: Minta data awal saat panel dibuka
  useEffect(() => {
    // Kirim request initial segera
    channel.postMessage({ type: 'REQUEST_INITIAL_STATE' });
    
    const handleSync = (event: MessageEvent<BroadcastAction>) => {
        if (event.data.type === 'SYNC_STATE') {
            setVisitState(event.data.payload.visit);
            setFoodState(event.data.payload.food);
            setCounters(event.data.payload.counters);
            setIsConnected(true);
        }
    };

    channel.onmessage = handleSync;
    
    // Polling untuk memastikan sync jika TV baru dibuka belakangan
    const pinger = setInterval(() => {
        if (!isConnected) channel.postMessage({ type: 'REQUEST_INITIAL_STATE' });
    }, 2000);

    return () => {
        channel.onmessage = null;
        clearInterval(pinger);
    };
  }, [channel, isConnected]);


  const currentState = activeTab === 'VISIT' ? visitState : foodState;
  const isBlue = activeTab === 'VISIT';
  
  // Cari data terakhir loket yang dipilih
  const myCounterData = counters[selectedCounter];
  // Hanya tampilkan jika service type-nya sesuai dengan tab aktif
  const myLastNumber = (myCounterData?.service === activeTab) ? myCounterData.number : null;

  // --- ACTIONS ---

  const handleNext = () => {
    if (activeTab === 'VISIT') {
        channel.postMessage({ type: 'REQUEST_NEXT_VISIT', payload: { counterId: selectedCounter } });
    } else {
        channel.postMessage({ type: 'REQUEST_NEXT_FOOD', payload: { counterId: selectedCounter } });
    }
  };

  const handleRecall = () => {
    if (!myLastNumber) return; 

    if (activeTab === 'VISIT') {
        channel.postMessage({ type: 'REQUEST_RECALL_VISIT', payload: { counterId: selectedCounter } });
    } else {
        channel.postMessage({ type: 'REQUEST_RECALL_FOOD', payload: { counterId: selectedCounter } });
    }
  };

  const handlePopOut = () => {
    const width = 400;
    const height = 700;
    const left = window.screen.width - width - 50;
    const top = 100;
    
    const url = new URL(window.location.href);
    url.searchParams.set('mode', 'CONTROL');
    
    window.open(
        url.toString(),
        'LapasControlPanel',
        `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=no,location=no,toolbar=no,menubar=no,popup=yes`
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 font-sans">
      <div className="bg-white w-[360px] rounded-2xl shadow-xl overflow-hidden border border-gray-200 relative">
        
        {/* Header Panel - COMPACT */}
        <div className="bg-gray-900 p-4 text-white border-b-4 border-yellow-500 relative flex flex-col items-center">
            
            {/* Pop Out Button */}
            <button 
                onClick={handlePopOut}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition p-1"
                title="Buka di Jendela Terpisah"
            >
                <ExternalLink size={16} />
            </button>

            <h1 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-0.5">Panel Petugas</h1>
            <h2 className="text-lg font-black text-white leading-tight">Lapas Kelas I Madiun</h2>
            
            {/* Connection Indicator */}
            <div className={`absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-full ${isConnected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400 animate-pulse'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                {isConnected ? 'ON' : 'OFF'}
            </div>
        </div>

        {/* SECTION 1: ALERT & COUNTER SELECTION (Moved to Top) */}
        <div className="p-4 pb-2 bg-white">
            {!isConnected && (
                <div className="mb-3 bg-red-50 text-red-600 p-2 rounded-lg text-xs flex items-start gap-2 border border-red-200 leading-tight">
                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                    <span>TV belum terhubung. Buka menu "Layar Antrian" dulu.</span>
                </div>
            )}

            {/* Counter Selector - DROPDOWN */}
            <div className="relative">
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">Pilih Loket Anda</label>
                <div className="relative">
                    <select
                        value={selectedCounter}
                        onChange={(e) => setSelectedCounter(Number(e.target.value))}
                        className={`w-full appearance-none bg-white border-2 rounded-xl py-3 px-4 text-gray-700 font-bold text-lg outline-none focus:ring-2 transition-all cursor-pointer ${
                            isBlue 
                            ? 'border-blue-100 focus:border-blue-500 focus:ring-blue-200' 
                            : 'border-orange-100 focus:border-orange-500 focus:ring-orange-200'
                        }`}
                    >
                        {[1, 2, 3, 4, 5].map((num) => (
                            <option key={num} value={num}>
                                Loket Petugas {num}
                            </option>
                        ))}
                    </select>
                    
                    {/* Custom Icon Overlay */}
                    <div className={`absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none ${isBlue ? 'text-blue-500' : 'text-orange-500'}`}>
                        <ChevronDown size={20} />
                    </div>
                </div>
            </div>
        </div>

        {/* SECTION 2: TAB SWITCHER */}
        <div className="flex border-y border-gray-200">
            <button 
                onClick={() => setActiveTab('VISIT')}
                className={`flex-1 py-3 flex items-center justify-center gap-2 transition-all ${activeTab === 'VISIT' ? 'bg-blue-50 text-blue-700 border-b-4 border-blue-600' : 'text-gray-400 hover:bg-gray-50'}`}
            >
                <Users size={18} />
                <span className="font-bold text-xs uppercase">Kunjungan</span>
            </button>
            <button 
                onClick={() => setActiveTab('FOOD')}
                className={`flex-1 py-3 flex items-center justify-center gap-2 transition-all ${activeTab === 'FOOD' ? 'bg-orange-50 text-orange-700 border-b-4 border-orange-600' : 'text-gray-400 hover:bg-gray-50'}`}
            >
                <Utensils size={18} />
                <span className="font-bold text-xs uppercase">Makanan</span>
            </button>
        </div>

        {/* SECTION 3: MONITOR & ACTIONS */}
        <div className="p-4 pt-4">
            
            {/* Personal Status Monitor */}
            <div className={`text-center mb-4 p-3 rounded-xl border ${isBlue ? 'bg-blue-50 border-blue-100' : 'bg-orange-50 border-orange-100'} transition-colors duration-300`}>
                <div className="flex items-center justify-center gap-1 mb-0 opacity-60">
                    <Store size={12} />
                    <p className="text-[10px] font-bold uppercase tracking-widest">Status Loket {selectedCounter}</p>
                </div>
                
                <div className="flex items-baseline justify-center gap-2">
                    <span className={`text-5xl font-black leading-none ${isBlue ? 'text-blue-700' : 'text-orange-700'}`}>
                        {myLastNumber ? (
                            <span className="flex items-center gap-1">
                                <span className="text-2xl opacity-60 font-bold">{activeTab === 'VISIT' ? 'D' : 'A'}</span>
                                {myLastNumber}
                            </span>
                        ) : (
                            <span className="text-gray-300 text-3xl">-</span>
                        )}
                    </span>
                </div>
            </div>

            {/* Main Actions */}
            <div className="space-y-3 mb-2">
                <button 
                    onClick={handleNext}
                    disabled={!isConnected}
                    className={`w-full py-4 rounded-xl shadow-lg border-b-4 text-white font-black text-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] active:translate-y-1 active:border-b-0 disabled:opacity-50 disabled:cursor-not-allowed ${isBlue ? 'bg-blue-600 border-blue-800 hover:bg-blue-700 shadow-blue-200' : 'bg-orange-600 border-orange-800 hover:bg-orange-700 shadow-orange-200'}`}
                >
                    <ChevronRight size={24} />
                    PANGGIL {currentState.currentNumber + 1}
                </button>

                <div className="grid grid-cols-[1.3fr_1fr] gap-4 items-center pt-2">
                    <button 
                        onClick={handleRecall}
                        disabled={!isConnected || !myLastNumber}
                        className={`h-12 rounded-xl border-2 text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 ${isBlue ? 'border-blue-100 text-blue-600 hover:bg-blue-50' : 'border-orange-100 text-orange-600 hover:bg-orange-50'}`}
                    >
                        <Megaphone size={18} />
                        Ulangi
                    </button>
                    
                    {/* Global Queue Status Compact - Boxless Design */}
                    <div className="flex flex-col items-end justify-center pr-1">
                         <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider leading-none mb-1">
                            Total Antrian
                         </span>
                         <span className="text-2xl font-black leading-none text-gray-800">
                            <span className={`text-lg opacity-40 mr-0.5 ${isBlue ? 'text-blue-600' : 'text-orange-600'}`}>
                                {activeTab === 'VISIT' ? 'D' : 'A'}
                            </span>
                            {currentState.currentNumber}
                         </span>
                    </div>
                </div>
            </div>
        </div>

        {/* Footer Status */}
        <div className="bg-gray-50 p-2 text-center text-[10px] text-gray-400 border-t border-gray-200">
            Kementerian Imigrasi & Pemasyarakatan
        </div>

      </div>
    </div>
  );
};