/**
 * MapData.ts
 * Defines map data structures and nodes
 */

export interface MapNode {
  id: string;
  position: {
    x: number;
    y: number;
  };
  isExit: boolean;
  isClassroom: boolean;
}

// Example: Node layout specifically for door-based graph
// Adjust x,y so each node is near a door or hallway intersection
export const allNodes: MapNode[] = [
  // Left-side doors
  { id: "DoorC1", position: { x: 120, y: 100 }, isExit: false, isClassroom: true },
  { id: "DoorC2", position: { x: 120, y: 180 }, isExit: false, isClassroom: true },
  { id: "DoorC3", position: { x: 120, y: 260 }, isExit: false, isClassroom: true },

  // Right-side doors
  { id: "DoorC4", position: { x: 280, y: 100 }, isExit: false, isClassroom: true },
  { id: "DoorC5", position: { x: 280, y: 180 }, isExit: false, isClassroom: true },
  { id: "DoorC6", position: { x: 280, y: 260 }, isExit: false, isClassroom: true },

  // Hallway intersections
  { id: "H1", position: { x: 200, y: 100 }, isExit: false, isClassroom: false },
  { id: "H2", position: { x: 200, y: 180 }, isExit: false, isClassroom: false },
  { id: "H3", position: { x: 200, y: 260 }, isExit: false, isClassroom: false },

  // Exits
  { id: "ExitLeft", position: { x: 60, y: 180 }, isExit: true, isClassroom: false },
  { id: "ExitRight", position: { x: 340, y: 180 }, isExit: true, isClassroom: false },
];

// Adjacency list (undirected edges). ONLY hallway connections—no crossing rooms!
export const adjacencyList: Record<string, string[]> = {
  // Doors -> hallway
  "DoorC1": ["H1"],
  "DoorC2": ["H2"],
  "DoorC3": ["H3"],
  "DoorC4": ["H1"],
  "DoorC5": ["H2"],
  "DoorC6": ["H3"],

  // Hallway intersections -> each other
  "H1": ["DoorC1", "DoorC4", "H2"],
  "H2": ["DoorC2", "DoorC5", "H1", "H3", "ExitLeft", "ExitRight"],
  "H3": ["DoorC3", "DoorC6", "H2"],

  // Exits
  "ExitLeft": ["H2"],
  "ExitRight": ["H2"]
}; 