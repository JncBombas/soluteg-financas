export const FIXED_HOLIDAYS = [
  "01-01",
  "04-21",
  "05-01",
  "09-07",
  "10-12",
  "11-02",
  "11-15",
  "11-20",
  "12-25"
];

// Butcher's algorithm to calculate Easter date
export function getEaster(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month, day);
}

const toLocalISOString = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export function getHolidays(year: number): Set<string> {
  const holidays = new Set<string>();

  for (const fh of FIXED_HOLIDAYS) {
    holidays.add(`${year}-${fh}`);
  }

  const easter = getEaster(year);
  
  const addDays = (date: Date, days: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return toLocalISOString(d);
  };

  holidays.add(addDays(easter, -48));
  holidays.add(addDays(easter, -47));
  holidays.add(addDays(easter, -2));
  holidays.add(addDays(easter, 60));

  return holidays;
}

export function nextBusinessDay(date: Date): Date {
  const d = new Date(date);
  const dayOfWeek = d.getDay();
  
  if (dayOfWeek === 0) {
    d.setDate(d.getDate() + 1);
  } else if (dayOfWeek === 6) {
    d.setDate(d.getDate() + 2);
  }

  const dateStr = toLocalISOString(d);
  const holidays = getHolidays(d.getFullYear());

  if (holidays.has(dateStr)) {
    d.setDate(d.getDate() + 1);
    return nextBusinessDay(d);
  }

  return d;
}
