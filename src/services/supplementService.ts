// ============================================================
// supplementService.ts
// Suplementační plán dle aktuální tréninkové fáze.
// Každý suplement má timing (ráno / před tréninkem / večer),
// dávku a poznámku proč je v dané fázi důležitý.
// ============================================================

import type { TrainingPhase } from './phaseDetectionService';

export type SupplementTiming = 'rano' | 'pred_tren' | 'po_tren' | 'vecer' | 'kdykoli';

export interface PhaseSupplement {
  id:      string;
  name:    string;
  dose:    string;
  timing:  SupplementTiming;
  timingLabel: string;
  note:    string;
  color:   string;
  icon:    string;
  // Suplementy s časovým oknem stopnutí (race week: kreatin 5 dní před)
  stopDaysBeforeRace?: number;
}

// ── Suplementy dle fáze ────────────────────────────────────

const OFF_SEASON_SUPPLEMENTS: PhaseSupplement[] = [
  {
    id: 'kreatin', name: 'Kreatin', dose: '3–5 g/den', timing: 'rano',
    timingLabel: 'Ráno', note: 'Udržení svalové hmoty v klidovém období',
    color: '#2196F3', icon: '💪',
  },
  {
    id: 'omega3', name: 'Omega-3', dose: '2–3 g/den', timing: 'rano',
    timingLabel: 'Ráno', note: 'Protizánětlivý efekt, podpora regenerace',
    color: '#4CAF50', icon: '🐟',
  },
  {
    id: 'vit_d', name: 'Vitamín D', dose: '2000 IU/den', timing: 'rano',
    timingLabel: 'Ráno s jídlem', note: 'Imunita a hormonální balance (hlavně v zimě)',
    color: '#FFC107', icon: '☀️',
  },
  {
    id: 'horcik', name: 'Hořčík', dose: '300–400 mg', timing: 'vecer',
    timingLabel: 'Večer', note: 'Kvalita spánku a svalová regenerace',
    color: '#9C27B0', icon: '🌙',
  },
];

const BUILD_SUPPLEMENTS: PhaseSupplement[] = [
  {
    id: 'kreatin', name: 'Kreatin', dose: '3–5 g/den', timing: 'kdykoli',
    timingLabel: 'Kdykoli', note: 'Síla a výkon při intenzivním tréninku',
    color: '#2196F3', icon: '💪',
    stopDaysBeforeRace: 5,
  },
  {
    id: 'horcik', name: 'Hořčík', dose: '400 mg', timing: 'vecer',
    timingLabel: 'Večer', note: 'Prevence svalových křečí, spánek',
    color: '#9C27B0', icon: '🌙',
  },
  {
    id: 'vit_c', name: 'Vitamín C', dose: '500 mg/den', timing: 'rano',
    timingLabel: 'Ráno', note: 'Imunita v náročném tréninkovém bloku',
    color: '#FF9800', icon: '🍊',
  },
  {
    id: 'beta_alanin', name: 'Beta-alanin', dose: '3.2 g/den', timing: 'pred_tren',
    timingLabel: 'Před tréninkem', note: 'Oddaluje laktátové pálení při VO2max',
    color: '#F44336', icon: '⚡',
  },
  {
    id: 'ashwagandha', name: 'Ashwagandha', dose: '600 mg', timing: 'vecer',
    timingLabel: 'Večer', note: 'Adaptogen — snižuje kortizol a stres z tréninku',
    color: '#795548', icon: '🌿',
  },
];

const RACE_WEEK_SUPPLEMENTS: PhaseSupplement[] = [
  // Kreatin se stopuje 5 dní před závodem (zadržuje vodu)
  {
    id: 'horcik', name: 'Hořčík', dose: '400 mg', timing: 'vecer',
    timingLabel: 'Večer', note: 'Prevence křečí v závodní den',
    color: '#9C27B0', icon: '🌙',
  },
  {
    id: 'vit_c', name: 'Vitamín C', dose: '500 mg', timing: 'rano',
    timingLabel: 'Ráno', note: 'Imunitní podpora před závodem',
    color: '#FF9800', icon: '🍊',
  },
  {
    id: 'elektrolyty', name: 'Elektrolyty (Na)', dose: '3–5 g Na/den', timing: 'kdykoli',
    timingLabel: 'Během dne', note: 'Hydratace + zásoby před závodem',
    color: '#00BCD4', icon: '💧',
  },
  {
    id: 'kofein_pozor', name: 'Kofein — ŠETŘIT', dose: 'Max 100 mg/den', timing: 'rano',
    timingLabel: 'Ráno (ne odpoledne!)', note: 'Šetři kofein před závodem pro maximální efekt',
    color: '#795548', icon: '☕',
  },
];

const RACE_DAY_SUPPLEMENTS: PhaseSupplement[] = [
  {
    id: 'horcik', name: 'Hořčík', dose: '400 mg', timing: 'vecer',
    timingLabel: 'Večer po závodě', note: 'Prevence křečí a regenerace',
    color: '#9C27B0', icon: '🌙',
  },
  {
    id: 'kofein_race', name: 'Kofein', dose: '200 mg (3 mg/kg)', timing: 'pred_tren',
    timingLabel: '45 min před startem', note: 'Maximální efekt — ušetřen z race week',
    color: '#795548', icon: '☕',
  },
  {
    id: 'elektrolyty', name: 'Elektrolyty', dose: 'Dle pocení', timing: 'kdykoli',
    timingLabel: 'Na kole každé 2h', note: 'Sodík každé 2 hodiny závodu',
    color: '#00BCD4', icon: '💧',
  },
];

const POST_RACE_SUPPLEMENTS: PhaseSupplement[] = [
  {
    id: 'horcik', name: 'Hořčík', dose: '400 mg', timing: 'vecer',
    timingLabel: 'Večer', note: 'Urychluje svalovou regeneraci',
    color: '#9C27B0', icon: '🌙',
  },
  {
    id: 'omega3', name: 'Omega-3', dose: '2–3 g/den', timing: 'rano',
    timingLabel: 'Ráno', note: 'Protizánětlivý efekt po závodní zátěži',
    color: '#4CAF50', icon: '🐟',
  },
  {
    id: 'vit_d', name: 'Vitamín D', dose: '2000 IU/den', timing: 'rano',
    timingLabel: 'Ráno', note: 'Imunita oslabená po extrémní zátěži',
    color: '#FFC107', icon: '☀️',
  },
];

// ── Hlavní funkce ─────────────────────────────────────────
export function getSupplementsForPhase(
  phase: TrainingPhase,
  daysToRace?: number | null,
): PhaseSupplement[] {
  switch (phase) {
    case 'off_season':
      return OFF_SEASON_SUPPLEMENTS;

    case 'build_1':
    case 'build_2':
    case 'pre_race':
      return BUILD_SUPPLEMENTS.filter(s => {
        // Stopni kreatin 5+ dní před závodem i v BUILD fázi pokud je blízko závod
        if (s.stopDaysBeforeRace && daysToRace != null && daysToRace <= s.stopDaysBeforeRace) {
          return false;
        }
        return true;
      });

    case 'race_week':
      return RACE_WEEK_SUPPLEMENTS;

    case 'race_day':
      return RACE_DAY_SUPPLEMENTS;

    case 'post_race':
      return POST_RACE_SUPPLEMENTS;

    default:
      return OFF_SEASON_SUPPLEMENTS;
  }
}

// ── Timing label pro UI ───────────────────────────────────
export const TIMING_LABELS: Record<SupplementTiming, string> = {
  rano:      'Ráno',
  pred_tren: 'Před tréninkem',
  po_tren:   'Po tréninku',
  vecer:     'Večer',
  kdykoli:   'Kdykoli',
};

// ── Skupiny suplementů pro checklist ─────────────────────
export function groupSupplementsByTiming(
  supplements: PhaseSupplement[],
): Record<SupplementTiming, PhaseSupplement[]> {
  const groups: Record<SupplementTiming, PhaseSupplement[]> = {
    rano: [], pred_tren: [], po_tren: [], vecer: [], kdykoli: [],
  };
  for (const s of supplements) {
    if (groups[s.timing]) groups[s.timing].push(s);
    else groups.kdykoli.push(s);
  }
  return groups;
}
