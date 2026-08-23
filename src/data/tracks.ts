/**
 * Tracks are structural, not editorial: the id is what a session's frontmatter
 * points at, and the colour is the rail that runs through the timetable row,
 * the track header and every card's session number.
 */

export type TrackId = 'a' | 'b' | 'c' | 'unscheduled';

export interface Track {
  id: TrackId;
  label: string;
  sub: string;
  /** Solid fill for the track header pill. */
  color: string;
  /** Readable version of `color` for small text on white. */
  textColor: string;
  /** Header needs dark text (yellow fails white). */
  darkInk?: boolean;
  /** Not yet a real track — rendered dashed and outlined. */
  pending?: boolean;
}

export const tracks: Track[] = [
  {
    id: 'a',
    label: 'Track A｜メイン・トーク',
    sub: '技術セッション・パネルディスカッション',
    color: 'var(--blue)',
    textColor: 'var(--blue)',
  },
  {
    id: 'b',
    label: 'Track B｜ハンズオン・トーク',
    sub: 'Google AI・生成AI ハンズオン',
    color: 'var(--green)',
    textColor: 'var(--green)',
  },
  {
    id: 'c',
    label: 'Track C｜ハンズオン・トーク',
    sub: 'LT・コミュニティセッション',
    color: 'var(--yellow)',
    textColor: '#8a5a00',
    darkInk: true,
  },
  {
    id: 'unscheduled',
    label: 'Track・時間調整中',
    sub: 'トラックと時間が決まりしだい移動します',
    color: 'var(--surface)',
    textColor: 'var(--muted)',
    pending: true,
  },
];

/** Timetable rows — the day at track granularity, which is all that is fixed. */
export const timetable = [
  {
    start: '11:00',
    end: '– 18:00',
    lines: [
      { label: 'Track A｜メイン・トーク', note: '技術セッション・パネルディスカッション（予定）', rail: 'var(--blue)' },
      { label: 'Track B｜ハンズオン・トーク', note: 'Google AI・生成AI ハンズオン（予定）', rail: 'var(--green)' },
      { label: 'Track C｜ハンズオン・トーク', note: 'LT・コミュニティセッション（予定）', rail: 'var(--yellow)' },
    ],
  },
  {
    start: '18:30',
    end: '– 20:30',
    lines: [
      { label: '懇親会（予定）', note: '登壇者・参加者とのネットワーキング', rail: 'var(--red)' },
    ],
  },
];

/** Pastel rotation used to keep adjacent speaker blocks from matching. */
export const pastelCycle = ['blue', 'green', 'yellow', 'red'] as const;
