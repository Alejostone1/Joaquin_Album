const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

/** "2026-11-15" → "15 de noviembre de 2026" (sin desfases de zona horaria) */
export function formatDate(iso: string | null | undefined, opts: { year?: boolean } = {}) {
  if (!iso) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  const [, y, mo, d] = m;
  const base = `${Number(d)} de ${MONTHS[Number(mo) - 1]}`;
  return opts.year === false ? base : `${base} de ${y}`;
}

export function monthYear(iso: string) {
  const m = /^(\d{4})-(\d{2})/.exec(iso);
  if (!m) return iso;
  return `${MONTHS[Number(m[2]) - 1]} ${m[1]}`;
}

export function formatTime(hhmm: string | null | undefined) {
  if (!hhmm) return "";
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmm);
  if (!m) return hhmm;
  let h = Number(m[1]);
  const suffix = h >= 12 ? "p. m." : "a. m.";
  h = h % 12 || 12;
  return `${h}:${m[2]} ${suffix}`;
}

export function addYears(iso: string, years: number) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  return `${Number(m[1]) + years}-${m[2]}-${m[3]}`;
}
