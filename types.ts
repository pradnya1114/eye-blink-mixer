export enum AppState {
  HOME = 'HOME',
  GAME = 'GAME',
  RESULT = 'RESULT'
}

export interface Fruit {
  id: string;
  type: FruitType | ObstacleType;
  x: number;
  y: number;
  speed: number;
  scale: number;
  isCollected: boolean; // If true, it is animating towards the blender
}

export interface FruitType {
  name: string;
  emoji: string;
  color: string; // Hex for juice mixing
  score: number;
  isBomb?: boolean;
}

export interface ObstacleType extends FruitType {
  isBomb: true;
}

export const FRUIT_TYPES: FruitType[] = [
  { name: 'Apple', emoji: '🍎', color: '#ff4d4d', score: 10 },
  { name: 'Banana', emoji: '🍌', color: '#ffe135', score: 15 },
  { name: 'Grapes', emoji: '🍇', color: '#6f2da8', score: 20 },
  { name: 'Orange', emoji: '🍊', color: '#ffa500', score: 15 },
  { name: 'Strawberry', emoji: '🍓', color: '#fc5a8d', score: 25 },
  { name: 'Watermelon', emoji: '🍉', color: '#ff6b6b', score: 30 },
];

export const BOMB_TYPE: ObstacleType = {
  name: 'Bomb',
  emoji: '💣',
  color: '#000000',
  score: 0,
  isBomb: true
};

export interface ShakeGoal {
  targetFruit: FruitType;
  description: string;
}

export interface GameStats {
  score: number;
  fruitsCollected: number;
  collectedFruitTypes: FruitType[];
  juiceColor: string;
  goalMet: boolean;
  matchPercentage: number;
  goalFruitName: string;
  wasBlasted?: boolean;
}

export interface LeaderboardEntry {
  playerName: string;
  score: number;
  date: string;
}
