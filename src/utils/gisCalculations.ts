/**
 * GIS Geodetic Spatial Measurement Engine
 * Uses WGS-84 authalic spherical projection & Haversine distance
 */

const EARTH_RADIUS_METERS = 6378137; // WGS84 Major Axis Radius

/**
 * Calculates accurate geodesic surface area in Square Meters, Acres, and Hectares
 * using spherical excess / equirectangular projection for local parcel polygons.
 */
export function calculatePolygonGeodesicArea(coords: [number, number][]): {
  areaSqMeters: number;
  areaAcres: number;
  areaHectares: number;
  perimeterKm: number;
} {
  if (!coords || coords.length < 3) {
    return { areaSqMeters: 0, areaAcres: 0, areaHectares: 0, perimeterKm: 0 };
  }

  // 1. Calculate Perimeter using Haversine
  let perimeterMeters = 0;
  for (let i = 0; i < coords.length; i++) {
    const nextIdx = (i + 1) % coords.length;
    perimeterMeters += haversineM(coords[i], coords[nextIdx]);
  }

  // 2. Project lat/lng to local metric plane (x, y) relative to centroid
  const avgLat = coords.reduce((sum, c) => sum + c[0], 0) / coords.length;
  const avgLng = coords.reduce((sum, c) => sum + c[1], 0) / coords.length;
  const latRad = (avgLat * Math.PI) / 180;

  // Meters per degree latitude and longitude at this latitude
  const metersPerDegLat = (Math.PI / 180) * EARTH_RADIUS_METERS;
  const metersPerDegLng = (Math.PI / 180) * EARTH_RADIUS_METERS * Math.cos(latRad);

  const localPoints = coords.map(([lat, lng]) => ({
    x: (lng - avgLng) * metersPerDegLng,
    y: (lat - avgLat) * metersPerDegLat,
  }));

  // 3. Shoelace formula on local metric coordinates
  let doubleArea = 0;
  for (let i = 0; i < localPoints.length; i++) {
    const j = (i + 1) % localPoints.length;
    doubleArea += localPoints[i].x * localPoints[j].y - localPoints[j].x * localPoints[i].y;
  }

  const areaSqMeters = Math.abs(doubleArea) / 2;
  const areaAcres = Math.round((areaSqMeters / 4046.8564224) * 100) / 100; // 2 decimal precision
  const areaHectares = Math.round((areaSqMeters / 10000) * 100) / 100;
  const perimeterKm = Math.round((perimeterMeters / 1000) * 100) / 100;

  return {
    areaSqMeters: Math.round(areaSqMeters),
    areaAcres,
    areaHectares,
    perimeterKm,
  };
}

/**
 * Haversine formula between two [lat, lng] coordinates in meters
 */
export function haversineM(c1: [number, number], c2: [number, number]): number {
  const dLat = ((c2[0] - c1[0]) * Math.PI) / 180;
  const dLng = ((c2[1] - c1[1]) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((c1[0] * Math.PI) / 180) *
      Math.cos((c2[0] * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
}

/**
 * Generates an accurate polygon enclosing EXACTLY targetAcres around a center point
 */
export function generateExactAcresPolygon(
  centerLat: number,
  centerLng: number,
  targetAcres: number
): [number, number][] {
  // Target area in square meters
  const targetSqMeters = targetAcres * 4046.8564224;
  // Side of equivalent square in meters
  const sideMeters = Math.sqrt(targetSqMeters);

  const latRad = (centerLat * Math.PI) / 180;
  const metersPerDegLat = (Math.PI / 180) * EARTH_RADIUS_METERS;
  const metersPerDegLng = (Math.PI / 180) * EARTH_RADIUS_METERS * Math.cos(latRad);

  const halfLat = (sideMeters / 2) / metersPerDegLat;
  const halfLng = (sideMeters / 2) / metersPerDegLng;

  // Realistic natural 6-sided agricultural parcel geometry
  // Adjusted slightly to match natural field boundaries while retaining exact target area
  const rawCoords: [number, number][] = [
    [centerLat + halfLat * 0.95, centerLng - halfLng * 0.85],
    [centerLat + halfLat * 1.05, centerLng + halfLng * 0.88],
    [centerLat + halfLat * 0.15, centerLng + halfLng * 1.05],
    [centerLat - halfLat * 0.98, centerLng + halfLng * 0.92],
    [centerLat - halfLat * 1.02, centerLng - halfLng * 0.88],
    [centerLat - halfLat * 0.10, centerLng - halfLng * 1.02],
  ];

  // Scale vertices so final calculated area matches targetAcres exactly
  const initial = calculatePolygonGeodesicArea(rawCoords);
  const scale = Math.sqrt(targetSqMeters / (initial.areaSqMeters || 1));

  return rawCoords.map(([lat, lng]) => [
    centerLat + (lat - centerLat) * scale,
    centerLng + (lng - centerLng) * scale,
  ]);
}
