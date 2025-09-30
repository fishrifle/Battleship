import { ShipDefinition } from '../config/ships';

export type CellState = 'empty' | 'ship' | 'hit' | 'miss';

export interface Coordinate {
  x: number;
  y: number;
}

export interface Ship {
  id: string;
  name: string;
  length: number;
  coords: Coordinate[];
  hits: number;
}

export interface Board {
  cells: CellState[][];
  ships: Ship[];
}

export interface Player {
  id: string;
  name: string;
  country: string;
  board: Board;
  isBot: boolean;
  ready: boolean;
  isAlive: boolean;
  shotsTaken: number;
  shotsHit: number;
}

export type GameStatus = 'waiting' | 'active' | 'finished';

export interface GameState {
  id: string;
  players: Player[];
  currentPlayerIndex: number;
  status: GameStatus;
  winnerId?: string;
  createdAt: number;
}

export interface ShotResult {
  hit: boolean;
  sunk: boolean;
  shipName?: string;
  eliminated: boolean;
  playerName?: string;
}

export interface RoomInfo {
  id: string;
  players: Array<{ id: string; name: string; country: string; isBot: boolean; ready: boolean }>;
  status: GameStatus;
  maxPlayers: number;
}