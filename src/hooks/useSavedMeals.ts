import { useUserSetting } from './useUserSetting';

// ─── SavedMeal interface ────────────────────────────────────
// All numeric values are ABSOLUTE for the reference portion
// (totalGrams). Scaling is done at add-time: ratio = newGrams / totalGrams.
export interface SavedMeal {
  id:          string;   // e.g. "saved_1710000000000"
  name:        string;
  createdAt:   string;   // ISO-8601
  totalGrams:  number;   // reference portion size (grams the recipe was built for)
  kcal:        number;
  carbs:       number;
  protein:     number;
  fat:         number;
  fiber:       number;
  na:          number;
  k:           number;
  mg:          number;
  ca:          number;
  fe:          number;
  vit_c:       number;
  vit_d:       number;
  b12:         number;
  omega3:      number;
  zn:          number;
  ingredients?: Array<{ id: string; name: string; grams: number }>;
}

const LS_KEY = 'cyclofuel_saved_meals';

const EMPTY_MEALS: SavedMeal[] = [];

export function useSavedMeals(userId: string | undefined) {
  const { value: savedMeals, setValue: setSavedMeals, loading } = useUserSetting<SavedMeal[]>(
    userId,
    'saved_meals',
    EMPTY_MEALS,
    {
      legacyKey: LS_KEY,
      isEmpty: value => value.length === 0,
    },
  );

  const saveMeal = async (meal: Omit<SavedMeal, 'id' | 'createdAt'>): Promise<void> => {
    const newMeal: SavedMeal = {
      ...meal,
      id:        `saved_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    await setSavedMeals([...savedMeals, newMeal]);
  };

  const updateMeal = async (id: string, updates: Omit<SavedMeal, 'id' | 'createdAt'>): Promise<void> => {
    await setSavedMeals(savedMeals.map(m => m.id === id ? { ...m, ...updates } : m));
  };

  const deleteMeal = async (id: string): Promise<void> => {
    await setSavedMeals(savedMeals.filter(m => m.id !== id));
  };

  return { savedMeals, saveMeal, updateMeal, deleteMeal, loading };
}
