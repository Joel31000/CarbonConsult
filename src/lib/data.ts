export const emissionFactors = {
  materials: [
    { name: "Steel (Recycled)", factor: 0.5, unit: "kg CO2e/kg" },
    { name: "Steel (Virgin)", factor: 2.0, unit: "kg CO2e/kg" },
    { name: "Aluminum (Recycled)", factor: 1.5, unit: "kg CO2e/kg" },
    { name: "Aluminum (Virgin)", factor: 11.0, unit: "kg CO2e/kg" },
    { name: "Plastic (PET)", factor: 2.3, unit: "kg CO2e/kg" },
    { name: "Glass", factor: 0.9, unit: "kg CO2e/kg" },
    { name: "Paper/Cardboard", factor: 0.6, unit: "kg CO2e/kg" },
    { name: "Concrete", factor: 0.13, unit: "kg CO2e/kg" },
    { name: "Wood (Sustainably Sourced)", factor: 0.05, unit: "kg CO2e/kg" },
  ],
  manufacturing: [
    { name: "Machining", factor: 5.0, unit: "kg CO2e/hr" },
    { name: "Welding", factor: 7.5, unit: "kg CO2e/hr" },
    { name: "Assembly", factor: 1.2, unit: "kg CO2e/hr" },
    { name: "Painting", factor: 3.0, unit: "kg CO2e/hr" },
    { name: "3D Printing (Plastic)", factor: 6.0, unit: "kg CO2e/hr" },
  ],
  transport: [
    { name: "Road (Diesel Truck)", factor: 0.1, unit: "kg CO2e/t-km" },
    { name: "Road (Electric Truck)", factor: 0.04, unit: "kg CO2e/t-km" },
    { name: "Rail", factor: 0.02, unit: "kg CO2e/t-km" },
    { name: "Sea", factor: 0.01, unit: "kg CO2e/t-km" },
    { name: "Air", factor: 0.6, unit: "kg CO2e/t-km" },
  ],
  endOfLife: [
    { name: "Landfill", factor: 0.2, unit: "kg CO2e/kg" },
    { name: "Incineration", factor: 1.0, unit: "kg CO2e/kg" },
    { name: "Recycling (Metals)", factor: -1.8, unit: "kg CO2e/kg" },
    { name: "Recycling (Plastics)", factor: -1.2, unit: "kg CO2e/kg" },
    { name: "Composting", factor: -0.1, unit: "kg CO2e/kg" },
  ],
};

export type EmissionFactors = typeof emissionFactors;
