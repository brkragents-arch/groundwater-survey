export type PotentialClass =
  | 'Very High Potential'
  | 'High Potential'
  | 'Moderate Potential'
  | 'Low Potential'
  | 'Very Low Potential';

export type ConfidenceLevel = 'High' | 'Moderate' | 'Low';

export type PathwayType =
  | 'surface_drainage'
  | 'inferred_fracture'
  | 'palaeochannel'
  | 'lineament_intersection'
  | 'subsurface_flow'
  | 'sub_pathway'
  | 'recharge_zone';

export interface BranchingPathway {
  id: string;
  type: PathwayType;
  streamOrder: number; // 1 (major) to 4 (minor tributary)
  coordinates: [number, number][]; // [lat, lng]
  confidence: ConfidenceLevel;
  flowAccumulationScore: number;
  description: string;
  flowVelocityMPerDay?: number;
  hydraulicGradient?: number;
  depthToWaterM?: number;
  flowDirectionDeg?: number;
  darcyFluxM3PerDay?: number;
}

export interface BorewellCandidate {
  id: string; // e.g. "BW-01"
  rank: 1 | 2 | 3;
  pinColor: 'gold' | 'blue' | 'green';
  lat: number;
  lng: number;
  elevationM: number;
  suitabilityScore: number; // 0 - 100
  potentialClass: PotentialClass;
  confidence: ConfidenceLevel;
  confidenceReason: string;
  aquiferType: string;
  lithologyUnit: string;
  weatheredZoneDepthM: number;
  lineamentEvidence: string;
  drainageConvergence: string;
  rechargeCharacteristics: string;
  indicativeDepthRange: {
    minM: number;
    maxM: number;
    minFt: number;
    maxFt: number;
    defensibility: 'Defensible' | 'Moderate' | 'Insufficient evidence';
    justification: string;
  };
  expectedYieldRange: {
    minLph: number;
    maxLph: number;
    minLps: number;
    maxLps: number;
    inchEquivalent: string;
    defensibility: 'Defensible' | 'Moderate' | 'Insufficient evidence';
    justification: string;
  };
  seasonalVariability: string;
  potentialRisks: string[];
  verificationChecklist: string[];
  criteriaScores: {
    lithology: number;
    lineaments: number;
    geomorphology: number;
    drainage: number;
    slope: number;
    soilLandCover: number;
    rainfall: number;
    existingWells: number;
  };
  distanceToNearestDrainageM: number;
  distanceToNearestLineamentM: number;
  surveyNumber: string; // e.g. "Sy. No. 42/1A (Bhuvan NRSC)"
  cadastralLandUse?: string;
}

export interface MCDAWeights {
  lithology: number;
  lineaments: number;
  geomorphology: number;
  drainage: number;
  slope: number;
  soilLandCover: number;
  rainfall: number;
  existingWells: number;
}

export interface CadastralParcel {
  id: string;
  surveyNumber: string; // e.g. "Sy. No. 42/1"
  subDivision: string;
  extentAcres: number;
  extentHectares: number;
  landUse: string; // "Dry Agricultural Patta", "Wet Wetland", "Government Poramboke"
  revenueVillage: string;
  coordinates: [number, number][]; // Polygon ring
  center: [number, number];
  bhuvanVerified: boolean;
  bhuvanSourceUrl: string;
}

export interface SurveyBoundary {
  id: string;
  name: string;
  coordinates: [number, number][]; // [lat, lng] polygon
  center: [number, number];
  areaHectares: number;
  areaAcres: number;
  perimeterKm: number;
  stateDistrict?: string;
  surveyNumber?: string;
  cadastralParcels?: CadastralParcel[];
}

export interface HistoricalWellRecord {
  id: string;
  lat: number;
  lng: number;
  totalDepthM: number;
  waterStrikeDepthM: number[];
  yieldLph: number;
  status: 'Productive' | 'Moderate' | 'Failed / Dry';
  casingDepthM: number;
  drillingYear: number;
  lithologyEncountered: string;
}

export interface VESLayerModel {
  layerNumber: number;
  lithology: string;
  trueResistivityOhmM: number;
  thicknessM: number;
  depthToBottomM: number;
  hydrogeologicalInterpretation: string;
}

export interface VESSoundingData {
  spacingAB2: number[]; // Half current electrode spacing AB/2 in meters
  apparentResistivity: number[]; // Measured apparent resistivity in Ohm*m
  inversionModel: VESLayerModel[];
  fitErrorRmsPercent: number;
  aquiferConfirmation: 'Confirmed Aquifer Zone' | 'Probable Weathered Zone' | 'High Resistivity / Dry Bedrock' | 'Clay / Saline Risk';
}

export interface DataSourceProvenance {
  name: string;
  category: 'Satellite' | 'Elevation / DEM' | 'Geological' | 'Hydrometeorological' | 'Groundwater Well';
  source: string;
  resolutionOrScale: string;
  acquisitionDate: string;
  status: 'Live API' | 'Georeferenced Regional Catalog' | 'User Upload' | 'Hydrological Model';
  limitations: string;
}
