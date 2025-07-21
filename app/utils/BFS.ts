/**
 * BFS.ts
 * Implements breadth-first search for finding evacuation paths
 */

/**
 * Unweighted BFS to find the shortest path (array of node IDs) between start & goal.
 */
export function bfsShortestPath(
  start: string, 
  goal: string, 
  adjacency: Record<string, string[]>
): string[] | null {
  const queue: string[][] = [[start]];
  const visited: Set<string> = new Set([start]);
  
  while (queue.length > 0) {
    const path = queue.shift()!;
    const lastNode = path[path.length - 1];
    
    if (lastNode === goal) {
      return path;
    }
    
    const neighbors = adjacency[lastNode] || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push([...path, neighbor]);
      }
    }
  }
  
  return null;
} 