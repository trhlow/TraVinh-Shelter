const DAY_MS = 24 * 60 * 60 * 1000;

export const DATE_PRESETS = [
  { id: 'all', label: 'Tất cả' },
  { id: '7d', label: '7 ngày' },
  { id: '30d', label: '30 ngày' },
  { id: 'quarter', label: 'Quý này' },
  { id: 'custom', label: 'Tùy chọn' },
];

export function resolveDateRange(presetId, custom = {}, now = new Date()) {
  if (presetId === '7d') return { from: new Date(now.getTime() - 7 * DAY_MS), to: now };
  if (presetId === '30d') return { from: new Date(now.getTime() - 30 * DAY_MS), to: now };
  if (presetId === 'quarter') {
    const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
    return { from: new Date(now.getFullYear(), quarterStartMonth, 1), to: now };
  }
  if (presetId === 'custom') {
    const from = custom.from ? new Date(`${custom.from}T00:00:00`) : null;
    const to = custom.to ? new Date(`${custom.to}T23:59:59.999`) : null;
    return { from, to };
  }
  return { from: null, to: null };
}

export function isInRange(value, range) {
  const bounded = Boolean(range.from || range.to);
  if (!value) return !bounded;
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return !bounded;
  if (range.from && time < range.from.getTime()) return false;
  if (range.to && time > range.to.getTime()) return false;
  return true;
}

export function previousRange(range) {
  if (!range.from || !range.to) return null;
  const length = range.to.getTime() - range.from.getTime();
  return { from: new Date(range.from.getTime() - length), to: new Date(range.from.getTime()) };
}

export function percentDelta(current, previous) {
  if (!previous) return null;
  return Math.round(((current - previous) / previous) * 100);
}
