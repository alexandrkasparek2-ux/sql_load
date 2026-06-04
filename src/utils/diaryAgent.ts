import { FOODS, type Food } from '../constants/foods';
import type { FoodEntry } from '../hooks/useFoodEntries';
import type { LogMealAction } from '../hooks/useChatSession';

export const VALID_MEAL_SLOTS = [
  'snidane', 'dop_svacina', 'obed', 'odp_svacina',
  'pred_tren', 'behem_tren', 'po_tren', 'vecere',
] as const;

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function findCatalogFood(query: string): Food | null {
  const normalizedQuery = normalize(query);
  const queryTokens = normalizedQuery.split(' ').filter(token => token.length > 2);

  const scored = FOODS.map(food => {
    const name = normalize(food.name);
    if (name === normalizedQuery) return { food, score: 100 };
    if (name.includes(normalizedQuery) || normalizedQuery.includes(name)) return { food, score: 80 };
    const matches = queryTokens.filter(token => name.includes(token)).length;
    return { food, score: queryTokens.length ? matches / queryTokens.length * 60 : 0 };
  }).sort((a, b) => b.score - a.score);

  return scored[0]?.score >= 35 ? scored[0].food : null;
}

function catalogEntry(
  food: Food,
  grams: number,
  slot: string,
  userId: string,
  date: string,
): Omit<FoodEntry, 'id'> {
  const ratio = grams / 100;
  return {
    user_id: userId,
    date,
    meal_slot: slot,
    food_id: food.id,
    food_name: food.name,
    grams,
    kcal: parseFloat((food.kcal * ratio).toFixed(1)),
    carbs: parseFloat((food.carbs * ratio).toFixed(1)),
    protein: parseFloat((food.protein * ratio).toFixed(1)),
    fat: parseFloat((food.fat * ratio).toFixed(1)),
    fiber: parseFloat(((food.fiber ?? 0) * ratio).toFixed(1)),
    na: parseFloat((food.micros.na * ratio).toFixed(1)),
    k: parseFloat((food.micros.k * ratio).toFixed(1)),
    mg: parseFloat((food.micros.mg * ratio).toFixed(1)),
    ca: parseFloat((food.micros.ca * ratio).toFixed(1)),
    fe: parseFloat((food.micros.fe * ratio).toFixed(2)),
    vit_c: parseFloat((food.micros.vit_c * ratio).toFixed(1)),
    vit_d: parseFloat((food.micros.vit_d * ratio).toFixed(2)),
    b12: parseFloat((food.micros.b12 * ratio).toFixed(2)),
    omega3: parseFloat((food.micros.omega3 * ratio).toFixed(1)),
    zn: parseFloat((food.micros.zn * ratio).toFixed(2)),
  };
}

function estimatedEntry(
  item: LogMealAction['items'][number],
  slot: string,
  userId: string,
  date: string,
): Omit<FoodEntry, 'id'> {
  return {
    user_id: userId,
    date,
    meal_slot: slot,
    food_id: `ai_estimate_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    food_name: `${item.name} · AI odhad`,
    grams: item.grams,
    kcal: item.kcal,
    carbs: item.carbs,
    protein: item.protein,
    fat: item.fat,
    fiber: 0,
    na: 0,
    k: 0,
    mg: 0,
    ca: 0,
    fe: 0,
    vit_c: 0,
    vit_d: 0,
    b12: 0,
    omega3: 0,
    zn: 0,
  };
}

export function normalizeMealSlot(slot: string | undefined) {
  const normalized = normalize(slot ?? '').replace(/ /g, '_');
  return VALID_MEAL_SLOTS.includes(normalized as typeof VALID_MEAL_SLOTS[number])
    ? normalized
    : 'obed';
}

export function buildDiaryEntries(
  action: LogMealAction,
  userId: string,
  date: string,
) {
  const slot = normalizeMealSlot(action.slot);
  let catalogMatches = 0;

  const entries = action.items.map(item => {
    const grams = Math.max(1, Number(item.grams) || 100);
    const food = findCatalogFood(item.name);
    if (food) {
      catalogMatches += 1;
      return catalogEntry(food, grams, slot, userId, date);
    }
    return estimatedEntry({ ...item, grams }, slot, userId, date);
  });

  return { entries, slot, catalogMatches };
}
