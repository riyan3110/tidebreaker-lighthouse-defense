export const UPGRADE_CATALOG = [
  {
    id: 'beamPower',
    name: 'Solar Lens',
    desc: '+28% Beam Damage',
    baseCost: 14,
    costStep: 10,
    maxLevel: 5,
    color: '#fde047',
  },
  {
    id: 'fireRate',
    name: 'Prism Focus',
    desc: '+22% Beam Fire Rate',
    baseCost: 14,
    costStep: 10,
    maxLevel: 5,
    color: '#38bdf8',
  },
  {
    id: 'maxHp',
    name: 'Sea Wall',
    desc: '+35 Max HP & +35 Heal',
    baseCost: 16,
    costStep: 11,
    maxLevel: 5,
    color: '#4ade80',
  },
  {
    id: 'magnet',
    name: 'Tide Magnet',
    desc: '+55% Shard Pull Range',
    baseCost: 12,
    costStep: 8,
    maxLevel: 4,
    color: '#f472b6',
  },
  {
    id: 'pulse',
    name: 'Gale Core',
    desc: '+25% Pulse & Ability Power',
    baseCost: 15,
    costStep: 10,
    maxLevel: 4,
    color: '#34d399',
  },
];

export function getUpgradeCost(def, level) {
  return def.baseCost + level * def.costStep;
}

export function computePlayerStats(levels) {
  return {
    beamDamage: 16 * (1 + (levels.beamPower || 0) * 0.28),
    fireInterval: 0.14 / (1 + (levels.fireRate || 0) * 0.22),
    maxHp: 120 + (levels.maxHp || 0) * 35,
    magnetRadius: 150 * (1 + (levels.magnet || 0) * 0.55),
    abilityScale: 1 + (levels.pulse || 0) * 0.25,
    beamWidth: 7 + (levels.beamPower || 0) * 1.4,
  };
}
