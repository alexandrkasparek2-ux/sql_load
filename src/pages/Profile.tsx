import { useContext, useState, useEffect, useCallback } from 'react';
import { AppContext } from '../App';
import { T, Card, SectionTitle, StatRow, Btn, Spinner } from '../components/UI';
import { calcBMR, calcCalories, calcMacros, calcWater } from '../constants/training';

function SliderField({
  label, value, min, max, step, unit, accent, onChange,
}: {
  label: string; value: number; min: number; max: number;
  step: number; unit: string; accent: string;
  onChange: (v: number) => void;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <label style={{ fontSize: 13, color: T.muted }}>{label}</label>
        <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 700, color: accent }}>
          {value} <span style={{ fontSize: 12, color: T.muted }}>{unit}</span>
        </span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ background: `linear-gradient(to right, ${accent} ${pct}%, ${T.border} 0%)` }}
      />
      <style>{`input[type=range]::-webkit-slider-thumb { background: ${accent}; } input[type=range]::-moz-range-thumb { background: ${accent}; }`}</style>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: T.muted, marginTop: 3 }}>
        <span>{min}{unit}</span><span>{max}{unit}</span>
      </div>
    </div>
  );
}

function WeightGoalCard({ userId, currentWeight, accent }: { userId: string; currentWeight: number; accent: string }) {
  const ctx = useContext(AppContext);
  const { deficitActive, setDeficitActive } = ctx;

  const storageKey = `cyclofuel_target_weight_${userId}`;
  const startKey   = `cyclofuel_start_weight_${userId}`;

  const [targetWeight, setTargetWeight] = useState<number>(() => {
    const v = localStorage.getItem(storageKey);
    return v ? Number(v) : Math.max(40, currentWeight - 5);
  });
  const [startWeight] = useState<number>(() => {
    const v = localStorage.getItem(startKey);
    if (v) return Number(v);
    localStorage.setItem(startKey, String(currentWeight));
    return currentWeight;
  });
  const [saved, setSaved] = useState(false);

  const tolose     = parseFloat((currentWeight - targetWeight).toFixed(1));
  const totalGoal  = parseFloat((startWeight - targetWeight).toFixed(1));
  const lost       = parseFloat((startWeight - currentWeight).toFixed(1));
  const progress   = totalGoal > 0 ? Math.min(100, Math.max(0, Math.round((lost / totalGoal) * 100))) : 0;

  // Recommended ~500 kcal deficit = ~0.5 kg/week
  const weeksNeeded = tolose > 0 ? Math.ceil(tolose / 0.5) : 0;
  const deficit     = tolose > 0 ? 500 : 0;

  const handleSave = () => {
    localStorage.setItem(storageKey, String(targetWeight));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const isGoalReached = tolose <= 0;

  return (
    <Card style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <span style={{ fontSize: 20 }}>🎯</span>
        <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700, color: T.text }}>Cílová váha</span>
      </div>

      {isGoalReached ? (
        <div style={{ textAlign: 'center', padding: '12px 0', marginBottom: 16 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🏆</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#22c55e', marginBottom: 4 }}>Cíl splněn!</div>
          <div style={{ fontSize: 13, color: T.muted }}>Aktuální váha je na nebo pod cílem</div>
        </div>
      ) : (
        <>
          {/* Progress bar */}
          {totalGoal > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: T.muted, marginBottom: 6 }}>
                <span>Start: {startWeight} kg</span>
                <span>{progress}% splněno</span>
                <span>Cíl: {targetWeight} kg</span>
              </div>
              <div style={{ height: 8, background: T.border, borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${progress}%`, background: accent, borderRadius: 4, transition: 'width 0.4s' }} />
              </div>
              {lost > 0 && (
                <div style={{ fontSize: 12, color: '#22c55e', marginTop: 6, textAlign: 'center' }}>
                  ✓ Už zhubnuto: {lost} kg
                </div>
              )}
            </div>
          )}

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
            {[
              { label: 'Zbývá', val: `${tolose} kg`, color: accent },
              { label: 'Deficit/den', val: `-${deficit} kcal`, color: '#f59e0b' },
              { label: 'Est. čas', val: `${weeksNeeded} týdnů`, color: T.muted },
            ].map(x => (
              <div key={x.label} style={{ background: T.bg, borderRadius: 10, padding: '10px 8px', textAlign: 'center' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: x.color, fontFamily: 'Syne,sans-serif' }}>{x.val}</div>
                <div style={{ fontSize: 10, color: T.muted, marginTop: 2 }}>{x.label}</div>
              </div>
            ))}
          </div>
        </>
      )}

      <SliderField
        label="Cílová váha" value={targetWeight} min={40} max={currentWeight} step={0.5} unit="kg"
        accent={accent} onChange={setTargetWeight}
      />

      <Btn accent={accent} size="md" full onClick={handleSave}>
        {saved ? '✓ Uloženo' : 'Uložit cíl'}
      </Btn>

      {/* Deficit toggle */}
      {!isGoalReached && (
        <button
          onClick={() => setDeficitActive(!deficitActive)}
          style={{
            marginTop: 12, width: '100%', padding: '12px 16px',
            borderRadius: 12, cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'space-between',
            border: `1px solid ${deficitActive ? accent : T.border}`,
            background: deficitActive ? accent + '15' : T.bg,
            transition: 'all 0.2s',
          }}
        >
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: deficitActive ? accent : T.text }}>
              {deficitActive ? '🔥 Deficit aktivní' : '⚡ Zapnout deficit −500 kcal/den'}
            </div>
            <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>
              {deficitActive
                ? 'Kalorický cíl je snížen o 500 kcal · ~0,5 kg/týden'
                : 'Odečte 500 kcal od denního cíle v celé aplikaci'}
            </div>
          </div>
          <div style={{
            width: 44, height: 24, borderRadius: 12, flexShrink: 0,
            background: deficitActive ? accent : T.border,
            position: 'relative', transition: 'background 0.2s', marginLeft: 12,
          }}>
            <div style={{
              position: 'absolute', top: 3, width: 18, height: 18, borderRadius: '50%',
              background: '#fff', transition: 'left 0.2s',
              left: deficitActive ? 23 : 3,
            }} />
          </div>
        </button>
      )}

      <div style={{ fontSize: 11, color: T.muted, marginTop: 10, textAlign: 'center', lineHeight: 1.5 }}>
        Doporučený deficit ~500 kcal/den = přibližně 0,5 kg/týden
      </div>
    </Card>
  );
}

export default function Profile() {
  const ctx = useContext(AppContext);
  const { userId, accent, profile, saveProfile, signOut, trainingDay } = ctx;

  const [weight, setWeight] = useState(profile?.weight ?? 70);
  const [height, setHeight] = useState(profile?.height ?? 175);
  const [age,    setAge]    = useState(profile?.age    ?? 30);
  const [gender, setGender] = useState<'male' | 'female'>(profile?.gender ?? 'male');
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);

  useEffect(() => {
    if (profile) {
      setWeight(profile.weight);
      setHeight(profile.height);
      setAge(profile.age);
      setGender(profile.gender);
    }
  }, [profile]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    await saveProfile({ weight, height, age, gender });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }, [weight, height, age, gender, saveProfile]);

  const type       = trainingDay?.training_type ?? 'rest';
  const rideHours  = trainingDay?.ride_hours    ?? 0;
  const p          = { weight, height, age, gender };
  const bmr        = Math.round(calcBMR(p));
  const kcal       = calcCalories(p, type, rideHours);
  const macros     = calcMacros(p, type);
  const water      = calcWater(p, rideHours);
  const bmi        = parseFloat((weight / ((height / 100) ** 2)).toFixed(1));

  const bmiLabel = bmi < 18.5 ? 'Podváha' : bmi < 25 ? 'Normální' : bmi < 30 ? 'Nadváha' : 'Obezita';
  const bmiColor = bmi < 18.5 ? '#f59e0b' : bmi < 25 ? '#22c55e' : bmi < 30 ? '#f59e0b' : '#ef4444';

  return (
    <div style={{ padding: '16px 16px 0' }}>
      <SectionTitle accent={accent}>Profil</SectionTitle>

      {/* Profile card */}
      <Card style={{ marginBottom: 16 }}>
        {/* Gender toggle */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 13, color: T.muted, marginBottom: 8 }}>Pohlaví</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['male', 'female'] as const).map(g => (
              <button
                key={g}
                onClick={() => setGender(g)}
                style={{
                  flex:         1,
                  padding:      '10px',
                  borderRadius: 10,
                  border:       `1px solid ${gender === g ? accent : T.border}`,
                  background:   gender === g ? accent + '22' : T.bg,
                  color:        gender === g ? accent : T.muted,
                  fontSize:     14,
                  fontWeight:   600,
                  cursor:       'pointer',
                  fontFamily:   'DM Sans, sans-serif',
                  transition:   'all 0.15s',
                }}
              >
                {g === 'male' ? '♂ Muž' : '♀ Žena'}
              </button>
            ))}
          </div>
        </div>

        <SliderField
          label="Hmotnost" value={weight} min={40} max={150} step={1} unit="kg"
          accent={accent} onChange={setWeight}
        />
        <SliderField
          label="Výška"    value={height} min={140} max={220} step={1} unit="cm"
          accent={accent} onChange={setHeight}
        />
        <SliderField
          label="Věk"      value={age}    min={14}  max={80}  step={1} unit="let"
          accent={accent} onChange={setAge}
        />

        <Btn accent={accent} size="lg" full onClick={handleSave} disabled={saving}>
          {saving ? (
            <><Spinner color="#fff" size={16} /> Ukládám…</>
          ) : saved ? '✓ Uloženo' : 'Uložit profil'}
        </Btn>
      </Card>

      {/* Weight goal */}
      <SectionTitle accent={accent}>Hubnutí</SectionTitle>
      <WeightGoalCard userId={userId} currentWeight={weight} accent={accent} />

      {/* Stats summary */}
      <SectionTitle accent={accent}>Parametry těla</SectionTitle>
      <Card style={{ marginBottom: 16 }}>
        <StatRow label="BMI"          value={bmi}   sublabel={bmiLabel}                   accent={bmiColor} />
        <StatRow label="BMR"          value={bmr}   unit="kcal/den" sublabel="Bazální metabolismus" accent={accent} />
        <StatRow label="Výška"        value={height} unit="cm" />
        <StatRow label="Hmotnost"     value={weight} unit="kg" />
        <StatRow label="Pohlaví"      value={gender === 'male' ? 'Muž' : 'Žena'} />
        <div style={{ borderBottom: 'none' }}>
          <StatRow label="Věk"        value={age}   unit="let" />
        </div>
      </Card>

      {/* Daily targets summary */}
      <SectionTitle accent={accent}>Dnešní cíle</SectionTitle>
      <Card style={{ marginBottom: 16 }}>
        <StatRow label="Kalorie"    value={kcal}           unit="kcal" accent={accent} />
        <StatRow label="Sacharidy"  value={macros.carbs}   unit="g"    accent="#f59e0b" />
        <StatRow label="Bílkoviny"  value={macros.protein} unit="g"    accent="#22c55e" />
        <StatRow label="Tuky"       value={macros.fat}     unit="g"    accent="#a855f7" />
        <div style={{ borderBottom: 'none' }}>
          <StatRow label="Voda"     value={water}          unit="L"    accent="#06b6d4" />
        </div>
      </Card>

      {/* About */}
      <Card style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.7 }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700, color: accent, marginBottom: 6 }}>
            🚴 CycloFuel v0.1
          </div>
          Nutriční tracker navržený pro cyklisty. Cíle kalorií a makronutrientů
          jsou vypočítány metodou Mifflin-St Jeor a přizpůsobeny tvému typu tréninku.
          Mikronutrienty jsou škálovány podle tréninkové zátěže.
        </div>
      </Card>

      {/* Sign out */}
      <div style={{ marginBottom: 16 }}>
        <Btn accent="#ef4444" variant="outline" size="lg" full onClick={() => signOut()}>
          Odhlásit se
        </Btn>
      </div>

    </div>
  );
}
