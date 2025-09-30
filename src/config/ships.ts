export interface ShipDefinition {
  name: string;
  length: number;
}

export interface CountryFleet {
  [countryCode: string]: ShipDefinition[];
}

export const BOARD_SIZE = 10;
export const MAX_PLAYERS = 4;
export const MIN_PLAYERS = 2;
export const CPU_TURN_DELAY = 700; // milliseconds

export const COUNTRY_FLEETS: CountryFleet = {
  US: [
    { name: "Gerald R. Ford-class Carrier", length: 5 },
    { name: "Arleigh Burke-class Destroyer", length: 4 },
    { name: "Independence-class Frigate", length: 3 },
    { name: "Virginia-class Submarine", length: 3 },
    { name: "Cyclone-class Patrol Boat", length: 2 }
  ],
  UK: [
    { name: "Queen Elizabeth-class Carrier", length: 5 },
    { name: "Type 45 Destroyer", length: 4 },
    { name: "Type 26 Frigate", length: 3 },
    { name: "Astute-class Submarine", length: 3 },
    { name: "Archer-class Patrol Boat", length: 2 }
  ],
  JP: [
    { name: "Izumo-class Carrier", length: 5 },
    { name: "Maya-class Destroyer", length: 4 },
    { name: "Mogami-class Frigate", length: 3 },
    { name: "Sōryū-class Submarine", length: 3 },
    { name: "Hayabusa-class Patrol Boat", length: 2 }
  ],
  CN: [
    { name: "Fujian-class Carrier", length: 5 },
    { name: "Type 055 Destroyer", length: 4 },
    { name: "Type 054A Frigate", length: 3 },
    { name: "Type 093 Submarine", length: 3 },
    { name: "Type 022 Patrol Boat", length: 2 }
  ],
  RU: [
    { name: "Admiral Kuznetsov Carrier", length: 5 },
    { name: "Sovremenny-class Destroyer", length: 4 },
    { name: "Admiral Gorshkov-class Frigate", length: 3 },
    { name: "Yasen-class Submarine", length: 3 },
    { name: "Buyan-class Patrol Boat", length: 2 }
  ],
  FR: [
    { name: "Charles de Gaulle Carrier", length: 5 },
    { name: "Horizon-class Destroyer", length: 4 },
    { name: "FREMM Frigate", length: 3 },
    { name: "Barracuda-class Submarine", length: 3 },
    { name: "P400-class Patrol Boat", length: 2 }
  ],
  DE: [
    { name: "Graf Zeppelin Carrier", length: 5 },
    { name: "Sachsen-class Destroyer", length: 4 },
    { name: "Baden-Württemberg Frigate", length: 3 },
    { name: "Type 212 Submarine", length: 3 },
    { name: "Braunschweig Patrol Boat", length: 2 }
  ],
  IN: [
    { name: "INS Vikrant Carrier", length: 5 },
    { name: "Kolkata-class Destroyer", length: 4 },
    { name: "Shivalik-class Frigate", length: 3 },
    { name: "Scorpène-class Submarine", length: 3 },
    { name: "Veer-class Patrol Boat", length: 2 }
  ],
  KR: [
    { name: "CVX-class Carrier", length: 5 },
    { name: "Sejong the Great Destroyer", length: 4 },
    { name: "Daegu-class Frigate", length: 3 },
    { name: "KSS-III Submarine", length: 3 },
    { name: "PKX-B Patrol Boat", length: 2 }
  ],
  IT: [
    { name: "Cavour Carrier", length: 5 },
    { name: "Horizon-class Destroyer", length: 4 },
    { name: "FREMM Frigate", length: 3 },
    { name: "Todaro-class Submarine", length: 3 },
    { name: "Comandanti Patrol Boat", length: 2 }
  ],
  AU: [
    { name: "Canberra-class Carrier", length: 5 },
    { name: "Hobart-class Destroyer", length: 4 },
    { name: "Hunter-class Frigate", length: 3 },
    { name: "Collins-class Submarine", length: 3 },
    { name: "Armidale Patrol Boat", length: 2 }
  ],
  BR: [
    { name: "São Paulo Carrier", length: 5 },
    { name: "Tamandaré Destroyer", length: 4 },
    { name: "Tamandaré-class Frigate", length: 3 },
    { name: "Riachuelo-class Submarine", length: 3 },
    { name: "Macaé Patrol Boat", length: 2 }
  ]
};

export const DEFAULT_FLEET: ShipDefinition[] = [
  { name: "Aircraft Carrier", length: 5 },
  { name: "Destroyer", length: 4 },
  { name: "Frigate", length: 3 },
  { name: "Submarine", length: 3 },
  { name: "Patrol Boat", length: 2 }
];

export function getFleetForCountry(countryCode: string): ShipDefinition[] {
  return COUNTRY_FLEETS[countryCode.toUpperCase()] || DEFAULT_FLEET;
}