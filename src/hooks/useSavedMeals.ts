import { useState } from 'react';

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

function load(): SavedMeal[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function persist(meals: SavedMeal[]): void {
  localStorage.setItem(LS_KEY, JSON.stringify(meals));
}

export function useSavedMeals() {
  const [savedMeals, setSavedMeals] = useState<SavedMeal[]>(load);

  const saveMeal = (meal: Omit<SavedMeal, 'id' | 'createdAt'>): void => {
    const newMeal: SavedMeal = {
      ...meal,
      id:        `saved_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    const updated = [...savedMeals, newMeal];
    persist(updated);
    setSavedMeals(updated);
  };

  const updateMeal = (id: string, updates: Omit<SavedMeal, 'id' | 'createdAt'>): void => {
    const updated = savedMeals.map(m => m.id === id ? { ...m, ...updates } : m);
    persist(updated);
    setSavedMeals(updated);
  };

  const deleteMeal = (id: string): void => {
    const updated = savedMeals.filter(m => m.id !== id);
    persist(updated);
    setSavedMeals(updated);
  };

  return { savedMeals, saveMeal, updateMeal, deleteMeal };
}
