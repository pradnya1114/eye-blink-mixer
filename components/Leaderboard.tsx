import React from 'react';
import { LeaderboardEntry } from '../types';

interface LeaderboardProps {
  leaderboard: LeaderboardEntry[];
  onDownload?: () => void;
  title?: string;
}

const Leaderboard: React.FC<LeaderboardProps> = ({ leaderboard, onDownload, title = "Leaderboard 🏆" }) => {
  // Ensure we have exactly 10 slots to show
  const displayEntries = [...leaderboard];
  while (displayEntries.length < 10) {
    displayEntries.push({ playerName: '---', score: 0, date: '---' });
  }

  return (
    <div className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-2xl border-4 border-purple-100 h-full w-full">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-black text-purple-600 uppercase tracking-wider">{title}</h3>
        <div className="bg-purple-100 text-purple-600 px-5 py-5 rounded-full text-xl font-bold">TOP 10</div>
      </div>
      
      <div className="space-y-4">
        {displayEntries.map((entry, idx) => {
          const isEmpty = entry.playerName === '---';
          return (
            <div 
              key={idx} 
              className={`flex justify-between items-center p-2.5 md:p-3 rounded-2xl border transition-all ${
                isEmpty 
                  ? 'bg-gray-50/50 border-gray-300 opacity-40' 
                  : idx === 0 
                    ? 'bg-yellow-50 border-yellow-200 ring-4 ring-yellow-100' 
                    : 'bg-white border-gray-200 hover:border-purple-200'
              }`}
            >
              <div className="flex items-center gap-5">
                <span className={`text-sm font-black w-7 h-7 flex items-center justify-center rounded-full ${
                  isEmpty 
                    ? 'bg-gray-100 text-gray-300' 
                    : idx === 0 
                      ? 'bg-yellow-400 text-white' 
                      : idx === 1 
                        ? 'bg-gray-300 text-white' 
                        : idx === 2 
                          ? 'bg-orange-300 text-white' 
                          : 'bg-gray-100 text-gray-400'
                }`}>
                  {idx + 1}
                </span>
                <div className="text-left">
                  <p className={`font-bold text-gray-900 ${isEmpty ? 'text-gray-500' : 'text-base'}`}>{entry.playerName}</p>
                  {!isEmpty && <p className="text-[9px] text-gray-700">{entry.date}</p>}
                </div>
              </div>
              <div className="text-right">
                <p className={`font-black ${isEmpty ? 'text-gray-200 text-lg' : 'text-xl text-purple-600'}`}>{entry.score}</p>
                {!isEmpty && <p className="text-[7px] text-gray-400 uppercase font-bold tracking-widest">Points</p>}
              </div>
            </div>
          );
        })}
      </div>

      {onDownload && (
        <div className="mt-6 pt-8 border-t border-gray-100">
          <button 
            onClick={onDownload}
            className="w-0 flex items-center justify-center gap-0 bg-purple-50 hover:bg-purple-100 text-purple-600 font-bold rounded-xl transition border border-purple-100 text-sm"
          >
            
          </button>
          <p className="text-[8px] text-gray-400 text-center mt-2 uppercase font-bold tracking-widest"></p>
        </div>
      )}
    </div>
  );
};

export default Leaderboard;
