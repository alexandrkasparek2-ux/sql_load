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
  '🍞 Pečivo',
  '🍯 Pomazánky',
  '🍰 Sladkosti',
  '🍲 Hotová jídla',
  '🍌 Ovoce',
  '🥩 Bílkoviny',
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
  // 🍞 Pečivo
  // ──────────────────────────────────────────
  {
    id: 'rohlik',
    cat: '🍞 Pečivo',
    name: 'Rohlík',
    kcal: 278, carbs: 55.0, protein: 8.5, fat: 2.5, per: 50,
    micros: { na: 450, k: 100, mg: 20, ca: 15, fe: 1.5, vit_c: 0, vit_d: 0, b12: 0, omega3: 10, zn: 0.7 },
  },
  {
    id: 'bageta',
    cat: '🍞 Pečivo',
    name: 'Bageta',
    kcal: 272, carbs: 55.0, protein: 9.0, fat: 1.5, per: 80,
    micros: { na: 450, k: 80, mg: 18, ca: 15, fe: 1.2, vit_c: 0, vit_d: 0, b12: 0, omega3: 5, zn: 0.6 },
  },
  {
    id: 'toast_whole',
    cat: '🍞 Pečivo',
    name: 'Toust celozrnný',
    kcal: 246, carbs: 43.0, protein: 10.0, fat: 3.5, per: 50,
    micros: { na: 380, k: 200, mg: 55, ca: 65, fe: 2.2, vit_c: 0, vit_d: 0, b12: 0, omega3: 80, zn: 1.5 },
  },
  {
    id: 'toast_white',
    cat: '🍞 Pečivo',
    name: 'Toust bílý',
    kcal: 265, carbs: 49.0, protein: 8.5, fat: 3.2, per: 50,
    micros: { na: 490, k: 100, mg: 20, ca: 80, fe: 1.2, vit_c: 0, vit_d: 0, b12: 0, omega3: 10, zn: 0.7 },
  },
  {
    id: 'croissant',
    cat: '🍞 Pečivo',
    name: 'Croissant',
    kcal: 406, carbs: 45.0, protein: 7.0, fat: 21.0, per: 70,
    micros: { na: 380, k: 120, mg: 15, ca: 20, fe: 1.0, vit_c: 0, vit_d: 0.2, b12: 0.1, omega3: 100, zn: 0.6 },
  },
  {
    id: 'rye_bread',
    cat: '🍞 Pečivo',
    name: 'Chléb žitný',
    kcal: 259, carbs: 48.0, protein: 8.5, fat: 3.3, per: 60,
    micros: { na: 470, k: 200, mg: 40, ca: 30, fe: 2.0, vit_c: 0, vit_d: 0, b12: 0, omega3: 90, zn: 1.5 },
  },
  {
    id: 'graham_roll',
    cat: '🍞 Pečivo',
    name: 'Grahamový rohlík',
    kcal: 265, carbs: 51.0, protein: 9.0, fat: 3.0, per: 55,
    micros: { na: 420, k: 180, mg: 35, ca: 25, fe: 1.8, vit_c: 0, vit_d: 0, b12: 0, omega3: 60, zn: 1.2 },
  },
  {
    id: 'pretzel',
    cat: '🍞 Pečivo',
    name: 'Preclík (slaný)',
    kcal: 380, carbs: 80.0, protein: 9.0, fat: 2.0, per: 30,
    micros: { na: 1500, k: 100, mg: 20, ca: 15, fe: 1.5, vit_c: 0, vit_d: 0, b12: 0, omega3: 5, zn: 0.8 },
  },
  {
    id: 'sourdough',
    cat: '🍞 Pečivo',
    name: 'Kváskový chléb',
    kcal: 230, carbs: 44.0, protein: 8.0, fat: 1.5, per: 70,
    micros: { na: 350, k: 150, mg: 30, ca: 20, fe: 1.8, vit_c: 0, vit_d: 0, b12: 0, omega3: 30, zn: 1.0 },
  },

  // ──────────────────────────────────────────
  // 🍯 Pomazánky – sladké
  // ──────────────────────────────────────────
  {
    id: 'med',
    cat: '🍯 Pomazánky',
    name: 'Med',
    kcal: 304, carbs: 82.4, protein: 0.3, fat: 0.0, per: 20,
    micros: { na: 4, k: 52, mg: 2, ca: 6, fe: 0.4, vit_c: 0.5, vit_d: 0, b12: 0, omega3: 0, zn: 0.2 },
  },
  {
    id: 'marmelada_jahodova',
    cat: '🍯 Pomazánky',
    name: 'Marmeláda jahodová',
    kcal: 250, carbs: 65.0, protein: 0.4, fat: 0.1, per: 20,
    micros: { na: 10, k: 75, mg: 4, ca: 10, fe: 0.3, vit_c: 8, vit_d: 0, b12: 0, omega3: 0, zn: 0.1 },
  },
  {
    id: 'marmelada_malinova',
    cat: '🍯 Pomazánky',
    name: 'Marmeláda malinová',
    kcal: 248, carbs: 64.0, protein: 0.6, fat: 0.1, per: 20,
    micros: { na: 10, k: 90, mg: 5, ca: 12, fe: 0.4, vit_c: 10, vit_d: 0, b12: 0, omega3: 0, zn: 0.1 },
  },
  {
    id: 'povidla_svestkova',
    cat: '🍯 Pomazánky',
    name: 'Povidla švestková',
    kcal: 220, carbs: 56.0, protein: 1.0, fat: 0.2, per: 25,
    micros: { na: 5, k: 220, mg: 8, ca: 15, fe: 0.8, vit_c: 3, vit_d: 0, b12: 0, omega3: 10, zn: 0.2 },
  },
  {
    id: 'nutella',
    cat: '🍯 Pomazánky',
    name: 'Nutella',
    kcal: 539, carbs: 57.5, protein: 6.0, fat: 30.9, per: 20,
    micros: { na: 41, k: 280, mg: 40, ca: 120, fe: 2.0, vit_c: 0, vit_d: 1, b12: 0.2, omega3: 30, zn: 0.8 },
  },
  {
    id: 'jablecne_pyre',
    cat: '🍯 Pomazánky',
    name: 'Jablečné pyré',
    kcal: 68, carbs: 17.7, protein: 0.2, fat: 0.1, per: 100,
    micros: { na: 2, k: 90, mg: 3, ca: 4, fe: 0.1, vit_c: 2, vit_d: 0, b12: 0, omega3: 5, zn: 0.05 },
  },

  // ──────────────────────────────────────────
  // 🍯 Pomazánky – slané
  // ──────────────────────────────────────────
  {
    id: 'hummus',
    cat: '🍯 Pomazánky',
    name: 'Hummus',
    kcal: 166, carbs: 14.3, protein: 7.9, fat: 9.6, per: 50,
    micros: { na: 300, k: 228, mg: 36, ca: 49, fe: 2.4, vit_c: 3, vit_d: 0, b12: 0, omega3: 80, zn: 1.4 },
  },
  {
    id: 'tvarohova_pomazanka',
    cat: '🍯 Pomazánky',
    name: 'Tvarohová pomazánka',
    kcal: 130, carbs: 3.0, protein: 11.0, fat: 8.0, per: 50,
    micros: { na: 250, k: 90, mg: 8, ca: 80, fe: 0.1, vit_c: 0, vit_d: 0, b12: 0.4, omega3: 30, zn: 0.4 },
  },
  {
    id: 'vejcova_pomazanka',
    cat: '🍯 Pomazánky',
    name: 'Vejcová pomazánka',
    kcal: 185, carbs: 1.5, protein: 9.0, fat: 15.5, per: 50,
    micros: { na: 280, k: 100, mg: 10, ca: 40, fe: 1.2, vit_c: 0, vit_d: 1.5, b12: 0.6, omega3: 120, zn: 0.8 },
  },
  {
    id: 'jaterni_pomazanka',
    cat: '🍯 Pomazánky',
    name: 'Játrová pomazánka',
    kcal: 280, carbs: 3.0, protein: 13.0, fat: 24.0, per: 50,
    micros: { na: 600, k: 180, mg: 12, ca: 15, fe: 4.5, vit_c: 3, vit_d: 0.5, b12: 10.0, omega3: 100, zn: 2.5 },
  },
  {
    id: 'lucina',
    cat: '🍯 Pomazánky',
    name: 'Lučina (smetanový sýr)',
    kcal: 257, carbs: 4.2, protein: 8.5, fat: 22.8, per: 30,
    micros: { na: 380, k: 95, mg: 9, ca: 90, fe: 0.1, vit_c: 0, vit_d: 0.1, b12: 0.3, omega3: 80, zn: 0.5 },
  },
  {
    id: 'majoneza',
    cat: '🍯 Pomazánky',
    name: 'Majonéza',
    kcal: 680, carbs: 0.6, protein: 1.0, fat: 74.9, per: 15,
    micros: { na: 490, k: 20, mg: 1, ca: 5, fe: 0.1, vit_c: 0, vit_d: 0.5, b12: 0, omega3: 400, zn: 0.1 },
  },
  {
    id: 'tatarka',
    cat: '🍯 Pomazánky',
    name: 'Tatarská omáčka',
    kcal: 300, carbs: 8.0, protein: 1.0, fat: 29.0, per: 30,
    micros: { na: 500, k: 40, mg: 3, ca: 15, fe: 0.2, vit_c: 2, vit_d: 0.2, b12: 0, omega3: 300, zn: 0.1 },
  },
  {
    id: 'rybi_pomazanka',
    cat: '🍯 Pomazánky',
    name: 'Rybí pomazánka',
    kcal: 195, carbs: 2.0, protein: 14.0, fat: 14.5, per: 50,
    micros: { na: 450, k: 180, mg: 20, ca: 50, fe: 0.8, vit_c: 0, vit_d: 3.0, b12: 2.0, omega3: 600, zn: 0.8 },
  },

  // ──────────────────────────────────────────
  // 🍰 Sladkosti – čokolády
  // ──────────────────────────────────────────
  {
    id: 'cokolada_horca',
    cat: '🍰 Sladkosti',
    name: 'Čokoláda hořká (70 %)',
    kcal: 598, carbs: 32.0, protein: 7.8, fat: 42.6, per: 30,
    micros: { na: 10, k: 559, mg: 146, ca: 56, fe: 5.9, vit_c: 0, vit_d: 0, b12: 0, omega3: 50, zn: 2.8 },
  },
  {
    id: 'cokolada_mlecna',
    cat: '🍰 Sladkosti',
    name: 'Čokoláda mléčná',
    kcal: 535, carbs: 59.4, protein: 7.7, fat: 29.7, per: 30,
    micros: { na: 79, k: 372, mg: 63, ca: 189, fe: 1.5, vit_c: 0.4, vit_d: 0.1, b12: 0.5, omega3: 100, zn: 1.4 },
  },
  {
    id: 'cokolada_bila',
    cat: '🍰 Sladkosti',
    name: 'Čokoláda bílá',
    kcal: 539, carbs: 59.2, protein: 5.9, fat: 32.1, per: 30,
    micros: { na: 90, k: 286, mg: 26, ca: 199, fe: 0.2, vit_c: 0.6, vit_d: 0.1, b12: 0.4, omega3: 80, zn: 0.8 },
  },
  {
    id: 'cokolada_s_orizky',
    cat: '🍰 Sladkosti',
    name: 'Čokoláda s oříšky',
    kcal: 554, carbs: 49.0, protein: 9.5, fat: 35.0, per: 30,
    micros: { na: 45, k: 430, mg: 90, ca: 95, fe: 2.5, vit_c: 0, vit_d: 0, b12: 0.1, omega3: 60, zn: 1.8 },
  },

  // ──────────────────────────────────────────
  // 🍰 Sladkosti – buchty, koláče, dorty
  // ──────────────────────────────────────────
  {
    id: 'buchta_makova',
    cat: '🍰 Sladkosti',
    name: 'Buchta s mákem',
    kcal: 308, carbs: 50.0, protein: 6.0, fat: 9.0, per: 80,
    micros: { na: 180, k: 130, mg: 40, ca: 80, fe: 2.0, vit_c: 0, vit_d: 0.1, b12: 0.1, omega3: 30, zn: 0.9 },
  },
  {
    id: 'kolac_tvarohovy',
    cat: '🍰 Sladkosti',
    name: 'Koláč tvarohový',
    kcal: 272, carbs: 38.0, protein: 8.5, fat: 9.5, per: 100,
    micros: { na: 160, k: 120, mg: 12, ca: 85, fe: 0.8, vit_c: 0, vit_d: 0.2, b12: 0.3, omega3: 50, zn: 0.7 },
  },
  {
    id: 'kolac_svestkovy',
    cat: '🍰 Sladkosti',
    name: 'Koláč švestkový',
    kcal: 255, carbs: 42.0, protein: 4.5, fat: 8.0, per: 100,
    micros: { na: 150, k: 160, mg: 10, ca: 25, fe: 0.9, vit_c: 3, vit_d: 0.1, b12: 0.1, omega3: 20, zn: 0.4 },
  },
  {
    id: 'dort_cokoladovy',
    cat: '🍰 Sladkosti',
    name: 'Dort čokoládový',
    kcal: 385, carbs: 48.0, protein: 5.0, fat: 19.5, per: 100,
    micros: { na: 200, k: 200, mg: 30, ca: 60, fe: 1.8, vit_c: 0, vit_d: 0.2, b12: 0.2, omega3: 60, zn: 0.9 },
  },
  {
    id: 'dort_ovocny',
    cat: '🍰 Sladkosti',
    name: 'Dort ovocný',
    kcal: 290, carbs: 44.0, protein: 4.0, fat: 11.0, per: 100,
    micros: { na: 120, k: 130, mg: 8, ca: 50, fe: 0.6, vit_c: 8, vit_d: 0.1, b12: 0.1, omega3: 30, zn: 0.4 },
  },
  {
    id: 'strudl_jablecny',
    cat: '🍰 Sladkosti',
    name: 'Štrúdl jablečný',
    kcal: 262, carbs: 38.0, protein: 4.0, fat: 10.5, per: 120,
    micros: { na: 140, k: 100, mg: 8, ca: 20, fe: 0.8, vit_c: 4, vit_d: 0.1, b12: 0, omega3: 20, zn: 0.3 },
  },
  {
    id: 'medovnik',
    cat: '🍰 Sladkosti',
    name: 'Medovník',
    kcal: 402, carbs: 57.0, protein: 5.5, fat: 17.0, per: 100,
    micros: { na: 200, k: 150, mg: 12, ca: 55, fe: 1.2, vit_c: 0, vit_d: 0.1, b12: 0.2, omega3: 40, zn: 0.6 },
  },
  {
    id: 'pernik',
    cat: '🍰 Sladkosti',
    name: 'Perník',
    kcal: 350, carbs: 74.0, protein: 5.0, fat: 4.0, per: 50,
    micros: { na: 220, k: 200, mg: 25, ca: 40, fe: 2.5, vit_c: 0, vit_d: 0, b12: 0, omega3: 10, zn: 0.5 },
  },
  {
    id: 'susnenky_maslove',
    cat: '🍰 Sladkosti',
    name: 'Sušenky máslové',
    kcal: 502, carbs: 65.0, protein: 5.5, fat: 24.0, per: 30,
    micros: { na: 300, k: 80, mg: 10, ca: 20, fe: 1.0, vit_c: 0, vit_d: 0.2, b12: 0.1, omega3: 60, zn: 0.4 },
  },
  {
    id: 'donut',
    cat: '🍰 Sladkosti',
    name: 'Donut',
    kcal: 390, carbs: 46.0, protein: 5.0, fat: 21.0, per: 80,
    micros: { na: 310, k: 90, mg: 10, ca: 25, fe: 1.2, vit_c: 0, vit_d: 0.1, b12: 0.1, omega3: 50, zn: 0.4 },
  },
  {
    id: 'muffin_cokoladovy',
    cat: '🍰 Sladkosti',
    name: 'Muffin čokoládový',
    kcal: 362, carbs: 50.0, protein: 5.0, fat: 16.0, per: 100,
    micros: { na: 280, k: 180, mg: 22, ca: 50, fe: 1.5, vit_c: 0, vit_d: 0.1, b12: 0.1, omega3: 40, zn: 0.7 },
  },
  {
    id: 'venecek',
    cat: '🍰 Sladkosti',
    name: 'Věneček (éclair)',
    kcal: 318, carbs: 28.0, protein: 7.5, fat: 19.5, per: 80,
    micros: { na: 200, k: 100, mg: 10, ca: 50, fe: 0.8, vit_c: 0, vit_d: 0.3, b12: 0.2, omega3: 80, zn: 0.6 },
  },
  {
    id: 'tiramisu',
    cat: '🍰 Sladkosti',
    name: 'Tiramisu',
    kcal: 295, carbs: 27.0, protein: 5.5, fat: 18.0, per: 120,
    micros: { na: 85, k: 120, mg: 12, ca: 65, fe: 0.5, vit_c: 0, vit_d: 0.3, b12: 0.4, omega3: 60, zn: 0.5 },
  },

  // ──────────────────────────────────────────
  // 🍲 Hotová jídla
  // ──────────────────────────────────────────
  {
    id: 'beef_goulash',
    cat: '🍲 Hotová jídla',
    name: 'Guláš hovězí',
    kcal: 120, carbs: 8.0, protein: 10.0, fat: 5.5, per: 300,
    micros: { na: 500, k: 350, mg: 20, ca: 25, fe: 2.0, vit_c: 5, vit_d: 0, b12: 1.5, omega3: 30, zn: 3.5 },
  },
  {
    id: 'svickova',
    cat: '🍲 Hotová jídla',
    name: 'Svíčková na smetaně',
    kcal: 130, carbs: 10.0, protein: 9.0, fat: 6.5, per: 300,
    micros: { na: 400, k: 300, mg: 18, ca: 45, fe: 1.5, vit_c: 3, vit_d: 0.1, b12: 1.0, omega3: 50, zn: 2.5 },
  },
  {
    id: 'lasagne',
    cat: '🍲 Hotová jídla',
    name: 'Lasagne',
    kcal: 135, carbs: 12.0, protein: 8.0, fat: 6.0, per: 350,
    micros: { na: 450, k: 280, mg: 22, ca: 120, fe: 1.5, vit_c: 5, vit_d: 0.1, b12: 0.5, omega3: 40, zn: 1.8 },
  },
  {
    id: 'bolognese',
    cat: '🍲 Hotová jídla',
    name: 'Boloňská omáčka',
    kcal: 110, carbs: 8.0, protein: 9.0, fat: 4.5, per: 200,
    micros: { na: 500, k: 400, mg: 20, ca: 30, fe: 2.0, vit_c: 10, vit_d: 0, b12: 1.0, omega3: 30, zn: 2.5 },
  },
  {
    id: 'tomato_sauce_meat',
    cat: '🍲 Hotová jídla',
    name: 'Rajská omáčka s masem',
    kcal: 95, carbs: 9.0, protein: 7.0, fat: 3.5, per: 250,
    micros: { na: 450, k: 380, mg: 18, ca: 35, fe: 1.5, vit_c: 15, vit_d: 0, b12: 0.8, omega3: 20, zn: 1.5 },
  },
  {
    id: 'knedliky_houskove',
    cat: '🍲 Hotová jídla',
    name: 'Houskové knedlíky',
    kcal: 190, carbs: 38.0, protein: 6.0, fat: 1.5, per: 150,
    micros: { na: 360, k: 80, mg: 12, ca: 30, fe: 0.8, vit_c: 0, vit_d: 0, b12: 0.1, omega3: 10, zn: 0.5 },
  },
  {
    id: 'knedliky_bramborove',
    cat: '🍲 Hotová jídla',
    name: 'Bramborové knedlíky',
    kcal: 110, carbs: 23.0, protein: 3.0, fat: 1.0, per: 150,
    micros: { na: 200, k: 200, mg: 15, ca: 20, fe: 0.5, vit_c: 5, vit_d: 0, b12: 0, omega3: 5, zn: 0.3 },
  },
  {
    id: 'rizoto',
    cat: '🍲 Hotová jídla',
    name: 'Rizoto',
    kcal: 140, carbs: 25.0, protein: 4.0, fat: 3.5, per: 300,
    micros: { na: 400, k: 120, mg: 15, ca: 30, fe: 0.8, vit_c: 2, vit_d: 0, b12: 0.2, omega3: 20, zn: 0.7 },
  },
  {
    id: 'cesnecka',
    cat: '🍲 Hotová jídla',
    name: 'Česnečka',
    kcal: 45, carbs: 6.0, protein: 2.5, fat: 1.5, per: 300,
    micros: { na: 600, k: 150, mg: 10, ca: 40, fe: 0.5, vit_c: 5, vit_d: 0, b12: 0, omega3: 10, zn: 0.3 },
  },
  {
    id: 'chicken_schnitzel',
    cat: '🍲 Hotová jídla',
    name: 'Kuřecí řízek',
    kcal: 220, carbs: 12.0, protein: 20.0, fat: 9.0, per: 150,
    micros: { na: 350, k: 280, mg: 25, ca: 25, fe: 1.0, vit_c: 0, vit_d: 0.1, b12: 0.3, omega3: 70, zn: 1.5 },
  },
  {
    id: 'halusky',
    cat: '🍲 Hotová jídla',
    name: 'Halušky se slaninou',
    kcal: 195, carbs: 28.0, protein: 8.0, fat: 6.0, per: 300,
    micros: { na: 500, k: 250, mg: 20, ca: 50, fe: 1.0, vit_c: 5, vit_d: 0.1, b12: 0.3, omega3: 20, zn: 1.0 },
  },
  {
    id: 'pork_roast',
    cat: '🍲 Hotová jídla',
    name: 'Vepřová pečeně',
    kcal: 145, carbs: 3.0, protein: 16.0, fat: 7.5, per: 200,
    micros: { na: 380, k: 320, mg: 22, ca: 20, fe: 1.2, vit_c: 0, vit_d: 0.2, b12: 0.8, omega3: 40, zn: 2.5 },
  },
  {
    id: 'soup_chicken',
    cat: '🍲 Hotová jídla',
    name: 'Kuřecí vývar s nudlemi',
    kcal: 55, carbs: 7.0, protein: 4.0, fat: 1.0, per: 350,
    micros: { na: 700, k: 180, mg: 10, ca: 20, fe: 0.4, vit_c: 2, vit_d: 0, b12: 0.2, omega3: 15, zn: 0.5 },
  },
  {
    id: 'stuffed_pepper',
    cat: '🍲 Hotová jídla',
    name: 'Plněná paprika',
    kcal: 105, carbs: 10.0, protein: 8.0, fat: 3.5, per: 300,
    micros: { na: 430, k: 350, mg: 22, ca: 30, fe: 1.5, vit_c: 40, vit_d: 0, b12: 0.7, omega3: 25, zn: 2.0 },
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
];
