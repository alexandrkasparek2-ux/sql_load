import { useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext, DEFICIT_KCAL } from '../App';
import { Btn, Card, ProgressBar, SegmentedTabs, SectionTitle, Spinner, StatRow, T, BRAND } from '../components/UI';
import { useIntervalsData } from '../hooks/useIntervalsData';
import { useUserSetting } from '../hooks/useUserSetting';
import { useWeeklyData } from '../hooks/useWeeklyData';
import { useWhoopData } from '../hooks/useWhoopData';
import { IntervalsCard } from '../components/IntervalsCard';
import { FOODS, type Food } from '../constants/foods';
import { TRAINING_TYPES, primaryType, type TrainingType } from '../constants/training';
import { getDuringCarbRange, calcFuelingScore } from '../utils/fuelingScore';
import { activityKcal, formatDuration, sportIcon, type IntervalsActivity } from '../services/intervalsService';
import { useTrainingPlan } from '../hooks/useTrainingPlan';
import { sportIcon as tpSportIcon } from '../services/trainingPeaksService';
import { CompactFuelingBadges } from '../components/WorkoutFuelPlannerCard';

type FuelPhase = 'phase1' | 'phase2' | 'phase3';
type DayTypeKey = 'rest' | 'easy_endurance' | 'quality' | 'double_load' | 'gym_support' | 'race_prep';
type ExperimentFocus = 'carbs' | 'hydration' | 'caffeine' | 'pre_ride' | 'post_ride';

interface StoredExperiment {
  id: string;
  date: string;
  focus: ExperimentFocus;
  note: string;
  trainingType: string;
  hours: number;
  targetCarbsPerHour: string;
  actualCarbsPerHour: string;
  fuelingScore: number;
}

const ICU = BRAND.blue;

const FUEL_PHASES: Array<{ id: FuelPhase; label: string; desc: string }> = [
  { id: 'phase1', label: 'Fáze 1', desc: 'největší praktický dopad' },
  { id: 'phase2', label: 'Fáze 2', desc: 'sportovní inteligence' },
  { id: 'phase3', label: 'Fáze 3', desc: 'Road Classics režim' },
];

const RACE_CHECKLIST_ITEMS = [
  'Snídaně 3 h před startem',
  'Láhve namíchané a označené',
  'Gely / tyčinky rozpočítané na trasu',
  'Kofeinový plán připravený',
  'Elektrolyty a sůl zabalené',
  'Pumpa, bombička a montpáky',
  'Recovery meal po dojezdu',
] as const;

const SPORT_LIBRARY_IDS = [
  'energy_gel',
  'energy_bar',
  'isotonic_drink',
  'rice_cakes',
  'banana',
  'dates',
  'whey_protein',
  'protein_bar',
] as const;

const DAY_TYPE_META: Record<DayTypeKey, { label: string; color: string; message: string }> = {
  rest: {
    label: 'Rest / reset',
    color: '#64748b',
    message: 'Nízký výdej, priorita je regenerace a srovnání hydratace.',
  },
  easy_endurance: {
    label: 'Easy endurance',
    color: '#22c55e',
    message: 'Vytrvalostní den. Hlavní práce je držet tempo energie a netahat tuky zbytečně nahoru.',
  },
  quality: {
    label: 'Quality session',
    color: '#f59e0b',
    message: 'Den s intenzitou. Rozhoduje timing sacharidů před, během a po výkonu.',
  },
  double_load: {
    label: 'Double load',
    color: '#ef4444',
    message: 'Dva stresory v jednom dni. Potřebuješ agresivnější doplnění sacharidů a tekutin.',
  },
  gym_support: {
    label: 'Gym support',
    color: '#f97316',
    message: 'Silová podpora. Hlídá se protein, regenerace a rozumné sacharidy okolo tréninku.',
  },
  race_prep: {
    label: 'Race prep',
    color: '#a855f7',
    message: 'Závodní režim. Důležitý je checklist, carb plan a minimální improvizace.',
  },
};

const FOCUS_LABELS: Record<ExperimentFocus, string> = {
  carbs: 'Sacharidy/h',
  hydration: 'Hydratace',
  caffeine: 'Kofein',
  pre_ride: 'Před výkonem',
  post_ride: 'Po výkonu',
};

function formatLocalISO(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function dateLabel(iso: string): string {
  const today = formatLocalISO(new Date());
  const yestDate = new Date();
  yestDate.setDate(yestDate.getDate() - 1);
  const yest = formatLocalISO(yestDate);
  if (iso === today) return 'Dnes';
  if (iso === yest) return 'Včera';
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString('cs-CZ', { weekday: 'long', day: 'numeric', month: 'numeric' });
}

function roundToFive(value: number) {
  return Math.round(value / 5) * 5;
}


function getAllTrainingTypes(trainingDay: { training_type: TrainingType; extra_types: TrainingType[] } | null): TrainingType[] {
  if (!trainingDay) return ['rest'];
  const merged = [trainingDay.training_type, ...(trainingDay.extra_types ?? [])];
  const deduped = Array.from(new Set(merged));
  return deduped.length ? deduped : ['rest'];
}

function getTrainingHours(trainingDay: {
  training_type: TrainingType;
  extra_types: TrainingType[];
  activity_hours: Record<string, number>;
  ride_hours: number;
} | null): number {
  if (!trainingDay) return 0;
  const types = getAllTrainingTypes(trainingDay).filter(type => type !== 'rest');
  const hoursFromMap = types.reduce((sum, type) => sum + (trainingDay.activity_hours?.[type] ?? 0), 0);
  return hoursFromMap > 0 ? hoursFromMap : trainingDay.ride_hours ?? 0;
}

function getDayType(types: TrainingType[], totalHours: number): DayTypeKey {
  const activeTypes = types.filter(type => type !== 'rest');
  if (activeTypes.length === 0 || totalHours <= 0.2) return 'rest';
  if (activeTypes.includes('race')) return 'race_prep';
  if (activeTypes.length >= 2 && totalHours >= 1.5) return 'double_load';
  if (activeTypes.length === 1 && activeTypes[0] === 'strength') return 'gym_support';
  if (activeTypes.includes('hard') || activeTypes.includes('medium') || totalHours >= 2.2) return 'quality';
  return 'easy_endurance';
}


function pickBuilderFoods(remaining: { kcal: number; carbs: number; protein: number; fat: number }) {
  const totalGap = Math.max(remaining.carbs + remaining.protein + remaining.fat, 1);
  const weights = {
    carbs: remaining.carbs / totalGap,
    protein: remaining.protein / totalGap,
    fat: remaining.fat / totalGap,
  };

  return FOODS
    .filter(food => food.kcal > 0 && food.per > 0 && !food.cat.includes('⭐'))
    .map(food => {
      const factor = food.per / 100;
      const serving = {
        food,
        grams: food.per,
        kcal: food.kcal * factor,
        carbs: food.carbs * factor,
        protein: food.protein * factor,
        fat: food.fat * factor,
      };

      const coverage =
        weights.carbs * Math.min(serving.carbs / Math.max(remaining.carbs, 1), 1) +
        weights.protein * Math.min(serving.protein / Math.max(remaining.protein, 1), 1) +
        weights.fat * Math.min(serving.fat / Math.max(remaining.fat, 1), 1);

      const penalty =
        (remaining.fat < 12 && serving.fat > remaining.fat * 1.8 ? 0.25 : 0) +
        (remaining.protein < 20 && serving.protein > remaining.protein * 1.8 ? 0.12 : 0) +
        (remaining.carbs < 20 && serving.carbs > remaining.carbs * 1.8 ? 0.12 : 0) +
        (remaining.kcal > 0 && serving.kcal > remaining.kcal * 1.35 + 120 ? 0.25 : 0);

      return { ...serving, score: coverage - penalty };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
}

function getBuilderStrategy(remaining: { carbs: number; protein: number; fat: number }) {
  const ordered = [
    { key: 'carbs', value: remaining.carbs, label: 'doplnit sacharidy' },
    { key: 'protein', value: remaining.protein, label: 'doplnit bílkoviny' },
    { key: 'fat', value: remaining.fat, label: 'dorovnat tuky' },
  ].sort((a, b) => b.value - a.value);
  return ordered.slice(0, 2).map(item => item.label).join(' + ');
}


function getRecoveryDebt(history: Array<{ goal: number; kcal: number }>, whoopRecovery: number | null) {
  const recent = history.slice(-4, -1);
  const debt = recent.reduce((sum, day) => sum + Math.max(0, day.goal - day.kcal), 0);
  const adjusted = whoopRecovery != null && whoopRecovery < 40 ? debt + 250 : debt;
  const level = adjusted >= 1800 ? 'Vysoký' : adjusted >= 900 ? 'Střední' : 'Nízký';
  const message = adjusted >= 1800
    ? 'Poslední dny byly v energetickém dluhu. Dnešek by měl být regeneračnější a s vyšším příjmem.'
    : adjusted >= 900
      ? 'Něco jsi nechal na stole. Hodí se navýšit sacharidy a post-workout jídlo.'
      : 'Poslední dny vypadají stabilně. Recovery dluh je pod kontrolou.';
  return { adjusted: Math.round(adjusted), level, message };
}

function ScoreBadge({ value }: { value: number }) {
  const color = value >= 80 ? BRAND.green : value >= 60 ? BRAND.gold : BRAND.orange;
  return (
    <div style={{
      minWidth: 72,
      padding: '10px 12px',
      borderRadius: 14,
      background: `${color}18`,
      border: `1px solid ${color}33`,
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4 }}>
        Fueling score
      </div>
    </div>
  );
}

function LibraryChip({
  food,
  active,
  onToggle,
  onQuickAdd,
}: {
  food: Food;
  active: boolean;
  onToggle: () => void;
  onQuickAdd: () => void;
}) {
  return (
    <div style={{
      border: `1px solid ${active ? `${BRAND.gold}44` : T.border}`,
      background: active ? 'rgba(124,92,255,0.08)' : T.card,
      borderRadius: 14,
      padding: '12px 12px 10px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{food.name}</div>
          <div style={{ fontSize: 11, color: T.muted, marginTop: 3 }}>
            {food.per} g · {Math.round(food.kcal * (food.per / 100))} kcal
          </div>
        </div>
        <button
          type="button"
          onClick={onToggle}
          style={{
            width: 30,
            height: 30,
            borderRadius: 10,
            border: `1px solid ${active ? `${BRAND.gold}44` : T.border}`,
            background: active ? 'rgba(124,92,255,0.16)' : 'transparent',
            color: active ? BRAND.gold : T.muted,
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          ★
        </button>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <Btn accent={BRAND.gold} variant="ghost" size="sm" full onClick={onQuickAdd}>
          + během tréninku
        </Btn>
      </div>
    </div>
  );
}

function DaySummary({ acts }: { acts: IntervalsActivity[] }) {
  const kcal = acts.reduce((sum, act) => sum + activityKcal(act), 0);
  const time = acts.reduce((sum, act) => sum + act.moving_time, 0);
  const dist = acts.reduce((sum, act) => sum + act.distance, 0);
  const tss = acts.reduce((sum, act) => sum + (act.icu_training_load ?? 0), 0);

  const stats: Array<{ val: string; unit: string; color: string }> = [];
  if (kcal > 0) stats.push({ val: kcal.toLocaleString(), unit: 'kcal', color: BRAND.gold });
  if (time > 0) stats.push({ val: formatDuration(time), unit: 'čas', color: T.text });
  if (dist > 500) stats.push({ val: (dist / 1000).toFixed(1), unit: 'km', color: ICU });
  if (tss > 0) stats.push({ val: Math.round(tss).toString(), unit: 'TSS', color: BRAND.purple });
  if (!stats.length) return null;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(96px, 1fr))', gap: 8, marginBottom: 10 }}>
      {stats.map(stat => (
        <div key={stat.unit} style={{ background: T.bg, borderRadius: 10, padding: '9px 8px', textAlign: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: stat.color }}>{stat.val}</div>
          <div style={{ fontSize: 9, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2 }}>
            {stat.unit}
          </div>
        </div>
      ))}
    </div>
  );
}

function ActivityCard({ act }: { act: IntervalsActivity }) {
  const kcal = activityKcal(act);
  const km = act.distance > 0 ? (act.distance / 1000).toFixed(1) : null;
  const elevation = act.total_elevation_gain > 0 ? Math.round(act.total_elevation_gain) : null;

  const chips: Array<{ icon: string; text: string }> = [{ icon: '⏱', text: formatDuration(act.moving_time) }];
  if (km) chips.push({ icon: '📍', text: `${km} km` });
  if (elevation) chips.push({ icon: '⛰', text: `+${elevation} m` });
  if (act.average_heartrate) chips.push({ icon: '❤️', text: `${Math.round(act.average_heartrate)} bpm` });
  if (act.icu_training_load) chips.push({ icon: '📊', text: `TSS ${Math.round(act.icu_training_load)}` });

  return (
    <div style={{
      background: T.card,
      border: `1px solid ${T.border}`,
      borderRadius: 14,
      padding: '12px 14px',
      display: 'flex',
      gap: 12,
      alignItems: 'flex-start',
    }}>
      <div style={{
        width: 42,
        height: 42,
        borderRadius: 12,
        background: `${ICU}18`,
        border: `1px solid ${ICU}30`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 22,
        flexShrink: 0,
      }}>
        {sportIcon(act.type)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 7 }}>
          {act.name}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {chips.map(chip => (
            <span
              key={chip.text}
              style={{
                fontSize: 10,
                color: T.muted,
                background: T.bg,
                border: `1px solid ${T.border}`,
                borderRadius: 6,
                padding: '3px 7px',
              }}
            >
              {chip.icon} {chip.text}
            </span>
          ))}
        </div>
      </div>
      {kcal > 0 && (
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: BRAND.gold }}>{kcal.toLocaleString()}</div>
          <div style={{ fontSize: 9, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>kcal</div>
        </div>
      )}
    </div>
  );
}

const CS_DAYS = ['Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So'];
function planDateLabel(iso: string): string {
  const today = formatLocalISO(new Date());
  const tomDate = new Date();
  tomDate.setDate(tomDate.getDate() + 1);
  const tom = formatLocalISO(tomDate);
  if (iso === today) return 'Dnes';
  if (iso === tom)   return 'Zítra';
  const d = new Date(iso + 'T00:00:00');
  return `${CS_DAYS[d.getDay()]} ${d.getDate()}.${d.getMonth() + 1}.`;
}

export default function Plan() {
  const navigate = useNavigate();
  const ctx = useContext(AppContext);
  const {
    userId,
    today,
    accent,
    profile,
    trainingDay,
    totals,
    goals,
    entries,
    addEntry,
    setGoalOverride,
    deficitLevel,
  } = ctx;
  const tp = useTrainingPlan();

  const [activePhase, setActivePhase] = useState<FuelPhase>('phase1');
  const [activeTab, setActiveTab] = useState<'lab' | 'aktivity' | 'plan' | 'carbs'>('lab');
  const [manualHours, setManualHours] = useState<number | null>(null);
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth >= 1280;
  });
  const [experimentFocus, setExperimentFocus] = useState<ExperimentFocus>('carbs');
  const [experimentNote, setExperimentNote] = useState('');
  const [savingExperiment, setSavingExperiment] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);

  const { activities, loading, error, stale, isConnected, cacheAge, sync } = useIntervalsData(90);
  const deficitKcal = DEFICIT_KCAL[deficitLevel] ?? 0;
  const { data: historyData } = useWeeklyData(userId, 14, profile, goals.kcal, deficitKcal);
  const { data: whoopData } = useWhoopData();

  const { value: productLibrary, setValue: setProductLibrary } = useUserSetting<string[]>(
    userId,
    'fueling_product_library',
    [],
    { legacyKey: 'cyclofuel_fueling_product_library', isEmpty: value => value.length === 0 },
  );
  const { value: raceChecklists, setValue: setRaceChecklists } = useUserSetting<Record<string, Record<string, boolean>>>(
    userId,
    'race_checklists',
    {},
    { legacyKey: 'cyclofuel_race_checklists', isEmpty: value => Object.keys(value).length === 0 },
  );
  const { value: experimentLog, setValue: setExperimentLog } = useUserSetting<StoredExperiment[]>(
    userId,
    'fueling_experiments',
    [],
    { legacyKey: 'cyclofuel_fueling_experiments', isEmpty: value => value.length === 0 },
  );

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const media = window.matchMedia('(min-width: 1280px)');
    const handleChange = () => setIsDesktop(media.matches);
    handleChange();
    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, []);

  const groupedActivities = useMemo(() => {
    return activities.reduce<Record<string, IntervalsActivity[]>>((acc, activity) => {
      const date = activity.start_date_local.split('T')[0];
      (acc[date] ??= []).push(activity);
      return acc;
    }, {});
  }, [activities]);

  const activityDates = useMemo(
    () => Object.keys(groupedActivities).sort((a, b) => b.localeCompare(a)),
    [groupedActivities],
  );

  const icuTypes = getAllTrainingTypes(trainingDay);
  const icuHours = getTrainingHours(trainingDay);
  const icuIsRest = icuTypes.every(t => t === 'rest') && icuHours === 0;
  const tpToday = tp.todayWorkout;
  const usingTP = icuIsRest && !!tpToday;

  const trainingTypes: TrainingType[] = usingTP
    ? [tpToday!.sportType as TrainingType]
    : icuTypes;
  const tpHours = usingTP ? tpToday!.durationMin / 60 : icuHours;
  const totalHours = manualHours !== null ? manualHours : tpHours;
  const primaryTraining = primaryType(trainingTypes);
  const trainingMeta = TRAINING_TYPES.find(item =>
    item.id === (usingTP ? tpToday!.sportType : (trainingDay?.training_type ?? 'rest'))
  ) ?? TRAINING_TYPES[0];
  const dayType = getDayType(trainingTypes, totalHours);
  const dayTypeMeta = DAY_TYPE_META[dayType];

  const carbRange = getDuringCarbRange(primaryTraining, totalHours);
  const duringCarbs = entries
    .filter(entry => entry.meal_slot === 'behem_tren')
    .reduce((sum, entry) => sum + entry.carbs, 0);
  const postWorkoutProtein = entries
    .filter(entry => entry.meal_slot === 'po_tren')
    .reduce((sum, entry) => sum + entry.protein, 0);
  const carbsPerHourActual = totalHours > 0 ? duringCarbs / totalHours : 0;

  const sessionPlan = useMemo(() => {
    if (!profile) {
      return {
        preCarbs: 0,
        duringTotal: 0,
        postCarbs: 0,
        postProtein: 0,
        fluidPerHour: 500,
        sodiumPerHour: 400,
        targetCarbs: goals.carbs,
        targetProtein: goals.protein,
        targetWater: goals.water,
        targetKcal: goals.kcal,
      };
    }

    const preCarbs = totalHours >= 2 ? roundToFive(profile.weight * 1.5) : roundToFive(profile.weight * 0.8);
    const duringMid = roundToFive(((carbRange.min + carbRange.max) / 2) * totalHours);
    const postCarbs = roundToFive(profile.weight * (primaryTraining === 'strength' ? 0.5 : 0.8));
    const postProtein = roundToFive(profile.weight * (primaryTraining === 'strength' ? 0.35 : 0.3));
    const fluidPerHour = primaryTraining === 'race' || primaryTraining === 'hard' ? 750 : totalHours >= 1.5 ? 650 : 500;
    const sodiumPerHour = primaryTraining === 'race' || primaryTraining === 'hard' ? 800 : totalHours >= 1.5 ? 600 : 400;
    const targetCarbs = Math.max(goals.carbs, preCarbs + duringMid + postCarbs);
    const targetProtein = Math.max(goals.protein, Math.round(profile.weight * 1.8), postProtein);
    const targetWater = Math.max(goals.water, parseFloat((fluidPerHour * totalHours / 1000 + 1.8).toFixed(1)));
    const targetKcal = Math.max(goals.kcal, Math.round(targetCarbs * 4 + targetProtein * 4 + goals.fat * 9));

    return {
      preCarbs,
      duringTotal: duringMid,
      postCarbs,
      postProtein,
      fluidPerHour,
      sodiumPerHour,
      targetCarbs,
      targetProtein,
      targetWater,
      targetKcal,
    };
  }, [profile, totalHours, carbRange.min, carbRange.max, primaryTraining, goals]);

  const remaining = {
    kcal: Math.max(0, goals.kcal - totals.kcal),
    carbs: Math.max(0, goals.carbs - totals.carbs),
    protein: Math.max(0, goals.protein - totals.protein),
    fat: Math.max(0, goals.fat - totals.fat),
  };

  const builderFoods = useMemo(() => pickBuilderFoods(remaining), [remaining]);
  const fuelingScore = calcFuelingScore({
    totals,
    goals,
    waterGlasses: trainingDay?.water_glasses ?? 0,
    totalHours,
    duringCarbs,
    carbRange,
    postWorkoutProtein,
  });
  const recoveryScore = whoopData?.recovery?.score.recovery_score ?? null;
  const recoveryDebt = getRecoveryDebt(historyData, recoveryScore);

  const todayChecklist = raceChecklists[today] ?? {};
  const favoriteIds = new Set([
    ...SPORT_LIBRARY_IDS,
    ...productLibrary,
  ]);
  const sportProducts = FOODS.filter(food => favoriteIds.has(food.id));

  const handleApplySessionTargets = () => {
    setGoalOverride({
      kcal: sessionPlan.targetKcal,
      carbs: sessionPlan.targetCarbs,
      protein: sessionPlan.targetProtein,
      water: sessionPlan.targetWater,
    });
  };

  const handleToggleChecklist = async (item: string) => {
    const next = {
      ...raceChecklists,
      [today]: {
        ...todayChecklist,
        [item]: !todayChecklist[item],
      },
    };
    await setRaceChecklists(next);
  };

  const handleToggleLibraryFood = async (foodId: string) => {
    const next = productLibrary.includes(foodId)
      ? productLibrary.filter(id => id !== foodId)
      : [...productLibrary, foodId];
    await setProductLibrary(next);
  };

  const handleQuickAddFood = async (food: Food) => {
    if (!userId) return;
    const factor = food.per / 100;
    await addEntry({
      user_id: userId,
      date: today,
      meal_slot: 'behem_tren',
      food_id: food.id,
      food_name: food.name,
      grams: food.per,
      kcal: Math.round(food.kcal * factor),
      carbs: Math.round(food.carbs * factor * 10) / 10,
      protein: Math.round(food.protein * factor * 10) / 10,
      fat: Math.round(food.fat * factor * 10) / 10,
      fiber: Math.round((food.fiber ?? 0) * factor * 10) / 10,
      na: Math.round(food.micros.na * factor),
      k: Math.round(food.micros.k * factor),
      mg: Math.round(food.micros.mg * factor),
      ca: Math.round(food.micros.ca * factor),
      fe: Math.round(food.micros.fe * factor * 10) / 10,
      vit_c: Math.round(food.micros.vit_c * factor),
      vit_d: Math.round(food.micros.vit_d * factor * 10) / 10,
      b12: Math.round(food.micros.b12 * factor * 100) / 100,
      omega3: Math.round(food.micros.omega3 * factor),
      zn: Math.round(food.micros.zn * factor * 10) / 10,
    });
  };

  const handleSaveExperiment = async () => {
    if (!experimentNote.trim()) return;
    setSavingExperiment(true);
    const next: StoredExperiment[] = [
      {
        id: `exp_${Date.now()}`,
        date: today,
        focus: experimentFocus,
        note: experimentNote.trim(),
        trainingType: trainingMeta.label,
        hours: parseFloat(totalHours.toFixed(1)),
        targetCarbsPerHour: `${carbRange.min}-${carbRange.max}`,
        actualCarbsPerHour: totalHours > 0 ? carbsPerHourActual.toFixed(1) : '0.0',
        fuelingScore,
      },
      ...experimentLog,
    ].slice(0, 12);
    await setExperimentLog(next);
    setExperimentNote('');
    setSavingExperiment(false);
  };


  // ── Mobile LAB view ─────────────────────────────────────────
  const weekStart = (() => {
    const d = new Date(today + 'T00:00:00');
    const dow = d.getDay();
    d.setDate(d.getDate() + (dow === 0 ? -6 : 1 - dow) + weekOffset * 7);
    return d;
  })();
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return formatLocalISO(d);
  });
  const weekNum = (() => {
    const jan1 = new Date(weekStart.getFullYear(), 0, 1);
    return Math.ceil(((weekStart.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
  })();
  const lastWeekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() - 7 + i);
    return formatLocalISO(d);
  });

  // For each day: prefer actual Intervals.icu data, fall back to TP plan
  const dayTSSMerged = (days: string[]) => days.reduce((total, d) => {
    const actTSS  = (groupedActivities[d] ?? []).reduce((s, a) => s + (a.icu_training_load ?? 0), 0);
    const planTSS = tp.workouts.filter(w => w.date === d).reduce((s, w) => s + (w.tss ?? 0), 0);
    return total + (actTSS > 0 ? actTSS : planTSS);
  }, 0);
  const dayHoursMerged = (days: string[]) => days.reduce((total, d) => {
    const actSecs  = (groupedActivities[d] ?? []).reduce((s, a) => s + (a.moving_time ?? 0), 0);
    const planMins = tp.workouts.filter(w => w.date === d).reduce((s, w) => s + (w.durationMin ?? 0), 0);
    return total + (actSecs > 0 ? actSecs / 3600 : planMins / 60);
  }, 0);

  const weekTSS   = Math.round(dayTSSMerged(weekDays));
  const weekHours = parseFloat(dayHoursMerged(weekDays).toFixed(1));
  const lastWeekTSS = dayTSSMerged(lastWeekDays);
  const ramp = lastWeekTSS > 0 ? Math.round((weekTSS - lastWeekTSS) / lastWeekTSS * 100) : null;
  const maxDayTSS = Math.max(1, ...weekDays.map(d => {
    const actTSS = (groupedActivities[d] ?? []).reduce((s, a) => s + (a.icu_training_load ?? 0), 0);
    const planTSS = tp.workouts.filter(w => w.date === d).reduce((s, w) => s + (w.tss ?? 0), 0);
    return actTSS > 0 ? actTSS : planTSS;
  }));
  const planSportColor = (type: string) => {
    if (!type || type === 'rest') return T.border;
    if (type === 'hard' || type === 'race') return BRAND.orange;
    if (type === 'medium') return BRAND.gold;
    if (type === 'strength') return BRAND.purple;
    return BRAND.green;
  };

  if (!isDesktop) {
    return (
      <div style={{ padding: '16px 16px 24px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: T.muted, fontFamily: 'JetBrains Mono, monospace', marginBottom: 3 }}>
              TÝDEN {weekNum}
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.02em' }}>
              Plán
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button onClick={() => setWeekOffset(o => o - 1)} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, color: T.muted, fontSize: 16, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
            {weekOffset !== 0 && (
              <button onClick={() => setWeekOffset(0)} style={{ background: 'none', border: 'none', color: BRAND.purple, fontSize: 10, fontFamily: 'JetBrains Mono, monospace', cursor: 'pointer', padding: '0 4px' }}>DNES</button>
            )}
            <button onClick={() => setWeekOffset(o => o + 1)} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, color: T.muted, fontSize: 16, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
            <button onClick={() => navigate('/profile')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.muted, fontSize: 20, padding: '0 0 0 6px' }}>⚙️</button>
          </div>
        </div>

        {/* Stats + bar chart card */}
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 20, padding: '16px 18px', marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, marginBottom: 22 }}>
            <div>
              <div style={{ fontSize: 8, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: T.muted, fontFamily: 'JetBrains Mono, monospace', marginBottom: 4 }}>TSS TÝDEN</div>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 30, fontWeight: 800, lineHeight: 1 }}>{weekTSS || '—'}</div>
            </div>
            <div>
              <div style={{ fontSize: 8, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: T.muted, fontFamily: 'JetBrains Mono, monospace', marginBottom: 4 }}>HODINY</div>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 30, fontWeight: 800, lineHeight: 1 }}>{weekHours || '—'}</div>
            </div>
            <div>
              <div style={{ fontSize: 8, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: T.muted, fontFamily: 'JetBrains Mono, monospace', marginBottom: 4 }}>RAMP</div>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 30, fontWeight: 800, lineHeight: 1, color: ramp !== null && ramp > 0 ? BRAND.green : ramp !== null && ramp < 0 ? BRAND.orange : T.text }}>
                {ramp !== null ? `${ramp > 0 ? '+' : ''}${ramp}%` : '—'}
              </div>
            </div>
          </div>
          {/* Bar chart */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, height: 84, alignItems: 'flex-end' }}>
            {weekDays.map(date => {
              const dayActs = groupedActivities[date] ?? [];
              const actTSS  = dayActs.reduce((s, a) => s + (a.icu_training_load ?? 0), 0);
              const planTSS = tp.workouts.filter(w => w.date === date).reduce((s, w) => s + (w.tss ?? 0), 0);
              const hasActual = actTSS > 0;
              const dayTSS = hasActual ? actTSS : planTSS;
              const primary = tp.workouts.find(w => w.date === date);
              const color = hasActual
                ? (dayActs[0]?.type ? planSportColor(dayActs[0].type) : BRAND.green)
                : (primary ? planSportColor(primary.sportType) : T.border);
              const isToday = date === today;
              const isFuture = date > today;
              const barH = dayTSS > 0 ? Math.max(8, Math.round((dayTSS / maxDayTSS) * 64)) : 4;
              const dow = new Date(date + 'T00:00:00').getDay();
              return (
                <div key={date} style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'flex-end', height: '100%', gap: 5 }}>
                  <div style={{ width: '100%', height: barH, background: isToday ? BRAND.purple : color, borderRadius: '3px 3px 0 0', opacity: isFuture && !isToday ? 0.45 : 1, transition: 'height 0.5s ease' }} />
                  <div style={{ fontSize: 9, color: isToday ? BRAND.purple : T.muted, fontFamily: 'JetBrains Mono, monospace', fontWeight: isToday ? 700 : 400 }}>
                    {CS_DAYS[dow]}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Workout list */}
        {!tp.isConnected ? (
          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: '20px 18px', textAlign: 'center' as const }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 6 }}>Připoj TrainingPeaks</div>
            <div style={{ fontSize: 12, color: T.muted, marginBottom: 16, lineHeight: 1.5 }}>Pro zobrazení týdenního plánu tréninků</div>
            <button onClick={() => navigate('/profile')} style={{ padding: '8px 20px', background: BRAND.purple, border: 'none', borderRadius: 20, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              Připojit v nastavení
            </button>
          </div>
        ) : tp.loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}><Spinner /></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
            {weekDays.map(date => {
              const SPORT_ORDER: Record<string, number> = { hard: 0, race: 1, medium: 2, light: 3, cycling_indoor: 4, running: 5, swimming: 6, strength: 7 };
              const dayActs = groupedActivities[date] ?? [];
              const hasActual = dayActs.length > 0;
              const bestAct = [...dayActs].sort((a, b) => (b.icu_training_load ?? 0) - (a.icu_training_load ?? 0))[0];
              const dayPlan = tp.workouts
                .filter(w => w.date === date)
                .sort((a, b) => (SPORT_ORDER[a.sportType] ?? 99) - (SPORT_ORDER[b.sportType] ?? 99))[0];

              const isToday = date === today;
              const d = new Date(date + 'T00:00:00');
              const abr = CS_DAYS[d.getDay()].toUpperCase();
              const dateNum = d.getDate();

              // Color: actual activity takes priority, then plan, then rest
              const borderColor = hasActual
                ? planSportColor(bestAct.type ?? 'light')
                : dayPlan ? planSportColor(dayPlan.sportType) : T.border;

              // Title + subtitle from actual if done, otherwise from plan
              const title = hasActual ? bestAct.name : (dayPlan?.title ?? 'Rest');
              const isRest = !hasActual && !dayPlan;
              const subtitle = (() => {
                if (hasActual) {
                  const actHrs = formatDuration(bestAct.moving_time);
                  const tss = bestAct.icu_training_load;
                  const parts = [actHrs, tss && tss > 0 ? `${Math.round(tss)} TSS` : null].filter(Boolean);
                  // If there were multiple activities, add count
                  if (dayActs.length > 1) parts.push(`+${dayActs.length - 1}`);
                  return parts.join(' · ');
                }
                if (isRest) return 'Volný den';
                const hrs = dayPlan!.durationMin / 60;
                const hrsStr = Number.isInteger(hrs * 4) ? `${Math.round(hrs * 4) / 4}h` : `${hrs.toFixed(1)}h`;
                return [hrsStr, dayPlan!.tss > 0 ? `${Math.round(dayPlan!.tss)} TSS` : null].filter(Boolean).join(' · ');
              })();

              return (
                <div key={date} style={{ background: T.card, border: `1px solid ${isToday ? BRAND.purple : T.border}`, borderRadius: 14, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 38, flexShrink: 0, textAlign: 'center' as const }}>
                    <div style={{ fontSize: 9, letterSpacing: '0.1em', color: T.muted, fontFamily: 'JetBrains Mono, monospace', lineHeight: 1.3 }}>{abr}</div>
                    <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "'Space Grotesk', sans-serif", lineHeight: 1.1, color: T.text }}>{dateNum}</div>
                  </div>
                  <div style={{ width: 3, height: 36, borderRadius: 2, background: borderColor, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: isRest ? T.muted : T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                      {title}
                    </div>
                    <div style={{ fontSize: 11, color: T.muted, fontFamily: 'JetBrains Mono, monospace', marginTop: 1 }}>
                      {subtitle}
                    </div>
                  </div>
                  <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {hasActual && (
                      <div style={{ fontSize: 12, color: BRAND.green, fontWeight: 700 }}>✓</div>
                    )}
                    {isToday && (
                      <div style={{ fontSize: 10, fontWeight: 700, color: BRAND.purple, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.1em' }}>DNES</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div style={{ padding: '16px 16px 0', position: 'relative' }}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 300,
          background: 'radial-gradient(ellipse at top, rgba(79,195,247,0.06), transparent 70%)',
          pointerEvents: 'none',
          zIndex: 0,
        }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <SectionTitle accent={BRAND.gold}>Fueling Lab</SectionTitle>
          <Card style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: T.text, marginBottom: 8 }}>
              Připoj Intervals.icu
            </div>
            <div style={{ fontSize: 14, color: T.muted, lineHeight: 1.6, marginBottom: 18 }}>
              Nové sportovní fáze se opírají o skutečný průběh aktivit. Jakmile připojíš Intervals, dostaneš plán na trénink,
              carbs/h, fueling score i recovery debt nad reálnými daty.
            </div>
            <IntervalsCard />
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: isDesktop ? '0 0 16px' : '16px 16px 0', position: 'relative' }}>
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 320,
        background: 'radial-gradient(ellipse at top, rgba(79,195,247,0.07), transparent 72%)',
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ marginBottom: 16 }}>
          <SegmentedTabs
            tabs={[
              { id: 'lab',    label: 'Fueling Lab' },
              { id: 'carbs',  label: 'Carbs/h' },
              { id: 'plan',   label: 'Plán tréninků' },
              { id: 'aktivity', label: 'Aktivity' },
            ]}
            active={activeTab}
            onChange={(id) => setActiveTab(id as 'lab' | 'aktivity' | 'plan' | 'carbs')}
          />
        </div>

        {activeTab === 'lab' && (<div style={{ animation: 'tabSlide 0.25s ease-out both' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: isDesktop ? 'minmax(0, 1.35fr) minmax(320px, 0.65fr)' : '1fr',
          gap: 18,
          marginBottom: 18,
        }}>
          <Card style={{
            background: 'linear-gradient(180deg, rgba(79,195,247,0.10), rgba(13,13,13,0.95))',
            borderColor: `${ICU}33`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 11, color: ICU, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 6 }}>
                  Sportovní roadmapa
                </div>
                <div style={{ fontSize: 28, fontWeight: 800, color: T.text, letterSpacing: '-0.04em', marginBottom: 6 }}>
                  Fueling Lab
                </div>
                <div style={{ fontSize: 14, color: T.muted, lineHeight: 1.6 }}>
                  Tři vývojové fáze jsou teď poskládané do jednoho pracovního místa nad tvým denním logem, aktivitami a recovery.
                </div>
              </div>
              <ScoreBadge value={fuelingScore} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? 'repeat(3, minmax(0, 1fr))' : '1fr', gap: 10 }}>
              {FUEL_PHASES.map(phase => {
                const active = activePhase === phase.id;
                return (
                  <button
                    key={phase.id}
                    type="button"
                    onClick={() => setActivePhase(phase.id)}
                    style={{
                      textAlign: 'left',
                      padding: '14px 14px 12px',
                      borderRadius: 16,
                      border: `1px solid ${active ? `${BRAND.gold}44` : T.border}`,
                      background: active ? 'rgba(124,92,255,0.10)' : 'rgba(255,255,255,0.02)',
                      color: active ? T.text : T.muted,
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 700, color: active ? BRAND.gold : T.text, marginBottom: 4 }}>
                      {phase.label}
                    </div>
                    <div style={{ fontSize: 11, lineHeight: 1.5 }}>{phase.desc}</div>
                  </button>
                );
              })}
            </div>
          </Card>

          <Card>
            <div style={{ fontSize: 11, color: T.muted, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8 }}>
              Dnešní kontext
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: `${dayTypeMeta.color}18`,
                border: `1px solid ${dayTypeMeta.color}33`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
              }}>
                {trainingMeta.icon}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: dayTypeMeta.color }}>{dayTypeMeta.label}</div>
                  {usingTP && (
                    <span style={{
                      fontSize: 9, fontWeight: 700, color: BRAND.purple,
                      background: BRAND.purple + '18', border: `1px solid ${BRAND.purple}33`,
                      borderRadius: 6, padding: '2px 6px', letterSpacing: '0.08em', textTransform: 'uppercase',
                    }}>
                      TrainingPeaks
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>
                  {usingTP ? tpToday!.title : trainingMeta.label} • {totalHours > 0 ? `${totalHours.toFixed(1)} h` : 'bez zadané délky'}
                </div>
              </div>
            </div>
            <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.6, marginBottom: 14 }}>
              {dayTypeMeta.message}
            </div>
            <StatRow label="Carbs / h" value={carbRange.min === 0 ? 'volitelné' : `${carbRange.min}-${carbRange.max}`} unit={carbRange.min === 0 ? '' : 'g'} accent={BRAND.gold} />
            <StatRow label="Fueling score" value={fuelingScore} unit="/100" accent={fuelingScore >= 80 ? BRAND.green : fuelingScore >= 60 ? BRAND.gold : BRAND.orange} />
            <StatRow label="Recovery debt" value={recoveryDebt.adjusted} unit="kcal" accent={recoveryDebt.level === 'Vysoký' ? BRAND.red : recoveryDebt.level === 'Střední' ? BRAND.orange : BRAND.green} />
          </Card>
        </div>

        {activePhase === 'phase1' && (
          <>
            <SectionTitle accent={BRAND.gold}>Fáze 1 — největší praktický dopad</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? 'repeat(3, minmax(0, 1fr))' : '1fr', gap: 14, marginBottom: 20 }}>
              <Card accent={accent} glow>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: T.text }}>
                    Nutriční plán na konkrétní trénink
                  </div>
                  {usingTP && (
                    <span style={{
                      fontSize: 9, fontWeight: 700, color: BRAND.purple, flexShrink: 0,
                      background: BRAND.purple + '18', border: `1px solid ${BRAND.purple}33`,
                      borderRadius: 6, padding: '3px 7px', letterSpacing: '0.08em', textTransform: 'uppercase',
                    }}>
                      TP
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.6, marginBottom: 14 }}>
                  {usingTP
                    ? `Plán na „${tpToday!.title}" — ${tpToday!.durationMin} min, TSS ${tpToday!.tss || '?'}.`
                    : 'Konkrétní rozpad na příjem před výkonem, během a po něm. Vychází z dnešního typu tréninku a délky.'}
                </div>
                <StatRow label="Před tréninkem" value={sessionPlan.preCarbs} unit="g S" accent={BRAND.gold} />
                <StatRow label="Během tréninku" value={sessionPlan.duringTotal} unit="g S" accent={BRAND.gold} sublabel={`${carbRange.min}-${carbRange.max} g/h`} />
                <StatRow label="Po tréninku" value={sessionPlan.postProtein} unit="g B" accent={BRAND.green} sublabel={`${sessionPlan.postCarbs} g sacharidů`} />
                <StatRow label="Hydratace" value={sessionPlan.fluidPerHour} unit="ml/h" accent={BRAND.blue} sublabel={`${sessionPlan.sodiumPerHour} mg sodíku / h`} />
                <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                  <Btn accent={BRAND.gold} full onClick={handleApplySessionTargets}>
                    použít jako dnešní cíle
                  </Btn>
                </div>
              </Card>

              <Card>
                <div style={{ fontSize: 18, fontWeight: 800, color: T.text, marginBottom: 8 }}>
                  Carbs / h během tréninku
                </div>
                <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.6, marginBottom: 14 }}>
                  Sleduj, jestli skutečný intake během výkonu odpovídá doporučenému rozsahu pro dnešní session.
                </div>
                <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                  <div style={{ flex: 1, background: T.bg, borderRadius: 12, padding: '12px 14px' }}>
                    <div style={{ fontSize: 11, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>
                      Doporučení
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: BRAND.gold }}>
                      {carbRange.min}-{carbRange.max} <span style={{ fontSize: 12, color: T.muted }}>g/h</span>
                    </div>
                  </div>
                  <div style={{ flex: 1, background: T.bg, borderRadius: 12, padding: '12px 14px' }}>
                    <div style={{ fontSize: 11, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>
                      Realita
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: carbsPerHourActual >= carbRange.min ? BRAND.green : BRAND.orange }}>
                      {totalHours > 0 ? carbsPerHourActual.toFixed(1) : '0.0'} <span style={{ fontSize: 12, color: T.muted }}>g/h</span>
                    </div>
                  </div>
                </div>
                <ProgressBar
                  value={carbsPerHourActual}
                  max={Math.max(carbRange.max, 1)}
                  color={carbsPerHourActual >= carbRange.min ? BRAND.green : BRAND.orange}
                  height={6}
                />
                <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.6, marginTop: 12 }}>
                  Zapsáno během výkonu: <span style={{ color: T.text }}>{duringCarbs.toFixed(0)} g</span>.
                  {totalHours >= 1
                    ? ` Na ${totalHours.toFixed(1)} h by ses měl držet kolem ${sessionPlan.duringTotal} g celkem.`
                    : ' U kratší session to zatím není limitní faktor.'}
                </div>
              </Card>

              <Card>
                <div style={{ fontSize: 18, fontWeight: 800, color: T.text, marginBottom: 8 }}>
                  Meal Builder podle zbylých maker
                </div>
                <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.6, marginBottom: 14 }}>
                  Priorita pro dnešek: <span style={{ color: T.text }}>{getBuilderStrategy(remaining)}</span>.
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8, marginBottom: 12 }}>
                  {[
                    { label: 'Zbývá kcal', value: Math.round(remaining.kcal), color: BRAND.gold },
                    { label: 'Sacharidy', value: `${remaining.carbs.toFixed(0)} g`, color: BRAND.gold },
                    { label: 'Bílkoviny', value: `${remaining.protein.toFixed(0)} g`, color: BRAND.green },
                    { label: 'Tuky', value: `${remaining.fat.toFixed(0)} g`, color: BRAND.orange },
                  ].map(item => (
                    <div key={item.label} style={{ background: T.bg, borderRadius: 10, padding: '10px 12px' }}>
                      <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                        {item.label}
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: item.color }}>{item.value}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                  {builderFoods.slice(0, 4).map(suggestion => (
                    <div key={suggestion.food.id} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 12,
                      background: T.bg,
                      borderRadius: 10,
                      padding: '10px 12px',
                    }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{suggestion.food.name}</div>
                        <div style={{ fontSize: 11, color: T.muted, marginTop: 3 }}>
                          {suggestion.grams} g · {Math.round(suggestion.kcal)} kcal
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', fontSize: 11, color: T.muted }}>
                        <div><span style={{ color: BRAND.gold }}>{suggestion.carbs.toFixed(0)} g S</span></div>
                        <div><span style={{ color: BRAND.green }}>{suggestion.protein.toFixed(0)} g B</span></div>
                        <div><span style={{ color: BRAND.orange }}>{suggestion.fat.toFixed(0)} g T</span></div>
                      </div>
                    </div>
                  ))}
                </div>
                <Btn accent={BRAND.gold} full onClick={() => navigate('/foods')}>
                  otevřít jídla a doplnit den
                </Btn>
              </Card>
            </div>
          </>
        )}

        {activePhase === 'phase2' && activeTab === 'lab' && (
          <>
            <SectionTitle accent={BRAND.gold}>Fáze 2 — sportovní inteligence</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? 'repeat(3, minmax(0, 1fr))' : '1fr', gap: 14, marginBottom: 20 }}>
              <Card>
                <div style={{ fontSize: 18, fontWeight: 800, color: T.text, marginBottom: 8 }}>
                  Training Day Types
                </div>
                <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.6, marginBottom: 14 }}>
                  Appka teď umí rozlišit charakter dne, ne jen základní sport. To pak ovlivňuje fueling i recovery.
                </div>
                <div style={{
                  borderRadius: 14,
                  background: `${dayTypeMeta.color}15`,
                  border: `1px solid ${dayTypeMeta.color}30`,
                  padding: '14px 16px',
                  marginBottom: 14,
                }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: dayTypeMeta.color, marginBottom: 4 }}>
                    {dayTypeMeta.label}
                  </div>
                  <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.6 }}>{dayTypeMeta.message}</div>
                </div>
                <StatRow label="Primary type" value={trainingMeta.label} accent={accent} />
                <StatRow label="Aktivní typy" value={trainingTypes.filter(type => type !== 'rest').length || 0} unit="typy" accent={T.text} />
                <StatRow label="Objem dne" value={totalHours.toFixed(1)} unit="h" accent={BRAND.blue} />
              </Card>

              <Card>
                <div style={{ fontSize: 18, fontWeight: 800, color: T.text, marginBottom: 8 }}>
                  Fueling Score
                </div>
                <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.6, marginBottom: 14 }}>
                  Kombinace protein coverage, carbs coverage, hydratace, carbs/h a post-workout recovery.
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                  <ScoreBadge value={fuelingScore} />
                  <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.6 }}>
                    {fuelingScore >= 80
                      ? 'Dnešní příprava vypadá silně. Hlavní kostra příjmu je na místě.'
                      : fuelingScore >= 60
                        ? 'Jádro funguje, ale pár detailů ještě chybí. Obvykle sacharidy během výkonu nebo voda.'
                        : 'Fueling je zatím pod čarou. Největší dopad bude mít doplnit tréninkové sacharidy a pití.'}
                  </div>
                </div>
                <StatRow label="Protein" value={Math.round((totals.protein / Math.max(goals.protein, 1)) * 100)} unit="%" accent={BRAND.green} />
                <StatRow label="Sacharidy" value={Math.round((totals.carbs / Math.max(goals.carbs, 1)) * 100)} unit="%" accent={BRAND.gold} />
                <StatRow label="Hydratace" value={trainingDay?.water_glasses ?? 0} unit="sklenic" accent={BRAND.blue} />
              </Card>

              <Card>
                <div style={{ fontSize: 18, fontWeight: 800, color: T.text, marginBottom: 8 }}>
                  Recovery Debt
                </div>
                <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.6, marginBottom: 14 }}>
                  Poslední dny porovnávám intake s výdejem, aby bylo vidět, kdy se ti začíná kumulovat energetický dluh.
                </div>
                <div style={{
                  borderRadius: 14,
                  background: `${recoveryDebt.level === 'Vysoký' ? BRAND.red : recoveryDebt.level === 'Střední' ? BRAND.orange : BRAND.green}15`,
                  border: `1px solid ${recoveryDebt.level === 'Vysoký' ? BRAND.red : recoveryDebt.level === 'Střední' ? BRAND.orange : BRAND.green}33`,
                  padding: '14px 16px',
                  marginBottom: 14,
                }}>
                  <div style={{
                    fontSize: 22,
                    fontWeight: 800,
                    color: recoveryDebt.level === 'Vysoký' ? BRAND.red : recoveryDebt.level === 'Střední' ? BRAND.orange : BRAND.green,
                    marginBottom: 4,
                  }}>
                    {recoveryDebt.level} · {recoveryDebt.adjusted} kcal
                  </div>
                  <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.6 }}>{recoveryDebt.message}</div>
                </div>
                <StatRow label="Whoop recovery" value={recoveryScore ?? '—'} unit={recoveryScore != null ? '/100' : ''} accent={recoveryScore != null && recoveryScore < 40 ? BRAND.red : BRAND.blue} />
                <StatRow label="Poslední 3 dny" value={Math.max(historyData.length - 1, 0)} unit="záznamy" accent={T.text} />
              </Card>
            </div>
          </>
        )}

        {activePhase === 'phase3' && activeTab === 'lab' && (
          <>
            <SectionTitle accent={BRAND.gold}>Fáze 3 — Road Classics režim</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? 'repeat(3, minmax(0, 1fr))' : '1fr', gap: 14, marginBottom: 20 }}>
              <Card>
                <div style={{ fontSize: 18, fontWeight: 800, color: T.text, marginBottom: 8 }}>
                  Race checklist
                </div>
                <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.6, marginBottom: 14 }}>
                  Krátký předstartovní seznam, který se ukládá ke konkrétnímu dni. Ideální pro závody a dlouhé švihy.
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {RACE_CHECKLIST_ITEMS.map(item => {
                    const checked = !!todayChecklist[item];
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => void handleToggleChecklist(item)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          textAlign: 'left',
                          padding: '10px 12px',
                          borderRadius: 12,
                          border: `1px solid ${checked ? `${BRAND.green}33` : T.border}`,
                          background: checked ? 'rgba(0,229,176,0.10)' : T.bg,
                          color: checked ? T.text : T.muted,
                          cursor: 'pointer',
                        }}
                      >
                        <span style={{
                          width: 18,
                          height: 18,
                          borderRadius: 6,
                          border: `1px solid ${checked ? BRAND.green : T.border}`,
                          background: checked ? BRAND.green : 'transparent',
                          color: '#000',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 11,
                          flexShrink: 0,
                        }}>
                          {checked ? '✓' : ''}
                        </span>
                        <span style={{ fontSize: 13 }}>{item}</span>
                      </button>
                    );
                  })}
                </div>
              </Card>

              <Card>
                <div style={{ fontSize: 18, fontWeight: 800, color: T.text, marginBottom: 8 }}>
                  Product library
                </div>
                <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.6, marginBottom: 14 }}>
                  Oblíbené produkty pro výkon na jednom místě. Můžeš je připnout a jedním klikem zapisovat do slotu během tréninku.
                </div>
                <div style={{ display: 'grid', gap: 10 }}>
                  {sportProducts.slice(0, 6).map(food => (
                    <LibraryChip
                      key={food.id}
                      food={food}
                      active={productLibrary.includes(food.id)}
                      onToggle={() => void handleToggleLibraryFood(food.id)}
                      onQuickAdd={() => void handleQuickAddFood(food)}
                    />
                  ))}
                </div>
              </Card>

              <Card>
                <div style={{ fontSize: 18, fontWeight: 800, color: T.text, marginBottom: 8 }}>
                  Experiment mode
                </div>
                <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.6, marginBottom: 14 }}>
                  Ulož si zkoušky s fuelingem a měj vedle poznámky i kontext tréninku, doporučené carbs/h a aktuální score.
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                  {(Object.keys(FOCUS_LABELS) as ExperimentFocus[]).map(focus => (
                    <button
                      key={focus}
                      type="button"
                      onClick={() => setExperimentFocus(focus)}
                      style={{
                        padding: '8px 10px',
                        borderRadius: 999,
                        border: `1px solid ${experimentFocus === focus ? `${BRAND.gold}44` : T.border}`,
                        background: experimentFocus === focus ? 'rgba(124,92,255,0.10)' : T.bg,
                        color: experimentFocus === focus ? BRAND.gold : T.muted,
                        cursor: 'pointer',
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      {FOCUS_LABELS[focus]}
                    </button>
                  ))}
                </div>
                <textarea
                  value={experimentNote}
                  onChange={event => setExperimentNote(event.target.value)}
                  placeholder="Např. 80 g sacharidů/h ve dvou lahvích fungovalo, ale posledních 30 min už bylo těžké to dopít."
                  style={{
                    width: '100%',
                    minHeight: 110,
                    resize: 'vertical',
                    borderRadius: 12,
                    border: `1px solid ${T.border}`,
                    background: T.bg,
                    color: T.text,
                    padding: 12,
                    fontSize: 13,
                    marginBottom: 12,
                  }}
                />
                <Btn accent={BRAND.gold} full onClick={() => void handleSaveExperiment()} disabled={savingExperiment || !experimentNote.trim()}>
                  {savingExperiment ? 'ukládám…' : 'uložit experiment'}
                </Btn>
                {!!experimentLog.length && (
                  <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {experimentLog.slice(0, 3).map(item => (
                      <div key={item.id} style={{ background: T.bg, borderRadius: 12, padding: '10px 12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: BRAND.gold }}>{FOCUS_LABELS[item.focus]}</div>
                          <div style={{ fontSize: 11, color: T.muted }}>{item.date}</div>
                        </div>
                        <div style={{ fontSize: 12, color: T.text, lineHeight: 1.6, marginBottom: 6 }}>{item.note}</div>
                        <div style={{ fontSize: 11, color: T.muted }}>
                          {item.trainingType} • {item.hours.toFixed(1)} h • target {item.targetCarbsPerHour} g/h • real {item.actualCarbsPerHour} g/h • score {item.fuelingScore}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </>
        )}

        </div>)} {/* end activeTab === 'lab' */}

        {/* ── Carbs/h tab ── */}
        {activeTab === 'carbs' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, animation: 'tabSlide 0.25s ease-out both' }}>
            <Card style={{
              background: 'linear-gradient(180deg, rgba(124,92,255,0.07), rgba(7,7,10,0.95))',
              borderColor: `${BRAND.gold}33`,
            }}>
              <div style={{ fontSize: 11, color: BRAND.gold, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 10 }}>
                Carbs / h — dnešní výkon
              </div>
              <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                <div style={{ flex: 1, background: T.bg, borderRadius: 12, padding: '14px' }}>
                  <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Doporučení</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: BRAND.gold, letterSpacing: '-0.04em' }}>
                    {carbRange.min === 0 ? '—' : `${carbRange.min}–${carbRange.max}`}
                    <span style={{ fontSize: 13, color: T.muted, fontWeight: 400 }}> g/h</span>
                  </div>
                  <div style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>{dayTypeMeta.message.slice(0, 50)}</div>
                </div>
                <div style={{ flex: 1, background: T.bg, borderRadius: 12, padding: '14px' }}>
                  <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Realita dnes</div>
                  <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.04em', color: carbsPerHourActual >= carbRange.min && carbRange.min > 0 ? BRAND.green : BRAND.orange }}>
                    {totalHours > 0 ? carbsPerHourActual.toFixed(1) : '0.0'}
                    <span style={{ fontSize: 13, color: T.muted, fontWeight: 400 }}> g/h</span>
                  </div>
                  <div style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>{duringCarbs.toFixed(0)} g zalogováno během výkonu</div>
                </div>
              </div>
              <ProgressBar
                value={carbsPerHourActual}
                max={Math.max(carbRange.max || 1, 1)}
                color={carbsPerHourActual >= carbRange.min && carbRange.min > 0 ? BRAND.green : BRAND.orange}
                height={6}
              />
              {/* Manual duration input — shown when TP doesn't provide duration */}
              {tpHours === 0 && (
                <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 12, color: T.muted, flexShrink: 0 }}>Délka výkonu:</span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {[0.5, 1, 1.5, 2, 2.5, 3, 4].map(h => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => setManualHours(manualHours === h ? null : h)}
                        style={{
                          padding: '5px 8px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                          border: `1px solid ${manualHours === h ? BRAND.gold : T.border}`,
                          background: manualHours === h ? `${BRAND.gold}18` : T.bg,
                          color: manualHours === h ? BRAND.gold : T.muted,
                          cursor: 'pointer',
                        }}
                      >
                        {h}h
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {totalHours >= 1 && (
                <div style={{ fontSize: 12, color: T.muted, marginTop: 10, lineHeight: 1.6 }}>
                  Na {totalHours.toFixed(1)} h výkonu cíl: <span style={{ color: T.text, fontWeight: 700 }}>{sessionPlan.duringTotal} g</span> celkem
                  ({carbRange.min}–{carbRange.max} g/h).
                </div>
              )}
            </Card>
            <Card>
              <div style={{ fontSize: 11, color: T.muted, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 12 }}>
                Dnešní kontext
              </div>
              <StatRow label="Trénink" value={usingTP ? tpToday!.title : trainingMeta.label} accent={BRAND.gold} />
              <StatRow label="Délka" value={totalHours > 0 ? `${totalHours.toFixed(1)} h${manualHours !== null ? ' *' : ''}` : 'nezadána'} />
              <StatRow label="Carbs / h rozsah" value={carbRange.min === 0 ? 'volitelné' : `${carbRange.min}–${carbRange.max}`} unit={carbRange.min === 0 ? '' : 'g'} accent={BRAND.gold} />
              <StatRow label="Fueling score" value={fuelingScore} unit="/100" accent={fuelingScore >= 80 ? BRAND.green : fuelingScore >= 60 ? BRAND.gold : BRAND.orange} />
              <StatRow label="Recovery debt" value={recoveryDebt.adjusted} unit="kcal" accent={recoveryDebt.level === 'Vysoký' ? BRAND.red : recoveryDebt.level === 'Střední' ? BRAND.orange : BRAND.green} />
            </Card>
          </div>
        )}

        {/* ── TrainingPeaks upcoming plan tab ── */}
        {activeTab === 'plan' && tp.isConnected && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: BRAND.purple, textTransform: 'uppercase', letterSpacing: '1.5px' }}>
                📅 Plánované tréninky
              </div>
              <button
                onClick={() => tp.sync()}
                disabled={tp.loading}
                style={{
                  background: 'none', border: 'none', cursor: tp.loading ? 'default' : 'pointer',
                  fontSize: 12, color: T.muted, padding: '2px 6px',
                }}
              >
                {tp.loading ? <Spinner color={BRAND.purple} size={12} /> : '↻'}
              </button>
            </div>

            {tp.error && (
              <div style={{ fontSize: 12, color: BRAND.red, background: BRAND.red + '15', borderRadius: 10, padding: '8px 12px', marginBottom: 10 }}>
                ⚠️ {tp.error}
              </div>
            )}

            {tp.upcoming.length === 0 && !tp.loading ? (
              <div style={{ fontSize: 12, color: T.muted, textAlign: 'center', padding: '16px 0' }}>
                Žádné plánované tréninky na příštích 21 dní.
              </div>
            ) : (
              tp.upcoming.map(w => (
                <div key={w.date} style={{
                  background: T.card, border: `1px solid ${BRAND.purple}33`,
                  borderRadius: 14, padding: '12px 14px', marginBottom: 10,
                }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                      background: BRAND.purple + '18', border: `1px solid ${BRAND.purple}30`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                    }}>
                      {tpSportIcon(w.sportType)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {w.title}
                        </span>
                        <span style={{ fontSize: 10, color: w.date === today ? BRAND.gold : T.muted, fontWeight: w.date === today ? 700 : 400, flexShrink: 0 }}>
                          {planDateLabel(w.date)}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8 }}>
                        {w.durationMin > 0 && (
                          <span style={{ fontSize: 10, color: T.muted, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 6, padding: '2px 7px' }}>
                            ⏱ {w.durationMin >= 60 ? `${Math.floor(w.durationMin / 60)}h${w.durationMin % 60 > 0 ? ` ${w.durationMin % 60}min` : ''}` : `${w.durationMin} min`}
                          </span>
                        )}
                        {w.tss > 0 && (
                          <span style={{ fontSize: 10, color: T.muted, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 6, padding: '2px 7px' }}>
                            📊 TSS {w.tss}
                          </span>
                        )}
                      </div>
                      <CompactFuelingBadges workout={w} />
                    </div>
                  </div>
                </div>
              ))
            )}
            <div style={{ height: 1, background: T.border, marginBottom: 20 }} />
          </div>
        )}

        {activeTab === 'plan' && !tp.isConnected && (
          <div style={{
            background: BRAND.purple + '0e', border: `1px solid ${BRAND.purple}33`,
            borderRadius: 14, padding: '12px 14px', marginBottom: 20,
            fontSize: 12, color: T.muted, lineHeight: 1.6,
          }}>
            📅 <strong style={{ color: T.text }}>Propoj TrainingPeaks</strong> — v Profilu → Tréninkový plán vlož svůj iCal kalendář pro nutriční doporučení.
          </div>
        )}

        {activeTab === 'aktivity' && (
        <SectionTitle
          accent={ICU}
          right={cacheAge ? <span style={{ fontSize: 11, color: T.muted }}>{cacheAge}</span> : undefined}
        >
          Aktivity & realita
        </SectionTitle>)}

        {activeTab === 'aktivity' && stale && (
          <div style={{
            background: '#f59e0b18',
            border: '1px solid #f59e0b44',
            borderRadius: 10,
            padding: '8px 14px',
            marginBottom: 14,
            fontSize: 11,
            color: '#f59e0b',
          }}>
            Offline data — poslední synchronizace neproběhla čistě.
          </div>
        )}

        {activeTab === 'aktivity' && (
        <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? 'minmax(0, 1fr) minmax(300px, 0.72fr)' : '1fr', gap: 16, animation: 'tabSlide 0.25s ease-out both' }}>
          <div>
            {loading && !activities.length ? (
              <Card style={{ textAlign: 'center', padding: '56px 0' }}>
                <Spinner color={ICU} size={28} />
                <div style={{ marginTop: 12, fontSize: 13, color: T.muted }}>Načítám aktivity…</div>
              </Card>
            ) : error && !activities.length ? (
              <Card style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>⚠️</div>
                <div style={{ fontSize: 13, color: BRAND.red, marginBottom: 14 }}>{error}</div>
                <Btn accent={ICU} onClick={() => void sync()}>
                  zkusit znovu
                </Btn>
              </Card>
            ) : activityDates.length === 0 ? (
              <Card style={{ textAlign: 'center', padding: 32 }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🚴</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 6 }}>Žádné aktivity</div>
                <div style={{ fontSize: 13, color: T.muted }}>Za poslední 3 dny nejsou v Intervals.icu žádné aktivity.</div>
              </Card>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {activityDates.map(date => (
                  <Card key={date}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
                      <div>
                        <div style={{ fontSize: 10, color: date === today ? ICU : T.muted, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                          {date === today ? 'Dnešní aktivity' : 'Historie'}
                        </div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: T.text, marginTop: 3 }}>
                          {dateLabel(date)}
                        </div>
                      </div>
                      <div style={{ fontSize: 12, color: T.muted }}>{groupedActivities[date].length} záznamů</div>
                    </div>
                    <DaySummary acts={groupedActivities[date]} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {groupedActivities[date].map(activity => (
                        <ActivityCard key={`${date}-${activity.id}`} act={activity} />
                      ))}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <IntervalsCard />
            <Card>
              <div style={{ fontSize: 18, fontWeight: 800, color: T.text, marginBottom: 8 }}>
                Co z toho plyne dnes
              </div>
              <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.6, marginBottom: 14 }}>
                Tohle je zkratka toho, co je dnes nejdůležitější udělat, aby ses nepřestřelil nebo naopak nepodjel intake.
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ background: T.bg, borderRadius: 12, padding: '12px 14px' }}>
                  <div style={{ fontSize: 11, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                    Priorita 1
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: BRAND.gold }}>
                    {totalHours >= 1.5 ? `Držet ${carbRange.min}-${carbRange.max} g sacharidů / h během výkonu.` : 'Dohlídnout timing jídla kolem tréninku, ne objem během výkonu.'}
                  </div>
                </div>
                <div style={{ background: T.bg, borderRadius: 12, padding: '12px 14px' }}>
                  <div style={{ fontSize: 11, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                    Priorita 2
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: BRAND.green }}>
                    {sessionPlan.postProtein} g proteinu po výkonu a dorovnat ještě {remaining.protein.toFixed(0)} g do konce dne.
                  </div>
                </div>
                <div style={{ background: T.bg, borderRadius: 12, padding: '12px 14px' }}>
                  <div style={{ fontSize: 11, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                    Priorita 3
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: BRAND.blue }}>
                    Zatím máš {trainingDay?.water_glasses ?? 0} sklenic vody. Cíl dneška je kolem {Math.round(goals.water * 4)}.
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
        )} {/* end activeTab === 'aktivity' */}

      </div>
    </div>
  );
}
