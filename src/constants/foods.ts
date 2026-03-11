// ============================================================
// Food database – 35 foods with macros + 10 micronutrients
// All values are per 100 g
// ============================================================

export interface FoodMicros {
  na:     number; // sodium mg
  k:      number; // potassium mg
  mg:     number; // magnesium mg
  ca:     number; // calcium mg
  fe:     number; // iron mg
  vit_c:  number; // vitamin C mg
  vit_d:  number; // vitamin D µg
  b12:    number; // vitamin B12 µg
  omega3: number; // omega-3 mg
  zn:     number; // zinc mg
}

export interface Food {
  id: string;
  cat: string;
  name: string;
  kcal: number;
  carbs: number;
  protein: number;
  fat: number;
  per: number; // default reference portion in grams
  micros: FoodMicros;
}

export const FOOD_CATEGORIES = [
  '🍚 Sacharidy',
  '🍟 Přílohy',
  '🍌 Ovoce',
  '🥩 Bílkoviny',
  '🥩 Šunky',
  '🧀 Sýry',
  '🥛 Mléčné',
  '🥜 Ořechy',
  '🥦 Zelenina',
  '🫘 Luštěniny',
  '⚡ Sportovní',
  '🫒 Tuky',
] as const;

export const FOODS: Food[] = [

  // ──────────────────────────────────────────
  // 🍚 Sacharidy
  // ──────────────────────────────────────────
  {
    id: 'white_rice',
    cat: '🍚 Sacharidy',
    name: 'Rýže bílá (vařená)',
    kcal: 130, carbs: 28.1, protein: 2.7, fat: 0.3, per: 200,
    micros: { na: 1, k: 35, mg: 12, ca: 10, fe: 0.2, vit_c: 0, vit_d: 0, b12: 0, omega3: 20, zn: 0.5 },
  },
  {
    id: 'pasta_cooked',
    cat: '🍚 Sacharidy',
    name: 'Těstoviny (vařené)',
    kcal: 158, carbs: 31.0, protein: 5.8, fat: 0.9, per: 200,
    micros: { na: 1, k: 44, mg: 18, ca: 7, fe: 0.5, vit_c: 0, vit_d: 0, b12: 0, omega3: 10, zn: 0.5 },
  },
  {
    id: 'oats',
    cat: '🍚 Sacharidy',
    name: 'Ovesné vločky',
    kcal: 389, carbs: 66.3, protein: 16.9, fat: 6.9, per: 80,
    micros: { na: 2, k: 350, mg: 130, ca: 54, fe: 3.6, vit_c: 0, vit_d: 0, b12: 0, omega3: 110, zn: 3.6 },
  },
  {
    id: 'whole_bread',
    cat: '🍚 Sacharidy',
    name: 'Chléb celozrnný',
    kcal: 247, carbs: 41.3, protein: 8.5, fat: 3.5, per: 60,
    micros: { na: 400, k: 200, mg: 70, ca: 70, fe: 2.5, vit_c: 0, vit_d: 0, b12: 0, omega3: 100, zn: 1.8 },
  },
  {
    id: 'sweet_potato',
    cat: '🍚 Sacharidy',
    name: 'Sladká brambora',
    kcal: 86, carbs: 20.1, protein: 1.6, fat: 0.1, per: 150,
    micros: { na: 55, k: 337, mg: 25, ca: 30, fe: 0.6, vit_c: 2.4, vit_d: 0, b12: 0, omega3: 10, zn: 0.3 },
  },
  {
    id: 'potato_boiled',
    cat: '🍚 Sacharidy',
    name: 'Brambory (vařené)',
    kcal: 87, carbs: 20.1, protein: 1.9, fat: 0.1, per: 200,
    micros: { na: 5, k: 379, mg: 22, ca: 12, fe: 0.3, vit_c: 13, vit_d: 0, b12: 0, omega3: 10, zn: 0.3 },
  },
  {
    id: 'quinoa',
    cat: '🍚 Sacharidy',
    name: 'Quinoa (vařená)',
    kcal: 120, carbs: 21.3, protein: 4.4, fat: 1.9, per: 180,
    micros: { na: 7, k: 172, mg: 64, ca: 17, fe: 1.5, vit_c: 0, vit_d: 0, b12: 0, omega3: 130, zn: 1.1 },
  },

  // ──────────────────────────────────────────
  // 🍌 Ovoce
  // ──────────────────────────────────────────
  {
    id: 'banana',
    cat: '🍌 Ovoce',
    name: 'Banán',
    kcal: 89, carbs: 22.8, protein: 1.1, fat: 0.3, per: 120,
    micros: { na: 1, k: 358, mg: 27, ca: 5, fe: 0.3, vit_c: 8.7, vit_d: 0, b12: 0, omega3: 30, zn: 0.2 },
  },
  {
    id: 'dates',
    cat: '🍌 Ovoce',
    name: 'Datle (sušené)',
    kcal: 277, carbs: 74.9, protein: 1.8, fat: 0.2, per: 50,
    micros: { na: 1, k: 696, mg: 54, ca: 64, fe: 0.9, vit_c: 0.4, vit_d: 0, b12: 0, omega3: 0, zn: 0.4 },
  },
  {
    id: 'orange',
    cat: '🍌 Ovoce',
    name: 'Pomeranč',
    kcal: 47, carbs: 11.8, protein: 0.9, fat: 0.1, per: 150,
    micros: { na: 0, k: 181, mg: 10, ca: 40, fe: 0.1, vit_c: 53, vit_d: 0, b12: 0, omega3: 20, zn: 0.1 },
  },
  {
    id: 'strawberries',
    cat: '🍌 Ovoce',
    name: 'Jahody',
    kcal: 32, carbs: 7.7, protein: 0.7, fat: 0.3, per: 150,
    micros: { na: 1, k: 153, mg: 13, ca: 16, fe: 0.4, vit_c: 59, vit_d: 0, b12: 0, omega3: 65, zn: 0.1 },
  },
  {
    id: 'apple',
    cat: '🍌 Ovoce',
    name: 'Jablko',
    kcal: 52, carbs: 13.8, protein: 0.3, fat: 0.2, per: 150,
    micros: { na: 1, k: 107, mg: 5, ca: 6, fe: 0.1, vit_c: 4.6, vit_d: 0, b12: 0, omega3: 9, zn: 0.04 },
  },

  // ──────────────────────────────────────────
  // 🥩 Bílkoviny
  // ──────────────────────────────────────────
  {
    id: 'chicken_breast',
    cat: '🥩 Bílkoviny',
    name: 'Kuřecí prsa',
    kcal: 165, carbs: 0, protein: 31.0, fat: 3.6, per: 150,
    micros: { na: 74, k: 256, mg: 29, ca: 14, fe: 0.7, vit_c: 0, vit_d: 0.1, b12: 0.3, omega3: 60, zn: 1.0 },
  },
  {
    id: 'salmon',
    cat: '🥩 Bílkoviny',
    name: 'Losos (čerstvý)',
    kcal: 208, carbs: 0, protein: 20.4, fat: 13.4, per: 150,
    micros: { na: 59, k: 363, mg: 29, ca: 12, fe: 0.4, vit_c: 0, vit_d: 11, b12: 3.2, omega3: 2260, zn: 0.6 },
  },
  {
    id: 'egg',
    cat: '🥩 Bílkoviny',
    name: 'Vejce (celé)',
    kcal: 143, carbs: 1.1, protein: 12.6, fat: 9.5, per: 60,
    micros: { na: 142, k: 126, mg: 12, ca: 56, fe: 1.8, vit_c: 0, vit_d: 2, b12: 0.89, omega3: 160, zn: 1.1 },
  },
  {
    id: 'tuna_canned',
    cat: '🥩 Bílkoviny',
    name: 'Tuňák (konzerva)',
    kcal: 116, carbs: 0, protein: 25.5, fat: 1.0, per: 120,
    micros: { na: 330, k: 207, mg: 30, ca: 16, fe: 0.8, vit_c: 0, vit_d: 4, b12: 2.5, omega3: 270, zn: 0.6 },
  },
  {
    id: 'beef_mince',
    cat: '🥩 Bílkoviny',
    name: 'Hovězí mleté (10 % tuku)',
    kcal: 137, carbs: 0, protein: 21.4, fat: 5.5, per: 150,
    micros: { na: 72, k: 270, mg: 21, ca: 20, fe: 2.7, vit_c: 0, vit_d: 0.1, b12: 2.1, omega3: 60, zn: 5.5 },
  },

  // ──────────────────────────────────────────
  // 🥛 Mléčné
  // ──────────────────────────────────────────
  {
    id: 'greek_yogurt',
    cat: '🥛 Mléčné',
    name: 'Řecký jogurt (2 %)',
    kcal: 73, carbs: 3.6, protein: 10.0, fat: 1.9, per: 200,
    micros: { na: 36, k: 141, mg: 11, ca: 111, fe: 0.1, vit_c: 0, vit_d: 0.1, b12: 0.75, omega3: 50, zn: 0.5 },
  },
  {
    id: 'cottage_cheese',
    cat: '🥛 Mléčné',
    name: 'Cottage cheese',
    kcal: 98, carbs: 3.4, protein: 11.1, fat: 4.3, per: 200,
    micros: { na: 364, k: 104, mg: 8, ca: 83, fe: 0.2, vit_c: 0, vit_d: 0, b12: 0.43, omega3: 50, zn: 0.4 },
  },
  {
    id: 'milk',
    cat: '🥛 Mléčné',
    name: 'Mléko (1,5 %)',
    kcal: 47, carbs: 4.8, protein: 3.4, fat: 1.5, per: 250,
    micros: { na: 44, k: 150, mg: 11, ca: 120, fe: 0.1, vit_c: 0.9, vit_d: 0.1, b12: 0.45, omega3: 40, zn: 0.4 },
  },
  {
    id: 'quark',
    cat: '🥛 Mléčné',
    name: 'Tvaroh nízkotučný',
    kcal: 72, carbs: 3.2, protein: 12.7, fat: 0.9, per: 200,
    micros: { na: 100, k: 100, mg: 8, ca: 80, fe: 0.1, vit_c: 0, vit_d: 0, b12: 0.5, omega3: 30, zn: 0.4 },
  },

  // ──────────────────────────────────────────
  // 🥜 Ořechy
  // ──────────────────────────────────────────
  {
    id: 'almonds',
    cat: '🥜 Ořechy',
    name: 'Mandle',
    kcal: 579, carbs: 21.6, protein: 21.2, fat: 49.9, per: 30,
    micros: { na: 1, k: 733, mg: 270, ca: 264, fe: 3.7, vit_c: 0, vit_d: 0, b12: 0, omega3: 5, zn: 3.1 },
  },
  {
    id: 'walnuts',
    cat: '🥜 Ořechy',
    name: 'Vlašské ořechy',
    kcal: 654, carbs: 13.7, protein: 15.2, fat: 65.2, per: 30,
    micros: { na: 2, k: 441, mg: 158, ca: 98, fe: 2.9, vit_c: 1.3, vit_d: 0, b12: 0, omega3: 9080, zn: 3.1 },
  },
  {
    id: 'peanut_butter',
    cat: '🥜 Ořechy',
    name: 'Arašídové máslo',
    kcal: 588, carbs: 20.1, protein: 25.1, fat: 50.4, per: 30,
    micros: { na: 459, k: 558, mg: 168, ca: 49, fe: 1.9, vit_c: 0, vit_d: 0, b12: 0, omega3: 100, zn: 2.7 },
  },

  // ──────────────────────────────────────────
  // 🥦 Zelenina
  // ──────────────────────────────────────────
  {
    id: 'broccoli',
    cat: '🥦 Zelenina',
    name: 'Brokolice',
    kcal: 34, carbs: 6.6, protein: 2.8, fat: 0.4, per: 200,
    micros: { na: 33, k: 316, mg: 21, ca: 47, fe: 0.7, vit_c: 89, vit_d: 0, b12: 0, omega3: 105, zn: 0.4 },
  },
  {
    id: 'spinach',
    cat: '🥦 Zelenina',
    name: 'Špenát',
    kcal: 23, carbs: 3.6, protein: 2.9, fat: 0.4, per: 100,
    micros: { na: 79, k: 558, mg: 79, ca: 99, fe: 2.7, vit_c: 28, vit_d: 0, b12: 0, omega3: 138, zn: 0.5 },
  },
  {
    id: 'tomato',
    cat: '🥦 Zelenina',
    name: 'Rajčata',
    kcal: 18, carbs: 3.9, protein: 0.9, fat: 0.2, per: 150,
    micros: { na: 5, k: 237, mg: 11, ca: 10, fe: 0.3, vit_c: 14, vit_d: 0, b12: 0, omega3: 30, zn: 0.2 },
  },
  {
    id: 'carrot',
    cat: '🥦 Zelenina',
    name: 'Mrkev',
    kcal: 41, carbs: 9.6, protein: 0.9, fat: 0.2, per: 120,
    micros: { na: 69, k: 320, mg: 12, ca: 33, fe: 0.3, vit_c: 5.9, vit_d: 0, b12: 0, omega3: 2, zn: 0.2 },
  },

  // ──────────────────────────────────────────
  // 🫘 Luštěniny
  // ──────────────────────────────────────────
  {
    id: 'lentils',
    cat: '🫘 Luštěniny',
    name: 'Čočka (vařená)',
    kcal: 116, carbs: 20.1, protein: 9.0, fat: 0.4, per: 200,
    micros: { na: 2, k: 369, mg: 36, ca: 19, fe: 3.3, vit_c: 1.5, vit_d: 0, b12: 0, omega3: 73, zn: 1.3 },
  },
  {
    id: 'chickpeas',
    cat: '🫘 Luštěniny',
    name: 'Cizrna (vařená)',
    kcal: 164, carbs: 27.4, protein: 8.9, fat: 2.6, per: 200,
    micros: { na: 7, k: 291, mg: 48, ca: 49, fe: 2.9, vit_c: 1.3, vit_d: 0, b12: 0, omega3: 43, zn: 1.5 },
  },
  {
    id: 'black_beans',
    cat: '🫘 Luštěniny',
    name: 'Fazole černé (vařené)',
    kcal: 132, carbs: 23.7, protein: 8.9, fat: 0.5, per: 200,
    micros: { na: 2, k: 355, mg: 70, ca: 27, fe: 2.1, vit_c: 0, vit_d: 0, b12: 0, omega3: 161, zn: 1.0 },
  },

  // ──────────────────────────────────────────
  // ⚡ Sportovní
  // ──────────────────────────────────────────
  {
    id: 'energy_bar',
    cat: '⚡ Sportovní',
    name: 'Energetická tyčinka',
    kcal: 380, carbs: 68.0, protein: 8.0, fat: 7.0, per: 65,
    micros: { na: 150, k: 200, mg: 40, ca: 50, fe: 2, vit_c: 10, vit_d: 1, b12: 0.5, omega3: 200, zn: 2 },
  },
  {
    id: 'energy_gel',
    cat: '⚡ Sportovní',
    name: 'Energetický gel',
    kcal: 280, carbs: 70.0, protein: 0, fat: 0, per: 40,
    micros: { na: 50, k: 100, mg: 5, ca: 5, fe: 0.2, vit_c: 0, vit_d: 0, b12: 0, omega3: 0, zn: 0.1 },
  },
  {
    id: 'whey_protein',
    cat: '⚡ Sportovní',
    name: 'Proteinový prášek (whey)',
    kcal: 380, carbs: 8.0, protein: 75.0, fat: 5.0, per: 30,
    micros: { na: 150, k: 220, mg: 30, ca: 130, fe: 0.5, vit_c: 0, vit_d: 1.5, b12: 0.8, omega3: 100, zn: 1.5 },
  },
  {
    id: 'plant_protein',
    cat: '⚡ Sportovní',
    name: 'Rostlinný protein (hrachový)',
    kcal: 360, carbs: 5.0, protein: 70.0, fat: 6.0, per: 30,
    micros: { na: 300, k: 180, mg: 50, ca: 50, fe: 4.5, vit_c: 0, vit_d: 0, b12: 0, omega3: 50, zn: 2.0 },
  },
  {
    id: 'isotonic_drink',
    cat: '⚡ Sportovní',
    name: 'Izotonický nápoj (prášek)',
    kcal: 380, carbs: 91.0, protein: 0, fat: 0, per: 35,
    micros: { na: 460, k: 150, mg: 20, ca: 10, fe: 0, vit_c: 30, vit_d: 0, b12: 0, omega3: 0, zn: 0 },
  },
  {
    id: 'creatine',
    cat: '⚡ Sportovní',
    name: 'Kreatin monohydrát',
    kcal: 0, carbs: 0, protein: 0, fat: 0, per: 5,
    micros: { na: 0, k: 0, mg: 0, ca: 0, fe: 0, vit_c: 0, vit_d: 0, b12: 0, omega3: 0, zn: 0 },
  },
  {
    id: 'protein_bar',
    cat: '⚡ Sportovní',
    name: 'Proteinová tyčinka',
    kcal: 350, carbs: 30.0, protein: 30.0, fat: 10.0, per: 60,
    micros: { na: 180, k: 250, mg: 35, ca: 200, fe: 1.5, vit_c: 5, vit_d: 1, b12: 0.6, omega3: 150, zn: 2.5 },
  },
  {
    id: 'rice_cakes',
    cat: '⚡ Sportovní',
    name: 'Rýžové chlebíčky',
    kcal: 387, carbs: 82.0, protein: 7.5, fat: 2.8, per: 30,
    micros: { na: 10, k: 100, mg: 30, ca: 5, fe: 0.5, vit_c: 0, vit_d: 0, b12: 0, omega3: 10, zn: 0.8 },
  },

  // ──────────────────────────────────────────
  // 🫒 Tuky
  // ──────────────────────────────────────────
  {
    id: 'avocado',
    cat: '🫒 Tuky',
    name: 'Avokádo',
    kcal: 160, carbs: 8.5, protein: 2.0, fat: 14.7, per: 100,
    micros: { na: 7, k: 485, mg: 29, ca: 12, fe: 0.6, vit_c: 10, vit_d: 0, b12: 0, omega3: 110, zn: 0.6 },
  },
  {
    id: 'olive_oil',
    cat: '🫒 Tuky',
    name: 'Olivový olej',
    kcal: 884, carbs: 0, protein: 0, fat: 100.0, per: 15,
    micros: { na: 2, k: 1, mg: 0, ca: 1, fe: 0.1, vit_c: 0, vit_d: 0, b12: 0, omega3: 760, zn: 0 },
  },
  {
    id: 'coconut_oil',
    cat: '🫒 Tuky',
    name: 'Kokosový olej',
    kcal: 892, carbs: 0, protein: 0, fat: 99.1, per: 15,
    micros: { na: 0, k: 0, mg: 0, ca: 0, fe: 0, vit_c: 0, vit_d: 0, b12: 0, omega3: 0, zn: 0 },
  },

  // ──────────────────────────────────────────
  // 🥩 Bílkoviny – další
  // ──────────────────────────────────────────
  {
    id: 'turkey_breast',
    cat: '🥩 Bílkoviny',
    name: 'Krůtí prsa',
    kcal: 157, carbs: 0, protein: 29.9, fat: 3.6, per: 150,
    micros: { na: 63, k: 298, mg: 28, ca: 16, fe: 0.7, vit_c: 0, vit_d: 0.1, b12: 0.5, omega3: 50, zn: 2.1 },
  },
  {
    id: 'sardines',
    cat: '🥩 Bílkoviny',
    name: 'Sardinky (konzerva)',
    kcal: 208, carbs: 0, protein: 24.6, fat: 11.5, per: 100,
    micros: { na: 505, k: 397, mg: 39, ca: 382, fe: 2.9, vit_c: 0, vit_d: 4.8, b12: 8.9, omega3: 1480, zn: 1.3 },
  },
  {
    id: 'shrimp',
    cat: '🥩 Bílkoviny',
    name: 'Krevety (vařené)',
    kcal: 99, carbs: 0.9, protein: 20.9, fat: 1.1, per: 150,
    micros: { na: 224, k: 185, mg: 37, ca: 70, fe: 0.5, vit_c: 0, vit_d: 0.3, b12: 1.1, omega3: 540, zn: 1.1 },
  },

  // ──────────────────────────────────────────
  // 🥛 Mléčné – další
  // ──────────────────────────────────────────
  {
    id: 'skyr',
    cat: '🥛 Mléčné',
    name: 'Skyr',
    kcal: 63, carbs: 4.0, protein: 11.0, fat: 0.2, per: 200,
    micros: { na: 44, k: 155, mg: 14, ca: 135, fe: 0.1, vit_c: 0, vit_d: 0.1, b12: 0.9, omega3: 20, zn: 0.6 },
  },
  {
    id: 'kefir',
    cat: '🥛 Mléčné',
    name: 'Kefír',
    kcal: 61, carbs: 4.7, protein: 3.3, fat: 3.3, per: 250,
    micros: { na: 40, k: 150, mg: 12, ca: 120, fe: 0.1, vit_c: 1, vit_d: 0.1, b12: 0.5, omega3: 80, zn: 0.4 },
  },

  // ──────────────────────────────────────────
  // 🍌 Ovoce – další
  // ──────────────────────────────────────────
  {
    id: 'blueberries',
    cat: '🍌 Ovoce',
    name: 'Borůvky',
    kcal: 57, carbs: 14.5, protein: 0.7, fat: 0.3, per: 150,
    micros: { na: 1, k: 77, mg: 6, ca: 6, fe: 0.3, vit_c: 9.7, vit_d: 0, b12: 0, omega3: 58, zn: 0.2 },
  },
  {
    id: 'watermelon',
    cat: '🍌 Ovoce',
    name: 'Meloun vodní',
    kcal: 30, carbs: 7.6, protein: 0.6, fat: 0.2, per: 300,
    micros: { na: 1, k: 112, mg: 10, ca: 7, fe: 0.2, vit_c: 8.1, vit_d: 0, b12: 0, omega3: 50, zn: 0.1 },
  },

  // ──────────────────────────────────────────
  // 🍚 Sacharidy – pečivo
  // ──────────────────────────────────────────
  {
    id: 'white_roll',
    cat: '🍚 Sacharidy',
    name: 'Rohlík bílý',
    kcal: 285, carbs: 55.0, protein: 9.5, fat: 2.0, per: 50,
    micros: { na: 520, k: 110, mg: 18, ca: 25, fe: 1.8, vit_c: 0, vit_d: 0, b12: 0, omega3: 20, zn: 0.7 },
  },
  {
    id: 'rye_bread',
    cat: '🍚 Sacharidy',
    name: 'Žitný chléb',
    kcal: 220, carbs: 42.0, protein: 7.0, fat: 2.2, per: 60,
    micros: { na: 470, k: 220, mg: 55, ca: 35, fe: 2.2, vit_c: 0, vit_d: 0, b12: 0, omega3: 90, zn: 1.5 },
  },
  {
    id: 'tortilla_wrap',
    cat: '🍚 Sacharidy',
    name: 'Tortilla wrap (celozrnná)',
    kcal: 310, carbs: 53.0, protein: 9.0, fat: 6.5, per: 60,
    micros: { na: 480, k: 130, mg: 30, ca: 100, fe: 2.5, vit_c: 0, vit_d: 0, b12: 0, omega3: 50, zn: 0.9 },
  },
  {
    id: 'baguette',
    cat: '🍚 Sacharidy',
    name: 'Bageta',
    kcal: 278, carbs: 53.0, protein: 9.5, fat: 2.0, per: 80,
    micros: { na: 540, k: 130, mg: 20, ca: 30, fe: 2.0, vit_c: 0, vit_d: 0, b12: 0, omega3: 15, zn: 0.8 },
  },
  {
    id: 'graham_roll',
    cat: '🍚 Sacharidy',
    name: 'Grahamový rohlík',
    kcal: 262, carbs: 48.0, protein: 10.5, fat: 3.0, per: 60,
    micros: { na: 390, k: 200, mg: 55, ca: 60, fe: 2.8, vit_c: 0, vit_d: 0, b12: 0, omega3: 110, zn: 1.6 },
  },

  // ──────────────────────────────────────────
  // 🍟 Přílohy
  // ──────────────────────────────────────────
  {
    id: 'fries_baked',
    cat: '🍟 Přílohy',
    name: 'Hranolky (pečené)',
    kcal: 175, carbs: 32.0, protein: 3.2, fat: 4.5, per: 150,
    micros: { na: 210, k: 560, mg: 28, ca: 12, fe: 0.8, vit_c: 10, vit_d: 0, b12: 0, omega3: 30, zn: 0.4 },
  },
  {
    id: 'baked_potato',
    cat: '🍟 Přílohy',
    name: 'Pečené brambory',
    kcal: 93, carbs: 21.5, protein: 2.5, fat: 0.1, per: 200,
    micros: { na: 8, k: 550, mg: 30, ca: 15, fe: 0.6, vit_c: 20, vit_d: 0, b12: 0, omega3: 10, zn: 0.4 },
  },
  {
    id: 'mashed_potato',
    cat: '🍟 Přílohy',
    name: 'Bramborová kaše',
    kcal: 83, carbs: 17.0, protein: 2.1, fat: 0.5, per: 200,
    micros: { na: 350, k: 400, mg: 20, ca: 20, fe: 0.4, vit_c: 12, vit_d: 0, b12: 0, omega3: 10, zn: 0.3 },
  },
  {
    id: 'bulgur',
    cat: '🍟 Přílohy',
    name: 'Bulgur (vařený)',
    kcal: 83, carbs: 18.6, protein: 3.1, fat: 0.2, per: 200,
    micros: { na: 5, k: 68, mg: 32, ca: 10, fe: 1.0, vit_c: 0, vit_d: 0, b12: 0, omega3: 20, zn: 0.6 },
  },
  {
    id: 'polenta',
    cat: '🍟 Přílohy',
    name: 'Polenta (vařená)',
    kcal: 70, carbs: 15.6, protein: 1.8, fat: 0.3, per: 200,
    micros: { na: 5, k: 32, mg: 9, ca: 1, fe: 0.3, vit_c: 0, vit_d: 0, b12: 0, omega3: 10, zn: 0.3 },
  },
  {
    id: 'rice_noodles',
    cat: '🍟 Přílohy',
    name: 'Rýžové nudle (vařené)',
    kcal: 108, carbs: 25.2, protein: 0.9, fat: 0.2, per: 200,
    micros: { na: 5, k: 20, mg: 8, ca: 6, fe: 0.2, vit_c: 0, vit_d: 0, b12: 0, omega3: 5, zn: 0.2 },
  },
  {
    id: 'couscous',
    cat: '🍟 Přílohy',
    name: 'Kuskus (vařený)',
    kcal: 112, carbs: 23.2, protein: 3.8, fat: 0.2, per: 200,
    micros: { na: 5, k: 58, mg: 10, ca: 8, fe: 0.4, vit_c: 0, vit_d: 0, b12: 0, omega3: 10, zn: 0.3 },
  },

  // ──────────────────────────────────────────
  // 🥩 Bílkoviny – maso
  // ──────────────────────────────────────────
  {
    id: 'chicken_thigh',
    cat: '🥩 Bílkoviny',
    name: 'Kuřecí stehno (bez kůže)',
    kcal: 177, carbs: 0, protein: 24.0, fat: 8.9, per: 180,
    micros: { na: 90, k: 260, mg: 24, ca: 12, fe: 0.9, vit_c: 0, vit_d: 0.1, b12: 0.5, omega3: 120, zn: 2.4 },
  },
  {
    id: 'pork_tenderloin',
    cat: '🥩 Bílkoviny',
    name: 'Vepřová panenka',
    kcal: 143, carbs: 0, protein: 22.6, fat: 5.5, per: 150,
    micros: { na: 54, k: 390, mg: 28, ca: 6, fe: 1.0, vit_c: 0, vit_d: 0.5, b12: 0.9, omega3: 40, zn: 2.2 },
  },
  {
    id: 'beef_steak',
    cat: '🥩 Bílkoviny',
    name: 'Hovězí steak (libový)',
    kcal: 179, carbs: 0, protein: 26.1, fat: 8.0, per: 180,
    micros: { na: 56, k: 318, mg: 24, ca: 18, fe: 2.9, vit_c: 0, vit_d: 0.1, b12: 2.6, omega3: 50, zn: 6.1 },
  },

  // ──────────────────────────────────────────
  // 🥩 Šunky & Uzeniny
  // ──────────────────────────────────────────
  {
    id: 'ham_premium',
    cat: '🥩 Šunky',
    name: 'Šunka nejvyšší jakosti',
    kcal: 107, carbs: 0.5, protein: 18.4, fat: 3.4, per: 60,
    micros: { na: 890, k: 290, mg: 18, ca: 8, fe: 0.5, vit_c: 0, vit_d: 0, b12: 0.4, omega3: 30, zn: 1.4 },
  },
  {
    id: 'prosciutto',
    cat: '🥩 Šunky',
    name: 'Prosciutto crudo',
    kcal: 145, carbs: 0, protein: 27.4, fat: 3.8, per: 50,
    micros: { na: 2100, k: 380, mg: 22, ca: 14, fe: 0.9, vit_c: 0, vit_d: 0, b12: 0.6, omega3: 40, zn: 2.0 },
  },
  {
    id: 'salami',
    cat: '🥩 Šunky',
    name: 'Salami',
    kcal: 347, carbs: 1.0, protein: 18.5, fat: 29.8, per: 40,
    micros: { na: 1600, k: 290, mg: 18, ca: 12, fe: 1.4, vit_c: 0, vit_d: 0, b12: 0.7, omega3: 150, zn: 2.8 },
  },
  {
    id: 'mortadella',
    cat: '🥩 Šunky',
    name: 'Mortadella',
    kcal: 311, carbs: 2.2, protein: 14.5, fat: 27.2, per: 60,
    micros: { na: 1100, k: 230, mg: 12, ca: 16, fe: 0.8, vit_c: 0, vit_d: 0, b12: 0.5, omega3: 100, zn: 1.8 },
  },
  {
    id: 'cooked_ham',
    cat: '🥩 Šunky',
    name: 'Šunka vařená (Debrecínská)',
    kcal: 215, carbs: 1.5, protein: 14.2, fat: 17.0, per: 60,
    micros: { na: 970, k: 270, mg: 15, ca: 10, fe: 0.9, vit_c: 0, vit_d: 0, b12: 0.4, omega3: 80, zn: 2.0 },
  },

  // ──────────────────────────────────────────
  // 🧀 Sýry
  // ──────────────────────────────────────────
  {
    id: 'parmesan',
    cat: '🧀 Sýry',
    name: 'Parmazán (Parmigiano)',
    kcal: 431, carbs: 0, protein: 38.0, fat: 29.0, per: 30,
    micros: { na: 1529, k: 120, mg: 44, ca: 1184, fe: 0.8, vit_c: 0, vit_d: 0.5, b12: 1.2, omega3: 230, zn: 2.7 },
  },
  {
    id: 'edam',
    cat: '🧀 Sýry',
    name: 'Eidam 30 %',
    kcal: 280, carbs: 0, protein: 28.0, fat: 18.0, per: 50,
    micros: { na: 810, k: 90, mg: 30, ca: 720, fe: 0.4, vit_c: 0, vit_d: 0.4, b12: 1.1, omega3: 120, zn: 3.8 },
  },
  {
    id: 'gouda',
    cat: '🧀 Sýry',
    name: 'Gouda',
    kcal: 356, carbs: 0, protein: 25.0, fat: 27.4, per: 50,
    micros: { na: 820, k: 121, mg: 29, ca: 700, fe: 0.2, vit_c: 0, vit_d: 0.6, b12: 1.5, omega3: 150, zn: 3.6 },
  },
  {
    id: 'mozzarella',
    cat: '🧀 Sýry',
    name: 'Mozzarella (light)',
    kcal: 242, carbs: 2.2, protein: 18.9, fat: 17.8, per: 125,
    micros: { na: 373, k: 76, mg: 20, ca: 518, fe: 0.2, vit_c: 0, vit_d: 0.4, b12: 0.8, omega3: 100, zn: 2.9 },
  },
  {
    id: 'brie',
    cat: '🧀 Sýry',
    name: 'Brie / Hermelín',
    kcal: 334, carbs: 0.5, protein: 20.0, fat: 27.7, per: 60,
    micros: { na: 629, k: 152, mg: 20, ca: 184, fe: 0.5, vit_c: 0, vit_d: 0.5, b12: 1.6, omega3: 130, zn: 2.4 },
  },
  {
    id: 'feta',
    cat: '🧀 Sýry',
    name: 'Feta',
    kcal: 264, carbs: 4.1, protein: 14.2, fat: 21.3, per: 60,
    micros: { na: 1116, k: 62, mg: 19, ca: 493, fe: 0.6, vit_c: 0, vit_d: 0.1, b12: 1.7, omega3: 80, zn: 2.9 },
  },
  {
    id: 'processed_cheese',
    cat: '🧀 Sýry',
    name: 'Tavený sýr (Apetito)',
    kcal: 245, carbs: 3.5, protein: 12.8, fat: 20.0, per: 40,
    micros: { na: 1050, k: 110, mg: 14, ca: 380, fe: 0.2, vit_c: 0, vit_d: 0.2, b12: 0.5, omega3: 80, zn: 1.8 },
  },

  // ──────────────────────────────────────────
  // 🧀 Sýry – další
  // ──────────────────────────────────────────
  {
    id: 'cheddar',
    cat: '🧀 Sýry',
    name: 'Čedar',
    kcal: 402, carbs: 1.3, protein: 24.9, fat: 33.1, per: 40,
    micros: { na: 621, k: 98, mg: 28, ca: 721, fe: 0.2, vit_c: 0, vit_d: 0.6, b12: 0.8, omega3: 170, zn: 3.1 },
  },
  {
    id: 'emmental',
    cat: '🧀 Sýry',
    name: 'Ementál',
    kcal: 380, carbs: 1.4, protein: 27.8, fat: 29.0, per: 40,
    micros: { na: 450, k: 100, mg: 32, ca: 1006, fe: 0.2, vit_c: 0, vit_d: 0.7, b12: 1.3, omega3: 160, zn: 4.0 },
  },
  {
    id: 'camembert',
    cat: '🧀 Sýry',
    name: 'Camembert / Hermelín',
    kcal: 300, carbs: 0.5, protein: 19.8, fat: 24.7, per: 60,
    micros: { na: 842, k: 187, mg: 20, ca: 388, fe: 0.3, vit_c: 0, vit_d: 0.4, b12: 1.3, omega3: 110, zn: 2.4 },
  },
  {
    id: 'lučina',
    cat: '🧀 Sýry',
    name: 'Žervé / Lučina (cream cheese)',
    kcal: 220, carbs: 5.0, protein: 7.5, fat: 19.0, per: 40,
    micros: { na: 380, k: 120, mg: 10, ca: 100, fe: 0.1, vit_c: 0, vit_d: 0.1, b12: 0.3, omega3: 70, zn: 0.8 },
  },
  {
    id: 'tvaruzky',
    cat: '🧀 Sýry',
    name: 'Olomoucké tvarůžky',
    kcal: 90, carbs: 1.1, protein: 28.7, fat: 0.5, per: 50,
    micros: { na: 1300, k: 105, mg: 16, ca: 120, fe: 0.3, vit_c: 0, vit_d: 0.1, b12: 1.0, omega3: 10, zn: 3.0 },
  },
  {
    id: 'ricotta',
    cat: '🧀 Sýry',
    name: 'Ricotta',
    kcal: 174, carbs: 3.0, protein: 11.3, fat: 13.0, per: 100,
    micros: { na: 84, k: 105, mg: 11, ca: 207, fe: 0.4, vit_c: 0, vit_d: 0.1, b12: 0.3, omega3: 90, zn: 1.2 },
  },

  // ──────────────────────────────────────────
  // 🍚 Sacharidy – obiloviny/kaše
  // ──────────────────────────────────────────
  {
    id: 'buckwheat',
    cat: '🍚 Sacharidy',
    name: 'Pohanka (vařená)',
    kcal: 92, carbs: 19.9, protein: 3.4, fat: 0.6, per: 200,
    micros: { na: 1, k: 88, mg: 51, ca: 7, fe: 0.8, vit_c: 0, vit_d: 0, b12: 0, omega3: 47, zn: 0.6 },
  },
  {
    id: 'wholegrain_toast',
    cat: '🍚 Sacharidy',
    name: 'Celozrnný toast',
    kcal: 259, carbs: 43.0, protein: 10.5, fat: 4.2, per: 40,
    micros: { na: 420, k: 210, mg: 65, ca: 80, fe: 2.8, vit_c: 0, vit_d: 0, b12: 0, omega3: 120, zn: 1.8 },
  },
  {
    id: 'muesli',
    cat: '🍚 Sacharidy',
    name: 'Müsli (bez přidaného cukru)',
    kcal: 370, carbs: 62.0, protein: 10.0, fat: 7.5, per: 60,
    micros: { na: 30, k: 380, mg: 90, ca: 60, fe: 3.5, vit_c: 0, vit_d: 0, b12: 0, omega3: 200, zn: 2.5 },
  },
  {
    id: 'spelt_pasta',
    cat: '🍚 Sacharidy',
    name: 'Špaldové těstoviny (vařené)',
    kcal: 142, carbs: 27.0, protein: 5.8, fat: 1.2, per: 200,
    micros: { na: 3, k: 96, mg: 45, ca: 20, fe: 1.2, vit_c: 0, vit_d: 0, b12: 0, omega3: 60, zn: 1.2 },
  },
  {
    id: 'barley',
    cat: '🍚 Sacharidy',
    name: 'Kroupy (vařené)',
    kcal: 76, carbs: 17.5, protein: 2.0, fat: 0.3, per: 200,
    micros: { na: 3, k: 93, mg: 22, ca: 11, fe: 0.7, vit_c: 0, vit_d: 0, b12: 0, omega3: 20, zn: 0.8 },
  },
  {
    id: 'millet',
    cat: '🍚 Sacharidy',
    name: 'Jáhly (vařené)',
    kcal: 73, carbs: 14.4, protein: 2.2, fat: 0.9, per: 200,
    micros: { na: 2, k: 62, mg: 26, ca: 3, fe: 0.6, vit_c: 0, vit_d: 0, b12: 0, omega3: 25, zn: 0.5 },
  },
  {
    id: 'pancakes',
    cat: '🍚 Sacharidy',
    name: 'Palačinky (klasické)',
    kcal: 210, carbs: 26.0, protein: 7.5, fat: 8.0, per: 100,
    micros: { na: 280, k: 120, mg: 12, ca: 90, fe: 0.8, vit_c: 0, vit_d: 0.3, b12: 0.3, omega3: 50, zn: 0.5 },
  },

  // ──────────────────────────────────────────
  // 🍌 Ovoce – další
  // ──────────────────────────────────────────
  {
    id: 'grapes',
    cat: '🍌 Ovoce',
    name: 'Hroznové víno',
    kcal: 69, carbs: 18.1, protein: 0.7, fat: 0.2, per: 150,
    micros: { na: 2, k: 191, mg: 7, ca: 10, fe: 0.4, vit_c: 3.2, vit_d: 0, b12: 0, omega3: 10, zn: 0.1 },
  },
  {
    id: 'kiwi',
    cat: '🍌 Ovoce',
    name: 'Kiwi',
    kcal: 61, carbs: 14.7, protein: 1.1, fat: 0.5, per: 100,
    micros: { na: 3, k: 312, mg: 17, ca: 34, fe: 0.3, vit_c: 92, vit_d: 0, b12: 0, omega3: 40, zn: 0.1 },
  },
  {
    id: 'pear',
    cat: '🍌 Ovoce',
    name: 'Hruška',
    kcal: 57, carbs: 15.2, protein: 0.4, fat: 0.1, per: 160,
    micros: { na: 1, k: 116, mg: 7, ca: 9, fe: 0.2, vit_c: 4.3, vit_d: 0, b12: 0, omega3: 8, zn: 0.1 },
  },
  {
    id: 'peach',
    cat: '🍌 Ovoce',
    name: 'Broskev',
    kcal: 39, carbs: 9.5, protein: 0.9, fat: 0.3, per: 150,
    micros: { na: 0, k: 190, mg: 9, ca: 6, fe: 0.3, vit_c: 6.6, vit_d: 0, b12: 0, omega3: 30, zn: 0.2 },
  },
  {
    id: 'mango',
    cat: '🍌 Ovoce',
    name: 'Mango',
    kcal: 60, carbs: 14.9, protein: 0.8, fat: 0.4, per: 200,
    micros: { na: 1, k: 168, mg: 10, ca: 11, fe: 0.2, vit_c: 36, vit_d: 0, b12: 0, omega3: 30, zn: 0.1 },
  },
  {
    id: 'apricot',
    cat: '🍌 Ovoce',
    name: 'Meruňka',
    kcal: 48, carbs: 11.1, protein: 1.4, fat: 0.4, per: 100,
    micros: { na: 1, k: 259, mg: 10, ca: 13, fe: 0.4, vit_c: 10, vit_d: 0, b12: 0, omega3: 60, zn: 0.2 },
  },
  {
    id: 'cherries',
    cat: '🍌 Ovoce',
    name: 'Třešně',
    kcal: 63, carbs: 16.0, protein: 1.1, fat: 0.2, per: 150,
    micros: { na: 0, k: 222, mg: 11, ca: 13, fe: 0.4, vit_c: 7, vit_d: 0, b12: 0, omega3: 30, zn: 0.1 },
  },
  {
    id: 'pineapple',
    cat: '🍌 Ovoce',
    name: 'Ananas',
    kcal: 50, carbs: 13.1, protein: 0.5, fat: 0.1, per: 150,
    micros: { na: 1, k: 109, mg: 12, ca: 13, fe: 0.3, vit_c: 47, vit_d: 0, b12: 0, omega3: 20, zn: 0.1 },
  },
  {
    id: 'raspberries',
    cat: '🍌 Ovoce',
    name: 'Maliny',
    kcal: 52, carbs: 11.9, protein: 1.2, fat: 0.7, per: 150,
    micros: { na: 1, k: 151, mg: 22, ca: 25, fe: 0.7, vit_c: 26, vit_d: 0, b12: 0, omega3: 126, zn: 0.4 },
  },
  {
    id: 'grapefruit',
    cat: '🍌 Ovoce',
    name: 'Grep (grapefruit)',
    kcal: 42, carbs: 10.7, protein: 0.8, fat: 0.1, per: 200,
    micros: { na: 0, k: 135, mg: 9, ca: 22, fe: 0.1, vit_c: 38, vit_d: 0, b12: 0, omega3: 13, zn: 0.1 },
  },

  // ──────────────────────────────────────────
  // 🥩 Bílkoviny – ryby & maso
  // ──────────────────────────────────────────
  {
    id: 'mackerel',
    cat: '🥩 Bílkoviny',
    name: 'Makrela (uzená filé)',
    kcal: 305, carbs: 0, protein: 24.0, fat: 22.0, per: 100,
    micros: { na: 700, k: 370, mg: 32, ca: 28, fe: 1.1, vit_c: 0, vit_d: 8.0, b12: 8.7, omega3: 2670, zn: 0.8 },
  },
  {
    id: 'cod',
    cat: '🥩 Bílkoviny',
    name: 'Treska (filé)',
    kcal: 105, carbs: 0, protein: 23.0, fat: 0.9, per: 150,
    micros: { na: 78, k: 413, mg: 42, ca: 16, fe: 0.4, vit_c: 0, vit_d: 1.0, b12: 0.9, omega3: 180, zn: 0.5 },
  },
  {
    id: 'trout',
    cat: '🥩 Bílkoviny',
    name: 'Pstruh duhový (pečený)',
    kcal: 141, carbs: 0, protein: 20.5, fat: 6.2, per: 150,
    micros: { na: 63, k: 369, mg: 28, ca: 67, fe: 0.8, vit_c: 0, vit_d: 14, b12: 4.2, omega3: 780, zn: 0.7 },
  },
  {
    id: 'pangasius',
    cat: '🥩 Bílkoviny',
    name: 'Pangasius (filé)',
    kcal: 120, carbs: 0, protein: 17.7, fat: 5.5, per: 150,
    micros: { na: 45, k: 350, mg: 22, ca: 25, fe: 0.5, vit_c: 0, vit_d: 1.0, b12: 1.2, omega3: 270, zn: 0.5 },
  },
  {
    id: 'pork_schnitzel',
    cat: '🥩 Bílkoviny',
    name: 'Vepřový řízek (smažený)',
    kcal: 280, carbs: 14.0, protein: 22.0, fat: 14.5, per: 180,
    micros: { na: 380, k: 310, mg: 24, ca: 30, fe: 1.2, vit_c: 0, vit_d: 0.2, b12: 0.7, omega3: 80, zn: 2.5 },
  },
  {
    id: 'lamb',
    cat: '🥩 Bílkoviny',
    name: 'Jehněčí (plec, vařené)',
    kcal: 258, carbs: 0, protein: 25.0, fat: 17.0, per: 150,
    micros: { na: 72, k: 310, mg: 22, ca: 18, fe: 1.9, vit_c: 0, vit_d: 0.1, b12: 2.0, omega3: 150, zn: 4.2 },
  },
  {
    id: 'duck_breast',
    cat: '🥩 Bílkoviny',
    name: 'Kachní prsa (bez kůže)',
    kcal: 140, carbs: 0, protein: 24.0, fat: 4.0, per: 150,
    micros: { na: 77, k: 305, mg: 26, ca: 12, fe: 2.7, vit_c: 0, vit_d: 0.4, b12: 0.4, omega3: 80, zn: 2.1 },
  },

  // ──────────────────────────────────────────
  // 🥛 Mléčné – další
  // ──────────────────────────────────────────
  {
    id: 'butter',
    cat: '🥛 Mléčné',
    name: 'Máslo',
    kcal: 717, carbs: 0.6, protein: 0.9, fat: 81.1, per: 10,
    micros: { na: 643, k: 24, mg: 2, ca: 24, fe: 0, vit_c: 0, vit_d: 1.5, b12: 0.2, omega3: 315, zn: 0.1 },
  },
  {
    id: 'sour_cream',
    cat: '🥛 Mléčné',
    name: 'Zakysaná smetana (12 %)',
    kcal: 116, carbs: 3.4, protein: 2.8, fat: 10.0, per: 50,
    micros: { na: 30, k: 120, mg: 10, ca: 88, fe: 0.1, vit_c: 0.7, vit_d: 0.1, b12: 0.2, omega3: 120, zn: 0.3 },
  },
  {
    id: 'heavy_cream',
    cat: '🥛 Mléčné',
    name: 'Smetana (33 %)',
    kcal: 314, carbs: 3.0, protein: 2.3, fat: 33.0, per: 30,
    micros: { na: 34, k: 85, mg: 8, ca: 69, fe: 0, vit_c: 0.6, vit_d: 0.3, b12: 0.2, omega3: 410, zn: 0.2 },
  },
  {
    id: 'soy_milk',
    cat: '🥛 Mléčné',
    name: 'Sójové mléko',
    kcal: 33, carbs: 1.5, protein: 3.0, fat: 1.8, per: 250,
    micros: { na: 51, k: 118, mg: 25, ca: 25, fe: 0.4, vit_c: 0, vit_d: 1.0, b12: 0, omega3: 200, zn: 0.3 },
  },
  {
    id: 'oat_milk',
    cat: '🥛 Mléčné',
    name: 'Ovesné mléko',
    kcal: 45, carbs: 8.0, protein: 1.0, fat: 1.5, per: 250,
    micros: { na: 60, k: 115, mg: 10, ca: 120, fe: 0.2, vit_c: 0, vit_d: 1.0, b12: 0, omega3: 90, zn: 0.2 },
  },
  {
    id: 'mascarpone',
    cat: '🥛 Mléčné',
    name: 'Mascarpone',
    kcal: 429, carbs: 2.6, protein: 3.7, fat: 44.0, per: 30,
    micros: { na: 45, k: 90, mg: 8, ca: 72, fe: 0, vit_c: 0, vit_d: 0.3, b12: 0.2, omega3: 320, zn: 0.2 },
  },
  {
    id: 'acidophilus',
    cat: '🥛 Mléčné',
    name: 'Acidofilní mléko',
    kcal: 52, carbs: 5.0, protein: 3.3, fat: 1.8, per: 250,
    micros: { na: 42, k: 140, mg: 11, ca: 115, fe: 0.1, vit_c: 0.8, vit_d: 0.1, b12: 0.4, omega3: 60, zn: 0.4 },
  },

  // ──────────────────────────────────────────
  // 🥜 Ořechy & semínka – další
  // ──────────────────────────────────────────
  {
    id: 'cashews',
    cat: '🥜 Ořechy',
    name: 'Kešu ořechy',
    kcal: 553, carbs: 30.2, protein: 18.2, fat: 43.9, per: 30,
    micros: { na: 12, k: 660, mg: 292, ca: 37, fe: 6.7, vit_c: 0.5, vit_d: 0, b12: 0, omega3: 63, zn: 5.8 },
  },
  {
    id: 'pistachios',
    cat: '🥜 Ořechy',
    name: 'Pistácie',
    kcal: 562, carbs: 27.7, protein: 20.1, fat: 45.3, per: 30,
    micros: { na: 6, k: 1025, mg: 121, ca: 105, fe: 3.9, vit_c: 5.6, vit_d: 0, b12: 0, omega3: 260, zn: 2.3 },
  },
  {
    id: 'brazil_nuts',
    cat: '🥜 Ořechy',
    name: 'Para ořechy',
    kcal: 656, carbs: 11.7, protein: 14.3, fat: 66.4, per: 30,
    micros: { na: 3, k: 659, mg: 376, ca: 160, fe: 2.4, vit_c: 0.7, vit_d: 0, b12: 0, omega3: 18, zn: 4.1 },
  },
  {
    id: 'chia',
    cat: '🥜 Ořechy',
    name: 'Chia semínka',
    kcal: 486, carbs: 42.1, protein: 16.5, fat: 30.7, per: 20,
    micros: { na: 16, k: 407, mg: 335, ca: 631, fe: 7.7, vit_c: 1.6, vit_d: 0, b12: 0, omega3: 17550, zn: 4.6 },
  },
  {
    id: 'flaxseed',
    cat: '🥜 Ořechy',
    name: 'Lněná semínka',
    kcal: 534, carbs: 28.9, protein: 18.3, fat: 42.2, per: 15,
    micros: { na: 30, k: 813, mg: 392, ca: 255, fe: 5.7, vit_c: 0.6, vit_d: 0, b12: 0, omega3: 22813, zn: 4.3 },
  },
  {
    id: 'sunflower_seeds',
    cat: '🥜 Ořechy',
    name: 'Slunečnicová semínka',
    kcal: 584, carbs: 20.0, protein: 20.8, fat: 51.5, per: 30,
    micros: { na: 9, k: 645, mg: 325, ca: 78, fe: 5.3, vit_c: 1.4, vit_d: 0, b12: 0, omega3: 74, zn: 5.0 },
  },
  {
    id: 'pumpkin_seeds',
    cat: '🥜 Ořechy',
    name: 'Dýňová semínka',
    kcal: 559, carbs: 10.7, protein: 30.2, fat: 49.1, per: 30,
    micros: { na: 7, k: 809, mg: 592, ca: 46, fe: 8.8, vit_c: 1.9, vit_d: 0, b12: 0, omega3: 112, zn: 7.8 },
  },
  {
    id: 'peanuts',
    cat: '🥜 Ořechy',
    name: 'Arašídy (pražené)',
    kcal: 567, carbs: 16.1, protein: 25.8, fat: 49.2, per: 30,
    micros: { na: 6, k: 705, mg: 168, ca: 54, fe: 1.6, vit_c: 0, vit_d: 0, b12: 0, omega3: 400, zn: 3.3 },
  },
  {
    id: 'almond_butter',
    cat: '🥜 Ořechy',
    name: 'Mandlové máslo',
    kcal: 614, carbs: 19.6, protein: 21.2, fat: 55.8, per: 30,
    micros: { na: 7, k: 706, mg: 270, ca: 261, fe: 3.7, vit_c: 0, vit_d: 0, b12: 0, omega3: 16, zn: 3.2 },
  },

  // ──────────────────────────────────────────
  // 🥦 Zelenina – další
  // ──────────────────────────────────────────
  {
    id: 'red_pepper',
    cat: '🥦 Zelenina',
    name: 'Paprika červená',
    kcal: 31, carbs: 6.0, protein: 1.0, fat: 0.3, per: 150,
    micros: { na: 4, k: 211, mg: 12, ca: 7, fe: 0.4, vit_c: 128, vit_d: 0, b12: 0, omega3: 45, zn: 0.3 },
  },
  {
    id: 'cucumber',
    cat: '🥦 Zelenina',
    name: 'Okurka',
    kcal: 15, carbs: 3.6, protein: 0.7, fat: 0.1, per: 150,
    micros: { na: 2, k: 147, mg: 13, ca: 16, fe: 0.3, vit_c: 2.8, vit_d: 0, b12: 0, omega3: 5, zn: 0.2 },
  },
  {
    id: 'zucchini',
    cat: '🥦 Zelenina',
    name: 'Cuketa',
    kcal: 17, carbs: 3.1, protein: 1.2, fat: 0.3, per: 200,
    micros: { na: 8, k: 261, mg: 18, ca: 16, fe: 0.4, vit_c: 17, vit_d: 0, b12: 0, omega3: 81, zn: 0.3 },
  },
  {
    id: 'mushrooms',
    cat: '🥦 Zelenina',
    name: 'Žampiony (čerstvé)',
    kcal: 22, carbs: 3.3, protein: 3.1, fat: 0.3, per: 100,
    micros: { na: 5, k: 318, mg: 9, ca: 3, fe: 0.5, vit_c: 2.1, vit_d: 0.2, b12: 0, omega3: 15, zn: 0.5 },
  },
  {
    id: 'corn',
    cat: '🥦 Zelenina',
    name: 'Kukuřice (konzerva)',
    kcal: 86, carbs: 19.0, protein: 3.2, fat: 1.2, per: 100,
    micros: { na: 270, k: 270, mg: 26, ca: 3, fe: 0.5, vit_c: 6.2, vit_d: 0, b12: 0, omega3: 28, zn: 0.5 },
  },
  {
    id: 'white_cabbage',
    cat: '🥦 Zelenina',
    name: 'Zelí bílé',
    kcal: 25, carbs: 5.8, protein: 1.3, fat: 0.1, per: 100,
    micros: { na: 18, k: 170, mg: 12, ca: 40, fe: 0.5, vit_c: 36, vit_d: 0, b12: 0, omega3: 26, zn: 0.2 },
  },
  {
    id: 'eggplant',
    cat: '🥦 Zelenina',
    name: 'Lilek',
    kcal: 25, carbs: 5.9, protein: 1.0, fat: 0.2, per: 200,
    micros: { na: 2, k: 229, mg: 14, ca: 9, fe: 0.2, vit_c: 2.2, vit_d: 0, b12: 0, omega3: 33, zn: 0.2 },
  },
  {
    id: 'onion',
    cat: '🥦 Zelenina',
    name: 'Cibule',
    kcal: 40, carbs: 9.3, protein: 1.1, fat: 0.1, per: 80,
    micros: { na: 4, k: 146, mg: 10, ca: 23, fe: 0.2, vit_c: 7.4, vit_d: 0, b12: 0, omega3: 4, zn: 0.2 },
  },
  {
    id: 'peas',
    cat: '🥦 Zelenina',
    name: 'Hrášek zelený (mražený)',
    kcal: 81, carbs: 14.5, protein: 5.4, fat: 0.4, per: 100,
    micros: { na: 5, k: 244, mg: 33, ca: 25, fe: 1.5, vit_c: 40, vit_d: 0, b12: 0, omega3: 36, zn: 1.2 },
  },
  {
    id: 'kale',
    cat: '🥦 Zelenina',
    name: 'Kapusta / Kale',
    kcal: 49, carbs: 8.8, protein: 4.3, fat: 0.9, per: 100,
    micros: { na: 38, k: 491, mg: 47, ca: 150, fe: 1.5, vit_c: 120, vit_d: 0, b12: 0, omega3: 180, zn: 0.4 },
  },
  {
    id: 'sweet_corn_baby',
    cat: '🥦 Zelenina',
    name: 'Salát ledový',
    kcal: 14, carbs: 2.2, protein: 1.4, fat: 0.2, per: 100,
    micros: { na: 10, k: 194, mg: 14, ca: 36, fe: 1.0, vit_c: 9.2, vit_d: 0, b12: 0, omega3: 113, zn: 0.2 },
  },

  // ──────────────────────────────────────────
  // 🫘 Luštěniny – další
  // ──────────────────────────────────────────
  {
    id: 'edamame',
    cat: '🫘 Luštěniny',
    name: 'Edamame (sójové boby)',
    kcal: 122, carbs: 8.9, protein: 11.9, fat: 5.2, per: 100,
    micros: { na: 6, k: 436, mg: 64, ca: 63, fe: 2.3, vit_c: 6.1, vit_d: 0, b12: 0, omega3: 350, zn: 1.4 },
  },
  {
    id: 'tofu',
    cat: '🫘 Luštěniny',
    name: 'Tofu (přírodní)',
    kcal: 76, carbs: 1.9, protein: 8.1, fat: 4.8, per: 150,
    micros: { na: 7, k: 121, mg: 30, ca: 350, fe: 1.6, vit_c: 0.1, vit_d: 0, b12: 0, omega3: 400, zn: 1.0 },
  },
  {
    id: 'white_beans',
    cat: '🫘 Luštěniny',
    name: 'Bílé fazole (vařené)',
    kcal: 127, carbs: 22.8, protein: 8.7, fat: 0.5, per: 200,
    micros: { na: 2, k: 561, mg: 63, ca: 90, fe: 3.7, vit_c: 0, vit_d: 0, b12: 0, omega3: 138, zn: 1.4 },
  },
  {
    id: 'red_lentils',
    cat: '🫘 Luštěniny',
    name: 'Červená čočka (vařená)',
    kcal: 116, carbs: 20.1, protein: 9.0, fat: 0.4, per: 200,
    micros: { na: 2, k: 369, mg: 36, ca: 19, fe: 3.3, vit_c: 1.5, vit_d: 0, b12: 0, omega3: 73, zn: 1.3 },
  },
  {
    id: 'hummus',
    cat: '🫘 Luštěniny',
    name: 'Hummus',
    kcal: 177, carbs: 14.3, protein: 7.9, fat: 10.4, per: 80,
    micros: { na: 379, k: 228, mg: 56, ca: 49, fe: 2.4, vit_c: 2.4, vit_d: 0, b12: 0, omega3: 100, zn: 1.6 },
  },

  // ──────────────────────────────────────────
  // 🫒 Tuky – další
  // ──────────────────────────────────────────
  {
    id: 'ghee',
    cat: '🫒 Tuky',
    name: 'Ghee (přepuštěné máslo)',
    kcal: 900, carbs: 0, protein: 0, fat: 99.5, per: 10,
    micros: { na: 2, k: 5, mg: 0, ca: 4, fe: 0, vit_c: 0, vit_d: 1.5, b12: 0, omega3: 300, zn: 0 },
  },
  {
    id: 'flax_oil',
    cat: '🫒 Tuky',
    name: 'Lněný olej',
    kcal: 884, carbs: 0, protein: 0, fat: 100.0, per: 10,
    micros: { na: 0, k: 0, mg: 0, ca: 0, fe: 0, vit_c: 0, vit_d: 0, b12: 0, omega3: 53300, zn: 0 },
  },
  {
    id: 'tahini',
    cat: '🫒 Tuky',
    name: 'Tahini (sezamová pasta)',
    kcal: 595, carbs: 21.2, protein: 17.0, fat: 53.8, per: 20,
    micros: { na: 115, k: 414, mg: 95, ca: 426, fe: 8.9, vit_c: 0, vit_d: 0, b12: 0, omega3: 400, zn: 4.6 },
  },

  // ──────────────────────────────────────────
  // 🥩 Šunky – další
  // ──────────────────────────────────────────
  {
    id: 'frankfurter',
    cat: '🥩 Šunky',
    name: 'Párky vídeňské',
    kcal: 293, carbs: 1.0, protein: 11.0, fat: 26.0, per: 80,
    micros: { na: 1000, k: 180, mg: 12, ca: 12, fe: 0.8, vit_c: 0, vit_d: 0, b12: 0.4, omega3: 120, zn: 1.4 },
  },
  {
    id: 'gothaj',
    cat: '🥩 Šunky',
    name: 'Gothajský salám',
    kcal: 295, carbs: 1.2, protein: 16.0, fat: 24.5, per: 40,
    micros: { na: 1050, k: 250, mg: 15, ca: 14, fe: 1.1, vit_c: 0, vit_d: 0, b12: 0.5, omega3: 110, zn: 2.0 },
  },
  {
    id: 'liver_pate',
    cat: '🥩 Šunky',
    name: 'Paté játrové',
    kcal: 320, carbs: 2.5, protein: 13.5, fat: 28.0, per: 50,
    micros: { na: 870, k: 190, mg: 14, ca: 15, fe: 4.5, vit_c: 2, vit_d: 0.5, b12: 8.0, omega3: 100, zn: 2.8 },
  },
  {
    id: 'chicken_ham',
    cat: '🥩 Šunky',
    name: 'Kuřecí šunka',
    kcal: 80, carbs: 1.0, protein: 16.5, fat: 1.2, per: 60,
    micros: { na: 750, k: 240, mg: 18, ca: 8, fe: 0.4, vit_c: 0, vit_d: 0, b12: 0.3, omega3: 25, zn: 0.9 },
  },

  // ──────────────────────────────────────────
  // ⚡ Sportovní – další
  // ──────────────────────────────────────────
  {
    id: 'fruit_puree',
    cat: '⚡ Sportovní',
    name: 'Ovocná přesnídávka (gel)',
    kcal: 55, carbs: 12.7, protein: 0.5, fat: 0.2, per: 100,
    micros: { na: 5, k: 120, mg: 5, ca: 8, fe: 0.2, vit_c: 15, vit_d: 0, b12: 0, omega3: 10, zn: 0.1 },
  },
  {
    id: 'electrolyte_tabs',
    cat: '⚡ Sportovní',
    name: 'Elektrolyty (tableta)',
    kcal: 10, carbs: 2.4, protein: 0, fat: 0, per: 5,
    micros: { na: 900, k: 150, mg: 60, ca: 20, fe: 0, vit_c: 60, vit_d: 0, b12: 0, omega3: 0, zn: 0 },
  },
  {
    id: 'collagen_powder',
    cat: '⚡ Sportovní',
    name: 'Kolagen (prášek)',
    kcal: 360, carbs: 0, protein: 90.0, fat: 0, per: 10,
    micros: { na: 80, k: 10, mg: 5, ca: 20, fe: 0.1, vit_c: 0, vit_d: 0, b12: 0, omega3: 0, zn: 0.2 },
  },
];
