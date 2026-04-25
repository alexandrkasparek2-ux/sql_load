import { useState, useEffect, useRef } from 'react';

interface NotifContext {
  totals:      { kcal: number; protein: number };
  goals:       { kcal: number; water: number; protein: number };
  waterGlasses: number;
  intervalsActivitiesJson: string; // JSON string to avoid object reference instability
}

const SENT_KEY = (date: string) => `cf_notif_${date}`;

function getSent(date: string): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(SENT_KEY(date)) ?? '[]') as string[]); }
  catch { return new Set(); }
}

function markSent(date: string, id: string) {
  const sent = getSent(date);
  sent.add(id);
  localStorage.setItem(SENT_KEY(date), JSON.stringify([...sent]));
}

function notify(title: string, body: string) {
  if (Notification.permission !== 'granted') return;
  try { new Notification(title, { body, icon: '/icon-192.png', badge: '/icon-192.png' }); }
  catch { /* ignore if notifications blocked */ }
}

function runChecks(ctx: NotifContext) {
  const now   = new Date();
  const today = now.toISOString().split('T')[0];
  const hour  = now.getHours();
  const min   = now.getMinutes();
  const sent  = getSent(today);

  // ── 1. Lunch reminder at 13:00 if < 300 kcal logged ──────
  if (hour === 13 && min < 10 && !sent.has('lunch') && ctx.totals.kcal < 300) {
    notify('🍽️ Nezapomněl jsi na oběd?', `Dnes máš jen ${Math.round(ctx.totals.kcal)} kcal. Cíl: ${Math.round(ctx.goals.kcal)} kcal.`);
    markSent(today, 'lunch');
  }

  // ── 2. Water reminder at 19:00 if < 80% goal ─────────────
  if (hour === 19 && min < 10 && !sent.has('water') && ctx.goals.water > 0) {
    const litres = ctx.waterGlasses * 0.25;
    if (litres < ctx.goals.water * 0.8) {
      notify('💧 Nezapomínej pít!', `Vypil jsi ${litres.toFixed(1)} l z ${ctx.goals.water.toFixed(1)} l. Zbývá ${(ctx.goals.water - litres).toFixed(1)} l.`);
      markSent(today, 'water');
    }
  }

  // ── 3. Post-workout protein window ───────────────────────
  if (!ctx.intervalsActivitiesJson) return;
  try {
    const acts = JSON.parse(ctx.intervalsActivitiesJson) as Array<{ start_date_local: string; moving_time: number; id: string }>;
    const nowMs = now.getTime();
    for (const act of acts) {
      if (!act.start_date_local.startsWith(today)) continue;
      const endMs  = new Date(act.start_date_local).getTime() + act.moving_time * 1000;
      const minsAgo = (nowMs - endMs) / 60_000;
      const id     = `protein_${act.id ?? act.start_date_local}`;
      if (minsAgo >= 5 && minsAgo <= 35 && !sent.has(id)) {
        const target = Math.round(ctx.goals.protein * 0.25);
        notify('💪 Okno na proteiny!', `Trénink skončil před ${Math.round(minsAgo)} min. Sněz ${target}g bílkovin pro regeneraci.`);
        markSent(today, id);
      }
    }
  } catch { /* ignore parse errors */ }
}

export function useNotifications(ctx: NotifContext) {
  const [permission, setPermission] = useState<NotificationPermission>(
    () => ('Notification' in window ? Notification.permission : 'denied')
  );
  const ctxRef = useRef(ctx);
  ctxRef.current = ctx;

  const request = async () => {
    if (!('Notification' in window)) return;
    const p = await Notification.requestPermission();
    setPermission(p);
  };

  useEffect(() => {
    if (permission !== 'granted') return;
    runChecks(ctxRef.current);
    const id = setInterval(() => runChecks(ctxRef.current), 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [permission]);

  return { permission, request };
}
