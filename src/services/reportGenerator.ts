import { BorewellCandidate, BranchingPathway, SurveyBoundary } from '../types/hydrogeology';

export function exportSurveyToGeoJSON(
  boundary: SurveyBoundary,
  candidates: BorewellCandidate[],
  pathways: BranchingPathway[]
): string {
  const features: any[] = [];

  // Survey Boundary Polygon
  if (boundary.coordinates.length >= 3) {
    // GeoJSON coordinates are [longitude, latitude]
    const ring = boundary.coordinates.map(([lat, lng]) => [lng, lat]);
    // Close ring if not closed
    if (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1]) {
      ring.push(ring[0]);
    }

    features.push({
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [ring],
      },
      properties: {
        layer: 'survey_boundary',
        name: boundary.name,
        areaHectares: boundary.areaHectares,
        areaAcres: boundary.areaAcres,
        perimeterKm: boundary.perimeterKm,
        stroke: '#facc15',
        strokeWidth: 3.5,
      },
    });
  }

  // Branching Cyan Network (Drainage & Lineament Pathways)
  for (const pw of pathways) {
    features.push({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: pw.coordinates.map(([lat, lng]) => [lng, lat]),
      },
      properties: {
        layer: pw.type,
        streamOrder: pw.streamOrder,
        confidence: pw.confidence,
        flowAccumulation: pw.flowAccumulationScore,
        description: pw.description,
        stroke: '#00f3ff',
      },
    });
  }

  // Top 3 Candidate Borewell Points
  for (const cand of candidates) {
    features.push({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [cand.lng, cand.lat],
      },
      properties: {
        layer: 'recommended_borewell_point',
        candidateId: cand.id,
        rank: cand.rank,
        surveyNumber: cand.surveyNumber,
        bhuvanCadastralSource: 'https://bhuvan.nrsc.gov.in/',
        suitabilityScore: cand.suitabilityScore,
        potentialClass: cand.potentialClass,
        confidence: cand.confidence,
        elevationM: cand.elevationM,
        lithology: cand.lithologyUnit,
        aquiferType: cand.aquiferType,
        indicativeDepthMeters: `${cand.indicativeDepthRange.minM} - ${cand.indicativeDepthRange.maxM} m`,
        expectedYieldLPH: `${cand.expectedYieldRange.minLph} - ${cand.expectedYieldRange.maxLph} LPH`,
        markerColor: cand.pinColor,
      },
    });
  }

  const geojson = {
    type: 'FeatureCollection',
    name: `AQUASYNC_Groundwater_Survey_${boundary.name.replace(/\s+/g, '_')}`,
    crs: {
      type: 'name',
      properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' },
    },
    features,
  };

  return JSON.stringify(geojson, null, 2);
}

export function triggerDownload(content: string, filename: string, mimeType: string = 'application/json') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
