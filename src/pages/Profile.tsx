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

export default function Profile() {
  const ctx = useContext(AppContext);
  const { accent, profile, saveProfile, signOut, trainingDay } = ctx;

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
