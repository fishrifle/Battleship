import { Coordinate, Player, Board } from '../models/types';
import { BOARD_SIZE, isValidCoordinate } from './board';

interface HuntTarget {
  coord: Coordinate;
  direction?: 'horizontal' | 'vertical';
}

export class CPUPlayer {
  private lastHits: Map<string, Coordinate[]> = new Map(); // targetPlayerId -> recent hits
  private huntQueue: Map<string, HuntTarget[]> = new Map(); // targetPlayerId -> coords to try

  /**
   * Simple AI strategy:
   * 1. If we have recent hits (hunt mode), try adjacent cells
   * 2. Otherwise, random firing with slight bias toward checkerboard pattern
   */
  selectTarget(targets: Player[], ownId: string): { targetId: string; coord: Coordinate } | null {
    const aliveTargets = targets.filter(p => p.isAlive && p.id !== ownId);
    if (aliveTargets.length === 0) return null;

    // Try hunt mode first for each target
    for (const target of aliveTargets) {
      const huntResult = this.tryHuntMode(target);
      if (huntResult) {
        return { targetId: target.id, coord: huntResult };
      }
    }

    // Fall back to random mode
    const randomTarget = aliveTargets[Math.floor(Math.random() * aliveTargets.length)];
    const coord = this.selectRandomCoord(randomTarget.board);

    if (coord) {
      return { targetId: randomTarget.id, coord };
    }

    return null;
  }

  /**
   * Record result of a shot for learning
   */
  recordShot(targetId: string, coord: Coordinate, hit: boolean, sunk: boolean): void {
    if (hit && !sunk) {
      // Add to recent hits
      const hits = this.lastHits.get(targetId) || [];
      hits.push(coord);
      this.lastHits.set(targetId, hits);

      // Generate adjacent hunt targets
      this.generateHuntTargets(targetId, coord);
    } else if (sunk) {
      // Clear hunt data for this target since ship is sunk
      this.lastHits.delete(targetId);
      this.huntQueue.delete(targetId);
    }
  }

  /**
   * Try to shoot adjacent to recent hits (hunt mode)
   */
  private tryHuntMode(target: Player): Coordinate | null {
    const queue = this.huntQueue.get(target.id) || [];

    while (queue.length > 0) {
      const huntTarget = queue.shift()!;
      const cell = target.board.cells[huntTarget.coord.y][huntTarget.coord.x];

      if (cell === 'empty' || cell === 'ship') {
        // Valid target
        this.huntQueue.set(target.id, queue);
        return huntTarget.coord;
      }
    }

    this.huntQueue.delete(target.id);
    return null;
  }

  /**
   * Generate adjacent coordinates to hunt after a hit
   */
  private generateHuntTargets(targetId: string, hitCoord: Coordinate): void {
    const queue = this.huntQueue.get(targetId) || [];
    const hits = this.lastHits.get(targetId) || [];

    // If we have multiple hits, try to determine direction
    if (hits.length >= 2) {
      const last = hits[hits.length - 1];
      const prev = hits[hits.length - 2];

      if (last.x === prev.x) {
        // Vertical pattern
        this.addIfValid(queue, { x: last.x, y: last.y + 1 });
        this.addIfValid(queue, { x: last.x, y: last.y - 1 });
      } else if (last.y === prev.y) {
        // Horizontal pattern
        this.addIfValid(queue, { x: last.x + 1, y: last.y });
        this.addIfValid(queue, { x: last.x - 1, y: last.y });
      }
    } else {
      // First hit, add all 4 directions
      this.addIfValid(queue, { x: hitCoord.x + 1, y: hitCoord.y });
      this.addIfValid(queue, { x: hitCoord.x - 1, y: hitCoord.y });
      this.addIfValid(queue, { x: hitCoord.x, y: hitCoord.y + 1 });
      this.addIfValid(queue, { x: hitCoord.x, y: hitCoord.y - 1 });
    }

    this.huntQueue.set(targetId, queue);
  }

  private addIfValid(queue: HuntTarget[], coord: Coordinate): void {
    if (isValidCoordinate(coord)) {
      // Avoid duplicates
      if (!queue.some(ht => ht.coord.x === coord.x && ht.coord.y === coord.y)) {
        queue.push({ coord });
      }
    }
  }

  /**
   * Select random untargeted coordinate with checkerboard bias
   */
  private selectRandomCoord(board: Board): Coordinate | null {
    const available: Coordinate[] = [];

    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        const cell = board.cells[y][x];
        if (cell === 'empty' || cell === 'ship') {
          available.push({ x, y });
        }
      }
    }

    if (available.length === 0) return null;

    // Bias toward checkerboard pattern (better coverage)
    const checkerboard = available.filter(c => (c.x + c.y) % 2 === 0);
    const pool = checkerboard.length > 0 ? checkerboard : available;

    return pool[Math.floor(Math.random() * pool.length)];
  }

  /**
   * Clear all state for a specific target (e.g., if they disconnect)
   */
  clearTarget(targetId: string): void {
    this.lastHits.delete(targetId);
    this.huntQueue.delete(targetId);
  }
}