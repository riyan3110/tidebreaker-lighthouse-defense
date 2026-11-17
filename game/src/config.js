export const WIDTH = 1280;
export const HEIGHT = 720;
export const LIGHTHOUSE_X = 640;
export const LIGHTHOUSE_Y = 385;
export const LIGHTHOUSE_RADIUS = 34;

export const PALETTE = {
  skyTop: '#040a14',
  skyMid: '#0b1d36',
  horizon: '#122b49',
  seaDeep: '#061322',
  seaFoam: '#1a4266',
  islandDark: '#161b24',
  islandLight: '#283242',
  towerStone: '#d9e2ec',
  towerStripe: '#c43e3e',
  towerShadow: '#829ab1',
  lanternGlow: '#ffe066',
  beamCore: '#fff6b3',
  beamOuter: '#38bdf8',
  shard: '#fde047',
  frost: '#67e8f9',
  lightning: '#a78bfa',
  pulse: '#34d399',
  danger: '#fb7185',
  hudBg: 'rgba(6, 15, 29, 0.82)',
  hudBorder: 'rgba(125, 211, 252, 0.35)',
  textMain: '#f0f7ff',
  textMuted: '#94a3b8',
};

export const ABILITIES = {
  frost: {
    key: '1',
    name: 'Frost Nova',
    cooldown: 11,
    duration: 3.6,
    color: '#67e8f9',
    desc: 'Freezes all gloom wisps on screen',
  },
  lightning: {
    key: '2',
    name: 'Chain Bolt',
    cooldown: 7.5,
    chains: 6,
    damage: 48,
    color: '#a78bfa',
    desc: 'Arcs across up to 6 nearby wisps',
  },
  repair: {
    key: '3',
    name: 'Repair',
    cooldown: 4.0,
    cost: 12,
    heal: 35,
    color: '#4ade80',
    desc: 'Spend 12 shards to restore 35 HP',
  },
  pulse: {
    key: 'Space',
    name: 'Pulse Blast',
    cooldown: 5.5,
    radius: 260,
    push: 210,
    damage: 22,
    color: '#34d399',
    desc: 'Knockback shockwave around tower',
  },
};

export const ENEMY_TYPES = {
  drifter: {
    name: 'Gloom Drifter',
    radius: 15,
    hp: 32,
    speed: 64,
    damage: 10,
    shards: 3,
    score: 40,
    color: '#60a5fa',
    coreColor: '#1e3a8a',
  },
  skimmer: {
    name: 'Swift Skimmer',
    radius: 12,
    hp: 20,
    speed: 122,
    damage: 8,
    shards: 4,
    score: 65,
    color: '#2dd4bf',
    coreColor: '#115e59',
  },
  brute: {
    name: 'Armored Brute',
    radius: 23,
    hp: 96,
    speed: 40,
    damage: 20,
    shards: 8,
    score: 130,
    color: '#f472b6',
    coreColor: '#831843',
  },
  boss: {
    name: 'The Drowned King',
    radius: 44,
    hp: 1050,
    speed: 26,
    damage: 34,
    shards: 35,
    score: 1200,
    color: '#c084fc',
    coreColor: '#3b0764',
  },
};

export const WAVES = [
  { wave: 1, title: 'First Mist', drifter: 8, skimmer: 0, brute: 0, interval: 1.05 },
  { wave: 2, title: 'Rising Tide', drifter: 10, skimmer: 4, brute: 0, interval: 0.92 },
  { wave: 3, title: 'Gale Warnings', drifter: 11, skimmer: 6, brute: 2, interval: 0.85 },
  { wave: 4, title: 'Abyssal Swell', drifter: 12, skimmer: 8, brute: 4, interval: 0.78 },
  { wave: 5, title: 'Black Squall', drifter: 14, skimmer: 10, brute: 5, interval: 0.72 },
  { wave: 6, title: 'Maelstrom', drifter: 16, skimmer: 12, brute: 7, interval: 0.65 },
  { wave: 7, title: 'Sunken Armada', drifter: 18, skimmer: 14, brute: 9, interval: 0.58 },
  { wave: 8, title: 'The Drowned King', drifter: 10, skimmer: 8, brute: 4, boss: 1, interval: 0.75 },
];
