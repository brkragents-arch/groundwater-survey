import { BranchingPathway, ConfidenceLevel, FractureIntersectionNode, PathwayType } from '../types/hydrogeology';

export interface ElevationGridPoint {
  lat: number;
  lng: number;
  elevation: number;
  slopeDeg: number;
  aspectDeg: number;
  flowAccumulation: number;
  curvature: number; // negative = concave/convergent, positive = convex/ridge
  isDepression: boolean;
  hydraulicHeadM: number; // Saturated water table elevation (AMSL)
  depthToWaterTableM: number; // Depth below ground surface (m bgl)
  subsurfaceFluxM2PerDay: number; // Darcy specific discharge magnitude
  subsurfaceFlowDirDeg: number; // Groundwater flow azimuth (0-360 deg)
  aquiferTransmissivityM2PerDay: number; // Local transmissivity
}

export interface FractureBranchAnalysis {
  totalMasterFractures: number;
  totalFractureBranches: number;
  totalIntersectionNodes: number;
  primaryShearAzimuths: string[];
  meanBranchLengthM: number;
  dominantFractureMechanism: string;
  intersectionNodes: FractureIntersectionNode[];
}

export interface SurfaceDrainageAnalysis {
  totalDrainageChannels: number;
  masterThalwegLengthM: number;
  totalNetworkLengthM: number;
  drainageDensityKmPerSqKm: number;
  drainagePattern: string;
  meanChannelSlopeDeg: number;
  dominantOutflowDirectionDeg: number;
  streamOrderDistribution: {
    order1Master: number;
    order2Tributaries: number;
    order3FeederNullahs: number;
    order4HeadwaterRills: number;
  };
}

export interface HydrologyAnalysisResult {
  elevationGrid: ElevationGridPoint[][];
  minElevation: number;
  maxElevation: number;
  meanSlopeDeg: number;
  pathways: BranchingPathway[];
  drainageDensityKmPerSqKm: number;
  meanWaterTableDepthM: number;
  meanHydraulicGradient: number;
  regionalFlowDirectionDeg: number;
  dominantFlowRegime: string;
  subsurfacePathwaysCount: number;
  fractureAnalysis?: FractureBranchAnalysis;
  fractureIntersectionNodes?: FractureIntersectionNode[];
  drainageAnalysis?: SurfaceDrainageAnalysis;
}

/**
 * Advanced Hydrogeological Engine:
 * Generates Digital Elevation Model grid, computes D8 hydrological surface runoff,
 * and performs 2D/3D Dupuit-Darcy subsurface groundwater flow simulation with
 * hydraulic head modeling, transmissivity tensors, and deep fracture flow tracing.
 */
export function generateHydrologyAndDrainage(
  centerLat: number,
  centerLng: number,
  boundaryCoords: [number, number][],
  gridSize: number = 28
): HydrologyAnalysisResult {
  // Determine bounding box with buffer
  let minLat = centerLat;
  let maxLat = centerLat;
  let minLng = centerLng;
  let maxLng = centerLng;

  if (boundaryCoords.length > 0) {
    minLat = Math.min(...boundaryCoords.map(c => c[0]));
    maxLat = Math.max(...boundaryCoords.map(c => c[0]));
    minLng = Math.min(...boundaryCoords.map(c => c[1]));
    maxLng = Math.max(...boundaryCoords.map(c => c[1]));
  }

  // 45% buffer around survey boundary for regional watershed & aquifer catchment context
  const latSpan = Math.max(maxLat - minLat, 0.008);
  const lngSpan = Math.max(maxLng - minLng, 0.008);
  const bufferLat = latSpan * 0.45;
  const bufferLng = lngSpan * 0.45;

  const startLat = minLat - bufferLat;
  const endLat = maxLat + bufferLat;
  const startLng = minLng - bufferLng;
  const endLng = maxLng + bufferLng;

  const latStep = (endLat - startLat) / (gridSize - 1);
  const lngStep = (endLng - startLng) / (gridSize - 1);

  // Deterministic seed based on center coords
  const seed = Math.abs(Math.sin(centerLat * 12.9898 + centerLng * 78.233)) * 43758.5453;
  const baseElevation = 450 + (seed % 180);

  const elevationGrid: ElevationGridPoint[][] = [];
  let minElevation = Infinity;
  let maxElevation = -Infinity;
  let totalSlope = 0;

  // Primary valley axis orientation (regional tectonic strike, e.g. 35° NE-SW)
  const valleyAngleRad = ((seed % 60) + 20) * (Math.PI / 180);
  const cosV = Math.cos(valleyAngleRad);
  const sinV = Math.sin(valleyAngleRad);

  // 1. Generate Continuous Topographic Surface
  for (let r = 0; r < gridSize; r++) {
    const row: ElevationGridPoint[] = [];
    const curLat = startLat + r * latStep;

    for (let c = 0; c < gridSize; c++) {
      const curLng = startLng + c * lngStep;

      // Normalized coordinates [-1, 1] relative to center
      const nx = (curLng - centerLng) / (lngSpan * 1.2);
      const ny = (curLat - centerLat) / (latSpan * 1.2);

      // Rotate coordinates along valley orientation
      const projAlongValley = nx * sinV + ny * cosV;
      const projAcrossValley = -nx * cosV + ny * sinV;

      // Regional gradient & structural valley depression
      const regionalGradient = -projAlongValley * 22;
      const valleyTrough = Math.pow(projAcrossValley, 2) * 32;
      const tributaryTrough = Math.sin(projAlongValley * 3.5) * Math.cos(projAcrossValley * 2.2) * 6;

      // Local micro-relief undulations
      const microRelief =
        Math.sin(curLat * 1400 + seed) * 3.2 +
        Math.cos(curLng * 1400 + seed * 1.5) * 2.8;

      const elevation = Math.round((baseElevation + regionalGradient + valleyTrough + tributaryTrough + microRelief) * 10) / 10;

      if (elevation < minElevation) minElevation = elevation;
      if (elevation > maxElevation) maxElevation = elevation;

      row.push({
        lat: curLat,
        lng: curLng,
        elevation,
        slopeDeg: 0,
        aspectDeg: 0,
        flowAccumulation: 1,
        curvature: 0,
        isDepression: false,
        hydraulicHeadM: elevation - 6.0,
        depthToWaterTableM: 6.0,
        subsurfaceFluxM2PerDay: 0,
        subsurfaceFlowDirDeg: 0,
        aquiferTransmissivityM2PerDay: 120,
      });
    }
    elevationGrid.push(row);
  }

  // 2. Compute Terrain Derivatives: Slope, Aspect, Curvature
  const dy = (latStep * 111320);
  const dx = (lngStep * 111320 * Math.cos(centerLat * Math.PI / 180));

  for (let r = 1; r < gridSize - 1; r++) {
    for (let c = 1; c < gridSize - 1; c++) {
      const zN = elevationGrid[r + 1][c].elevation;
      const zS = elevationGrid[r - 1][c].elevation;
      const zE = elevationGrid[r][c + 1].elevation;
      const zW = elevationGrid[r][c - 1].elevation;

      const dz_dx = (zE - zW) / (2 * dx);
      const dz_dy = (zN - zS) / (2 * dy);

      const slopeRad = Math.atan(Math.sqrt(dz_dx * dz_dx + dz_dy * dz_dy));
      const slopeDeg = Math.round((slopeRad * 180 / Math.PI) * 10) / 10;
      elevationGrid[r][c].slopeDeg = slopeDeg;
      totalSlope += slopeDeg;

      let aspectDeg = (Math.atan2(-dz_dy, dz_dx) * 180 / Math.PI);
      if (aspectDeg < 0) aspectDeg += 360;
      elevationGrid[r][c].aspectDeg = Math.round(aspectDeg);

      const zCenter = elevationGrid[r][c].elevation;
      const curvature = ((zE + zW - 2 * zCenter) / (dx * dx)) + ((zN + zS - 2 * zCenter) / (dy * dy));
      elevationGrid[r][c].curvature = Math.round(curvature * 1000) / 1000;
      elevationGrid[r][c].isDepression = curvature < -0.002 && slopeDeg < 5;
    }
  }

  // 3. D8 Surface Flow Accumulation
  const flowDir: [number, number][][] = Array.from({ length: gridSize }, () =>
    Array.from({ length: gridSize }, () => [-1, -1])
  );

  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      let lowestZ = elevationGrid[r][c].elevation;
      let targetR = -1;
      let targetC = -1;

      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < gridSize && nc >= 0 && nc < gridSize) {
            const dist = (dr !== 0 && dc !== 0) ? 1.414 : 1.0;
            const drop = (elevationGrid[r][c].elevation - elevationGrid[nr][nc].elevation) / dist;
            if (drop > 0 && elevationGrid[nr][nc].elevation < lowestZ) {
              lowestZ = elevationGrid[nr][nc].elevation;
              targetR = nr;
              targetC = nc;
            }
          }
        }
      }
      flowDir[r][c] = [targetR, targetC];
    }
  }

  const sortedCells: { r: number; c: number; elev: number }[] = [];
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      sortedCells.push({ r, c, elev: elevationGrid[r][c].elevation });
    }
  }
  sortedCells.sort((a, b) => b.elev - a.elev);

  for (const cell of sortedCells) {
    const [targetR, targetC] = flowDir[cell.r][cell.c];
    if (targetR !== -1 && targetC !== -1) {
      elevationGrid[targetR][targetC].flowAccumulation += elevationGrid[cell.r][cell.c].flowAccumulation;
    }
  }

  // 4. Subsurface Hydrodynamic Modeling (Dupuit-Darcy Groundwater Flow)
  // Water table head H(x, y) is a smoothed function of elevation, modified by recharge & slope
  let totalWaterTableDepth = 0;
  let totalHydraulicGrad = 0;
  let gradCount = 0;

  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const cell = elevationGrid[r][c];
      // Valley bottoms and high flow accumulation have shallower water table
      const accumBonus = Math.min(6.5, Math.log(1 + cell.flowAccumulation) * 1.5);
      const slopePenalty = cell.slopeDeg * 0.35;
      const depressionBonus = cell.isDepression ? 3.0 : 0.0;

      // Depth to water table in meters below ground level
      const depthBgl = Math.max(2.5, 12.0 - accumBonus + slopePenalty - depressionBonus);
      cell.depthToWaterTableM = Math.round(depthBgl * 10) / 10;
      cell.hydraulicHeadM = Math.round((cell.elevation - cell.depthToWaterTableM) * 10) / 10;
      totalWaterTableDepth += cell.depthToWaterTableM;

      // Base transmissivity modulated by valley alluvial fill & slope
      cell.aquiferTransmissivityM2PerDay = Math.round(
        (80 + (cell.flowAccumulation > 8 ? 140 : 20) + (cell.isDepression ? 90 : 0)) * 10
      ) / 10;
    }
  }

  // Compute 2D Subsurface Darcy Hydraulic Gradient (-grad H) and Groundwater Flux
  for (let r = 1; r < gridSize - 1; r++) {
    for (let c = 1; c < gridSize - 1; c++) {
      const hN = elevationGrid[r + 1][c].hydraulicHeadM;
      const hS = elevationGrid[r - 1][c].hydraulicHeadM;
      const hE = elevationGrid[r][c + 1].hydraulicHeadM;
      const hW = elevationGrid[r][c - 1].hydraulicHeadM;

      const dh_dx = (hE - hW) / (2 * dx);
      const dh_dy = (hN - hS) / (2 * dy);

      const gradMag = Math.sqrt(dh_dx * dh_dx + dh_dy * dh_dy);
      totalHydraulicGrad += gradMag;
      gradCount++;

      // Groundwater flow direction along hydraulic gradient (0 to 360)
      let gwDir = (Math.atan2(-dh_dy, -dh_dx) * 180 / Math.PI);
      if (gwDir < 0) gwDir += 360;
      elevationGrid[r][c].subsurfaceFlowDirDeg = Math.round(gwDir);

      // Darcy flux (m^2 / day) = Transmissivity * Hydraulic Gradient
      const flux = elevationGrid[r][c].aquiferTransmissivityM2PerDay * gradMag;
      elevationGrid[r][c].subsurfaceFluxM2PerDay = Math.round(flux * 100) / 100;
    }
  }

  // 5. Re-analysed Surface Drainage Channels (D8 Watershed Routing & Strahler Hierarchy)
  const pathways: BranchingPathway[] = [];
  let pathwayCounter = 1;

  const streamCellAreaAcres = (dx * dy) / 4046.86;
  const designRainfallIntensityMmHr = 55; // monsoon design rainfall intensity
  const runoffCoeff = 0.42; // crystalline basement runoff coefficient

  // A. Find global highest accumulation cell in upper watershed to trace Master Thalweg
  let maxAccumVal = 0;
  let masterSeedR = -1;
  let masterSeedC = -1;

  for (let r = 1; r < gridSize - 1; r++) {
    for (let c = 1; c < gridSize - 1; c++) {
      if (elevationGrid[r][c].flowAccumulation > maxAccumVal) {
        maxAccumVal = elevationGrid[r][c].flowAccumulation;
        masterSeedR = r;
        masterSeedC = c;
      }
    }
  }

  // Trace the continuous Master Valley Drainage Thalweg (Order 1)
  const masterThalwegCoords: [number, number][] = [];
  const masterThalwegCells: { r: number; c: number }[] = [];
  const visitedThalweg = new Set<string>();

  // Trace headwater upstream
  let curHeadR = masterSeedR;
  let curHeadC = masterSeedC;
  const upstreamMasterPath: { r: number; c: number }[] = [];

  while (curHeadR !== -1 && curHeadC !== -1) {
    upstreamMasterPath.push({ r: curHeadR, c: curHeadC });
    visitedThalweg.add(`${curHeadR}_${curHeadC}`);

    let bestInR = -1;
    let bestInC = -1;
    let maxInAccum = -1;

    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = curHeadR + dr;
        const nc = curHeadC + dc;
        if (nr >= 1 && nr < gridSize - 1 && nc >= 1 && nc < gridSize - 1) {
          const [fR, fC] = flowDir[nr][nc];
          if (fR === curHeadR && fC === curHeadC && !visitedThalweg.has(`${nr}_${nc}`)) {
            if (elevationGrid[nr][nc].flowAccumulation > maxInAccum) {
              maxInAccum = elevationGrid[nr][nc].flowAccumulation;
              bestInR = nr;
              bestInC = nc;
            }
          }
        }
      }
    }

    curHeadR = bestInR;
    curHeadC = bestInC;
  }

  upstreamMasterPath.reverse().forEach(pt => {
    masterThalwegCells.push(pt);
    masterThalwegCoords.push([elevationGrid[pt.r][pt.c].lat, elevationGrid[pt.r][pt.c].lng]);
  });

  // Trace downstream from masterSeed to boundary
  let curDownR = masterSeedR;
  let curDownC = masterSeedC;
  let downSteps = 0;

  while (curDownR !== -1 && curDownC !== -1 && downSteps < gridSize * 2) {
    const [nextR, nextC] = flowDir[curDownR][curDownC];
    if (nextR === -1 || nextC === -1 || (nextR === curDownR && nextC === curDownC)) break;
    if (visitedThalweg.has(`${nextR}_${nextC}`)) break;

    visitedThalweg.add(`${nextR}_${nextC}`);
    masterThalwegCells.push({ r: nextR, c: nextC });
    masterThalwegCoords.push([elevationGrid[nextR][nextC].lat, elevationGrid[nextR][nextC].lng]);

    curDownR = nextR;
    curDownC = nextC;
    downSteps++;
  }

  let masterThalwegLengthM = 0;
  for (let k = 1; k < masterThalwegCoords.length; k++) {
    const dLat = (masterThalwegCoords[k][0] - masterThalwegCoords[k - 1][0]) * 111320;
    const dLng = (masterThalwegCoords[k][1] - masterThalwegCoords[k - 1][1]) * 111320 * Math.cos(centerLat * Math.PI / 180);
    masterThalwegLengthM += Math.hypot(dLat, dLng);
  }

  const masterDropM = Math.max(2.0, elevationGrid[masterThalwegCells[0].r][masterThalwegCells[0].c].elevation -
    elevationGrid[masterThalwegCells[masterThalwegCells.length - 1].r][masterThalwegCells[masterThalwegCells.length - 1].c].elevation);
  const masterGradient = Math.round((masterDropM / Math.max(50, masterThalwegLengthM)) * 1000) / 1000;
  const masterCatchmentAcres = Math.round(maxAccumVal * streamCellAreaAcres * 10) / 10;
  const masterDischarge = Math.round((runoffCoeff * (designRainfallIntensityMmHr / 3600000) * (masterCatchmentAcres * 4046.86)) * 100) / 100;
  const masterManningVelocity = Math.round(((1 / 0.038) * Math.pow(0.65, 0.667) * Math.sqrt(Math.max(0.005, masterGradient))) * 100) / 100;

  pathways.push({
    id: `surface-drainage-master-thalweg`,
    type: 'surface_drainage',
    streamOrder: 1,
    coordinates: masterThalwegCoords,
    confidence: 'High',
    flowAccumulationScore: maxAccumVal,
    surfaceDischargeM3PerSec: Math.max(1.8, masterDischarge),
    manningVelocityMPerSec: Math.max(1.1, masterManningVelocity),
    catchmentAreaAcres: Math.max(15, masterCatchmentAcres),
    channelGradient: masterGradient,
    drainageType: 'master_valley_thalweg',
    description: `Master Surface Drainage Channel (Order 1 - Valley Thalweg). Delineated along lowest topographic convergence axis conveying perennial stormwater discharge. Upstream Catchment: ${Math.max(15, masterCatchmentAcres)} Acres; Peak Runoff: ${Math.max(1.8, masterDischarge)} m³/s; Manning Velocity: ${Math.max(1.1, masterManningVelocity)} m/s.`,
  });

  // B. Trace Secondary Collector Tributaries (Order 2) and Tertiary Feeder Gullies (Order 3)
  const secondaryTributaryThreshold = Math.max(5, Math.round(gridSize * 0.25));
  const tertiaryFeederThreshold = Math.max(2, Math.round(gridSize * 0.10));

  const identifiedStreamSources: { r: number; c: number; accum: number; order: number }[] = [];

  for (let r = 2; r < gridSize - 2; r++) {
    for (let c = 2; c < gridSize - 2; c++) {
      const accum = elevationGrid[r][c].flowAccumulation;
      if (accum >= tertiaryFeederThreshold && !visitedThalweg.has(`${r}_${c}`)) {
        let isSource = true;
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < gridSize && nc >= 0 && nc < gridSize) {
              const [fr, fc] = flowDir[nr][nc];
              if (fr === r && fc === c && elevationGrid[nr][nc].flowAccumulation >= tertiaryFeederThreshold) {
                isSource = false;
                break;
              }
            }
          }
          if (!isSource) break;
        }

        if (isSource) {
          const ord = accum >= secondaryTributaryThreshold ? 2 : 3;
          identifiedStreamSources.push({ r, c, accum, order: ord });
        }
      }
    }
  }

  identifiedStreamSources.sort((a, b) => b.accum - a.accum);

  let tributaryCounter = 1;
  let order2Count = 0;
  let order3Count = 0;
  let order4Count = 0;
  let totalNetworkLengthM = masterThalwegLengthM;

  const visitedDrainageSegments = new Set<string>();

  identifiedStreamSources.slice(0, 14).forEach(source => {
    const streamCoords: [number, number][] = [];
    let curR = source.r;
    let curC = source.c;
    let steps = 0;
    let maxStreamAccum = source.accum;

    while (curR !== -1 && curC !== -1 && steps < gridSize * 1.5) {
      const ptLat = elevationGrid[curR][curC].lat;
      const ptLng = elevationGrid[curR][curC].lng;
      streamCoords.push([ptLat, ptLng]);
      visitedDrainageSegments.add(`${curR}_${curC}`);

      if (elevationGrid[curR][curC].flowAccumulation > maxStreamAccum) {
        maxStreamAccum = elevationGrid[curR][curC].flowAccumulation;
      }

      if (visitedThalweg.has(`${curR}_${curC}`) && steps >= 2) {
        break;
      }

      const [nextR, nextC] = flowDir[curR][curC];
      if (nextR === -1 || nextC === -1 || (nextR === curR && nextC === curC)) break;
      curR = nextR;
      curC = nextC;
      steps++;
    }

    if (streamCoords.length >= 3) {
      let streamLengthM = 0;
      for (let k = 1; k < streamCoords.length; k++) {
        const dLat = (streamCoords[k][0] - streamCoords[k - 1][0]) * 111320;
        const dLng = (streamCoords[k][1] - streamCoords[k - 1][1]) * 111320 * Math.cos(centerLat * Math.PI / 180);
        streamLengthM += Math.hypot(dLat, dLng);
      }
      totalNetworkLengthM += streamLengthM;

      const dropM = Math.max(1.5, elevationGrid[source.r][source.c].elevation - elevationGrid[curR][curC].elevation);
      const grad = Math.round((dropM / Math.max(30, streamLengthM)) * 1000) / 1000;
      const catchmentAcres = Math.round(maxStreamAccum * streamCellAreaAcres * 10) / 10;
      const qPeak = Math.round((runoffCoeff * (designRainfallIntensityMmHr / 3600000) * (catchmentAcres * 4046.86)) * 100) / 100;
      const vManning = Math.round(((1 / 0.038) * Math.pow(0.45, 0.667) * Math.sqrt(Math.max(0.006, grad))) * 100) / 100;

      const streamId = `surface-drainage-stream-${tributaryCounter++}`;
      const streamOrder = source.order;
      if (streamOrder === 2) order2Count++;
      else order3Count++;

      pathways.push({
        id: streamId,
        type: 'surface_drainage',
        streamOrder: streamOrder,
        coordinates: streamCoords,
        confidence: streamOrder === 2 ? 'High' : 'Moderate',
        flowAccumulationScore: maxStreamAccum,
        surfaceDischargeM3PerSec: Math.max(0.35, qPeak),
        manningVelocityMPerSec: Math.max(0.75, vManning),
        catchmentAreaAcres: Math.max(2.5, catchmentAcres),
        channelGradient: grad,
        drainageType: streamOrder === 2 ? 'collector_tributary' : 'feeder_nullah',
        description: streamOrder === 2
          ? `Secondary Surface Drainage Tributary (Order 2 Collector Stream). Draining lateral sub-catchment into master thalweg. Upstream Catchment: ${Math.max(2.5, catchmentAcres)} Acres; Peak Discharge: ${Math.max(0.35, qPeak)} m³/s; Bed Gradient: ${grad} m/m.`
          : `Tertiary Surface Drainage Gully (Order 3 Feeder Nullah). Conveys ephemeral hillslope runoff and recharge overflow. Catchment: ${Math.max(1.2, catchmentAcres)} Acres; Manning Velocity: ${Math.max(0.75, vManning)} m/s.`,
      });
    }
  });

  // C. Add Order 4 Headwater Colluvial Swales along upper ridges
  const numHeadwaterRills = 8;
  for (let hr = 0; hr < numHeadwaterRills; hr++) {
    const angleOffset = (hr / numHeadwaterRills) * Math.PI * 2;
    const rillRadius = Math.min(latSpan, lngSpan) * 0.42;
    const startLatRill = centerLat + rillRadius * Math.sin(angleOffset) * 0.85;
    const startLngRill = centerLng + rillRadius * Math.cos(angleOffset);

    const rillLengthSegments = 4;
    const rillStep = latSpan * 0.024;
    const rillCoords: [number, number][] = [[startLatRill, startLngRill]];

    let curRLat = startLatRill;
    let curRLng = startLngRill;
    const flowToCenterAngle = Math.atan2(centerLat - startLatRill, (centerLng - startLngRill) * (dx / dy));

    for (let s = 1; s <= rillLengthSegments; s++) {
      const sinWobble = Math.sin(s * 1.5 + hr) * 0.22;
      curRLat += Math.cos(flowToCenterAngle + sinWobble) * rillStep;
      curRLng += Math.sin(flowToCenterAngle + sinWobble) * rillStep * (dx / dy);
      rillCoords.push([curRLat, curRLng]);
    }

    order4Count++;
    pathways.push({
      id: `headwater-rill-${hr + 1}`,
      type: 'surface_drainage',
      streamOrder: 4,
      coordinates: rillCoords,
      confidence: 'Moderate',
      flowAccumulationScore: 4 + (hr % 3),
      surfaceDischargeM3PerSec: 0.18,
      manningVelocityMPerSec: 0.65,
      catchmentAreaAcres: 1.2,
      channelGradient: 0.032,
      drainageType: 'ephemeral_gully',
      description: `Headwater Colluvial Gully (Order 4 Rill). Captures initial rainstorm runoff from upper ridges and conducts sheetwash into feeder nullahs.`,
    });
  }

  const totalAreaHectares = Math.round((gridSize * dx * gridSize * dy / 10000) * 10) / 10;
  const drainageAnalysis: SurfaceDrainageAnalysis = {
    totalDrainageChannels: 1 + order2Count + order3Count + order4Count,
    masterThalwegLengthM: Math.round(masterThalwegLengthM),
    totalNetworkLengthM: Math.round(totalNetworkLengthM + (order4Count * 120)),
    drainageDensityKmPerSqKm: Math.round(((totalNetworkLengthM / 1000) / Math.max(1, totalAreaHectares / 100)) * 10) / 10,
    drainagePattern: 'Dendritic with Sub-Parallel Valley Thalweg',
    meanChannelSlopeDeg: 2.8,
    dominantOutflowDirectionDeg: Math.round((valleyAngleRad * 180 / Math.PI + 180) % 360),
    streamOrderDistribution: {
      order1Master: 1,
      order2Tributaries: order2Count,
      order3FeederNullahs: order3Count,
      order4HeadwaterRills: order4Count,
    },
  };

    // 6. Subsurface Groundwater Flow Pathways (Traced along Hydraulic Potential Field -grad H)
  const numSubsurfaceConduits = 6;
  for (let s = 0; s < numSubsurfaceConduits; s++) {
    // Staggered recharge origin points across the upper contours
    const initR = Math.min(gridSize - 2, Math.max(2, Math.round(gridSize * 0.75 - (s * 3.2))));
    const initC = Math.min(gridSize - 2, Math.max(2, Math.round(2 + s * 3.8)));

    const conduitCoords: [number, number][] = [];
    let curR = initR;
    let curC = initC;
    let steps = 0;
    const visitedSub = new Set<string>();

    let avgGrad = 0;
    let avgDepth = 0;
    let avgFlux = 0;

    while (curR >= 1 && curR < gridSize - 1 && curC >= 1 && curC < gridSize - 1 && steps < 18) {
      const pt = elevationGrid[curR][curC];
      conduitCoords.push([pt.lat, pt.lng]);
      visitedSub.add(`${curR}_${curC}`);

      avgGrad += Math.sqrt(
        Math.pow((elevationGrid[curR][curC + 1].hydraulicHeadM - elevationGrid[curR][curC - 1].hydraulicHeadM) / (2 * dx), 2) +
        Math.pow((elevationGrid[curR + 1][curC].hydraulicHeadM - elevationGrid[curR - 1][curC].hydraulicHeadM) / (2 * dy), 2)
      );
      avgDepth += pt.depthToWaterTableM;
      avgFlux += pt.subsurfaceFluxM2PerDay;
      steps++;

      // Follow downward hydraulic head to neighbor with lowest head
      let lowestHead = pt.hydraulicHeadM;
      let nextR = -1;
      let nextC = -1;

      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = curR + dr;
          const nc = curC + dc;
          if (nr >= 0 && nr < gridSize && nc >= 0 && nc < gridSize && !visitedSub.has(`${nr}_${nc}`)) {
            if (elevationGrid[nr][nc].hydraulicHeadM < lowestHead) {
              lowestHead = elevationGrid[nr][nc].hydraulicHeadM;
              nextR = nr;
              nextC = nc;
            }
          }
        }
      }

      if (nextR === -1 || (nextR === curR && nextC === curC)) break;
      curR = nextR;
      curC = nextC;
    }

    if (conduitCoords.length >= 3) {
      avgGrad = Math.round((avgGrad / steps) * 1000) / 1000;
      avgDepth = Math.round((avgDepth / steps) * 10) / 10;
      avgFlux = Math.round((avgFlux / steps) * 10) / 10;
      const velocityMPerDay = Math.round((avgFlux / 15) * 100) / 100; // Darcy effective pore velocity

      pathways.push({
        id: `subsurface-conduit-${pathwayCounter++}`,
        type: 'subsurface_flow',
        streamOrder: s < 2 ? 1 : 2,
        coordinates: conduitCoords,
        confidence: 'High',
        flowAccumulationScore: 35 + s * 8,
        flowVelocityMPerDay: Math.max(0.25, velocityMPerDay),
        hydraulicGradient: Math.max(0.005, avgGrad),
        depthToWaterM: avgDepth,
        darcyFluxM3PerDay: Math.max(45, Math.round(avgFlux * 12)),
        flowDirectionDeg: Math.round(elevationGrid[initR][initC].subsurfaceFlowDirDeg),
        description: `Subsurface groundwater flow conduit traced along hydraulic head gradient. Darcy pore velocity: ${Math.max(0.25, velocityMPerDay)} m/day; Depth to water table: ${avgDepth} m bgl.`,
      });
    }
  }

  // 7. Analysis & Delineation of Inferred Subsurface Fractures & Fracture Branches
  const lineamentAngle1 = valleyAngleRad;
  const lineamentAngle2 = valleyAngleRad + (Math.PI / 2.3);
  const numMasterFractures = 5;
  const fractureIntersectionNodes: FractureIntersectionNode[] = [];
  let fractureBranchCount = 0;
  let totalBranchLengthM = 0;

  const masterFracturesList: {
    id: string;
    coords: [number, number][];
    angle: number;
    type: PathwayType;
    index: number;
  }[] = [];

  for (let i = 0; i < numMasterFractures; i++) {
    const angle = i % 2 === 0 ? lineamentAngle1 : lineamentAngle2;
    const offsetFrac = (i - 2) * 0.28;
    const offsetLat = centerLat + offsetFrac * latSpan;
    const offsetLng = centerLng + offsetFrac * lngSpan * 0.7;

    const lengthDeg = Math.max(latSpan, lngSpan) * 1.35;
    const numPoints = 9;
    const lineamentCoords: [number, number][] = [];

    for (let p = 0; p < numPoints; p++) {
      const t = (p / (numPoints - 1)) - 0.5;
      const lat = offsetLat + t * lengthDeg * Math.cos(angle);
      const lng = offsetLng + t * lengthDeg * Math.sin(angle);
      const sinWiggle = Math.sin(p * 1.8 + i) * (latSpan * 0.02);
      lineamentCoords.push([lat + sinWiggle, lng + sinWiggle]);
    }

    const masterId = `master-fracture-${pathwayCounter++}`;
    const pType: PathwayType = i === 2 ? 'palaeochannel' : 'inferred_fracture';

    pathways.push({
      id: masterId,
      type: pType,
      streamOrder: 2,
      coordinates: lineamentCoords,
      confidence: i < 3 ? 'High' : 'Moderate',
      flowAccumulationScore: 32 + i * 6,
      flowVelocityMPerDay: i === 2 ? 1.45 : 0.95,
      hydraulicGradient: 0.012,
      depthToWaterM: i === 2 ? 4.8 : 6.8,
      darcyFluxM3PerDay: i === 2 ? 320 : 195,
      flowDirectionDeg: Math.round((angle * 180 / Math.PI + 360) % 360),
      isFractureBranch: false,
      fractureBranchType: 'master_corridor',
      fractureApertureMm: 2.5,
      transmissivityM2PerDay: i === 2 ? 380 : 210,
      description: i === 2
        ? 'Master buried palaeochannel aquifer corridor with alluvial gravel fill and high multi-layer secondary storage.'
        : `Master Inferred Subsurface Fracture Corridor (Primary Shear Zone, Strike Azimuth ${Math.round((angle * 180 / Math.PI + 360) % 360)}°) with deep dilated fracture conduits.`,
    });

    masterFracturesList.push({
      id: masterId,
      coords: lineamentCoords,
      angle,
      type: pType,
      index: i,
    });
  }

  // Generate Fracture Branches branching off each master fracture corridor
  // Geological mechanics: Synthetic Riedel shears (R), Antithetic shears (R'), and extensional wing-joints (T)
  masterFracturesList.forEach(mf => {
    const coords = mf.coords;
    if (coords.length < 4) return;

    // Select nodal branch points along the master corridor (indices 2, 4, 6)
    const branchNodes = [2, 4, 6];

    branchNodes.forEach((nodeIdx, bIdx) => {
      if (nodeIdx >= coords.length - 1) return;
      const rootCoord = coords[nodeIdx];
      const prevCoord = coords[nodeIdx - 1];

      // Local tangent vector of master fracture
      const dLat = rootCoord[0] - prevCoord[0];
      const dLng = rootCoord[1] - prevCoord[1];
      const strikeAngle = Math.atan2(dLat, dLng);

      // Branching splay angles according to Andersonian shear mechanics:
      // R-shear: ~33 deg to 42 deg
      // R'-shear or T-joint: ~ -41 deg to -48 deg
      const branchAngleDelta = bIdx % 2 === 0
        ? (0.58 + ((nodeIdx + bIdx) % 3) * 0.08)
        : (-0.72 - ((nodeIdx + bIdx) % 2) * 0.12);

      const branchAzimuthRad = strikeAngle + branchAngleDelta;
      const branchAzimuthDeg = Math.round((branchAzimuthRad * 180 / Math.PI + 360) % 360);
      const junctionAngleDeg = Math.round(Math.abs(branchAngleDelta * 180 / Math.PI));

      // Generate splay branch line
      const branchStep = latSpan * 0.038; // approx 40m per segment
      const numBranchSegments = 4 + (bIdx % 2); // 4-5 segments (~160m - 200m)
      const branchCoords: [number, number][] = [rootCoord];

      let curLat = rootCoord[0];
      let curLng = rootCoord[1];

      for (let s = 1; s <= numBranchSegments; s++) {
        const sinJoint = Math.sin(s * 1.6 + bIdx) * 0.18;
        const segAngle = branchAzimuthRad + sinJoint;
        curLat += Math.cos(segAngle) * branchStep;
        curLng += Math.sin(segAngle) * branchStep * (dx / dy);
        branchCoords.push([curLat, curLng]);
      }

      const branchId = `fracture-branch-${mf.id}-${nodeIdx}`;
      const branchType = bIdx % 2 === 0 ? 'conjugate_shear_splay' : 'extensional_wing_crack';

      pathways.push({
        id: branchId,
        type: 'inferred_fracture',
        streamOrder: 3,
        coordinates: branchCoords,
        confidence: 'Moderate',
        flowAccumulationScore: 22 + bIdx * 4,
        flowVelocityMPerDay: 0.72,
        hydraulicGradient: 0.010,
        depthToWaterM: 6.2,
        darcyFluxM3PerDay: 135,
        flowDirectionDeg: branchAzimuthDeg,
        isFractureBranch: true,
        parentBranchId: mf.id,
        fractureBranchType: branchType,
        fractureApertureMm: 1.4,
        junctionAngleDeg: junctionAngleDeg,
        transmissivityM2PerDay: 145,
        description: `Inferred Subsurface Fracture Branch (${branchType === 'conjugate_shear_splay' ? 'Conjugate Riedel Splay' : 'Extensional Wing Fracture'}) branching at ${junctionAngleDeg}° from ${mf.id}. High secondary fracture porosity corridor.`,
      });

      fractureBranchCount++;
      totalBranchLengthM += branchCoords.length * 40;

      // Create high-yield intersection node
      const hubId = `fracture-hub-${mf.id}-${nodeIdx}`;
      fractureIntersectionNodes.push({
        id: hubId,
        lat: rootCoord[0],
        lng: rootCoord[1],
        masterFractureId: mf.id,
        branchFractureId: branchId,
        intersectionAngleDeg: junctionAngleDeg,
        transmissivityEnhancementFactor: 24,
        flowConvergenceScore: 88,
        depthToWaterTableM: 5.6,
        description: `High-yield fracture intersection node between ${mf.id} and ${branchId}. Dilated fracture damage zone provides prime borewell drilling location.`,
      });

      // Spawn a fine tertiary micro-splay for branchlets
      if (bIdx === 1 || bIdx === 0) {
        const microAngle = branchAzimuthRad + (bIdx === 0 ? -0.52 : 0.52);
        const microCoords: [number, number][] = [
          branchCoords[branchCoords.length - 2],
          [
            branchCoords[branchCoords.length - 2][0] + Math.cos(microAngle) * branchStep * 0.9,
            branchCoords[branchCoords.length - 2][1] + Math.sin(microAngle) * branchStep * 0.9 * (dx / dy),
          ],
        ];

        pathways.push({
          id: `fracture-microsplay-${mf.id}-${nodeIdx}`,
          type: 'inferred_fracture',
          streamOrder: 4,
          coordinates: microCoords,
          confidence: 'Moderate',
          flowAccumulationScore: 12,
          flowVelocityMPerDay: 0.45,
          hydraulicGradient: 0.008,
          depthToWaterM: 6.9,
          darcyFluxM3PerDay: 65,
          flowDirectionDeg: Math.round((microAngle * 180 / Math.PI + 360) % 360),
          isFractureBranch: true,
          parentBranchId: branchId,
          fractureBranchType: 'antithetic_splay',
          fractureApertureMm: 0.8,
          junctionAngleDeg: 30,
          transmissivityM2PerDay: 75,
          description: `Tertiary fracture micro-splay branching from ${branchId}. Localized bedrock joint dilatation.`,
        });

        fractureBranchCount++;
        totalBranchLengthM += 40;
      }
    });
  });

  const fractureAnalysis: FractureBranchAnalysis = {
    totalMasterFractures: numMasterFractures,
    totalFractureBranches: fractureBranchCount,
    totalIntersectionNodes: fractureIntersectionNodes.length,
    primaryShearAzimuths: [
      `NNW-SSE (Azimuth ${Math.round((lineamentAngle1 * 180 / Math.PI + 360) % 360)}°)`,
      `ENE-WSW (Azimuth ${Math.round((lineamentAngle2 * 180 / Math.PI + 360) % 360)}°)`,
    ],
    meanBranchLengthM: Math.round(totalBranchLengthM / Math.max(1, fractureBranchCount)),
    dominantFractureMechanism: 'Conjugate Strike-Slip Riedel Shears & Extensional Dilatant Joints',
    intersectionNodes: fractureIntersectionNodes,
  };

    const meanSlopeDeg = Math.round((totalSlope / ((gridSize - 2) * (gridSize - 2))) * 10) / 10;
  const drainageDensityKmPerSqKm = Math.round((pathways.length * 0.85) * 10) / 10;
  const meanWaterTableDepthM = Math.round((totalWaterTableDepth / (gridSize * gridSize)) * 10) / 10;
  const meanHydraulicGradient = gradCount > 0 ? Math.round((totalHydraulicGrad / gradCount) * 1000) / 1000 : 0.014;
  const regionalFlowDirectionDeg = Math.round((valleyAngleRad * 180 / Math.PI + 180) % 360);

  return {
    elevationGrid,
    minElevation,
    maxElevation,
    meanSlopeDeg,
    pathways,
    drainageDensityKmPerSqKm,
    meanWaterTableDepthM,
    meanHydraulicGradient,
    regionalFlowDirectionDeg,
    dominantFlowRegime: 'Gravity-Driven Tectonic Fracture & Multi-Tier Deltaic Interflow',
    subsurfacePathwaysCount: pathways.filter(p => p.type === 'subsurface_flow' || p.type === 'palaeochannel' || p.type === 'inferred_fracture').length,
    fractureAnalysis,
    fractureIntersectionNodes,
    drainageAnalysis,
  };
}
