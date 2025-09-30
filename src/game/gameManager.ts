import { GameState, Player, Coordinate, ShotResult, RoomInfo } from '../models/types';
import { createEmptyBoard, autoPlaceFleet, processShot, areAllShipsSunk } from './board';
import { MAX_PLAYERS, MIN_PLAYERS } from '../config/ships';

export class GameManager {
  private games: Map<string, GameState> = new Map();

  createGame(roomId: string): GameState {
    const game: GameState = {
      id: roomId,
      players: [],
      currentPlayerIndex: 0,
      status: 'waiting',
      createdAt: Date.now()
    };

    this.games.set(roomId, game);
    return game;
  }

  getGame(roomId: string): GameState | undefined {
    return this.games.get(roomId);
  }

  addPlayer(roomId: string, playerId: string, name: string, country: string, isBot: boolean = false): Player | null {
    const game = this.games.get(roomId);
    if (!game) return null;

    if (game.players.length >= MAX_PLAYERS) return null;
    if (game.status !== 'waiting') return null;

    // Check if player already in game
    if (game.players.some(p => p.id === playerId)) return null;

    const player: Player = {
      id: playerId,
      name,
      country,
      board: createEmptyBoard(),
      isBot,
      ready: false,
      isAlive: true,
      shotsTaken: 0,
      shotsHit: 0
    };

    game.players.push(player);
    return player;
  }

  removePlayer(roomId: string, playerId: string): boolean {
    const game = this.games.get(roomId);
    if (!game) return false;

    const index = game.players.findIndex(p => p.id === playerId);
    if (index === -1) return false;

    game.players.splice(index, 1);

    // If game is active and player was removed, mark them as eliminated
    if (game.status === 'active' && game.players.length > 0) {
      this.checkWinCondition(roomId);
    }

    // Delete empty games
    if (game.players.length === 0) {
      this.games.delete(roomId);
    }

    return true;
  }

  setPlayerReady(roomId: string, playerId: string, ready: boolean): boolean {
    const game = this.games.get(roomId);
    if (!game || game.status !== 'waiting') return false;

    const player = game.players.find(p => p.id === playerId);
    if (!player) return false;

    player.ready = ready;
    return true;
  }

  canStartGame(roomId: string): boolean {
    const game = this.games.get(roomId);
    if (!game || game.status !== 'waiting') return false;
    if (game.players.length < MIN_PLAYERS) return false;

    return game.players.every(p => p.ready);
  }

  startGame(roomId: string): boolean {
    const game = this.games.get(roomId);
    if (!game || !this.canStartGame(roomId)) return false;

    // Auto-place ships for all players
    for (const player of game.players) {
      autoPlaceFleet(player.board, player.country);
    }

    game.status = 'active';
    game.currentPlayerIndex = 0;
    return true;
  }

  executeShot(roomId: string, shooterId: string, targetId: string, coord: Coordinate): ShotResult | null {
    const game = this.games.get(roomId);
    if (!game || game.status !== 'active') return null;

    const currentPlayer = game.players[game.currentPlayerIndex];
    if (!currentPlayer || currentPlayer.id !== shooterId) return null;

    const targetPlayer = game.players.find(p => p.id === targetId);
    if (!targetPlayer || !targetPlayer.isAlive) return null;

    // Can't shoot yourself
    if (shooterId === targetId) return null;

    try {
      const shotResult = processShot(targetPlayer.board, coord);

      currentPlayer.shotsTaken++;
      if (shotResult.hit) {
        currentPlayer.shotsHit++;
      }

      const result: ShotResult = {
        hit: shotResult.hit,
        sunk: !!shotResult.sunkShip,
        shipName: shotResult.sunkShip?.name,
        eliminated: false,
        playerName: targetPlayer.name
      };

      // Check if target is eliminated
      if (areAllShipsSunk(targetPlayer.board)) {
        targetPlayer.isAlive = false;
        result.eliminated = true;
      }

      // Check win condition
      this.checkWinCondition(roomId);

      // Move to next player
      this.advanceToNextPlayer(roomId);

      return result;
    } catch (error) {
      return null;
    }
  }

  private advanceToNextPlayer(roomId: string): void {
    const game = this.games.get(roomId);
    if (!game || game.status !== 'active') return;

    const alivePlayers = game.players.filter(p => p.isAlive);
    if (alivePlayers.length <= 1) return;

    // Find next alive player
    let nextIndex = (game.currentPlayerIndex + 1) % game.players.length;
    let attempts = 0;

    while (!game.players[nextIndex].isAlive && attempts < game.players.length) {
      nextIndex = (nextIndex + 1) % game.players.length;
      attempts++;
    }

    game.currentPlayerIndex = nextIndex;
  }

  private checkWinCondition(roomId: string): void {
    const game = this.games.get(roomId);
    if (!game || game.status !== 'active') return;

    const alivePlayers = game.players.filter(p => p.isAlive);

    if (alivePlayers.length === 1) {
      game.status = 'finished';
      game.winnerId = alivePlayers[0].id;
    } else if (alivePlayers.length === 0) {
      // Edge case: all eliminated simultaneously
      game.status = 'finished';
    }
  }

  getCurrentPlayer(roomId: string): Player | undefined {
    const game = this.games.get(roomId);
    if (!game) return undefined;
    return game.players[game.currentPlayerIndex];
  }

  getRoomInfo(roomId: string): RoomInfo | null {
    const game = this.games.get(roomId);
    if (!game) return null;

    return {
      id: game.id,
      players: game.players.map(p => ({
        id: p.id,
        name: p.name,
        country: p.country,
        isBot: p.isBot,
        ready: p.ready
      })),
      status: game.status,
      maxPlayers: MAX_PLAYERS
    };
  }

  getAllRooms(): RoomInfo[] {
    return Array.from(this.games.values())
      .filter(g => g.status === 'waiting')
      .map(g => this.getRoomInfo(g.id)!)
      .filter(r => r !== null);
  }

  deleteGame(roomId: string): void {
    this.games.delete(roomId);
  }
}