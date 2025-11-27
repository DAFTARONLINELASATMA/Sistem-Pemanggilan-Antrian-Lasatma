import React from 'react';
import { Store, ArrowRight } from 'lucide-react';
import { CounterMap } from '../types';

interface QueueCardProps {
  counterStatus: CounterMap;
  visitTotal: number;
  foodTotal: number;
}

export const QueueCard: React.FC<QueueCardProps> = ({
  counterStatus,
  visitTotal,
  foodTotal,
}) => {
  const counters = [1, 2, 3, 4, 5];

  return (
    <div className="flex flex-col h-full bg-white rounded-3xl shadow-2xl overflow-hidden border-4 border-gray-200">
      {/* Unified Header */}
      <div className="bg-gray-900 p-4 text-white text-center shadow-md relative overflow-hidden flex justify-between items-center px-8 border-b-8 border-yellow-500 shrink-0">
        <div className="flex items-center gap-4">
            <h2 className="text-3xl font-black uppercase tracking-wider drop-shadow-md text-blue-100">Status Panggilan Loket</h2>
        </div>
        
        {/* Summary Stats */}
        <div className="flex gap-8 text-lg font-bold">
            <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded bg-blue-500"></div>
                <span>Kunjungan: <span className="text-2xl text-yellow-400 ml-1">{visitTotal}</span></span>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded bg-orange-500"></div>
                <span>Makanan: <span className="text-2xl text-yellow-400 ml-1">{foodTotal}</span></span>
            </div>
        </div>
      </div>

      {/* Main List Display */}
      <div className="flex-1 flex flex-col justify-center p-4 bg-gray-100 gap-3 min-h-0">
        {counters.map((counterId) => {
            const data = counterStatus[counterId];
            const isVisit = data?.service === 'VISIT';
            const hasData = !!data;
            
            // Warna dinamis berdasarkan jenis layanan
            const rowBg = hasData 
                ? (isVisit ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200')
                : 'bg-white border-gray-200 opacity-60';
            
            const numColor = hasData
                ? (isVisit ? 'text-blue-700' : 'text-orange-700')
                : 'text-gray-300';

            const prefix = hasData ? (isVisit ? 'D' : 'A') : '';

            return (
                <div 
                    key={counterId} 
                    className={`flex-1 flex items-center px-8 rounded-xl border-l-[16px] shadow-sm transition-all duration-500 ${rowBg} ${hasData ? (isVisit ? 'border-l-blue-600' : 'border-l-orange-600') : 'border-l-gray-300'}`}
                >
                    {/* Counter Identifier - FIXED WIDTH COLUMN */}
                    <div className="flex items-center gap-6 w-[400px] shrink-0">
                        <div className={`p-4 rounded-full ${hasData ? 'bg-white shadow-md' : 'bg-gray-100'}`}>
                            <Store size={36} className={hasData ? 'text-gray-800' : 'text-gray-300'} />
                        </div>
                        <span className="text-5xl font-black uppercase text-gray-700 tracking-widest">LOKET {counterId}</span>
                    </div>

                    {/* Arrow Indicator - FLEXIBLE CENTER */}
                    <div className="flex-1 flex justify-center opacity-20 px-4">
                         {hasData && <ArrowRight size={48} className="text-gray-400" />}
                    </div>

                    {/* Number Display - FIXED WIDTH COLUMN & ALIGNED */}
                    <div className="w-[550px] shrink-0 flex items-center justify-end pr-4">
                        {hasData ? (
                            <div className={`flex items-center justify-end gap-3 ${numColor} animate-in slide-in-from-right-10 duration-300`}>
                                {/* Prefix (D/A) */}
                                <span className="text-[5rem] font-bold w-[90px] text-right leading-none select-none">{prefix}</span>
                                
                                {/* Separator (-) */}
                                <span className="text-[4rem] font-light mx-2 opacity-40 translate-y-[-6px] select-none">-</span>
                                
                                {/* Number - Tabular Nums for perfect alignment */}
                                <span className="text-[6.5rem] font-black w-[240px] text-left tabular-nums leading-none tracking-tighter">
                                    {data.number}
                                </span>
                            </div>
                        ) : (
                            <div className="w-full text-right text-3xl font-bold text-gray-300 uppercase tracking-widest italic pr-8">
                                Menunggu...
                            </div>
                        )}
                    </div>
                </div>
            );
        })}
      </div>
    </div>
  );
};
