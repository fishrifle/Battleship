import {
  createEmptyBoard,
  isValidCoordinate,
  canPlaceShip,
  placeShip,
  processShot,
  areAllShipsSunk
} from './board';
import { Coordinate } from '../models/types';
import { BOARD_SIZE } from '../config/ships';

describe('Board Functions', () => {
  describe('createEmptyBoard', () => {
    it('should create a 10x10 empty board', () => {
      const board = createEmptyBoard();
      expect(board.cells.length).toBe(BOARD_SIZE);
      expect(board.cells[0].length).toBe(BOARD_SIZE);
      expect(board.ships.length).toBe(0);

      for (let y = 0; y < BOARD_SIZE; y++) {
        for (let x = 0; x < BOARD_SIZE; x++) {
          expect(board.cells[y][x]).toBe('empty');
        }
      }
    });
  });

  describe('isValidCoordinate', () => {
    it('should return true for valid coordinates', () => {
      expect(isValidCoordinate({ x: 0, y: 0 })).toBe(true);
      expect(isValidCoordinate({ x: 5, y: 5 })).toBe(true);
      expect(isValidCoordinate({ x: 9, y: 9 })).toBe(true);
    });

    it('should return false for invalid coordinates', () => {
      expect(isValidCoordinate({ x: -1, y: 0 })).toBe(false);
      expect(isValidCoordinate({ x: 0, y: -1 })).toBe(false);
      expect(isValidCoordinate({ x: 10, y: 0 })).toBe(false);
      expect(isValidCoordinate({ x: 0, y: 10 })).toBe(false);
    });
  });

  describe('canPlaceShip and placeShip', () => {
    it('should place a horizontal ship', () => {
      const board = createEmptyBoard();
      const shipDef = { name: 'Destroyer', length: 4 };
      const startCoord: Coordinate = { x: 2, y: 3 };

      expect(canPlaceShip(board, startCoord, 4, true)).toBe(true);

      const ship = placeShip(board, shipDef, startCoord, true);
      expect(ship).not.toBeNull();
      expect(ship!.length).toBe(4);
      expect(ship!.coords.length).toBe(4);

      expect(board.cells[3][2]).toBe('ship');
      expect(board.cells[3][3]).toBe('ship');
      expect(board.cells[3][4]).toBe('ship');
      expect(board.cells[3][5]).toBe('ship');
      expect(board.ships.length).toBe(1);
    });

    it('should place a vertical ship', () => {
      const board = createEmptyBoard();
      const shipDef = { name: 'Submarine', length: 3 };
      const startCoord: Coordinate = { x: 5, y: 1 };

      expect(canPlaceShip(board, startCoord, 3, false)).toBe(true);

      const ship = placeShip(board, shipDef, startCoord, false);
      expect(ship).not.toBeNull();
      expect(ship!.coords.length).toBe(3);

      expect(board.cells[1][5]).toBe('ship');
      expect(board.cells[2][5]).toBe('ship');
      expect(board.cells[3][5]).toBe('ship');
    });

    it('should prevent ship placement out of bounds', () => {
      const board = createEmptyBoard();
      const shipDef = { name: 'Carrier', length: 5 };

      expect(canPlaceShip(board, { x: 7, y: 0 }, 5, true)).toBe(false);
      expect(canPlaceShip(board, { x: 0, y: 7 }, 5, false)).toBe(false);
    });

    it('should prevent overlapping ships', () => {
      const board = createEmptyBoard();
      const shipDef1 = { name: 'Ship1', length: 3 };
      const shipDef2 = { name: 'Ship2', length: 3 };

      placeShip(board, shipDef1, { x: 2, y: 2 }, true);

      expect(canPlaceShip(board, { x: 3, y: 2 }, 3, true)).toBe(false);
      expect(canPlaceShip(board, { x: 3, y: 0 }, 3, false)).toBe(false);
    });
  });

  describe('processShot', () => {
    it('should register a hit on a ship', () => {
      const board = createEmptyBoard();
      const shipDef = { name: 'Test Ship', length: 2 };
      placeShip(board, shipDef, { x: 5, y: 5 }, true);

      const result = processShot(board, { x: 5, y: 5 });

      expect(result.hit).toBe(true);
      expect(result.sunkShip).toBeUndefined();
      expect(board.cells[5][5]).toBe('hit');
      expect(board.ships[0].hits).toBe(1);
    });

    it('should register a miss', () => {
      const board = createEmptyBoard();

      const result = processShot(board, { x: 0, y: 0 });

      expect(result.hit).toBe(false);
      expect(board.cells[0][0]).toBe('miss');
    });

    it('should detect when a ship is sunk', () => {
      const board = createEmptyBoard();
      const shipDef = { name: 'Small Ship', length: 2 };
      placeShip(board, shipDef, { x: 3, y: 3 }, true);

      processShot(board, { x: 3, y: 3 });
      const result = processShot(board, { x: 4, y: 3 });

      expect(result.hit).toBe(true);
      expect(result.sunkShip).toBeDefined();
      expect(result.sunkShip!.name).toBe('Small Ship');
      expect(board.ships[0].hits).toBe(2);
    });

    it('should throw error on invalid coordinate', () => {
      const board = createEmptyBoard();

      expect(() => processShot(board, { x: -1, y: 0 })).toThrow('Invalid coordinate');
      expect(() => processShot(board, { x: 10, y: 0 })).toThrow('Invalid coordinate');
    });

    it('should throw error when shooting same cell twice', () => {
      const board = createEmptyBoard();

      processShot(board, { x: 2, y: 2 });

      expect(() => processShot(board, { x: 2, y: 2 })).toThrow('Cell already targeted');
    });
  });

  describe('areAllShipsSunk', () => {
    it('should return false when ships are not sunk', () => {
      const board = createEmptyBoard();
      placeShip(board, { name: 'Ship1', length: 2 }, { x: 0, y: 0 }, true);

      expect(areAllShipsSunk(board)).toBe(false);
    });

    it('should return true when all ships are sunk', () => {
      const board = createEmptyBoard();
      placeShip(board, { name: 'Ship1', length: 2 }, { x: 0, y: 0 }, true);

      processShot(board, { x: 0, y: 0 });
      processShot(board, { x: 1, y: 0 });

      expect(areAllShipsSunk(board)).toBe(true);
    });

    it('should return true for board with no ships', () => {
      const board = createEmptyBoard();
      expect(areAllShipsSunk(board)).toBe(true);
    });
  });
});