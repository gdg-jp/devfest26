/**
 * Every date label on the page is derived from the two ISO timestamps in a
 * tenant config, so a city writes `startsAt` / `endsAt` and nothing else.
 *
 * Before this, nine hand-maintained label fields sat next to the timestamps and
 * could drift out of sync with them. Formatting is pinned to Asia/Tokyo so the
 * output does not depend on the build machine's timezone.
 */

const JST = 'Asia/Tokyo';
const DOW_JA = ['日', '月', '火', '水', '木', '金', '土'];
const DOW_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface Parts {
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
  dow: number;
}

function partsInJst(iso: string): Parts {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid event timestamp: "${iso}"`);
  }

  const formatted = new Intl.DateTimeFormat('en-US', {
    timeZone: JST,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
    hourCycle: 'h23',
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    formatted.find((p) => p.type === type)?.value ?? '';

  const dow = DOW_EN.indexOf(get('weekday'));
  if (dow < 0) throw new Error(`Could not read weekday for "${iso}"`);

  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
    dow,
  };
}

export interface EventDates {
  /** 2026-10-18 — schema.org and <time datetime>. */
  isoDate: string;
  /** 2026年10月18日 */
  dateLabel: string;
  /** 10/18 */
  dateShort: string;
  /** 10月18日 */
  monthDay: string;
  /** 日 */
  dayOfWeek: string;
  /** Sun */
  dayOfWeekEn: string;
  /** 11:00 */
  startTime: string;
  /** 18:00 */
  endTime: string;
  /** 11:00 – 18:00 */
  hours: string;
  /** 11:00–18:00 — tight spots, no spaces around the dash. */
  hoursCompact: string;
  /** 2026.10.18 SUN 11:00 JST */
  countdownLabel: string;
}

export function eventDates(startsAt: string, endsAt: string): EventDates {
  const s = partsInJst(startsAt);
  const e = partsInJst(endsAt);

  const startTime = `${s.hour}:${s.minute}`;
  const endTime = `${e.hour}:${e.minute}`;
  const dowEn = DOW_EN[s.dow];

  return {
    isoDate: `${s.year}-${s.month}-${s.day}`,
    dateLabel: `${s.year}年${Number(s.month)}月${Number(s.day)}日`,
    dateShort: `${Number(s.month)}/${Number(s.day)}`,
    monthDay: `${Number(s.month)}月${Number(s.day)}日`,
    dayOfWeek: DOW_JA[s.dow],
    dayOfWeekEn: dowEn,
    startTime,
    endTime,
    hours: `${startTime} – ${endTime}`,
    hoursCompact: `${startTime}–${endTime}`,
    countdownLabel: `${s.year}.${s.month}.${s.day} ${dowEn.toUpperCase()} ${startTime} JST`,
  };
}
