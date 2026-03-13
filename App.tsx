import React, { useState, useEffect } from 'react';
import Welcome from './components/Welcome';
import Game from './components/Game';
import Result from './components/Result';
import { AppState, GameStats, LeaderboardEntry } from './types';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.HOME);
  const [playerName, setPlayerName] = useState('');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [allEntries, setAllEntries] = useState<LeaderboardEntry[]>([]);
  const [lastStats, setLastStats] = useState<GameStats>({ 
    score: 0, 
    fruitsCollected: 0, 
    collectedFruitTypes: [],
    juiceColor: '#fff',
    goalMet: false,
    matchPercentage: 0,
    goalFruitName: ''
  });

  // Load data from localStorage on mount
  useEffect(() => {
    const savedLeaderboard = localStorage.getItem('fruit_mixer_leaderboard');
    if (savedLeaderboard) {
      try {
        setLeaderboard(JSON.parse(savedLeaderboard));
      } catch (e) {
        console.error("Failed to parse leaderboard", e);
      }
    }

    const savedAllEntries = localStorage.getItem('fruit_mixer_all_entries');
    if (savedAllEntries) {
      try {
        setAllEntries(JSON.parse(savedAllEntries));
      } catch (e) {
        console.error("Failed to parse all entries", e);
      }
    }
  }, []);

  // Global key listener for '1' to download all data
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '1') {
        const savedAllEntries = localStorage.getItem('fruit_mixer_all_entries');
        const entriesToDownload = savedAllEntries ? JSON.parse(savedAllEntries) : allEntries;
        
        if (entriesToDownload.length === 0) {
          console.log('No data to download');
          return;
        }

        const dataStr = JSON.stringify(entriesToDownload, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `fruit_mixer_all_data_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        console.log('All data downloaded');
        } else if (e.key === '2') {
        // Clear only the visible leaderboard state for the current session
        // Data is NOT removed from localStorage as requested
        setLeaderboard([]);
        console.log('Leaderboard cleared from view');
        alert('Leaderboard cleared from view! (Data remains in storage and will return on refresh)');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [allEntries]);

  const handleStartGame = (name: string) => {
    setPlayerName(name);
    setAppState(AppState.GAME);
  };

  const handleGameOver = (stats: GameStats) => {
    setLastStats(stats);
    
    // Create new entry
    const newEntry: LeaderboardEntry = {
      playerName: playerName || 'Anonymous',
      score: stats.score,
      date: new Date().toLocaleString() // Use full string for more detail
    };
    
    // Update top 10 leaderboard
    const updatedLeaderboard = [...leaderboard, newEntry]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
      
    setLeaderboard(updatedLeaderboard);
    localStorage.setItem('fruit_mixer_leaderboard', JSON.stringify(updatedLeaderboard));

    // Update all entries (no limit)
    const updatedAllEntries = [...allEntries, newEntry];
    setAllEntries(updatedAllEntries);
    localStorage.setItem('fruit_mixer_all_entries', JSON.stringify(updatedAllEntries));
    
    setAppState(AppState.RESULT);
  };

  const handleReplay = () => {
    setAppState(AppState.GAME);
  };

  const handleHome = () => {
    setAppState(AppState.HOME);
  };

  return (
    <div className="antialiased">
      {appState === AppState.HOME && <Welcome onStart={handleStartGame} leaderboard={leaderboard} />}
      {appState === AppState.GAME && <Game onGameOver={handleGameOver} />}
      {appState === AppState.RESULT && (
        <Result 
          stats={lastStats} 
          leaderboard={leaderboard}
          onReplay={handleReplay} 
          onHome={handleHome} 
        />
      )}
    </div>
  );
};

export default App;