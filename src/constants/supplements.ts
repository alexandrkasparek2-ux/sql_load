// ============================================================
// Supplement database — common sports & health supplements
// ============================================================

export interface Supplement {
  id:           string;
  name:         string;
  icon:         string;
  category:     string;
  defaultDose:  number;  // default dose value
  unit:         string;  // 'mg', 'g', 'µg', 'IU'
  timing:       string;  // recommended time to take
  description:  string;  // short benefit note
  color:        string;  // accent color for the card
}

export const SUPPLEMENT_CATEGORIES = [
  'Minerály',
  'Vitamíny',
  'Sportovní',
  'Adaptogeny',
] as const;

export const SUPPLEMENTS: Supplement[] = [
  // ── Minerály ─────────────────────────────────────────────
  {
    id:          'magnesium',
    name:        'Hořčík',
    icon:        '🔵',
    category:    'Minerály',
    defaultDose: 400,
    unit:        'mg',
    timing:      'Večer',
    description: 'Svalová funkce, nervový systém, spánek, regenerace',
    color:       '#6366f1',
  },
  {
    id:          'zinc',
    name:        'Zinek',
    icon:        '⚪',
    category:    'Minerály',
    defaultDose: 15,
    unit:        'mg',
    timing:      'Ráno',
    description: 'Imunita, testosteron, regenerace svalů',
    color:       '#a855f7',
  },
  {
    id:          'calcium',
    name:        'Vápník',
    icon:        '🦴',
    category:    'Minerály',
    defaultDose: 500,
    unit:        'mg',
    timing:      'K jídlu',
    description: 'Kosti, zuby, svalová kontrakce',
    color:       '#06b6d4',
  },
  {
    id:          'iron',
    name:        'Železo',
    icon:        '🔴',
    category:    'Minerály',
    defaultDose: 14,
    unit:        'mg',
    timing:      'Ráno (s vitamínem C)',
    description: 'Přenos kyslíku, prevence anémie',
    color:       '#ef4444',
  },
  {
    id:          'potassium',
    name:        'Draslík',
    icon:        '🟡',
    category:    'Minerály',
    defaultDose: 400,
    unit:        'mg',
    timing:      'Po tréninku',
    description: 'Elektrolytová rovnováha, srdeční rytmus',
    color:       '#22c55e',
  },

  // ── Vitamíny ─────────────────────────────────────────────
  {
    id:          'vitamin_d3',
    name:        'Vitamín D3',
    icon:        '☀️',
    category:    'Vitamíny',
    defaultDose: 2000,
    unit:        'IU',
    timing:      'Ráno (s tukem)',
    description: 'Kosti, imunita, nálada, svalová funkce',
    color:       '#eab308',
  },
  {
    id:          'vitamin_b12',
    name:        'Vitamín B12',
    icon:        '💊',
    category:    'Vitamíny',
    defaultDose: 1000,
    unit:        'µg',
    timing:      'Ráno',
    description: 'Nervový systém, tvorba červených krvinek, energie',
    color:       '#ec4899',
  },
  {
    id:          'vitamin_c',
    name:        'Vitamín C',
    icon:        '🍊',
    category:    'Vitamíny',
    defaultDose: 500,
    unit:        'mg',
    timing:      'Ráno',
    description: 'Imunita, antioxidant, vstřebávání železa',
    color:       '#f97316',
  },
  {
    id:          'multivitamin',
    name:        'Multivitamín',
    icon:        '🌈',
    category:    'Vitamíny',
    defaultDose: 1,
    unit:        'tab',
    timing:      'K snídani',
    description: 'Komplexní pokrytí vitamínů a minerálů',
    color:       '#22c55e',
  },

  // ── Sportovní ─────────────────────────────────────────────
  {
    id:          'creatine',
    name:        'Kreatin',
    icon:        '⚡',
    category:    'Sportovní',
    defaultDose: 5000,
    unit:        'mg',
    timing:      'Po tréninku',
    description: 'Sílový výkon, svalová hmota, regenerace',
    color:       '#ef4444',
  },
  {
    id:          'omega3',
    name:        'Omega-3',
    icon:        '🐟',
    category:    'Sportovní',
    defaultDose: 2000,
    unit:        'mg',
    timing:      'K jídlu',
    description: 'Protizánětlivý, mozek, klouby, srdce',
    color:       '#14b8a6',
  },
  {
    id:          'bcaa',
    name:        'BCAA',
    icon:        '💪',
    category:    'Sportovní',
    defaultDose: 5000,
    unit:        'mg',
    timing:      'Během tréninku',
    description: 'Esenciální aminokyseliny, prevence katabolismu',
    color:       '#f59e0b',
  },
  {
    id:          'beta_alanine',
    name:        'Beta-alanin',
    icon:        '🔥',
    category:    'Sportovní',
    defaultDose: 3200,
    unit:        'mg',
    timing:      'Před tréninkem',
    description: 'Svalová vytrvalost, snižuje únavu při VH intenzitě',
    color:       '#f97316',
  },
  {
    id:          'collagen',
    name:        'Kolagen',
    icon:        '🦵',
    category:    'Sportovní',
    defaultDose: 10000,
    unit:        'mg',
    timing:      'Ráno (s vitamínem C)',
    description: 'Klouby, vazy, šlachy, kůže',
    color:       '#d97706',
  },
  {
    id:          'caffeine_tablet',
    name:        'Kofein (tableta)',
    icon:        '☕',
    category:    'Sportovní',
    defaultDose: 200,
    unit:        'mg',
    timing:      'Před výkonem',
    description: 'Výkon, soustředění, snižuje vnímání únavy',
    color:       '#92400e',
  },

  // ── Adaptogeny ───────────────────────────────────────────
  {
    id:          'ashwagandha',
    name:        'Ashwagandha',
    icon:        '🌿',
    category:    'Adaptogeny',
    defaultDose: 600,
    unit:        'mg',
    timing:      'Večer',
    description: 'Kortizol, stres, spánek, testosteron, výdrž',
    color:       '#4ade80',
  },
  {
    id:          'rhodiola',
    name:        'Rhodiola Rosea',
    icon:        '🌸',
    category:    'Adaptogeny',
    defaultDose: 400,
    unit:        'mg',
    timing:      'Ráno (před výkonem)',
    description: 'Fyzická a mentální odolnost, únava',
    color:       '#f472b6',
  },
  {
    id:          'melatonin',
    name:        'Melatonin',
    icon:        '🌙',
    category:    'Adaptogeny',
    defaultDose: 1,
    unit:        'mg',
    timing:      '30 min před spaním',
    description: 'Spánek, cirkadiánní rytmus, regenerace',
    color:       '#818cf8',
  },
];
