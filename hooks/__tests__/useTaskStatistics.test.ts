import moment from 'moment';

// Extract and test the pure midnight-split logic directly,
// without needing React hooks infrastructure.
const getSleepMinutesForDay = (start: moment.Moment, durationMinutes: number, targetDay: moment.Moment): number => {
  const end = start.clone().add(durationMinutes, 'minutes');
  const dayStart = targetDay.clone().startOf('day');
  const dayEnd = dayStart.clone().add(1, 'day'); // exclusive midnight — avoids endOf('day') = 23:59:59.999 truncation

  const overlapStart = start.isAfter(dayStart) ? start : dayStart;
  const overlapEnd = end.isBefore(dayEnd) ? end : dayEnd;

  return Math.max(0, overlapEnd.diff(overlapStart, 'minutes'));
};

// Simulate the stats aggregation logic from useSommeilStats
const computeSleepStats = (tasks: { date: string; label: string }[], now: moment.Moment) => {
  let todaySum = 0;
  let yesterdaySum = 0;
  const lastSevenDaysData = Array(7).fill(0);

  tasks.forEach((task) => {
    const duration = parseInt(task.label, 10);
    if (isNaN(duration) || duration <= 0) return;

    const startMoment = moment(task.date, 'YYYY-MM-DD HH:mm:ss');

    todaySum += getSleepMinutesForDay(startMoment, duration, now.clone());
    yesterdaySum += getSleepMinutesForDay(startMoment, duration, now.clone().subtract(1, 'day'));

    for (let i = 0; i < 7; i++) {
      lastSevenDaysData[i] += getSleepMinutesForDay(startMoment, duration, now.clone().subtract(i, 'days'));
    }
  });

  return { todaySum, yesterdaySum, lastSevenDaysData };
};

describe('getSleepMinutesForDay — midnight split logic', () => {
  describe('sessions entirely within one day', () => {
    it('counts full duration when session is entirely today', () => {
      const now = moment('2025-01-10 14:00:00', 'YYYY-MM-DD HH:mm:ss');
      const start = moment('2025-01-10 09:00:00', 'YYYY-MM-DD HH:mm:ss');
      expect(getSleepMinutesForDay(start, 60, now)).toBe(60);
    });

    it('returns 0 for a session entirely in a different day', () => {
      const now = moment('2025-01-10 14:00:00', 'YYYY-MM-DD HH:mm:ss');
      const start = moment('2025-01-08 09:00:00', 'YYYY-MM-DD HH:mm:ss');
      expect(getSleepMinutesForDay(start, 60, now)).toBe(0);
    });

    it('counts full duration for a session starting at midnight', () => {
      const now = moment('2025-01-10 12:00:00', 'YYYY-MM-DD HH:mm:ss');
      const start = moment('2025-01-10 00:00:00', 'YYYY-MM-DD HH:mm:ss');
      expect(getSleepMinutesForDay(start, 30, now)).toBe(30);
    });

    it('counts full duration for a session ending just before midnight', () => {
      const now = moment('2025-01-10 12:00:00', 'YYYY-MM-DD HH:mm:ss');
      const start = moment('2025-01-10 23:00:00', 'YYYY-MM-DD HH:mm:ss');
      expect(getSleepMinutesForDay(start, 59, now)).toBe(59);
    });
  });

  describe('sessions crossing midnight', () => {
    it('splits 60 min starting at 23:30 — 30 min day J, 30 min day J+1', () => {
      const dayJ    = moment('2025-01-10 12:00:00', 'YYYY-MM-DD HH:mm:ss');
      const dayJp1  = moment('2025-01-11 12:00:00', 'YYYY-MM-DD HH:mm:ss');
      const start   = moment('2025-01-10 23:30:00', 'YYYY-MM-DD HH:mm:ss');

      expect(getSleepMinutesForDay(start, 60, dayJ)).toBe(30);
      expect(getSleepMinutesForDay(start, 60, dayJp1)).toBe(30);
    });

    it('splits 90 min starting at 23:00 — 60 min day J, 30 min day J+1', () => {
      const dayJ   = moment('2025-01-10 12:00:00', 'YYYY-MM-DD HH:mm:ss');
      const dayJp1 = moment('2025-01-11 12:00:00', 'YYYY-MM-DD HH:mm:ss');
      const start  = moment('2025-01-10 23:00:00', 'YYYY-MM-DD HH:mm:ss');

      expect(getSleepMinutesForDay(start, 90, dayJ)).toBe(60);
      expect(getSleepMinutesForDay(start, 90, dayJp1)).toBe(30);
    });

    it('splits 1 min starting at 23:59 — 1 min day J, 0 min day J+1', () => {
      const dayJ   = moment('2025-01-10 12:00:00', 'YYYY-MM-DD HH:mm:ss');
      const dayJp1 = moment('2025-01-11 12:00:00', 'YYYY-MM-DD HH:mm:ss');
      const start  = moment('2025-01-10 23:59:00', 'YYYY-MM-DD HH:mm:ss');

      expect(getSleepMinutesForDay(start, 1, dayJ)).toBe(1);
      expect(getSleepMinutesForDay(start, 1, dayJp1)).toBe(0);
    });

    it('splits correctly for a 3-hour session spanning midnight', () => {
      const dayJ   = moment('2025-01-10 12:00:00', 'YYYY-MM-DD HH:mm:ss');
      const dayJp1 = moment('2025-01-11 12:00:00', 'YYYY-MM-DD HH:mm:ss');
      const start  = moment('2025-01-10 22:00:00', 'YYYY-MM-DD HH:mm:ss');

      const minutesJ   = getSleepMinutesForDay(start, 180, dayJ);
      const minutesJp1 = getSleepMinutesForDay(start, 180, dayJp1);

      expect(minutesJ).toBe(120);   // 22:00 → 00:00 = 2h
      expect(minutesJp1).toBe(60);  // 00:00 → 01:00 = 1h
      expect(minutesJ + minutesJp1).toBe(180); // total preserved
    });

    it('total minutes across all days always equals original duration', () => {
      const start = moment('2025-01-10 23:30:00', 'YYYY-MM-DD HH:mm:ss');
      const duration = 90;
      let total = 0;
      for (let i = -1; i <= 2; i++) {
        total += getSleepMinutesForDay(start, duration, moment('2025-01-10').add(i, 'days'));
      }
      expect(total).toBe(duration);
    });
  });
});

describe('computeSleepStats — aggregation with midnight split', () => {
  it('session entirely today — all minutes go to today', () => {
    const now = moment('2025-01-10 14:00:00', 'YYYY-MM-DD HH:mm:ss');
    const tasks = [{ date: '2025-01-10 10:00:00', label: '60' }];
    const { todaySum, yesterdaySum } = computeSleepStats(tasks, now);
    expect(todaySum).toBe(60);
    expect(yesterdaySum).toBe(0);
  });

  it('session entirely yesterday — all minutes go to yesterday', () => {
    const now = moment('2025-01-10 14:00:00', 'YYYY-MM-DD HH:mm:ss');
    const tasks = [{ date: '2025-01-09 10:00:00', label: '45' }];
    const { todaySum, yesterdaySum } = computeSleepStats(tasks, now);
    expect(todaySum).toBe(0);
    expect(yesterdaySum).toBe(45);
  });

  it('session crossing midnight — splits between yesterday and today', () => {
    // Session starts yesterday at 23:30, lasts 60 min → 30 min yesterday, 30 min today
    const now = moment('2025-01-10 14:00:00', 'YYYY-MM-DD HH:mm:ss');
    const tasks = [{ date: '2025-01-09 23:30:00', label: '60' }];
    const { todaySum, yesterdaySum } = computeSleepStats(tasks, now);
    expect(todaySum).toBe(30);
    expect(yesterdaySum).toBe(30);
  });

  it('chart data reflects split across days', () => {
    // Session starts yesterday (index 1) at 23:30, lasts 60 min
    // → 30 min in index 0 (today), 30 min in index 1 (yesterday)
    const now = moment('2025-01-10 14:00:00', 'YYYY-MM-DD HH:mm:ss');
    const tasks = [{ date: '2025-01-09 23:30:00', label: '60' }];
    const { lastSevenDaysData } = computeSleepStats(tasks, now);
    expect(lastSevenDaysData[0]).toBe(30); // today
    expect(lastSevenDaysData[1]).toBe(30); // yesterday
    expect(lastSevenDaysData[2]).toBe(0);
  });

  it('multiple sessions accumulate correctly', () => {
    const now = moment('2025-01-10 14:00:00', 'YYYY-MM-DD HH:mm:ss');
    const tasks = [
      { date: '2025-01-10 08:00:00', label: '30' },  // entirely today: 30 min
      { date: '2025-01-09 23:30:00', label: '60' },  // splits: 30 yesterday, 30 today
    ];
    const { todaySum, yesterdaySum } = computeSleepStats(tasks, now);
    expect(todaySum).toBe(60);    // 30 + 30
    expect(yesterdaySum).toBe(30);
  });

  it('ignores tasks with invalid or zero duration', () => {
    const now = moment('2025-01-10 14:00:00', 'YYYY-MM-DD HH:mm:ss');
    const tasks = [
      { date: '2025-01-10 08:00:00', label: 'abc' },
      { date: '2025-01-10 09:00:00', label: '0' },
      { date: '2025-01-10 10:00:00', label: '-5' },
    ];
    const { todaySum } = computeSleepStats(tasks, now);
    expect(todaySum).toBe(0);
  });
});
