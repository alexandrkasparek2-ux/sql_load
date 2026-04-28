import { useState } from 'react';
import { T, BRAND, Card, Btn } from './UI';
import type { PlannedWorkout } from '../services/trainingPeaksService';
import type { FoodEntry } from '../hooks/useFoodEntries';
import {
  classifyWorkout, calculateFuelingTargets, buildFuelingChecklist,
  FUEL_TYPE_META,
  type FuelingChecklistItem,
} from '../services/fuelingPlanner';

interface Props {
  workout:  PlannedWorkout;
  userId:   string;
  today:    string;
  addEntry: (e: Omit<FoodEntry, 'id'>) => Promise<FoodEntry | null>;
  compact?: boolean;
}

function makeEntry(
  userId: string, today: string, slot: string, name: string,
  carbs: number, protein: number, fat: number,
): Omit<FoodEntry, 'id'> {
  const kcal = Math.round(carbs * 4 + protein * 4 + fat * 9);
  return {
    user_id: userId, date: today, meal_slot: slot,
    food_id: `fp_${slot}`, food_name: name,
    grams: 100, kcal, carbs, protein, fat,
    fiber: 0, na: 0, k: 0, mg: 0, ca: 0,
    fe: 0, vit_c: 0, vit_d: 0, b12: 0, omega3: 0, zn: 0,
  };
}

function ChecklistRow({ item }: { item: FuelingChecklistItem }) {
  const colors: Record<FuelingChecklistItem['category'], string> = {
    bottle: BRAND.blue, gel: BRAND.gold, bar: BRAND.orange,
    food: BRAND.green, electrolyte: '#06b6d4', recovery: BRAND.green,
  };
  const color = colors[item.category];
  return (
    <div style={{
      display: 'flex', gap: 10, alignItems: 'flex-start',
      padding: '8px 0',
      borderBottom: `1px solid ${T.border}`,
    }}>
      <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{item.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{item.label}</div>
        <div style={{ fontSize: 11, color: T.muted, marginTop: 2, lineHeight: 1.4 }}>{item.detail}</div>
      </div>
      <div style={{
        flexShrink: 0, width: 8, height: 8, borderRadius: '50%',
        background: color, marginTop: 6,
      }} />
    </div>
  );
}

export function WorkoutFuelPlannerCard({ workout, userId, today, addEntry, compact = false }: Props) {
  const [added, setAdded]   = useState(false);
  const [adding, setAdding] = useState(false);

  const type    = classifyWorkout(workout);
  const targets = calculateFuelingTargets(workout, type);
  const checklist = buildFuelingChecklist(targets);
  const meta    = FUEL_TYPE_META[type];

  const handleAddToDiary = async () => {
    if (added || adding) return;
    setAdding(true);

    const entries: Omit<FoodEntry, 'id'>[] = [];

    if (targets.preWorkoutCarbs > 0 || targets.preWorkoutProtein > 0) {
      entries.push(makeEntry(
        userId, today, 'pred_tren', 'Předtréninkové sacharidy',
        targets.preWorkoutCarbs, targets.preWorkoutProtein, 8,
      ));
    }

    if (targets.totalCarbsDuring > 0) {
      entries.push(makeEntry(
        userId, today, 'behem_tren', 'Fueling během tréninku',
        targets.totalCarbsDuring, 0, 0,
      ));
    }

    if (targets.postWorkoutCarbs > 0 || targets.postWorkoutProtein > 0) {
      entries.push(makeEntry(
        userId, today, 'po_tren', 'Regenerační jídlo po tréninku',
        targets.postWorkoutCarbs, targets.postWorkoutProtein, 10,
      ));
    }

    for (const entry of entries) {
      await addEntry(entry);
    }

    setAdding(false);
    setAdded(true);
  };

  if (compact) {
    return (
      <div style={{
        marginTop: 10, paddingTop: 10, borderTop: `1px solid ${T.border}`,
        display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center',
      }}>
        <span style={{
          fontSize: 9, fontWeight: 700, color: meta.color,
          background: meta.color + '18', border: `1px solid ${meta.color}33`,
          borderRadius: 6, padding: '2px 7px', textTransform: 'uppercase', letterSpacing: '0.08em',
        }}>
          {meta.icon} {meta.label}
        </span>
        {targets.carbsPerHourMax > 0 && (
          <span style={{ fontSize: 10, color: BRAND.gold, background: BRAND.gold + '12', borderRadius: 6, padding: '2px 7px' }}>
            🍬 {targets.carbsPerHourMin}–{targets.carbsPerHourMax} g/h
          </span>
        )}
        {targets.totalCarbsDuring > 0 && (
          <span style={{ fontSize: 10, color: T.muted, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 6, padding: '2px 7px' }}>
            {targets.totalCarbsDuring} g celkem
          </span>
        )}
        {targets.fluidsPerHourMl > 0 && (
          <span style={{ fontSize: 10, color: BRAND.blue, background: BRAND.blue + '12', borderRadius: 6, padding: '2px 7px' }}>
            💧 {targets.fluidsPerHourMl} ml/h
          </span>
        )}
      </div>
    );
  }

  return (
    <Card style={{ marginBottom: 14, borderColor: meta.color + '33', background: meta.color + '06' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{
              fontSize: 9, fontWeight: 700, color: meta.color, textTransform: 'uppercase', letterSpacing: '0.1em',
              background: meta.color + '18', border: `1px solid ${meta.color}33`, borderRadius: 6, padding: '2px 8px',
            }}>
              {meta.icon} {meta.label}
            </span>
            <span style={{ fontSize: 9, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Fueling plán</span>
          </div>
          <div style={{ fontSize: 15, fontWeight: 800, color: T.text, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {workout.title}
          </div>
          <div style={{ fontSize: 11, color: T.muted }}>
            {workout.durationMin > 0 ? `⏱ ${Math.floor(workout.durationMin / 60)}h${workout.durationMin % 60 > 0 ? ` ${workout.durationMin % 60}min` : ''}` : `⏱ ~${targets.estimatedDurationMin} min (odhad)`}
            {workout.tss > 0 && ` · TSS ${workout.tss}`}
          </div>
        </div>
      </div>

      {/* Recommendation text */}
      <div style={{
        fontSize: 12, color: T.muted, lineHeight: 1.6, marginBottom: 14,
        padding: '8px 12px', background: T.bg, borderRadius: 10,
        borderLeft: `3px solid ${meta.color}`,
      }}>
        {targets.recommendationText}
      </div>

      {/* Key targets grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 14,
      }}>
        {[
          { icon: '🍬', label: 'Carbs / h', value: targets.carbsPerHourMax > 0 ? `${targets.carbsPerHourMin}–${targets.carbsPerHourMax}` : '—', unit: 'g/h', color: BRAND.gold },
          { icon: '🍬', label: 'Celkem tijdens', value: targets.totalCarbsDuring > 0 ? `${targets.totalCarbsDuring}` : '—', unit: 'g', color: BRAND.gold },
          { icon: '💧', label: 'Tekutiny', value: `${targets.fluidsPerHourMl}`, unit: 'ml/h', color: BRAND.blue },
          { icon: '⚡', label: 'Sodík', value: `${targets.sodiumPerHourMg}`, unit: 'mg/h', color: '#06b6d4' },
        ].map(s => (
          <div key={s.label} style={{ background: T.bg, borderRadius: 10, padding: '10px 12px' }}>
            <div style={{ fontSize: 9, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
              {s.icon} {s.label}
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: s.color, fontVariantNumeric: 'tabular-nums' }}>
              {s.value}
              <span style={{ fontSize: 10, color: T.muted, fontWeight: 400, marginLeft: 3 }}>{s.unit}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Pre/post targets */}
      {(targets.preWorkoutCarbs > 0 || targets.postWorkoutProtein > 0) && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          {targets.preWorkoutCarbs > 0 && (
            <div style={{ flex: 1, background: T.bg, borderRadius: 10, padding: '10px 12px' }}>
              <div style={{ fontSize: 9, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>⬆ Před</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: BRAND.gold }}>{targets.preWorkoutCarbs} g S</div>
              {targets.preWorkoutProtein > 0 && (
                <div style={{ fontSize: 11, color: T.muted }}>{targets.preWorkoutProtein} g B</div>
              )}
            </div>
          )}
          {targets.postWorkoutProtein > 0 && (
            <div style={{ flex: 1, background: T.bg, borderRadius: 10, padding: '10px 12px' }}>
              <div style={{ fontSize: 9, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>⬇ Po</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: BRAND.green }}>{targets.postWorkoutProtein} g B</div>
              {targets.postWorkoutCarbs > 0 && (
                <div style={{ fontSize: 11, color: T.muted }}>{targets.postWorkoutCarbs} g S</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Checklist */}
      {checklist.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 10, color: T.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
            Co si připravit
          </div>
          <div style={{ borderTop: `1px solid ${T.border}` }}>
            {checklist.map((item, i) => (
              <ChecklistRow key={i} item={item} />
            ))}
          </div>
        </div>
      )}

      {/* Warnings */}
      {targets.warnings.length > 0 && (
        <div style={{ fontSize: 11, color: '#f59e0b', background: '#f59e0b10', borderRadius: 8, padding: '6px 10px', marginBottom: 12 }}>
          ⚠️ {targets.warnings.join(' ')}
        </div>
      )}

      {/* Add to diary CTA */}
      {added ? (
        <div style={{
          textAlign: 'center', padding: '10px', borderRadius: 10,
          background: '#22c55e18', border: '1px solid #22c55e33',
          color: '#22c55e', fontSize: 13, fontWeight: 600,
        }}>
          ✓ Přidáno do deníku
        </div>
      ) : (
        <Btn accent={meta.color} full onClick={() => void handleAddToDiary()} disabled={adding}>
          {adding ? 'Přidávám…' : '📋 Přidat do deníku'}
        </Btn>
      )}
    </Card>
  );
}

/** Compact fueling summary used inside Plan.tsx upcoming workouts list */
export function CompactFuelingBadges({ workout }: { workout: PlannedWorkout }) {
  const type    = classifyWorkout(workout);
  const targets = calculateFuelingTargets(workout, type);
  const meta    = FUEL_TYPE_META[type];

  if (type === 'rest' || type === 'recovery') return null;

  return (
    <div style={{ marginTop: 8, display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
      <span style={{
        fontSize: 9, fontWeight: 700, color: meta.color,
        background: meta.color + '18', border: `1px solid ${meta.color}33`,
        borderRadius: 5, padding: '2px 6px', textTransform: 'uppercase', letterSpacing: '0.08em',
      }}>
        {meta.icon} {meta.label}
      </span>
      {targets.carbsPerHourMax > 0 && (
        <span style={{ fontSize: 10, color: BRAND.gold, background: BRAND.gold + '12', borderRadius: 5, padding: '2px 6px' }}>
          🍬 {targets.carbsPerHourMin}–{targets.carbsPerHourMax} g/h
        </span>
      )}
      {targets.totalCarbsDuring > 0 && (
        <span style={{ fontSize: 10, color: T.muted, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 5, padding: '2px 6px' }}>
          {targets.totalCarbsDuring} g celkem
        </span>
      )}
      {targets.fluidsPerHourMl > 0 && (
        <span style={{ fontSize: 10, color: BRAND.blue, background: BRAND.blue + '12', borderRadius: 5, padding: '2px 6px' }}>
          💧 {targets.fluidsPerHourMl} ml/h
        </span>
      )}
    </div>
  );
}
