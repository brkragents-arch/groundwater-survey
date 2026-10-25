import type { BranchingPathway, ConfidenceLevel } from '../types/hydrogeology';
import type { ElevationGridPoint } from './demHydrology';

/**
 * Subsurface Flow Network Engine
 * ------------------------------
 * Builds a dense, hierarchical (Strahler order 1-4) dendritic network of inferred
 * subsurface flow pathways by tracing streamlines through the modelled hydraulic
 * head field H(x, y), and extracts equipotential (hydraulic head) contours.
 *
 * Method:
 *  1. Bilinear interpolation of the gridded hydraulic head surface.
 *  2. Order-1 trunks are traced UP-gradient (+∇H) from outlets on the down-gradient
 *     side of the domain, so groundwater flows along them toward the outlet (-∇H).
 *  3. Tributaries are spawned head-ward along every branch at 40°-55° junction
 *     angles and steered up-gradient, recursively down to order 4.
 *  4. A spatial hash enforces a minimum spacing per order so branches do not
 *     overlap, producing a clean dendritic pattern.
 *  5. Equipotential contours are extracted with marching squares.
 *
 * IMPORTANT: The head field is modelled from terrain derivatives, not measured
 * piezometric data. All pathways are interpretive hypotheses that require field
 * verification (VES/ERT, piezometer levels, well logs).
 */

export interface HeadContour {
  level: number; // hydraulic head (m AMSL)
  segments: [number, number][][]; // each segment: [[lat, lng], [lat, lng]]
  labelPoints: [number, number][];
}

interface Frame {
  grid: ElevationGridPoint[][];
  rows: number;
  cols: number;
  startLat: number;
  startLng: number;
  latStep: number;
  lngStep: number;
  lat0: number;
  lng0: number;
  mLat: number; // metres per degree latitude
  mLng: number; // metres per degree longitude
  halfX: number; // domain half-width (m)
  halfY: number; // domain half-height (m)
  cellM: number; // approx grid cell size (m)
}

type Vec = [number, number];

function makeFrame(grid: ElevationGridPoint[][], centerLat: number, centerLng: number): Frame {
  const rows = grid.length;
  const cols = grid[0].length;
  const startLat = grid[0][0].lat;
  const startLng = grid[0][0].lng;
  const latStep = grid[1][0].lat - startLat;
  const lngStep = grid[0][1].lng - startLng;
  const mLat = 111320;
  const mLng = 111320 * Math.cos((centerLat * Math.PI) / 180);
  const halfY = ((rows - 1) * latStep * mLat) / 2;
  const halfX = ((cols - 1) * lngStep * mLng) / 2;
  return {
    grid,
    rows,
    cols,
    startLat,
    startLng,
    latStep,
    lngStep,
    lat0: startLat + ((rows - 1) * latStep) / 2,
    lng0: startLng + ((cols - 1) * lngStep) / 2,
    mLat,
    mLng,
    halfX,
    halfY,
    cellM: Math.min(latStep * mLat, lngStep * mLng),
  };
}

function toLatLng(f: Frame, p: Vec): [number, number] {
  return [f.lat0 + p[1] / f.mLat, f.lng0 + p[0] / f.mLng];
}

function sample(
  f: Frame,
  p: Vec,
  key: 'hydraulicHeadM' | 'depthToWaterTableM' | 'aquiferTransmissivityM2PerDay'
): number | null {
  const [lat, lng] = toLatLng(f, p);
  const fr = (lat - f.startLat) / f.latStep;
  const fc = (lng - f.startLng) / f.lngStep;
  if (fr < 0 || fc < 0 || fr > f.rows - 1 || fc > f.cols - 1) return null;
  const r0 = Math.min(f.rows - 2, Math.floor(fr));
  const c0 = Math.min(f.cols - 2, Math.floor(fc));
  const tr = fr - r0;
  const tc = fc - c0;
  const g = f.grid;
  return (
    g[r0][c0][key] * (1 - tr) * (1 - tc) +
    g[r0][c0 + 1][key] * (1 - tr) * tc +
    g[r0 + 1][c0][key] * tr * (1 - tc) +
    g[r0 + 1][c0 + 1][key] * tr * tc
  );
}

/** Hydraulic gradient ∇H (m/m) via central differences at grid-cell scale */
function gradH(f: Frame, p: Vec): Vec | null {
  const h = f.cellM * 0.75;
  const e = sample(f, [p[0] + h, p[1]], 'hydraulicHeadM');
  const w = sample(f, [p[0] - h, p[1]], 'hydraulicHeadM');
  const n = sample(f, [p[0], p[1] + h], 'hydraulicHeadM');
  const s = sample(f, [p[0], p[1] - h], 'hydraulicHeadM');
  if (e === null || w === null || n === null || s === null) return null;
  return [(e - w) / (2 * h), (n - s) / (2 * h)];
}

function norm(v: Vec): Vec {
  const m = Math.hypot(v[0], v[1]) || 1;
  return [v[0] / m, v[1] / m];
}

function rotate(v: Vec, rad: number): Vec {
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return [v[0] * c - v[1] * s, v[0] * s + v[1] * c];
}

function mulberry32(seed: number): () => number {
  let a = Math.floor(seed) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

class SpatialHash {
  private cells = new Map<string, { x: number; y: number; id: number }[]>();
  constructor(private cell: number) {}

  private key(ix: number, iy: number) {
    return `${ix}_${iy}`;
  }

  add(p: Vec, id: number) {
    const k = this.key(Math.floor(p[0] / this.cell), Math.floor(p[1] / this.cell));
    const arr = this.cells.get(k);
    if (arr) arr.push({ x: p[0], y: p[1], id });
    else this.cells.set(k, [{ x: p[0], y: p[1], id }]);
  }

  /** True if any stored point (excluding ignored ids) lies within radius */
  near(p: Vec, radius: number, ignore: Set<number>): boolean {
    const r = Math.ceil(radius / this.cell);
    const ix = Math.floor(p[0] / this.cell);
    const iy = Math.floor(p[1] / this.cell);
    const r2 = radius * radius;
    for (let dx = -r; dx <= r; dx++) {
      for (let dy = -r; dy <= r; dy++) {
        const arr = this.cells.get(this.key(ix + dx, iy + dy));
        if (!arr) continue;
        for (const q of arr) {
          if (ignore.has(q.id)) continue;
          const ddx = q.x - p[0];
          const ddy = q.y - p[1];
          if (ddx * ddx + ddy * ddy < r2) return true;
        }
      }
    }
    return false;
  }
}

interface Branch {
  id: number;
  parentId: number;
  order: number;
  pts: Vec[]; // ordered downstream -> upstream
}

/**
 * Builds the dendritic subsurface flow network over the full modelled domain.
 */
export function buildSubsurfaceDendriticNetwork(
  grid: ElevationGridPoint[][],
  centerLat: number,
  centerLng: number,
  seed: number
): BranchingPathway[] {
  if (grid.length < 4 || grid[0].length < 4) return [];
  const f = makeFrame(grid, centerLat, centerLng);
  const rng = mulberry32(seed * 1000 + 17);
  const R = Math.min(f.halfX, f.halfY);

  // Regional down-gradient direction (mean of -∇H)
  let gx = 0;
  let gy = 0;
  for (let i = -3; i <= 3; i++) {
    for (let j = -3; j <= 3; j++) {
      const g = gradH(f, [(i / 4) * f.halfX, (j / 4) * f.halfY]);
      if (g) {
        gx += g[0];
        gy += g[1];
      }
    }
  }
  const regionalUp = norm([gx, gy]); // up-gradient
  const regionalDown: Vec = [-regionalUp[0], -regionalUp[1]];
  const perp: Vec = [-regionalDown[1], regionalDown[0]];

  // Per-order geometry parameters (metres, relative to domain size R)
  const P: Record<number, { maxLen: number; step: number; spawnEvery: number; spacing: number }> = {
    1: { maxLen: 2.6 * R, step: R / 32, spawnEvery: 0.07 * R, spacing: 0.07 * R },
    2: { maxLen: 0.55 * R, step: R / 48, spawnEvery: 0.055 * R, spacing: 0.038 * R },
    3: { maxLen: 0.24 * R, step: R / 64, spawnEvery: 0.04 * R, spacing: 0.024 * R },
    4: { maxLen: 0.11 * R, step: R / 90, spawnEvery: Infinity, spacing: 0.015 * R },
  };

  const hash = new SpatialHash(0.02 * R);
  const branches: Branch[] = [];
  let nextId = 1;

  const grow = (start: Vec, initDir: Vec, order: number, parentId: number): Branch | null => {
    const prm = P[order];
    const id = nextId++;
    const pts: Vec[] = [start];
    let dir = norm(initDir);
    let len = 0;
    const wDir = order === 1 ? 0.6 : 0.78;
    const wUp = order === 1 ? 0.28 : 0.17;
    const wReg = order === 1 ? 0.12 : 0.05;
    const ignoreSelf = new Set<number>([id]);
    const ignoreSelfAndParent = new Set<number>([id, parentId]);

    while (len < prm.maxLen) {
      const cur = pts[pts.length - 1];
      const g = gradH(f, cur);
      if (!g) break;
      const gm = Math.hypot(g[0], g[1]);
      if (gm < 1e-5) break; // groundwater divide / flat head
      const up: Vec = [g[0] / gm, g[1] / gm];
      let nd = norm([
        dir[0] * wDir + up[0] * wUp + regionalUp[0] * wReg,
        dir[1] * wDir + up[1] * wUp + regionalUp[1] * wReg,
      ]);
      nd = rotate(nd, (rng() - 0.5) * 0.32); // natural sinuosity
      const next: Vec = [cur[0] + nd[0] * prm.step, cur[1] + nd[1] * prm.step];
      if (sample(f, next, 'hydraulicHeadM') === null) break;
      const ignore = pts.length < 4 ? ignoreSelfAndParent : ignoreSelf;
      if (hash.near(next, prm.spacing, ignore)) break;
      pts.push(next);
      dir = nd;
      len += prm.step;
    }

    if (pts.length < 3) return null;
    pts.forEach(p => hash.add(p, id));
    const b: Branch = { id, parentId, order, pts };
    branches.push(b);
    return b;
  };

  // 1. Order-1 trunks traced up-gradient from outlets on the down-gradient edge
  const numTrunks = 5;
  const outletOffset = 0.92 * R;
  const levelBranches: Branch[][] = [[], [], [], [], []];
  for (let k = 0; k < numTrunks; k++) {
    const t = (k / (numTrunks - 1) - 0.5) * 1.7 * R + (rng() - 0.5) * 0.12 * R;
    const start: Vec = [
      regionalDown[0] * outletOffset + perp[0] * t,
      regionalDown[1] * outletOffset + perp[1] * t,
    ];
    const b = grow(start, regionalUp, 1, 0);
    if (b) levelBranches[1].push(b);
  }

  // 2. Head-ward tributaries, order by order (higher orders claim space first)
  for (let order = 1; order <= 3; order++) {
    const childOrder = order + 1;
    for (const parent of levelBranches[order]) {
      const prm = P[order];
      let acc = 0;
      let nextAt = prm.spawnEvery * (0.5 + rng() * 0.6);
      let side = rng() < 0.5 ? 1 : -1;
      for (let i = 1; i < parent.pts.length - 1; i++) {
        acc += Math.hypot(parent.pts[i][0] - parent.pts[i - 1][0], parent.pts[i][1] - parent.pts[i - 1][1]);
        if (acc < nextAt) continue;
        nextAt = acc + prm.spawnEvery * (0.7 + rng() * 0.6);
        if (rng() < 0.12) continue; // occasional gap
        side = rng() < 0.78 ? -side : side;
        const local = norm([
          parent.pts[i + 1][0] - parent.pts[i][0],
          parent.pts[i + 1][1] - parent.pts[i][1],
        ]);
        const angle = ((40 + rng() * 15) * Math.PI) / 180;
        const child = grow(parent.pts[i], rotate(local, side * angle), childOrder, parent.id);
        if (child) levelBranches[childOrder].push(child);
      }
    }
  }

  // 3. Convert to georeferenced pathways with hydraulic attributes
  return branches.map(b => {
    let gradSum = 0;
    let depthSum = 0;
    let tSum = 0;
    let n = 0;
    for (const p of b.pts) {
      const g = gradH(f, p);
      const d = sample(f, p, 'depthToWaterTableM');
      const T = sample(f, p, 'aquiferTransmissivityM2PerDay');
      if (g && d !== null && T !== null) {
        gradSum += Math.hypot(g[0], g[1]);
        depthSum += d;
        tSum += T;
        n++;
      }
    }
    const i = n ? gradSum / n : 0.01;
    const depth = n ? depthSum / n : 6;
    const T = n ? tSum / n : 120;
    const thicknessM = 20; // assumed saturated thickness for K = T / b
    const porosity = 0.15; // assumed effective porosity
    const K = T / thicknessM;
    const velocity = (K * i) / porosity;
    const widthM = b.order === 1 ? 80 : b.order === 2 ? 40 : b.order === 3 ? 20 : 10;
    const flux = T * i * widthM;

    // Downstream azimuth (flow runs from pts[1] toward pts[0])
    const dx = b.pts[0][0] - b.pts[1][0];
    const dy = b.pts[0][1] - b.pts[1][1];
    const az = ((Math.atan2(dx, dy) * 180) / Math.PI + 360) % 360;

    const confidence: ConfidenceLevel = b.order <= 2 ? 'Moderate' : 'Low';
    const label =
      b.order === 1
        ? 'Primary subsurface flow trunk'
        : b.order === 2
        ? 'Secondary subsurface flow branch'
        : b.order === 3
        ? 'Tertiary sub-pathway'
        : 'Headwater recharge feeder';

    return {
      id: `gw-net-${b.id}`,
      type: b.order <= 2 ? 'subsurface_flow' : 'sub_pathway',
      streamOrder: b.order,
      coordinates: b.pts.map(p => toLatLng(f, p)),
      confidence,
      flowAccumulationScore: Math.round(60 / b.order),
      flowVelocityMPerDay: Math.round(velocity * 100) / 100,
      hydraulicGradient: Math.round(i * 10000) / 10000,
      depthToWaterM: Math.round(depth * 10) / 10,
      darcyFluxM3PerDay: Math.round(flux),
      flowDirectionDeg: Math.round(az),
      description: `${label} (Strahler order ${b.order}) traced along the modelled hydraulic-head gradient. Model-derived hypothesis — verify with VES/ERT and well water levels before drilling.`,
    } as BranchingPathway;
  });
}

function niceStep(raw: number): number {
  if (raw <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const m = raw / p;
  const nice = m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10;
  return nice * p;
}

/**
 * Extracts equipotential (hydraulic head) contours with marching squares.
 */
export function computeHeadContours(grid: ElevationGridPoint[][], targetLevels: number = 12): HeadContour[] {
  const rows = grid.length;
  if (rows < 2) return [];
  const cols = grid[0].length;
  let min = Infinity;
  let max = -Infinity;
  for (const row of grid) {
    for (const c of row) {
      if (c.hydraulicHeadM < min) min = c.hydraulicHeadM;
      if (c.hydraulicHeadM > max) max = c.hydraulicHeadM;
    }
  }
  const step = niceStep((max - min) / targetLevels);
  const contours: HeadContour[] = [];

  const interp = (a: ElevationGridPoint, b: ElevationGridPoint, level: number): [number, number] => {
    const t = (level - a.hydraulicHeadM) / (b.hydraulicHeadM - a.hydraulicHeadM || 1e-9);
    return [a.lat + (b.lat - a.lat) * t, a.lng + (b.lng - a.lng) * t];
  };

  for (let level = Math.ceil(min / step) * step; level <= max; level += step) {
    const segments: [number, number][][] = [];
    for (let r = 0; r < rows - 1; r++) {
      for (let c = 0; c < cols - 1; c++) {
        // Corners counter-clockwise: bl, br, tr, tl
        const corners = [grid[r][c], grid[r][c + 1], grid[r + 1][c + 1], grid[r + 1][c]];
        const pts: [number, number][] = [];
        for (let e = 0; e < 4; e++) {
          const a = corners[e];
          const b = corners[(e + 1) % 4];
          if ((a.hydraulicHeadM < level) !== (b.hydraulicHeadM < level)) {
            pts.push(interp(a, b, level));
          }
        }
        if (pts.length === 2) segments.push([pts[0], pts[1]]);
        else if (pts.length === 4) {
          segments.push([pts[0], pts[1]]);
          segments.push([pts[2], pts[3]]);
        }
      }
    }
    if (segments.length === 0) continue;

    // Place up to 3 labels per contour level, spread along its segments
    const labelPoints: [number, number][] = [];
    const every = Math.max(1, Math.floor(segments.length / 3));
    for (let s = Math.floor(every / 2); s < segments.length && labelPoints.length < 3; s += every) {
      const [a, b] = segments[s];
      labelPoints.push([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]);
    }
    contours.push({ level: Math.round(level * 10) / 10, segments, labelPoints });
  }
  return contours;
}
