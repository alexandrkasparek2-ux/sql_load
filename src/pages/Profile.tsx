import { useContext, useState, useEffect, useCallback } from 'react';
import { AppContext, type DeficitLevel, DEFICIT_KCAL } from '../App';
import { T, BRAND, Card, SectionTitle, StatRow, Btn, Spinner } from '../components/UI';
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
  const { deficitLevel, setDeficitLevel } = ctx;

  const storageKey = `cyclofuel_target_weight_${userId}`;
  const startKey   = `cyclofuel_start_weight_${userId}`;

  const [targetWeight, setTargetWeight] = useState<number>(() => {
    const v = localStorage.getItem(storageKey);
    return v ? Number(v) : Math.max(40, currentWeight - 5);
  });
  const [startWeight, setStartWeight] = useState<number>(() => {
    const v = localStorage.getItem(startKey);
    if (v) return Number(v);
    localStorage.setItem(startKey, String(currentWeight));
    return currentWeight;
  });
  const [saved, setSaved] = useState(false);

  // If user increased weight above stored start, update start weight
  useEffect(() => {
    if (currentWeight > startWeight) {
      localStorage.setItem(startKey, String(currentWeight));
      setStartWeight(currentWeight);
    }
  }, [currentWeight, startWeight, startKey]);

  const tolose     = parseFloat((currentWeight - targetWeight).toFixed(1));
  const totalGoal  = parseFloat((startWeight - targetWeight).toFixed(1));
  const lost       = parseFloat((startWeight - currentWeight).toFixed(1));
  const progress   = totalGoal > 0 ? Math.min(100, Math.max(0, Math.round((lost / totalGoal) * 100))) : 0;

  const activeDeficit  = deficitLevel !== 'off' && tolose > 0 ? DEFICIT_KCAL[deficitLevel] : 0;
  const kgPerWeek      = activeDeficit / 1000; // 7700 kcal ≈ 1 kg, 500 kcal/day ≈ 0.5 kg/week
  const weeksNeeded    = tolose > 0 && kgPerWeek > 0 ? Math.ceil(tolose / kgPerWeek) : 0;

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
              { label: 'Deficit/den', val: activeDeficit > 0 ? `-${activeDeficit} kcal` : '—', color: '#f59e0b' },
              { label: 'Est. čas', val: weeksNeeded > 0 ? `${weeksNeeded} týdnů` : '—', color: T.muted },
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

      {/* Deficit speed selector */}
      {!isGoalReached && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 12, color: T.muted, marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
            Rychlost hubnutí
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {([
              { id: 'off',    label: 'Vypnuto', sub: '—',           color: T.muted  },
              { id: 'slow',   label: 'Pomalu',  sub: '−250 kcal',   color: '#22c55e' },
              { id: 'medium', label: 'Středně', sub: '−500 kcal',   color: '#f59e0b' },
              { id: 'fast',   label: 'Rychle',  sub: '−750 kcal',   color: '#ef4444' },
            ] as { id: DeficitLevel; label: string; sub: string; color: string }[]).map(opt => {
              const active = deficitLevel === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => setDeficitLevel(opt.id)}
                  style={{
                    flex: 1, padding: '10px 4px', borderRadius: 12, cursor: 'pointer',
                    border: `1px solid ${active ? opt.color : T.border}`,
                    background: active ? opt.color + '20' : T.bg,
                    transition: 'all 0.15s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                  }}
                >
                  <span style={{ fontSize: 12, fontWeight: 700, color: active ? opt.color : T.muted }}>{opt.label}</span>
                  <span style={{ fontSize: 10, color: active ? opt.color : T.muted, opacity: 0.8 }}>{opt.sub}</span>
                </button>
              );
            })}
          </div>
          {deficitLevel !== 'off' && (
            <div style={{ fontSize: 11, color: T.muted, marginTop: 8, textAlign: 'center' }}>
              {deficitLevel === 'slow'   && '~0,25 kg/týden · bezpečné a udržitelné'}
              {deficitLevel === 'medium' && '~0,5 kg/týden · doporučená rychlost'}
              {deficitLevel === 'fast'   && '~0,75 kg/týden · náročnější, sleduj energii'}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

// ─── Weight log button (inline in profile card) ───────────────
function WeightLogBtn({ userId, currentWeight, accent, onLogged }: { userId: string; currentWeight: number; accent: string; onLogged: () => void }) {
  const logKey = `cyclofuel_weight_log_${userId}`;
  const today  = new Date().toISOString().split('T')[0];
  const [logged, setLogged] = useState(false);

  const entries: { date: string; weight: number }[] = (() => {
    try { return JSON.parse(localStorage.getItem(logKey) ?? '[]'); }
    catch { return []; }
  })();
  const todayLogged = entries.some(e => e.date === today);

  const log = () => {
    const next = [...entries.filter(e => e.date !== today), { date: today, weight: currentWeight }]
      .sort((a, b) => a.date.localeCompare(b.date)).slice(-60);
    localStorage.setItem(logKey, JSON.stringify(next));
    setLogged(true);
    onLogged();
    setTimeout(() => setLogged(false), 2000);
  };

  return (
    <button onClick={log} style={{
      width: '100%', marginBottom: 18,
      padding: '10px', borderRadius: 10, cursor: 'pointer',
      border: `1px solid ${logged ? '#30d158' : todayLogged ? accent + '44' : accent}`,
      background: logged ? '#30d15815' : todayLogged ? accent + '10' : accent + '18',
      color: logged ? '#30d158' : accent,
      fontSize: 13, fontWeight: 700, letterSpacing: '0.04em',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    }}>
      <span style={{ fontSize: 16 }}>{logged ? '✓' : '⚖️'}</span>
      {logged ? 'Váha zaznamenána!' : todayLogged ? `Přepsat dnešní záznam (${currentWeight} kg)` : `Zaznamenat váhu · ${currentWeight} kg`}
    </button>
  );
}

// ─── Weight tracker ───────────────────────────────────────────
interface WeightEntry { date: string; weight: number; }

function WeightTracker({ userId, currentWeight, accent }: { userId: string; currentWeight: number; accent: string }) {
  const logKey    = `cyclofuel_weight_log_${userId}`;
  const targetKey = `cyclofuel_target_weight_${userId}`;

  const [entries] = useState<WeightEntry[]>(() => {
    try { return JSON.parse(localStorage.getItem(logKey) ?? '[]'); }
    catch { return []; }
  });

  const today        = new Date().toISOString().split('T')[0];
  const targetWeight = Number(localStorage.getItem(targetKey) ?? 0) || null;

  // Chart
  const W = 280, H = 110, padL = 34, padR = 8, padT = 12, padB = 24;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  const weights = entries.map(e => e.weight);
  if (targetWeight) weights.push(targetWeight);

  const minW = weights.length ? Math.floor(Math.min(...weights) - 1) : currentWeight - 5;
  const maxW = weights.length ? Math.ceil(Math.max(...weights) + 1)  : currentWeight + 5;
  const range = maxW - minW || 1;

  const toX = (i: number) => padL + (entries.length < 2 ? chartW / 2 : (i / (entries.length - 1)) * chartW);
  const toY = (w: number) => padT + chartH - ((w - minW) / range) * chartH;

  const points = entries.map((e, i) => `${toX(i)},${toY(e.weight)}`).join(' ');
  const areaPoints = entries.length > 0
    ? `${toX(0)},${padT + chartH} ${points} ${toX(entries.length - 1)},${padT + chartH}`
    : '';

  // X axis labels — show first, middle, last
  const labelIdxs = entries.length <= 1 ? [0]
    : entries.length <= 4 ? entries.map((_, i) => i)
    : [0, Math.floor((entries.length - 1) / 2), entries.length - 1];

  const fmtDate = (d: string) => {
    const dt = new Date(d + 'T00:00:00');
    return `${dt.getDate()}.${dt.getMonth() + 1}.`;
  };

  return (
    <Card style={{ marginBottom: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
        <span style={{ fontSize: 16 }}>📈</span>
        <span style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, color: T.text, fontSize: 13 }}>Vývoj váhy</span>
        {entries.length > 0 && (
          <span style={{ fontSize: 11, color: T.muted, marginLeft: 4 }}>{entries.length} měření</span>
        )}
      </div>

      {entries.length < 2 ? (
        <div style={{ textAlign: 'center', padding: '20px 0', color: T.muted, fontSize: 13 }}>
          {entries.length === 0
            ? 'Zaznamenej první měření tlačítkem výše'
            : 'Přidej další měření — graf se zobrazí od 2 záznamů'}
        </div>
      ) : (
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ overflow: 'visible', display: 'block' }}>
          {/* Y axis gridlines + labels */}
          {[minW, Math.round((minW + maxW) / 2), maxW].map(w => {
            const y = toY(w);
            return (
              <g key={w}>
                <line x1={padL} y1={y} x2={W - padR} y2={y} stroke={T.border} strokeWidth={1} strokeDasharray="3,3" />
                <text x={padL - 4} y={y + 4} textAnchor="end" fontSize={8} fill={T.muted}>{w}</text>
              </g>
            );
          })}

          {/* Target weight line */}
          {targetWeight && targetWeight >= minW && targetWeight <= maxW && (
            <g>
              <line x1={padL} y1={toY(targetWeight)} x2={W - padR} y2={toY(targetWeight)}
                stroke={accent} strokeWidth={1} strokeDasharray="4,3" opacity={0.6} />
              <text x={W - padR + 2} y={toY(targetWeight) + 4} fontSize={8} fill={accent} opacity={0.8}>cíl</text>
            </g>
          )}

          {/* Area fill */}
          {areaPoints && (
            <polygon points={areaPoints} fill={`url(#wGrad_${userId})`} opacity={0.25} />
          )}
          <defs>
            <linearGradient id={`wGrad_${userId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={accent} stopOpacity={0.6} />
              <stop offset="100%" stopColor={accent} stopOpacity={0} />
            </linearGradient>
          </defs>

          {/* Line */}
          {entries.length >= 2 && (
            <polyline points={points} fill="none" stroke={accent} strokeWidth={2}
              strokeLinecap="round" strokeLinejoin="round"
              style={{ filter: `drop-shadow(0 0 4px ${accent}88)` }}
            />
          )}

          {/* Dots */}
          {entries.map((e, i) => {
            const isToday = e.date === today;
            return (
              <circle key={e.date} cx={toX(i)} cy={toY(e.weight)} r={isToday ? 4 : 3}
                fill={isToday ? accent : T.card} stroke={accent} strokeWidth={isToday ? 0 : 1.5}
                style={{ filter: isToday ? `drop-shadow(0 0 4px ${accent})` : undefined }}
              />
            );
          })}

          {/* X axis labels */}
          {labelIdxs.map(i => {
            if (!entries[i]) return null;
            const align = i === 0 ? 'start' : i === entries.length - 1 ? 'end' : 'middle';
            return (
              <text key={i} x={toX(i)} y={H - 4} textAnchor={align} fontSize={8} fill={T.muted}>
                {fmtDate(entries[i].date)}
              </text>
            );
          })}
        </svg>
      )}

      {/* Stats row */}
      {entries.length >= 2 && (() => {
        const first = entries[0].weight;
        const last  = entries[entries.length - 1].weight;
        const diff  = parseFloat((last - first).toFixed(1));
        const trend = diff < 0 ? '↓' : diff > 0 ? '↑' : '→';
        const trendColor = diff < 0 ? '#30d158' : diff > 0 ? '#ff375f' : T.muted;
        return (
          <div style={{ display: 'flex', gap: 8, marginTop: 12, paddingTop: 12, borderTop: `1px solid ${T.border}` }}>
            {[
              { label: 'Start', val: `${first} kg`, color: T.muted },
              { label: 'Nyní',  val: `${last} kg`,  color: accent  },
              { label: 'Změna', val: `${trend} ${Math.abs(diff)} kg`, color: trendColor },
            ].map(s => (
              <div key={s.label} style={{ flex: 1, textAlign: 'center', background: T.bg, borderRadius: 8, padding: '8px 4px' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: s.color }}>{s.val}</div>
                <div style={{ fontSize: 10, color: T.muted, marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
              </div>
            ))}
          </div>
        );
      })()}
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
  const [saving,       setSaving]       = useState(false);
  const [saved,        setSaved]        = useState(false);
  const [weightLogKey, setWeightLogKey] = useState(0);

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
    <div style={{ padding: '16px 16px 0', position: 'relative' }}>
      {/* Gradient overlay */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 300,
        background: 'radial-gradient(ellipse at top, rgba(255,214,0,0.06), transparent 70%)',
        pointerEvents: 'none', zIndex: 0,
      }} />
      <div style={{ position: 'relative', zIndex: 1 }}>
      <SectionTitle accent={BRAND.gold}>Profil</SectionTitle>

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
        <WeightLogBtn userId={userId} currentWeight={weight} accent={accent} onLogged={() => setWeightLogKey(k => k + 1)} />
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

      {/* Weight tracker */}
      <SectionTitle accent={accent}>Vývoj váhy</SectionTitle>
      <WeightTracker key={weightLogKey} userId={userId} currentWeight={weight} accent={accent} />

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
        <StatRow label="Sacharidy"  value={macros.carbs}   unit="g"    accent={BRAND.gold}   />
        <StatRow label="Bílkoviny"  value={macros.protein} unit="g"    accent={BRAND.green}  />
        <StatRow label="Tuky"       value={macros.fat}     unit="g"    accent={BRAND.orange} />
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
    </div>
  );
}
