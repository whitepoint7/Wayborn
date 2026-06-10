export const WEATHER_STATES = {
  sunny: { label: "Gunesli", windBias: -0.01, waterBonus: 0, stormRisk: 0 },
  cloudy: { label: "Kapali", windBias: 0, waterBonus: 0, stormRisk: 0 },
  rain: { label: "Yagmur", windBias: 0.02, waterBonus: 1, stormRisk: 0 },
  storm: { label: "Firtina", windBias: 0.07, waterBonus: 1, stormRisk: 18 }
};

export const SEA_STATES = {
  calm: { label: "Duz", drift: 0.85, speed: 1, roughness: 0 },
  choppy: { label: "Dalgali", drift: 1.12, speed: 0.94, roughness: 1 },
  rough: { label: "Sert dalga", drift: 1.42, speed: 0.84, roughness: 2 }
};

export const SAIL_TYPES = [
  { label: "Yelkensiz", speedBonus: 0, windBonus: 0, drift: 0.22, maxHp: 0 },
  { label: "Basit yelken", speedBonus: 0.08, windBonus: 0.75, drift: 0.55, maxHp: 3 }
];
