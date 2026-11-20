export type GroundPoint = readonly [number, number];

type RouteGrid = {
  points: GroundPoint[];
  open: boolean[];
  columns: number;
  rows: number;
  walkable: (point: GroundPoint) => boolean;
  clear: (from: GroundPoint, to: GroundPoint) => boolean;
  preventCornerCutting: boolean;
};

// Scene adapters own obstacles and clearance; search and path simplification stay shared.
export function planGridRoute(grid: RouteGrid, start: GroundPoint, goal: GroundPoint): GroundPoint[] {
  const {points, open, columns, rows, walkable, clear, preventCornerCutting} = grid;
  let first = -1, nearest = Infinity;
  points.forEach((point, index) => {
    const distance = Math.hypot(point[0] - start[0], point[1] - start[1]);
    if (open[index] && distance < nearest && clear(start, point)) {
      first = index;
      nearest = distance;
    }
  });
  if (first < 0) return [start];
  const parent = new Int32Array(points.length).fill(-1), queue = [first];
  parent[first] = first;
  let best = first, bestDistance = Infinity;
  for (let head = 0; head < queue.length; head++) {
    const index = queue[head], point = points[index];
    const distance = Math.hypot(point[0] - goal[0], point[1] - goal[1]);
    if (distance < bestDistance) { best = index; bestDistance = distance; }
    const column = index % columns, row = Math.floor(index / columns);
    for (const [dx, dz] of [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]]) {
      const x = column + dx, z = row + dz, next = z * columns + x;
      if (x < 0 || x >= columns || z < 0 || z >= rows || !open[next] || parent[next] !== -1) continue;
      if (preventCornerCutting && dx && dz && (!open[row * columns + x] || !open[z * columns + column])) continue;
      if (!clear(point, points[next])) continue;
      parent[next] = index;
      queue.push(next);
    }
  }
  const path: GroundPoint[] = [];
  for (let index = best;; index = parent[index]) {
    path.push(points[index]);
    if (index === first) break;
  }
  path.reverse();
  path.unshift(start);
  if (walkable(goal) && clear(points[best], goal)) path.push(goal);
  const route: GroundPoint[] = [start];
  for (let index = 0; index < path.length - 1;) {
    let next = path.length - 1;
    while (next > index + 1 && !clear(path[index], path[next])) next--;
    const last = route.at(-1)!;
    if (Math.hypot(path[next][0] - last[0], path[next][1] - last[1]) > 1e-6) route.push(path[next]);
    index = next;
  }
  return route;
}
