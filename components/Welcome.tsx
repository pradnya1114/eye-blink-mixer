import React, { useState } from 'react';
import { LeaderboardEntry } from '../types';

interface WelcomeProps {
  onStart: (name: string) => void;
  leaderboard: LeaderboardEntry[];
}

const Welcome: React.FC<WelcomeProps> = ({ onStart, leaderboard }) => {
  const [name, setName] = useState('');

  const handleStart = () => {
    if (name.trim()) {
      onStart(name.trim());
    } else {
      alert('Please enter your name to start!');
    }
  };

  const downloadLeaderboard = () => {
    if (leaderboard.length === 0) {
      alert('No leaderboard data to download!');
      return;
    }
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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden bg-sky-50">
      {/* Decorative Background Blobs */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-yellow-300 opacity-30 blob-shape blur-xl -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-red-300 opacity-30 blob-shape blur-xl translate-x-1/3 translate-y-1/3"></div>

      <div className="z-10 text-center max-w-[800px] w-full bg-white/80 backdrop-blur-md p-8 rounded-3xl shadow-xl border-4 border-orange-200">
        <h1 className="text-4xl md:text-5xl font-bold mb-6 text-orange-600 tracking-tight">
          Eye Blink <br />
          <span className="text-purple-600">Fruit Mixer</span>
        </h1>
        
        <div className="mb-6">
          <label htmlFor="playerName" className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">
            Enter Your Name
          </label>
          <input
            id="playerName"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name...."
            className="w-full px-4 py-3 rounded-xl border-2 border-orange-200 focus:border-orange-500 focus:outline-none text-center text-lg font-bold text-gray-700 shadow-inner"
            maxLength={15}
          />
        </div>

        <div className="space-y-4 mb-8">
          <div className="flex items-center justify-start bg-blue-50 p-4 rounded-xl">
            <span className="text-3xl mr-4">😉</span>
            <div className="text-left">
              <p className="font-bold text-gray-800">Single Blink</p>
              <p className="text-sm text-gray-600">Catch the fruits!</p>
            </div>
          </div>
          
          <div className="flex items-center justify-start bg-pink-50 p-4 rounded-xl">
            <span className="text-3xl mr-4">🧺</span>
            <div className="text-left">
              <p className="font-bold text-gray-800">Fill the Boxes</p>
              <p className="text-sm text-gray-600">Collect 10 fruits to start the mixer!</p>
            </div>
          </div>

          <div className="flex items-center justify-start bg-red-50 p-4 rounded-xl">
            <span className="text-3xl mr-4">💣</span>
            <div className="text-left">
              <p className="font-bold text-gray-800">Avoid Bombs!</p>
              <p className="text-sm text-gray-600">Don't catch the bombs or it's game over!</p>
            </div>
          </div>
        </div>

        <button 
          onClick={handleStart}
          className="w-full bg-gradient-to-r from-orange-500 to-pink-500 text-white font-bold py-4 px-8 rounded-full text-xl shadow-lg transform transition hover:scale-105 hover:shadow-2xl active:scale-95 ring-4 ring-orange-200"
        >
          START GAME
        </button>
        
        <p className="mt-4 text-xs text-gray-500">Camera access required for eye tracking.</p>

        {leaderboard.length > 0 && (
          <button 
            onClick={downloadLeaderboard}
            className="mt-8 text-xs font-bold text-purple-400 hover:text-purple-600 uppercase tracking-widest flex items-center justify-center gap-2 mx-auto transition"
          >
            
          </button>
        )}
      </div>
    </div>
  );
};

export default Welcome;