import { VESSoundingData, VESLayerModel, BorewellCandidate } from '../types/hydrogeology';

/**
 * Standard Schlumberger electrode spacing AB/2 in meters
 */
export const STANDARD_AB2_SPACINGS = [1.5, 2.5, 4.0, 6.0, 8.0, 12.0, 18.0, 25.0, 35.0, 50.0, 70.0, 100.0, 140.0, 180.0];

/**
 * Simulates a realistic 1D Schlumberger Vertical Electrical Sounding (VES) apparent
 * resistivity curve based on candidate point hydrogeological conditions.
 */
export function simulateVESSoundingForCandidate(candidate: BorewellCandidate): VESSoundingData {
  const isHighPotential = candidate.suitabilityScore >= 75;
  const isBasalt = candidate.lithologyUnit.toLowerCase().includes('basalt');

  // Define forward model true layers
  const layers: VESLayerModel[] = isBasalt
    ? [
        {
          layerNumber: 1,
          lithology: 'Black cotton soil / silt overburden',
          trueResistivityOhmM: 18,
          thicknessM: 2.5,
          depthToBottomM: 2.5,
          hydrogeologicalInterpretation: 'High clay content; impermeable topsoil layer.',
        },
        {
          layerNumber: 2,
          lithology: 'Weathered vesicular basalt',
          trueResistivityOhmM: 35,
          thicknessM: 14.0,
          depthToBottomM: 16.5,
          hydrogeologicalInterpretation: 'Primary unconfined shallow aquifer zone; moderate yield.',
        },
        {
          layerNumber: 3,
          lithology: 'Fractured amygdaloidal basalt with interflow zeolites',
          trueResistivityOhmM: isHighPotential ? 65 : 120,
          thicknessM: 32.0,
          depthToBottomM: 48.5,
          hydrogeologicalInterpretation: isHighPotential
            ? 'CONFIRMED CONFINED AQUIFER: High porosity and secondary fracture permeability.'
            : 'Moderately fractured basalt with limited water storage.',
        },
        {
          layerNumber: 4,
          lithology: 'Dense compact massive basalt (trap bedrock)',
          trueResistivityOhmM: 850,
          thicknessM: 150,
          depthToBottomM: 198.5,
          hydrogeologicalInterpretation: 'Impermeable basal aquifuge; drilling beyond this depth is non-productive.',
        },
      ]
    : [
        {
          layerNumber: 1,
          lithology: 'Red gravelly sandy soil',
          trueResistivityOhmM: 65,
          thicknessM: 2.0,
          depthToBottomM: 2.0,
          hydrogeologicalInterpretation: 'Unsaturated aerated topsoil; high infiltration capacity.',
        },
        {
          layerNumber: 2,
          lithology: 'Weathered Granitic Saprolite (Lithomargic zone)',
          trueResistivityOhmM: 28,
          thicknessM: candidate.weatheredZoneDepthM,
          depthToBottomM: candidate.weatheredZoneDepthM + 2.0,
          hydrogeologicalInterpretation: 'Porous semi-decomposed saprolite functioning as groundwater sponge/reservoir.',
        },
        {
          layerNumber: 3,
          lithology: 'Fractured Saturated Crystalline Gneiss Bedrock',
          trueResistivityOhmM: isHighPotential ? 88 : 165,
          thicknessM: 45.0,
          depthToBottomM: candidate.weatheredZoneDepthM + 47.0,
          hydrogeologicalInterpretation: isHighPotential
            ? 'HIGH-YIELD FRACTURED AQUIFER: Saturated interconnected joint system (Optimal drilling target).'
            : 'Moderately fractured crystalline rock with tight hairline fractures.',
        },
        {
          layerNumber: 4,
          lithology: 'Massive Unweathered Crystalline Basement Granite',
          trueResistivityOhmM: 1850,
          thicknessM: 120,
          depthToBottomM: candidate.weatheredZoneDepthM + 167.0,
          hydrogeologicalInterpretation: 'Massive crystalline bedrock with near-zero porosity (Hard basement).',
        },
      ];

  // Calculate apparent resistivity at each AB/2 spacing using linear filter / asymptote approximation
  const apparentResistivity = STANDARD_AB2_SPACINGS.map(ab2 => {
    // At small AB/2, app res is close to topsoil
    // At intermediate AB/2 (5 - 25m), app res dips into weathered saprolite (H-type or HK-type sounding curve)
    // At large AB/2 (> 60m), app res climbs towards massive basement resistivity
    let rhoA = 0;
    if (ab2 <= 3) {
      rhoA = layers[0].trueResistivityOhmM;
    } else if (ab2 <= 15) {
      // Transition through weathered zone
      const t = (ab2 - 3) / 12;
      rhoA = layers[0].trueResistivityOhmM * (1 - t) + layers[1].trueResistivityOhmM * t;
    } else if (ab2 <= 60) {
      // Transition through fractured aquifer
      const t = (ab2 - 15) / 45;
      rhoA = layers[1].trueResistivityOhmM * (1 - t) + layers[2].trueResistivityOhmM * t;
    } else {
      // Asymptote climbing toward basement
      const t = Math.min(1.0, (ab2 - 60) / 120);
      rhoA = layers[2].trueResistivityOhmM * (1 - t) + layers[3].trueResistivityOhmM * t * 0.75;
    }

    // Add 2% realistic field measurement noise
    const noise = 1 + (Math.sin(ab2 * 7.3) * 0.02);
    return Math.round(rhoA * noise * 10) / 10;
  });

  const aquiferConfirmation = isHighPotential
    ? 'Confirmed Aquifer Zone'
    : candidate.suitabilityScore >= 65
    ? 'Probable Weathered Zone'
    : 'High Resistivity / Dry Bedrock';

  return {
    spacingAB2: STANDARD_AB2_SPACINGS,
    apparentResistivity,
    inversionModel: layers,
    fitErrorRmsPercent: 2.8,
    aquiferConfirmation,
  };
}
