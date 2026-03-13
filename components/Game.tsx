import React, { useEffect, useRef, useState, useCallback } from 'react';
import { detectBlink, initializeFaceLandmarker } from '../services/visionService';
import { Fruit, FRUIT_TYPES, GameStats, FruitType, ObstacleType, BOMB_TYPE, ShakeGoal } from '../types';

interface GameProps {
  onGameOver: (stats: GameStats) => void;
}

// Adjusted Thresholds
const BLINK_THRESHOLD = 0.5; // Increased to 0.5 to make it easier to register a blink
const DOUBLE_BLINK_TIME = 500; // ms window for double blink
const GAME_DURATION = 60; // seconds

const Game: React.FC<GameProps> = ({ onGameOver }) => {
  // UI State
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{text: string, id: number} | null>(null);
  const [pendingCount, setPendingCount] = useState(0); 
  const [isFaceDetected, setIsFaceDetected] = useState(false); // New: Track face status
  const [currentGoal, setCurrentGoal] = useState<ShakeGoal | null>(null);
  const currentGoalRef = useRef<ShakeGoal | null>(null);
  const [showGoalOverlay, setShowGoalOverlay] = useState(true);
  
  const showGoalOverlayRef = useRef(true);
  const inventoryRef = useRef<(FruitType | null)[]>(new Array(10).fill(null));

  // Visual state for fruits sitting in the boxes
  const [inventory, setInventory] = useState<(FruitType | null)[]>(new Array(10).fill(null));

  // Refs for Game Logic
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const fruitsRef = useRef<Fruit[]>([]);
  const lastSpawnRef = useRef<number>(0);
  const scoreRef = useRef(0);
  const collectedFruitsCountRef = useRef(0);
  
  const mixColorRef = useRef<{r: number, g: number, b: number}>({r: 255, g: 255, b: 255});
  
  // Blink Detection Logic Refs
  const blinkStateRef = useRef<{
    lastBlinkTime: number;
    blinkCount: number;
    isEyesClosed: boolean;
  }>({ lastBlinkTime: 0, blinkCount: 0, isEyesClosed: false });

  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 255, g: 255, b: 255 };
  };

  // Helper to add fruit to inventory when it arrives
  const addFruitToInventory = (fruitType: FruitType) => {
    const nextInventory = [...inventoryRef.current];
    const emptyIndex = nextInventory.findIndex(item => item === null);
    if (emptyIndex !== -1) {
      nextInventory[emptyIndex] = fruitType;
      inventoryRef.current = nextInventory;
      setInventory(nextInventory);

      // Update mix color
      const fruitRgb = hexToRgb(fruitType.color);
      const collectedCount = nextInventory.filter(i => i !== null).length;
      if (collectedCount === 1) {
        mixColorRef.current = fruitRgb;
      } else {
        mixColorRef.current = {
          r: (mixColorRef.current.r * (collectedCount - 1) + fruitRgb.r) / collectedCount,
          g: (mixColorRef.current.g * (collectedCount - 1) + fruitRgb.g) / collectedCount,
          b: (mixColorRef.current.b * (collectedCount - 1) + fruitRgb.b) / collectedCount,
        };
      }
    }
    
    setPendingCount(prev => prev + 1);
    
    // If inventory is full, finish game early
    if (nextInventory.filter(i => i !== null).length >= 10) {
      setTimeout(() => finishGame(), 500);
    }
  };

  // Helper to spawn a new fruit
  const spawnFruit = (canvasWidth: number) => {
    // 15% chance to spawn a bomb
    const isBomb = Math.random() < 0.15;
    let type: FruitType | ObstacleType;
    
    if (isBomb) {
      type = BOMB_TYPE;
    } else {
      // 25% chance to spawn the target fruit specifically, otherwise random
      const isTarget = Math.random() < 0.25;
      if (isTarget && currentGoalRef.current) {
        type = currentGoalRef.current.targetFruit;
      } else {
        type = FRUIT_TYPES[Math.floor(Math.random() * FRUIT_TYPES.length)];
      }
    }
    
    fruitsRef.current.push({
      id: Math.random().toString(),
      type,
      x: Math.random() * (canvasWidth - 60) + 30,
      y: -50,
      // Increased base speed from 2 to 3 for better flow
      // Constant speed for all fruits as requested
      speed: 4,
      scale: 1,
      isCollected: false
    });
  };

  // Initialize Game & Camera
  useEffect(() => {
    let timerInterval: ReturnType<typeof setInterval> | undefined;
    let loadTimeout: ReturnType<typeof setTimeout> | undefined;

    // Pick a random goal
    const randomFruit = FRUIT_TYPES[Math.floor(Math.random() * FRUIT_TYPES.length)];
    const goal = {
      targetFruit: randomFruit,
      description: `Make a ${randomFruit.name} Shake!`
    };
    setCurrentGoal(goal);
    currentGoalRef.current = goal;

    const startCamera = async () => {
      try {
        // Set a timeout to warn user if AI takes too long
        loadTimeout = setTimeout(() => {
          if (isLoading) {
             setLoadError("Loading is taking longer than expected. Check your internet connection.");
          }
        }, 10000);

        console.log("Starting initialization...");
        await initializeFaceLandmarker();
        console.log("Camera requesting...");
        // Increased resolution for better eye tracking
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          
          const startLogic = () => {
            console.log("Video loaded. Starting game loop.");
            setIsLoading(false);
            if (loadTimeout) clearTimeout(loadTimeout);
            
            // Ensure video is playing
            videoRef.current?.play().catch(e => console.error("Play error:", e));
            
            startGameLoop();
            
            // Start Timer
            timerInterval = setInterval(() => {
              setTimeLeft((prev) => {
                if (prev <= 1) {
                  clearInterval(timerInterval);
                  cancelAnimationFrame(requestRef.current);
                  finishGame();
                  return 0;
                }
                return prev - 1;
              });
            }, 1000);
          };

          // Robust check for video readiness
          if (videoRef.current.readyState >= 2) {
             startLogic();
          } else {
             videoRef.current.onloadeddata = startLogic;
          }
        }
      } catch (err) {
        console.error("Camera error:", err);
        setLoadError("Failed to access camera. Please allow permissions and reload.");
        if (loadTimeout) clearTimeout(loadTimeout);
      }
    };

    startCamera();

    return () => {
      cancelAnimationFrame(requestRef.current);
      if (timerInterval) clearInterval(timerInterval);
      if (loadTimeout) clearTimeout(loadTimeout);
      
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finishGame = (wasBlasted = false) => {
    const r = Math.round(mixColorRef.current.r);
    const g = Math.round(mixColorRef.current.g);
    const b = Math.round(mixColorRef.current.b);
    
     // Check if goal was met (percentage based on 10 fruits as requested, so 2 fruits = 20%)
    const collectedTypes = inventoryRef.current.filter((f): f is FruitType => f !== null);
    const targetFruitCount = collectedTypes.filter(f => f.name === currentGoalRef.current?.targetFruit.name).length;
    const matchPercentage = Math.min(100, targetFruitCount * 10);
    const goalMet = matchPercentage >= 50; // 5 fruits for a "success"

    onGameOver({
      score: scoreRef.current,
      fruitsCollected: collectedFruitsCountRef.current,
      collectedFruitTypes: collectedTypes,
      juiceColor: `rgb(${r},${g},${b})`,
      goalMet,
      matchPercentage,
      goalFruitName: currentGoalRef.current?.targetFruit.name || '',
      wasBlasted
    });
  };

  const showFeedback = (text: string) => {
    setFeedback({ text, id: Date.now() });
    setTimeout(() => setFeedback(null), 1000);
  };

  const handleSingleBlink = () => {
    if (showGoalOverlayRef.current) return;

    // Collect closest fruit - ONLY ABOVE THE LINE
    const catchLineY = window.innerHeight * 0.7; // Moved slightly higher as requested ("UPER")
    const activeFruits = fruitsRef.current.filter(f => !f.isCollected && f.y <= catchLineY && f.y >= catchLineY - 400);
    if (activeFruits.length > 0) {
      // Find fruit closest to the line from above (the one with the largest Y value)
      const target = activeFruits.reduce((prev, curr) => (prev.y > curr.y ? prev : curr));
      
      
      if ('isBomb' in target.type && target.type.isBomb) {
        target.isCollected = true;
        showFeedback("OH NO! 💣");
        return;
      }

      target.isCollected = true;
      
      // Bonus if it matches the goal
      const isGoalFruit = target.type.name === currentGoalRef.current?.targetFruit.name;
      const points = isGoalFruit ? target.type.score * 2 : target.type.score;
      
      scoreRef.current += points;
      collectedFruitsCountRef.current += 1;
      
      setScore(scoreRef.current);
      showFeedback(isGoalFruit ? `PERFECT! +${points}` : `Caught! +${points}`);
    } else {
      showFeedback(`Miss!`);
    }
  };

  const handleDoubleBlink = () => {
    if (showGoalOverlayRef.current) return;
    // Double blink is no longer used for mixing in-game
    showFeedback("Double Blink!");
  };

  const processBlinkLogic = (leftOpen: number, rightOpen: number) => {
    // BOTH eyes must be closed below threshold
    const eyesClosed = leftOpen < BLINK_THRESHOLD && rightOpen < BLINK_THRESHOLD;
    const now = Date.now();

    if (eyesClosed && !blinkStateRef.current.isEyesClosed) {
        blinkStateRef.current.isEyesClosed = true;
    } else if (!eyesClosed && blinkStateRef.current.isEyesClosed) {
        // Eyes just opened -> Blink detected
        blinkStateRef.current.isEyesClosed = false;
        blinkStateRef.current.blinkCount++;
        blinkStateRef.current.lastBlinkTime = now;

        // Debounce logic
        setTimeout(() => {
            if (blinkStateRef.current.blinkCount === 1) {
               // Waiting for potential second blink...
            } else if (blinkStateRef.current.blinkCount >= 2) {
               handleDoubleBlink();
               blinkStateRef.current.blinkCount = 0; 
            }
        }, 50); // Small initial delay

        setTimeout(() => {
             if (blinkStateRef.current.blinkCount === 1) {
                 handleSingleBlink();
                 blinkStateRef.current.blinkCount = 0;
             }
        }, DOUBLE_BLINK_TIME);
    }
  };

  const startGameLoop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const animate = (time: number) => {
      if (!canvasRef.current) return;
      
      // Handle resize
      if (canvasRef.current.width !== window.innerWidth || canvasRef.current.height !== window.innerHeight) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      // 1. Process Vision
      if (videoRef.current && !videoRef.current.paused && !videoRef.current.ended) {
        const result = detectBlink(videoRef.current);
        
        if (result.status === 'ok') {
          setIsFaceDetected(true);
          processBlinkLogic(result.leftOpen, result.rightOpen);
        } else if (result.status === 'no-face') {
          // Only explicitly set to false if the detector ran and found nothing
          setIsFaceDetected(false);
        }
        // If status is 'skipped' (frame didn't change), we preserve the previous state
        // This prevents flickering between True/False at high frame rates
      }

      // 2. Clear Canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

       // Draw Catch Line (Higher up)
      const catchY = canvas.height * 0.7;
      ctx.beginPath();
      ctx.setLineDash([15, 15]);
      ctx.strokeStyle = 'rgba(255, 165, 0, 0.5)';
      ctx.lineWidth = 4;
      ctx.moveTo(0, catchY);
      ctx.lineTo(canvas.width, catchY);
      ctx.stroke();
      ctx.setLineDash([]);

      
      if (showGoalOverlayRef.current) {
        requestRef.current = requestAnimationFrame(animate);
        return;
      }

      // 3. Spawn Fruits - Faster rate and multiple fruits
      // Base interval 900ms, gets faster. Every 5 fruits, spawn a burst.
      const spawnInterval = Math.max(900 - (collectedFruitsCountRef.current * 15), 600);
      
      if (time - lastSpawnRef.current > spawnInterval) { 
        spawnFruit(canvas.width);
        
        // Chance to spawn a second fruit simultaneously as difficulty increases
        if (collectedFruitsCountRef.current > 5 && Math.random() > 0.7) {
             setTimeout(() => spawnFruit(canvas.width), 200);
        }
        
        lastSpawnRef.current = time;
      }

      // 4. Update & Draw Fruits
      for (let i = fruitsRef.current.length - 1; i >= 0; i--) {
        const fruit = fruitsRef.current[i];
        
        if (fruit.isCollected) {
          // Fly to one of the boxes
          const emptyIndex = inventoryRef.current.findIndex(item => item === null);
          const isLeft = emptyIndex < 5;
          const boxX = isLeft ? 60 : canvas.width - 60;
          const boxY = 150 + (emptyIndex % 5) * 100;

          const dx = boxX - fruit.x;
          const dy = boxY - fruit.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 30) {
              addFruitToInventory(fruit.type as FruitType);
              fruitsRef.current.splice(i, 1);
              continue;
          }
          
          fruit.x += dx * 0.15;
          fruit.y += dy * 0.15;
          if (fruit.scale > 0.5) fruit.scale -= 0.05;

        } else {
          // Fall down
          fruit.y += fruit.speed;
          if (fruit.y > canvas.height) {
            fruitsRef.current.splice(i, 1);
            continue;
          }
        }

        // Draw
        ctx.font = `${90 * fruit.scale}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(fruit.type.emoji, fruit.x, fruit.y);
      }

      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative w-full h-screen bg-sky-50 overflow-hidden">
      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white">
          {loadError ? (
            <div className="text-center p-6">
              <div className="text-red-500 text-5xl mb-4">⚠️</div>
              <p className="text-xl font-bold text-red-600 mb-2">Error Loading Game</p>
              <p className="text-gray-600">{loadError}</p>
            </div>
          ) : (
            <>
              <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-orange-500 mb-4"></div>
              <p className="text-xl font-semibold text-gray-700">Loading AI Model...</p>
              <p className="text-sm text-gray-400 mt-2">Please allow camera access</p>
            </>
          )}
        </div>
      )}

      {/* Main Game Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 z-10" />

      {/* Goal Overlay */}
      {showGoalOverlay && currentGoal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white p-8 rounded-3xl shadow-2xl text-center border-8 border-orange-400 animate-in zoom-in duration-300">
            <h2 className="text-3xl font-black text-gray-800 mb-4 uppercase tracking-tighter">Today's Special</h2>
            <div className="text-8xl mb-4 animate-bounce">{currentGoal.targetFruit.emoji}</div>
            <p className="text-2xl font-bold text-orange-600 mb-6">{currentGoal.description}</p>
            <p className="text-sm text-gray-500 mb-8">Collect at least 3 {currentGoal.targetFruit.name}s!</p>
            <button 
              onClick={() => {
                showGoalOverlayRef.current = false;
                setShowGoalOverlay(false);
              }}
              className="bg-orange-500 hover:bg-orange-600 text-white font-black py-4 px-12 rounded-full text-xl shadow-xl transform transition hover:scale-105 active:scale-95"
            >
              LET'S MIX!
            </button>
          </div>
        </div>
      )}

      {/* Collection Boxes - Left */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-4">
        {[0, 1, 2, 3, 4].map(i => (
          <div key={`left-${i}`} className="w-16 h-16 bg-white/40 border-2 border-dashed border-gray-400 rounded-xl flex items-center justify-center text-3xl shadow-inner">
            {inventory[i]?.emoji}
          </div>
        ))}
      </div>

      {/* Collection Boxes - Right */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-4">
        {[5, 6, 7, 8, 9].map(i => (
          <div key={`right-${i}`} className="w-16 h-16 bg-white/40 border-2 border-dashed border-gray-400 rounded-xl flex items-center justify-center text-3xl shadow-inner">
            {inventory[i]?.emoji}
          </div>
        ))}
      </div>

      {/* Camera Feed & Status */}
      <div className="absolute top-4 right-4 z-30 w-32 md:w-48 overflow-hidden rounded-xl border-4 border-white shadow-lg bg-black">
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted 
          className="w-full h-full object-cover transform -scale-x-100" // Mirror flip
        />
        <div className={`absolute bottom-0 left-0 right-0 text-[10px] text-center py-1 font-bold ${isFaceDetected ? 'bg-green-500/80 text-white' : 'bg-red-500/80 text-white'}`}>
          {isFaceDetected ? "FACE DETECTED" : "NO FACE DETECTED"}
        </div>
      </div>

      {/* HUD: Score & Timer */}
      <div className="absolute top-4 left-4 z-30 flex gap-4">
        <div className="bg-white/90 backdrop-blur rounded-xl p-3 shadow-lg border-2 border-orange-100">
          <p className="text-xs text-gray-500 font-bold uppercase">Score</p>
          <p className="text-2xl font-bold text-orange-600">{score}</p>
        </div>
        <div className={`bg-white/90 backdrop-blur rounded-xl p-3 shadow-lg border-2 ${timeLeft < 10 ? 'border-red-500 animate-pulse' : 'border-blue-100'}`}>
          <p className="text-xs text-gray-500 font-bold uppercase">Time</p>
          <p className={`text-2xl font-bold ${timeLeft < 10 ? 'text-red-600' : 'text-blue-600'}`}>
            {timeLeft}s
          </p>
        </div>
      </div>

      {/* Feedback Popup */}
      {feedback && (
        <div key={feedback.id} className="absolute top-1/3 left-1/2 transform -translate-x-1/2 z-40 animate-bounce">
          <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-400 to-red-500 drop-shadow-md stroke-white">
            {feedback.text}
          </span>
        </div>
      )}

      {/* Blender / Mixer Area removed from game page as per request */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30">
        <div className={`bg-white/80 backdrop-blur px-6 py-2 rounded-full border-2 shadow-lg transition-colors duration-300 ${pendingCount === 0 && timeLeft < 50 ? 'border-red-500 animate-pulse' : 'border-orange-200'}`}>
          <p className={`text-sm font-bold ${pendingCount === 0 && timeLeft < 50 ? 'text-red-600' : 'text-orange-600'}`}>
            {pendingCount === 0 && timeLeft < 50 ? "Don't keep container empty! Catch some fruit!" : `Collect 10 fruits to start mixing! (${pendingCount}/10)`}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Game;