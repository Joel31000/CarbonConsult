export const emissionFactors = {
  materials: [
    { name: "Acier (Recyclé)", factor: 0.5, unit: "kg CO2e/kg" },
    { name: "Acier (Vierge)", factor: 2.0, unit: "kg CO2e/kg" },
    { name: "Aluminium (Recyclé)", factor: 1.5, unit: "kg CO2e/kg" },
    { name: "Aluminium (Vierge)", factor: 11.0, unit: "kg CO2e/kg" },
    { name: "Plastique (PET)", factor: 2.3, unit: "kg CO2e/kg" },
    { name: "Verre", factor: 0.9, unit: "kg CO2e/kg" },
    { name: "Papier/Carton", factor: 0.6, unit: "kg CO2e/kg" },
    { name: "Béton", factor: 0.13, unit: "kg CO2e/kg" },
    { name: "Bois (Source durable)", factor: 0.05, unit: "kg CO2e/kg" },
  ],
  manufacturing: [
    { name: "Usinage", factor: 5.0, unit: "kg CO2e/hr" },
    { name: "Soudage", factor: 7.5, unit: "kg CO2e/hr" },
    { name: "Assemblage", factor: 1.2, unit: "kg CO2e/hr" },
    { name: "Peinture", factor: 3.0, unit: "kg CO2e/hr" },
    { name: "Impression 3D (Plastique)", factor: 6.0, unit: "kg CO2e/hr" },
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
