import { HistoricalWellRecord } from '../types/hydrogeology';

export interface CalibrationMetrics {
  totalWellsSampled: number;
  productiveCount: number;
  failureCount: number;
  successRatePercent: number;
  meanProductiveDepthM: number;
  meanYieldLph: number;
  primaryWaterStrikeDepthInterval: string;
  recommendedCasingDepthM: number;
  calibrationNotes: string;
}

export function computeHistoricalCalibration(wells: HistoricalWellRecord[]): CalibrationMetrics {
  if (wells.length === 0) {
    return {
      totalWellsSampled: 0,
      productiveCount: 0,
      failureCount: 0,
      successRatePercent: 65,
      meanProductiveDepthM: 110,
      meanYieldLph: 7500,
      primaryWaterStrikeDepthInterval: '25m - 90m',
      recommendedCasingDepthM: 18,
      calibrationNotes: 'Default regional calibration applied (no local well logs uploaded yet).',
    };
  }

  const productive = wells.filter(w => w.status === 'Productive');
  const failures = wells.filter(w => w.status === 'Failed / Dry');

  const productiveYields = productive.map(w => w.yieldLph).filter(y => y > 0);
  const meanYield = productiveYields.length > 0
    ? Math.round(productiveYields.reduce((a, b) => a + b, 0) / productiveYields.length)
    : 7000;

  const productiveDepths = productive.map(w => w.totalDepthM);
  const meanDepth = productiveDepths.length > 0
    ? Math.round(productiveDepths.reduce((a, b) => a + b, 0) / productiveDepths.length)
    : 115;

  const casings = wells.map(w => w.casingDepthM).filter(c => c > 0);
  const meanCasing = casings.length > 0
    ? Math.round(casings.reduce((a, b) => a + b, 0) / casings.length)
    : 16;

  const successRate = Math.round((productive.length / wells.length) * 100);

  return {
    totalWellsSampled: wells.length,
    productiveCount: productive.length,
    failureCount: failures.length,
    successRatePercent: successRate,
    meanProductiveDepthM: meanDepth,
    meanYieldLph: meanYield,
    primaryWaterStrikeDepthInterval: '28m - 85m (Saprolite base & First fracture set)',
    recommendedCasingDepthM: Math.max(meanCasing, 15),
    calibrationNotes: `Calibrated with ${wells.length} field well logs in this geological quadrangle. Historical success rate: ${successRate}%.`,
  };
}
