import React, { useState, useEffect } from 'react';
import { GameStats, LeaderboardEntry } from '../types';
import Leaderboard from './Leaderboard';

interface ResultProps {
  stats: GameStats;
  leaderboard: LeaderboardEntry[];
  onReplay: () => void;
  onHome: () => void;
}

const Result: React.FC<ResultProps> = ({ stats, leaderboard, onReplay, onHome }) => {
  const [isMixing, setIsMixing] = useState(true);
  const [juiceLevel, setJuiceLevel] = useState(0);
  const [hasExploded, setHasExploded] = useState(false);
  const [showFinalResults, setShowFinalResults] = useState(false);

  const hasBomb = stats.collectedFruitTypes.some(f => f.isBomb);
  const isEmpty = stats.fruitsCollected === 0;

  const getChefComment = () => {
    if (stats.wasBlasted) return "That was a explosive disaster! 💣";
    if (isEmpty) return "Don't keep container empty! You need fruits for juice! 🥤";
    if (stats.matchPercentage >= 100) return "Magnificent! A 100% perfect blend! 🌟";
    if (stats.matchPercentage >= 80) return "Outstanding! Almost a perfect match! 💎";
    if (stats.matchPercentage >= 60) return "Great job! That's a very tasty mix! 😋";
    if (stats.matchPercentage >= 40) return "Not bad! You're getting the hang of it! 👍";
    if (stats.matchPercentage >= 20) return "A good start! Try to catch more target fruits! 🍹";
    if (stats.matchPercentage > 0) return "Every fruit counts! Keep practicing! 🥤";
    if (stats.score > 150) return "Wow! That's a premium high-energy mix! ⚡";
    return "A refreshing blend! Keep mixing! 🍹";
  };

  useEffect(() => {
    if (isMixing) {
      const mixingDuration = 3000;
      const intervalTime = 50;
      const steps = mixingDuration / intervalTime;
      const increment = 85 / steps;

      const interval = setInterval(() => {
        let shouldExplode = false;
        setJuiceLevel(prev => {
          const next = prev + increment;
          if (hasBomb && next > 40 && !hasExploded) {
            shouldExplode = true;
            return prev;
          }
          return Math.min(next, 85);
        });

        if (shouldExplode) {
          setHasExploded(true);
          clearInterval(interval);
          setTimeout(() => {
            setIsMixing(false);
            setShowFinalResults(true);
          }, 1000);
        }
      }, intervalTime);

      const timer = setTimeout(() => {
        if (!hasBomb) {
          setIsMixing(false);
          setShowFinalResults(true);
        }
      }, mixingDuration);
      
      return () => {
        clearTimeout(timer);
        clearInterval(interval);
      };
    }
  }, [isMixing, hasBomb, hasExploded]);

  const downloadLeaderboard = () => {
    const dataStr = JSON.stringify(leaderboard, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'fruit_mixer_leaderboard.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (isMixing || (hasBomb && hasExploded && !showFinalResults)) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-6 transition-colors duration-500 ${hasExploded ? 'bg-red-600' : 'bg-sky-50'} relative overflow-hidden`}>
        {hasExploded && (
          <div className="absolute inset-0 z-50 flex items-center justify-center animate-ping">
            <div className="text-[20rem]">💥</div>
          </div>
        )}
        
        <div className="z-10 text-center">
          <h2 className={`text-4xl font-black mb-8 animate-pulse ${hasExploded ? 'text-white' : 'text-orange-600'}`}>
            {hasExploded ? 'KABOOOOM!!!' : isEmpty ? 'WAITING FOR FRUITS...' : 'MIXING YOUR JUICE...'}
          </h2>
          
          <div className={`relative flex flex-col items-center ${hasExploded ? 'scale-150 rotate-12' : ''} transition-transform duration-300`}>
            <div className={`relative w-48 h-64 bg-white/40 border-4 border-gray-400 rounded-b-3xl backdrop-blur-sm overflow-hidden flex items-end justify-center ${!hasExploded && !isEmpty ? 'shake' : 'animate-bounce'}`}>
               {!hasExploded && stats.collectedFruitTypes.map((f, i) => {
                  const fallDelay = i * 0.2;
                  return (
                    <div 
                      key={`mixing-${i}`}
                      className={`absolute text-5xl ${juiceLevel > 10 ? 'swirl' : 'animate-bounce'}`}
                      style={{
                        left: `${20 + (i * 15) % 60}%`,
                        top: juiceLevel > 10 ? 'auto' : `-${100 + i * 80}px`,
                        bottom: juiceLevel > 10 ? `${10 + (i * 8) % 40}%` : 'auto',
                        animationDelay: juiceLevel > 10 ? '0s' : `${fallDelay}s`,
                        animationDuration: juiceLevel > 10 ? '0.6s' : '1.2s',
                        zIndex: 25,
                        opacity: juiceLevel > 60 ? 0.4 : 1,
                        transition: 'opacity 1s ease-in-out, top 0.5s ease-in'
                      }}
                    >
                      {f.emoji}
                    </div>
                  );
               })}

               <div 
                 className="w-full absolute bottom-0 left-0 right-0 z-0"
                 style={{ 
                   height: `${juiceLevel}%`, 
                   backgroundColor: hasExploded ? '#000' : stats.juiceColor,
                   opacity: 0.8
                 }}
               >
                 {!hasExploded && (
                   <div className="w-full h-full opacity-30 bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')] animate-spin" style={{animationDuration: '0.5s'}}></div>
                 )}
               </div>
               
               <div className={`absolute bottom-4 w-24 h-3 bg-gray-600 rounded-full z-20 ${!hasExploded ? 'animate-spin' : ''}`} style={{animationDuration: '0.1s'}}></div>

               {!hasExploded && !isEmpty && isMixing && Array.from({ length: 8 }).map((_, i) => (
                  <div 
                    key={`splatter-${i}`}
                    className="absolute w-3 h-3 rounded-full animate-ping"
                    style={{
                      backgroundColor: stats.juiceColor,
                      left: `${20 + Math.random() * 60}%`,
                      bottom: `${juiceLevel - 10 + Math.random() * 20}%`,
                      animationDelay: `${i * 0.1}s`,
                      opacity: 0.6,
                      zIndex: 15
                    }}
                  />
               ))}
            </div>
            <div className="w-56 h-14 bg-gray-800 rounded-t-xl -mt-2 shadow-2xl border-t border-gray-600"></div>
          </div>
          
          {!hasExploded && (
            <p className="mt-8 text-xl font-bold text-gray-600 italic">
              {isEmpty ? "Don't keep container empty!" : `Blending ${stats.fruitsCollected} fresh items!`}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-4 ${stats.wasBlasted ? 'bg-red-100' : 'bg-amber-50'} relative overflow-y-auto`}>
       <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-10 left-10 text-4xl animate-bounce">🍎</div>
          <div className="absolute top-10 right-20 text-4xl animate-bounce">🍇</div>
          <div className="absolute bottom-20 right-20 text-4xl animate-bounce delay-100">🍌</div>
          <div className="absolute bottom-20 left-10 text-4xl animate-bounce delay-200">🍓</div>
       </div>

      <div className="w-full max-w-[1400px] z-10 grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
        {/* Left Column: Results */}
        <div className="bg-white p-6 md:p-8 rounded-3xl shadow-2xl text-center border-4 border-purple-100 h-full flex flex-col justify-between">
          {stats.wasBlasted ? (
            <div className="mb-4">
              <h2 className="text-3xl font-black text-red-600 mb-1">BOOM! 💥</h2>
              <p className="text-gray-600 italic font-bold mb-2 text-sm">{getChefComment()}</p>
            </div>
          ) : (
            <>
              <h2 className="text-3xl font-bold text-gray-800 mb-1">
                {isEmpty ? "Empty Cup!" : "Time's Up!"}
              </h2>
              <p className="text-gray-500 mb-2 text-sm">
                {isEmpty ? "You didn't catch anything!" : "Here is your fresh juice mix"}
              </p>
              
              <div className={`mb-4 p-2 rounded-2xl border-2 ${stats.matchPercentage >= 100 ? 'bg-green-50 border-green-200' : stats.matchPercentage > 0 ? 'bg-orange-50 border-orange-200' : 'bg-red-50 border-red-200'}`}>
                <p className="text-[10px] font-bold uppercase text-gray-400">Goal: {stats.goalFruitName} Shake</p>
                <div className="flex items-center justify-center gap-2 mt-0.5">
                  <div className="w-full bg-gray-200 rounded-full h-2 max-w-[120px]">
                    <div 
                      className={`h-2 rounded-full transition-all duration-1000 ${stats.matchPercentage >= 100 ? 'bg-green-500' : 'bg-orange-500'}`} 
                      style={{ width: `${stats.matchPercentage}%` }}
                    ></div>
                  </div>
                  <span className={`text-base font-black ${stats.matchPercentage >= 100 ? 'text-green-600' : 'text-orange-600'}`}>
                    {stats.matchPercentage}% Match
                  </span>
                </div>
                <p className={`text-xs font-bold mt-0.5 ${stats.matchPercentage >= 100 ? 'text-green-600' : 'text-orange-600'}`}>
                  {stats.matchPercentage >= 100 ? '✨ Perfect Recipe!' : stats.matchPercentage > 50 ? '👍 Almost there!' : stats.matchPercentage > 0 ? '🥤 Needs more fruit!' : '❌ Missed the target!'}
                </p>
              </div>
              
              <p className="text-orange-600 font-bold italic mb-4 text-sm">"{getChefComment()}"</p>
            </>
          )}

          <div className="flex justify-center mb-4">
              <div className={`relative w-24 h-36 rounded-b-3xl border-4 border-gray-300 bg-white overflow-hidden ${stats.wasBlasted ? 'opacity-20 grayscale' : ''}`}>
                  <div 
                      className="absolute bottom-0 left-0 right-0 transition-all duration-1000"
                      style={{ 
                          height: '85%', 
                          backgroundColor: stats.juiceColor || '#f3f4f6',
                          opacity: 0.8
                      }}
                  >
                      <div className="absolute bottom-2 left-2 w-2 h-2 bg-white rounded-full opacity-50 animate-ping"></div>
                      <div className="absolute bottom-6 right-4 w-3 h-3 bg-white rounded-full opacity-50 animate-pulse"></div>
                      <div className="absolute top-10 left-1/2 w-4 h-4 bg-white rounded-full opacity-30"></div>
                  </div>
                  <div className="absolute -top-10 right-4 w-4 h-64 bg-stripes rotate-12 border-l border-r border-gray-200" style={{backgroundImage: 'linear-gradient(45deg, #ff0000 25%, #ffffff 25%, #ffffff 50%, #ff0000 50%, #ff0000 75%, #ffffff 75%, #ffffff 100%)', backgroundSize: '20px 20px'}}></div>
              </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-orange-50 p-3 rounded-xl">
                  <p className="text-[10px] text-gray-500 uppercase font-bold">Total Score</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.score}</p>
              </div>
              <div className="bg-purple-50 p-3 rounded-xl">
                  <p className="text-[10px] text-gray-500 uppercase font-bold">Fruits</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.fruitsCollected}</p>
              </div>
          </div>

          <div className="flex flex-col gap-2">
              <button 
                  onClick={onReplay}
                  className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-xl shadow-md transition transform hover:-translate-y-1 text-lg"
              >
                  Play Again 🔄
              </button>
              <button 
                  onClick={onHome}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2 px-6 rounded-xl transition text-sm"
              >
                  Home 🏠
              </button>
          </div>
        </div>

        {/* Right Column: Leaderboard */}
        <Leaderboard 
          leaderboard={leaderboard} 
          onDownload={downloadLeaderboard} 
        />
      </div>
    </div>
  );
};

export default Result;