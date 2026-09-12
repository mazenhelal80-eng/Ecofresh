/**
 * Central Date & Period Utilities for Reports and Analytics
 * Timezone: Africa/Cairo (Egypt UTC+2 / UTC+3)
 */

export type ReportPeriod = 'weekly' | 'monthly' | 'yearly' | 'custom';

export interface DateRange {
  startDate: Date;
  endDate: Date;
  startDateStr: string; // YYYY-MM-DD
  endDateStr: string;   // YYYY-MM-DD
  label: string;
}

export interface PeriodComparisonRange {
  current: DateRange;
  previous: DateRange;
  period: ReportPeriod;
}

/**
 * Normalizes start and end dates to start-of-day (00:00:00.000) and end-of-day (23:59:59.999)
 */
export function toStartOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function toEndOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function formatDateToISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDateToArabic(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Resolves current and previous equivalent period date ranges.
 */
export function resolvePeriodDates(params: {
  period?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  baseDate?: Date;
}): PeriodComparisonRange {
  const period: ReportPeriod = (params.period as ReportPeriod) || 'monthly';
  const now = params.baseDate ? new Date(params.baseDate) : new Date();

  let currentStart: Date;
  let currentEnd: Date;
  let prevStart: Date;
  let prevEnd: Date;

  if (period === 'weekly') {
    // Current week: last 7 days ending today
    currentEnd = toEndOfDay(now);
    currentStart = toStartOfDay(new Date(currentEnd.getTime() - 6 * 24 * 60 * 60 * 1000));

    // Previous week: 7 days immediately before currentStart
    prevEnd = toEndOfDay(new Date(currentStart.getTime() - 1 * 24 * 60 * 60 * 1000));
    prevStart = toStartOfDay(new Date(prevEnd.getTime() - 6 * 24 * 60 * 60 * 1000));
  } else if (period === 'yearly') {
    // Current year: Jan 1 to Dec 31 of current year
    const year = now.getFullYear();
    currentStart = new Date(year, 0, 1, 0, 0, 0, 0);
    currentEnd = new Date(year, 11, 31, 23, 59, 59, 999);

    // Previous year
    prevStart = new Date(year - 1, 0, 1, 0, 0, 0, 0);
    prevEnd = new Date(year - 1, 11, 31, 23, 59, 59, 999);
  } else if (period === 'custom' && params.startDate && params.endDate) {
    currentStart = toStartOfDay(new Date(params.startDate));
    currentEnd = toEndOfDay(new Date(params.endDate));

    if (isNaN(currentStart.getTime()) || isNaN(currentEnd.getTime()) || currentStart > currentEnd) {
      // Fallback to current month if invalid
      const year = now.getFullYear();
      const month = now.getMonth();
      currentStart = new Date(year, month, 1, 0, 0, 0, 0);
      currentEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);
    }

    const durationMs = currentEnd.getTime() - currentStart.getTime() + 1;
    prevEnd = new Date(currentStart.getTime() - 1);
    prevStart = new Date(prevEnd.getTime() - durationMs + 1);
  } else {
    // Default 'monthly': 1st of current month to end of current month
    const year = now.getFullYear();
    const month = now.getMonth();
    currentStart = new Date(year, month, 1, 0, 0, 0, 0);
    currentEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);

    // Previous month
    prevStart = new Date(year, month - 1, 1, 0, 0, 0, 0);
    prevEnd = new Date(year, month, 0, 23, 59, 59, 999);
  }

  const currentRange: DateRange = {
    startDate: currentStart,
    endDate: currentEnd,
    startDateStr: formatDateToISO(currentStart),
    endDateStr: formatDateToISO(currentEnd),
    label: `${formatDateToArabic(currentStart)} ← ${formatDateToArabic(currentEnd)}`,
  };

  const prevRange: DateRange = {
    startDate: prevStart,
    endDate: prevEnd,
    startDateStr: formatDateToISO(prevStart),
    endDateStr: formatDateToISO(prevEnd),
    label: `${formatDateToArabic(prevStart)} ← ${formatDateToArabic(prevEnd)}`,
  };

  return {
    current: currentRange,
    previous: prevRange,
    period,
  };
}

/**
 * Calculates percentage delta safely
 */
export function calculatePercentageChange(current: number, previous: number): {
  diff: number;
  pct: number;
  direction: 'UP' | 'DOWN' | 'EQUAL';
} {
  const diff = current - previous;
  if (previous === 0) {
    return {
      diff,
      pct: current > 0 ? 100 : 0,
      direction: current > 0 ? 'UP' : current < 0 ? 'DOWN' : 'EQUAL',
    };
  }

  const pct = (diff / Math.abs(previous)) * 100;
  return {
    diff,
    pct: Math.round(pct * 10) / 10,
    direction: diff > 0 ? 'UP' : diff < 0 ? 'DOWN' : 'EQUAL',
  };
}
