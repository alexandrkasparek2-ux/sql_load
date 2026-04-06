// ============================================================
// Training types, micro metadata, and calculation functions
// ============================================================

export type TrainingType =
  | 'rest' | 'light' | 'medium' | 'hard' | 'race'
  | 'strength' | 'running' | 'swimming' | 'team_sport' | 'yoga'
  | 'walking' | 'hiking' | 'cycling_indoor' | 'dancing' | 'skiing' | 'boxing';

export interface TrainingConfig {
  id:          TrainingType;
  label:       string;
  icon:        string;
  color:       string;
  glow:        string;
  desc:        string;
  category:    'cycling' | 'sport';
  macros:      { carbs: number; protein: number; fat: number };
  microMul:    number;
  calBurnRate: number;
  tips:        string[];
}

export const TRAINING_TYPES: TrainingConfig[] = [
  // ── Cyklistika ──────────────────────────────────────────
  {
    id: 'rest', label: 'Odpočinek', icon: '🛌', category: 'cycling',
    color: '#64748b', glow: 'rgba(100,116,139,0.25)',
    desc: 'Den regenerace a obnovy svalů',
    macros: { carbs: 3.0, protein: 1.8, fat: 1.1 },
    microMul: 1.0, calBurnRate: 0,
    tips: ['Zaměř se na protahování a mobilitu','Dostatek spánku (7–9 hodin) je klíčový','Hydratace je důležitá i v klidový den'],
  },
  {
    id: 'light', label: 'Lehký trénink', icon: '🚴', category: 'cycling',
    color: '#22c55e', glow: 'rgba(34,197,94,0.25)',
    desc: 'Regenerační jízda nebo Z2 vytrvalost',
    macros: { carbs: 5.0, protein: 1.9, fat: 1.0 },
    microMul: 1.1, calBurnRate: 4.0,
    tips: ['Nízká intenzita – měl bys být schopen mluvit','Nezapomeň na elektrolyty při jízdě nad 60 min','Ideální pro aktivní regeneraci'],
  },
  {
    id: 'medium', label: 'Střední trénink', icon: '⚡', category: 'cycling',
    color: '#f59e0b', glow: 'rgba(245,158,11,0.25)',
    desc: 'Intervalový nebo tempový trénink',
    macros: { carbs: 7.0, protein: 2.0, fat: 0.9 },
    microMul: 1.25, calBurnRate: 6.0,
    tips: ['Sacharidy před i během jízdy jsou klíčové','Hydratuj každých 15–20 minut','Po tréninku doplň elektrolyty a bílkoviny'],
  },
  {
    id: 'hard', label: 'Těžký trénink', icon: '🔥', category: 'cycling',
    color: '#ef4444', glow: 'rgba(239,68,68,0.25)',
    desc: 'VO₂max nebo závodní tempo',
    macros: { carbs: 9.0, protein: 2.1, fat: 0.8 },
    microMul: 1.5, calBurnRate: 8.0,
    tips: ['60–90 g sacharidů za každou hodinu jízdy','Gel každých 30–45 minut při vysoké intenzitě','Protein do 30 minut po výkonu pro regeneraci'],
  },
  {
    id: 'race', label: 'Závod', icon: '🏆', category: 'cycling',
    color: '#a855f7', glow: 'rgba(168,85,247,0.25)',
    desc: 'Den závodu – maximální výkon',
    macros: { carbs: 11.0, protein: 2.2, fat: 0.7 },
    microMul: 1.7, calBurnRate: 10.0,
    tips: ['Carb loading 2–3 dny před závodem','90 g sacharidů/hod při závodě','Izotonický nápoj + gely + banán – kombinuj zdroje'],
  },
  // ── Ostatní sporty ───────────────────────────────────────
  {
    id: 'strength', label: 'Silový trénink', icon: '🏋️', category: 'sport',
    color: '#f97316', glow: 'rgba(249,115,22,0.25)',
    desc: 'Posilovna, kettlebell, crossfit',
    macros: { carbs: 4.0, protein: 2.3, fat: 1.0 },
    microMul: 1.2, calBurnRate: 4.5,
    tips: ['Dostatek bílkovin (2,3 g/kg) pro svalový růst','Sacharidy před tréninkem pro energii','Kreatin + protein do 30 min po tréninku'],
  },
  {
    id: 'running', label: 'Běh', icon: '🏃', category: 'sport',
    color: '#06b6d4', glow: 'rgba(6,182,212,0.25)',
    desc: 'Silniční běh, trail, sprint',
    macros: { carbs: 6.5, protein: 1.9, fat: 0.9 },
    microMul: 1.3, calBurnRate: 7.5,
    tips: ['Sacharidy 1–2 hod před závodem/tréninkem','Hydratace každých 20 min při běhu','Gel nebo banán při běhu delším než 60 min'],
  },
  {
    id: 'swimming', label: 'Plavání', icon: '🏊', category: 'sport',
    color: '#0ea5e9', glow: 'rgba(14,165,233,0.25)',
    desc: 'Bazén, otevřená voda',
    macros: { carbs: 6.0, protein: 2.0, fat: 0.9 },
    microMul: 1.3, calBurnRate: 6.5,
    tips: ['Hydratace i ve vodě – pocit žízně je opožděný','Jídlo 2 hod před plavením','Sacharidy + bílkoviny po tréninku'],
  },
  {
    id: 'team_sport', label: 'Kolektivní sport', icon: '⚽', category: 'sport',
    color: '#84cc16', glow: 'rgba(132,204,22,0.25)',
    desc: 'Fotbal, basketbal, tenis, hokej…',
    macros: { carbs: 6.0, protein: 1.9, fat: 1.0 },
    microMul: 1.2, calBurnRate: 5.5,
    tips: ['Sacharidová jídla 3 hod před zápasem','Izotonický nápoj během zápasu','Regenerace: bílkoviny + sacharidy do 30 min'],
  },
  {
    id: 'yoga', label: 'Jóga / Pilates', icon: '🧘', category: 'sport',
    color: '#d946ef', glow: 'rgba(217,70,239,0.25)',
    desc: 'Jóga, pilates, strečink, meditace',
    macros: { carbs: 3.5, protein: 1.8, fat: 1.0 },
    microMul: 1.05, calBurnRate: 2.5,
    tips: ['Lehké jídlo 1–2 hod před cvičením','Hydratace během i po cvičení','Hořčík večer podporuje svalovou relaxaci'],
  },
  {
    id: 'walking', label: 'Chůze', icon: '🚶', category: 'sport',
    color: '#10b981', glow: 'rgba(16,185,129,0.25)',
    desc: 'Procházka, nordic walking, vycházka',
    macros: { carbs: 3.5, protein: 1.7, fat: 1.1 },
    microMul: 1.05, calBurnRate: 2.5,
    tips: ['Ideální pro aktivní regeneraci a spalování tuků','Nordic walking zapojuje i horní polovinu těla','Dostatek tekutin i při nízké intenzitě'],
  },
  {
    id: 'hiking', label: 'Turistika / Trek', icon: '🥾', category: 'sport',
    color: '#78716c', glow: 'rgba(120,113,108,0.25)',
    desc: 'Horská turistika, trekking, výlety',
    macros: { carbs: 6.0, protein: 1.9, fat: 1.0 },
    microMul: 1.2, calBurnRate: 4.5,
    tips: ['Energetické tyčinky a ořechy jsou ideální na trail','Pij minimálně 0,5 l vody za hodinu chůze','Elektrolyty při celodenní turistice jsou nezbytné'],
  },
  {
    id: 'cycling_indoor', label: 'Spinning / Indoor', icon: '🚵', category: 'sport',
    color: '#f43f5e', glow: 'rgba(244,63,94,0.25)',
    desc: 'Spinning, indoor cycling, stacionární kolo',
    macros: { carbs: 7.0, protein: 2.0, fat: 0.9 },
    microMul: 1.3, calBurnRate: 6.5,
    tips: ['Intenzivní hodina spinningu = 500–800 kcal','Pij izotonický nápoj během cvičení','Sacharidy + protein do 30 min po spinningu'],
  },
  {
    id: 'dancing', label: 'Tanec', icon: '💃', category: 'sport',
    color: '#ec4899', glow: 'rgba(236,72,153,0.25)',
    desc: 'Tanec, Zumba, aerobik, salsa',
    macros: { carbs: 5.0, protein: 1.8, fat: 1.0 },
    microMul: 1.1, calBurnRate: 3.5,
    tips: ['Lehká svačina 1 hod před tancem','Hydratace je klíčová při dlouhých tanečních blocích','Protažení po tanci předchází svalovým křečím'],
  },
  {
    id: 'skiing', label: 'Lyžování / Snowboard', icon: '⛷️', category: 'sport',
    color: '#38bdf8', glow: 'rgba(56,189,248,0.25)',
    desc: 'Sjezdové lyžování, snowboard, běžky',
    macros: { carbs: 6.5, protein: 1.9, fat: 1.0 },
    microMul: 1.25, calBurnRate: 5.0,
    tips: ['V chladu tělo spaluje více kalorií – jez víc','Teplý polévkový oběd na horách – skvělá volba','Hydratace v chladu je stejně důležitá jako v teple'],
  },
  {
    id: 'boxing', label: 'Box / Bojové sporty', icon: '🥊', category: 'sport',
    color: '#b45309', glow: 'rgba(180,83,9,0.25)',
    desc: 'Box, MMA, kickbox, karate, judo',
    macros: { carbs: 5.5, protein: 2.2, fat: 0.9 },
    microMul: 1.3, calBurnRate: 6.0,
    tips: ['Sacharidy + bílkoviny 2 hod před tréninkem','Vyhni se tučnému jídlu před bojovým sportem','Protein + sacharidy ihned po tréninku pro regeneraci'],
  },
];

export interface MicroMeta {
  key: string; label: string; unit: string; color: string; base: number; perMul: number;
}

export const MICRO_META: MicroMeta[] = [
  { key: 'na',     label: 'Sodík',       unit: 'mg', color: '#f59e0b', base: 1500, perMul: 500 },
  { key: 'k',      label: 'Draslík',     unit: 'mg', color: '#22c55e', base: 3500, perMul: 500 },
  { key: 'mg',     label: 'Hořčík',      unit: 'mg', color: '#6366f1', base: 300,  perMul: 50  },
  { key: 'ca',     label: 'Vápník',      unit: 'mg', color: '#06b6d4', base: 1000, perMul: 100 },
  { key: 'fe',     label: 'Železo',      unit: 'mg', color: '#ef4444', base: 14,   perMul: 3   },
  { key: 'vit_c',  label: 'Vitamín C',   unit: 'mg', color: '#f97316', base: 80,   perMul: 30  },
  { key: 'vit_d',  label: 'Vitamín D',   unit: 'µg', color: '#eab308', base: 15,   perMul: 5   },
  { key: 'b12',    label: 'Vitamín B12', unit: 'µg', color: '#ec4899', base: 2.4,  perMul: 0.5 },
  { key: 'omega3', label: 'Omega-3',     unit: 'mg', color: '#14b8a6', base: 1600, perMul: 300 },
  { key: 'zn',     label: 'Zinek',       unit: 'mg', color: '#a855f7', base: 11,   perMul: 2   },
];

export const MEAL_SLOTS = [
  { id: 'snidane',     label: 'Snídaně',           icon: '☀️' },
  { id: 'dop_svacina', label: 'Dopolední svačina',  icon: '🍎' },
  { id: 'obed',        label: 'Oběd',               icon: '🍽️' },
  { id: 'odp_svacina', label: 'Odpolední svačina',  icon: '🍌' },
  { id: 'pred_tren',   label: 'Před tréninkem',     icon: '⚡' },
  { id: 'behem_tren',  label: 'Během tréninku',     icon: '🚴' },
  { id: 'po_tren',     label: 'Po tréninku',        icon: '💪' },
  { id: 'vecere',      label: 'Večeře',             icon: '🌙' },
] as const;

export interface CalcProfile {
  weight: number; height: number; age: number; gender: 'male' | 'female';
}

export function calcBMR(p: CalcProfile): number {
  const base = 10 * p.weight + 6.25 * p.height - 5 * p.age;
  return p.gender === 'male' ? base + 5 : base - 161;
}

export function calcCalories(p: CalcProfile, type: TrainingType, activeHours: number): number {
  const bmr = calcBMR(p);
  if (type === 'rest') return Math.round(bmr * 1.2);
  const cfg = TRAINING_TYPES.find(t => t.id === type)!;
  // Reduce sedentary base proportionally as exercise hours increase (avoid double-counting).
  // At 0h active → BMR×1.2 (sedentary day). At 8h+ active → BMR×1.05 (base nearly replaced by activity).
  const h = Math.min(activeHours, 12);
  const base = bmr * (1.2 - 0.15 * Math.min(h / 8, 1));
  const activity = h * p.weight * (cfg.calBurnRate - 1.0);
  return Math.round(base + activity);
}

export const INTENSITY_MUL: Record<string, number> = { low: 0.7, medium: 1.0, high: 1.3 };

export function calcCaloriesMulti(
  p: CalcProfile,
  types: TrainingType[],
  hoursMap: Record<string, number>,
  intensityMap: Record<string, string> = {},
): number {
  const bmr = calcBMR(p);
  const active = types.filter(t => t !== 'rest');
  if (active.length === 0) return Math.round(bmr * 1.2);
  const totalH = active.reduce((s, t) => s + (hoursMap[t] ?? 0), 0);
  const burn = active.reduce((sum, t) => {
    const cfg = TRAINING_TYPES.find(x => x.id === t)!;
    const mul = INTENSITY_MUL[intensityMap[t] ?? 'medium'] ?? 1.0;
    return sum + (hoursMap[t] ?? 0) * p.weight * (cfg.calBurnRate - 1.0) * mul;
  }, 0);
  // Same proportional base reduction as calcCalories to avoid double-counting
  const h = Math.min(totalH, 12);
  const base = bmr * (1.2 - 0.15 * Math.min(h / 8, 1));
  return Math.round(base + burn);
}

export function primaryType(types: TrainingType[]): TrainingType {
  const active = types.filter(t => t !== 'rest');
  if (active.length === 0) return 'rest';
  return active.reduce((best, t) => {
    const cfg = TRAINING_TYPES.find(x => x.id === t)!;
    const bestCfg = TRAINING_TYPES.find(x => x.id === best)!;
    return cfg.calBurnRate > bestCfg.calBurnRate ? t : best;
  });
}

export function calcMacros(p: CalcProfile, type: TrainingType): { carbs: number; protein: number; fat: number } {
  const cfg = TRAINING_TYPES.find(t => t.id === type)!;
  return {
    carbs:   Math.round(cfg.macros.carbs   * p.weight),
    protein: Math.round(cfg.macros.protein * p.weight),
    fat:     Math.round(cfg.macros.fat     * p.weight),
  };
}

export function calcWater(p: CalcProfile, activeHours: number): number {
  return parseFloat((p.weight * 0.035 + activeHours * 0.65).toFixed(1));
}

export function calcMicroGoals(microMul: number): Record<string, number> {
  return Object.fromEntries(
    MICRO_META.map(m => [m.key, parseFloat((m.base + m.perMul * (microMul - 1)).toFixed(2))]),
  );
}

// ============================================================
// Meal recommendations per training type
// ============================================================

export interface MealRecItem {
  foodId:   string;
  grams:    number;
  slot:     string; // meal slot id
}

export interface MealRecommendation {
  title:       string;
  description: string;
  emoji:       string;
  items:       MealRecItem[];
}

export const MEAL_RECS: Partial<Record<TrainingType, MealRecommendation>> = {
  light: {
    title:       'Lehký výjezd',
    description: 'Energeticky šetrný balíček na 1–2 hod jízdy',
    emoji:       '🚴',
    items: [
      { foodId: 'banana',        grams: 120, slot: 'behem_tren' },
      { foodId: 'rice_cakes',    grams:  30, slot: 'behem_tren' },
      { foodId: 'isotonic_drink',grams:  35, slot: 'behem_tren' },
    ],
  },
  medium: {
    title:       'Intervalový trénink',
    description: 'Sacharidy + elektrolyty pro tempo a intervaly',
    emoji:       '⚡',
    items: [
      { foodId: 'energy_bar',    grams:  65, slot: 'behem_tren' },
      { foodId: 'banana',        grams: 120, slot: 'behem_tren' },
      { foodId: 'isotonic_drink',grams:  70, slot: 'behem_tren' },
      { foodId: 'energy_gel',    grams:  40, slot: 'behem_tren' },
    ],
  },
  hard: {
    title:       'Těžký trénink',
    description: '3+ hod výkonu — 60–90 g sacharidů za hodinu',
    emoji:       '🔥',
    items: [
      { foodId: 'energy_gel',    grams:  80, slot: 'behem_tren' },
      { foodId: 'energy_bar',    grams:  65, slot: 'behem_tren' },
      { foodId: 'banana',        grams: 120, slot: 'behem_tren' },
      { foodId: 'dates',         grams:  50, slot: 'behem_tren' },
      { foodId: 'isotonic_drink',grams:  70, slot: 'behem_tren' },
    ],
  },
  race: {
    title:       'Závodní balíček',
    description: 'Maximum energie a elektrolytů pro závod',
    emoji:       '🏆',
    items: [
      { foodId: 'energy_gel',    grams: 120, slot: 'behem_tren' },
      { foodId: 'energy_bar',    grams:  65, slot: 'behem_tren' },
      { foodId: 'dates',         grams:  50, slot: 'behem_tren' },
      { foodId: 'banana',        grams: 120, slot: 'behem_tren' },
      { foodId: 'isotonic_drink',grams: 105, slot: 'behem_tren' },
      { foodId: 'rice_cakes',    grams:  60, slot: 'behem_tren' },
    ],
  },
  strength: {
    title:       'Silový trénink',
    description: 'Proteiny + sacharidy pro svalový růst',
    emoji:       '🏋️',
    items: [
      { foodId: 'whey_protein',  grams:  30, slot: 'po_tren' },
      { foodId: 'banana',        grams: 120, slot: 'po_tren' },
      { foodId: 'white_rice',    grams: 200, slot: 'po_tren' },
      { foodId: 'chicken_breast',grams: 150, slot: 'obed' },
    ],
  },
  running: {
    title:       'Běžecký výkon',
    description: 'Sacharidy před + elektrolyty během běhu',
    emoji:       '🏃',
    items: [
      { foodId: 'energy_gel',    grams:  40, slot: 'behem_tren' },
      { foodId: 'banana',        grams: 120, slot: 'pred_tren' },
      { foodId: 'isotonic_drink',grams:  35, slot: 'behem_tren' },
      { foodId: 'dates',         grams:  50, slot: 'pred_tren' },
    ],
  },
  hiking: {
    title:       'Túra',
    description: 'Výdržový mix na celodenní pohyb v přírodě',
    emoji:       '🥾',
    items: [
      { foodId: 'whole_bread',   grams:  60, slot: 'snidane' },
      { foodId: 'ham_premium',   grams:  60, slot: 'snidane' },
      { foodId: 'banana',        grams: 120, slot: 'behem_tren' },
      { foodId: 'walnuts',       grams:  30, slot: 'behem_tren' },
      { foodId: 'energy_bar',    grams:  65, slot: 'behem_tren' },
      { foodId: 'apple',         grams: 150, slot: 'behem_tren' },
    ],
  },
  swimming: {
    title:       'Plavání',
    description: 'Lehký balíček pro bazénový trénink',
    emoji:       '🏊',
    items: [
      { foodId: 'banana',        grams: 120, slot: 'pred_tren' },
      { foodId: 'greek_yogurt',  grams: 200, slot: 'po_tren' },
      { foodId: 'protein_bar',   grams:  60, slot: 'po_tren' },
    ],
  },
  cycling_indoor: {
    title:       'Spinning',
    description: 'Elektrolyty a rychlé sacharidy pro indoor ride',
    emoji:       '🚲',
    items: [
      { foodId: 'isotonic_drink',grams:  70, slot: 'behem_tren' },
      { foodId: 'energy_gel',    grams:  40, slot: 'behem_tren' },
      { foodId: 'banana',        grams: 120, slot: 'po_tren' },
    ],
  },
  skiing: {
    title:       'Lyžování',
    description: 'Dlouhý výdej energie na svahu — lyžařský balíček',
    emoji:       '⛷️',
    items: [
      { foodId: 'whole_bread',   grams:  60, slot: 'snidane' },
      { foodId: 'energy_bar',    grams:  65, slot: 'behem_tren' },
      { foodId: 'dates',         grams:  50, slot: 'behem_tren' },
      { foodId: 'banana',        grams: 120, slot: 'behem_tren' },
      { foodId: 'walnuts',       grams:  30, slot: 'behem_tren' },
    ],
  },
  boxing: {
    title:       'Boxing / bojový sport',
    description: 'Výbušná energie + proteiny pro regeneraci',
    emoji:       '🥊',
    items: [
      { foodId: 'banana',        grams: 120, slot: 'pred_tren' },
      { foodId: 'energy_gel',    grams:  40, slot: 'pred_tren' },
      { foodId: 'whey_protein',  grams:  30, slot: 'po_tren' },
      { foodId: 'white_rice',    grams: 200, slot: 'po_tren' },
    ],
  },
};
