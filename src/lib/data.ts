export const emissionFactors = {
  materials: [
    { name: "Acier (Recyclé)", factor: 0.5, unit: "kg CO2e/kg" },
    { name: "Acier (Vierge)", factor: 2.0, unit: "kg CO2e/kg" },
    { name: "Aluminium (Recyclé)", factor: 1.5, unit: "kg CO2e/kg" },
    { name: "Aluminium (Vierge)", factor: 11.0, unit: "kg CO2e/kg" },
    { name: "Plastique (PET)", factor: 2.3, unit: "kg CO2e/kg" },
    { name: "Verre", factor: 0.9, unit: "kg CO2e/kg" },
    { name: "Papier/Carton", factor: 0.6, unit: "kg CO2e/kg" },
    { name: "Béton", factor: 0.13, unit: "kg CO2e/kg" }, // Facteur par défaut/générique
    { name: "Bois (Source durable)", factor: 0.05, unit: "kg CO2e/kg" },
  ],
  concrete: [
    // Facteurs originaux en tCO2/m3. Conversion en kgCO2/kg en supposant une densité de 2400 kg/m3.
    // (facteur_t * 1000) / 2400
    { name: "CEM I (ATILH)", factor: 0.313, unit: "kg CO2e/kg", originalFactor: 0.752, originalUnit: "tCO2eq/m³" },
    { name: "CEM II/A-LL ou LL (ATILH)", factor: 0.267, unit: "kg CO2e/kg", originalFactor: 0.64, originalUnit: "tCO2eq/m³" },
    { name: "CEM II/A-S A-M et A-V (ATILH)", factor: 0.258, unit: "kg CO2e/kg", originalFactor: 0.619, originalUnit: "tCO2eq/m³" },
    { name: "CEM II/B-L ou LL (ATILH)", factor: 0.228, unit: "kg CO2e/kg", originalFactor: 0.547, originalUnit: "tCO2eq/m³" },
    { name: "CEM II/B-M CEM II/B-S (ATILH)", factor: 0.231, unit: "kg CO2e/kg", originalFactor: 0.554, originalUnit: "tCO2eq/m³" },
    { name: "CEM III/A (ATILH)", factor: 0.195, unit: "kg CO2e/kg", originalFactor: 0.467, originalUnit: "tCO2eq/m³" },
    { name: "CEM III/A PM et ES (ATILH)", factor: 0.139, unit: "kg CO2e/kg", originalFactor: 0.334, originalUnit: "tCO2eq/m³" },
    { name: "CEM III/B (ATILH)", factor: 0.132, unit: "kg CO2e/kg", originalFactor: 0.316, originalUnit: "tCO2eq/m³" },
    { name: "CEM III/C (ATILH)", factor: 0.083, unit: "kg CO2e/kg", originalFactor: 0.199, originalUnit: "tCO2eq/m³" },
    { name: "CEM V/A (S-V) (ATILH)", factor: 0.200, unit: "kg CO2e/kg", originalFactor: 0.479, originalUnit: "tCO2eq/m³" },
    { name: "CEM VI (ECOCEM)", factor: 0.174, unit: "kg CO2e/kg", originalFactor: 0.417, originalUnit: "tCO2eq/m³" },
  ],
  manufacturing: [
    { name: "Usinage", factor: 5.0, unit: "kg CO2e/hr" },
    { name: "Soudage", factor: 7.5, unit: "kg CO2e/hr" },
    { name: "Assemblage", factor: 1.2, unit: "kg CO2e/hr" },
    { name: "Peinture", factor: 3.0, unit: "kg CO2e/hr" },
    { name: "Impression 3D (Plastique)", factor: 6.0, unit: "kg CO2e/hr" },
  ],
  implementation: [
    { name: "Grue", factor: 13.5, unit: "kg CO2e/hr" },
    { name: "Bétonnière", factor: 8.5, unit: "kg CO2e/hr" },
    { name: "Groupe électrogène", factor: 10.5, unit: "kg CO2e/hr" },
    { name: "Pelleuteuse", factor: 20.0, unit: "kg CO2e/hr" },
    { name: "Pelle araignée", factor: 14.5, unit: "kg CO2e/hr" },
    { name: "Compacteur", factor: 18.0, unit: "kg CO2e/hr" },
    { name: "Bulldozer", factor: 27.5, unit: "kg CO2e/hr" },
    { name: "Chargeuse", factor: 14.0, unit: "kg CO2e/hr" },
  ],
  transport: [
    { name: "Route (Camion diesel)", factor: 0.1, unit: "kg CO2e/t-km" },
    { name: "Route (Camion électrique)", factor: 0.04, unit: "kg CO2e/t-km" },
    { name: "Rail", factor: 0.02, unit: "kg CO2e/t-km" },
    { name: "Mer", factor: 0.01, unit: "kg CO2e/t-km" },
    { name: "Air", factor: 0.6, unit: "kg CO2e/t-km" },
  ],
  endOfLife: [
    { name: "Mise en décharge", factor: 0.2, unit: "kg CO2e/kg" },
    { name: "Incinération", factor: 1.0, unit: "kg CO2e/kg" },
    { name: "Recyclage (Métaux)", factor: -1.8, unit: "kg CO2e/kg" },
    { name: "Recyclage (Plastiques)", factor: -1.2, unit: "kg CO2e/kg" },
    { name: "Compostage", factor: -0.1, unit: "kg CO2e/kg" },
  ],
};

export type EmissionFactors = typeof emissionFactors;
