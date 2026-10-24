import { MCDAWeights, PotentialClass } from '../types/hydrogeology';

export const DEFAULT_MCDA_WEIGHTS: MCDAWeights = {
  lithology: 20,
  lineaments: 20,
  geomorphology: 15,
  drainage: 10,
  slope: 10,
  soilLandCover: 10,
  rainfall: 10,
  existingWells: 5,
};

export function classifyPotentialScore(score: number): PotentialClass {
  if (score >= 80) return 'Very High Potential';
  if (score >= 65) return 'High Potential';
  if (score >= 50) return 'Moderate Potential';
  if (score >= 35) return 'Low Potential';
  return 'Very Low Potential';
}

export function calculateWeightedPotentialScore(
  scores: {
    lithology: number; // 0 - 100
    lineaments: number; // 0 - 100
    geomorphology: number; // 0 - 100
    drainage: number; // 0 - 100
    slope: number; // 0 - 100
    soilLandCover: number; // 0 - 100
    rainfall: number; // 0 - 100
    existingWells: number; // 0 - 100
  },
  weights: MCDAWeights = DEFAULT_MCDA_WEIGHTS
): { totalScore: number; potentialClass: PotentialClass } {
  const totalWeight =
    weights.lithology +
    weights.lineaments +
    weights.geomorphology +
    weights.drainage +
    weights.slope +
    weights.soilLandCover +
    weights.rainfall +
    weights.existingWells;

  const normalizedTotal =
    (scores.lithology * weights.lithology +
      scores.lineaments * weights.lineaments +
      scores.geomorphology * weights.geomorphology +
      scores.drainage * weights.drainage +
      scores.slope * weights.slope +
      scores.soilLandCover * weights.soilLandCover +
      scores.rainfall * weights.rainfall +
      scores.existingWells * weights.existingWells) /
    (totalWeight || 100);

  const rounded = Math.round(normalizedTotal * 10) / 10;
  return {
    totalScore: rounded,
    potentialClass: classifyPotentialScore(rounded),
  };
}

/**
 * Normalizes slope in degrees to infiltration suitability score (0-100).
 * Gentle flat-to-undulating slopes (0-3 deg) facilitate maximum infiltration,
 * while steep slopes (>15 deg) produce excessive runoff and low infiltration.
 */
export function scoreSlopeForGroundwater(slopeDeg: number): number {
  if (slopeDeg <= 2.0) return 95; // Nearly flat / Valley bottom: optimal infiltration
  if (slopeDeg <= 5.0) return 82; // Gentle undulating slope: good infiltration
  if (slopeDeg <= 9.0) return 60; // Moderate slope: moderate runoff
  if (slopeDeg <= 15.0) return 38; // Steep slope: high runoff
  return 18; // Very steep escarpment: negligible infiltration
}
