import { useMemo } from 'react';
import moment from 'moment';
import 'moment/locale/fr';
import { Task, DailyStats, ChartData, StackedChartData, TaskStatistics, TemperatureStats } from '../types/stats';

// Utilitaires de date
const isToday = (date: string) => moment(date, 'YYYY-MM-DD HH:mm:ss').isSame(moment(), 'day');
const isYesterday = (date: string) => moment(date, 'YYYY-MM-DD HH:mm:ss').isSame(moment().subtract(1, 'day'), 'day');
const isInLastNDays = (date: string, days: number) => moment(date, 'YYYY-MM-DD HH:mm:ss').isAfter(moment().subtract(days, 'days'));

// Performance optimization: Create stable signature for tasks array
// This prevents unnecessary recalculations when tasks array reference changes
// but content is the same
const createTasksSignature = (tasks: Task[]): string => {
  if (!tasks || tasks.length === 0) return 'empty';
  return tasks.map(t => `${t.uid}-${t.date}-${t.label || ''}`).join('|');
};

// Hook pour Biberon
export const useBiberonStats = (tasks: Task[]): TaskStatistics => {
  // Performance optimization: use stable signature instead of tasks array reference
  const tasksSignature = useMemo(() => createTasksSignature(tasks), [tasks]);

  return useMemo(() => {
    if (!tasks || tasks.length === 0) {
      return {
        dailyStats: { today: 0, yesterday: 0, lastPeriod: 0 },
        chartData: { labels: [], datasets: [{ data: [] }] },
        lastTask: null,
        isLoading: false,
        error: null
      };
    }

    let todaySum = 0;
    let yesterdaySum = 0;
    let lastSevenDaysSum = 0;
    let mostRecentTask: Task | null = null;
    let lastSevenDaysData = Array(7).fill(0);
    let labels = [];

    for (let i = 0; i < 7; i++) {
      labels.push(moment().subtract(i, 'days').format('YYYY-MM-DD'));
    }

    tasks.forEach((task) => {
      const value = parseFloat(task.label);
      if (isNaN(value)) return;

      if (isToday(task.date)) todaySum += value;
      if (isYesterday(task.date)) yesterdaySum += value;
      if (isInLastNDays(task.date, 7)) lastSevenDaysSum += value;

      for (let i = 0; i < 7; i++) {
        if (moment(task.date, 'YYYY-MM-DD HH:mm:ss').isSame(moment().subtract(i, 'days'), 'day')) {
          lastSevenDaysData[i] += value;
        }
      }

      const taskDate = moment(task.date, 'YYYY-MM-DD HH:mm:ss');
      if (!mostRecentTask || taskDate.isAfter(moment(mostRecentTask.date, 'YYYY-MM-DD HH:mm:ss'))) {
        mostRecentTask = task;
      }
    });

    return {
      dailyStats: { today: todaySum, yesterday: yesterdaySum, lastPeriod: lastSevenDaysSum },
      chartData: {
        labels: labels.map(label => moment(label).format('DD')),
        datasets: [{ data: lastSevenDaysData }]
      },
      lastTask: mostRecentTask,
      isLoading: false,
      error: null
    };
  }, [tasksSignature, tasks]);
};

// Returns how many minutes of a sleep session [start, start+duration) overlap
// with an arbitrary period [periodStart, periodEnd).
export const getSleepMinutesForPeriod = (
  start: moment.Moment,
  durationMinutes: number,
  periodStart: moment.Moment,
  periodEnd: moment.Moment
): number => {
  const end = start.clone().add(durationMinutes, 'minutes');
  const overlapStart = start.isAfter(periodStart) ? start : periodStart;
  const overlapEnd = end.isBefore(periodEnd) ? end : periodEnd;
  return Math.max(0, overlapEnd.diff(overlapStart, 'minutes'));
};

// Convenience wrapper for a single calendar day.
// Uses exclusive midnight boundary to avoid endOf('day') = 23:59:59.999 truncation.
const getSleepMinutesForDay = (start: moment.Moment, durationMinutes: number, targetDay: moment.Moment): number => {
  const dayStart = targetDay.clone().startOf('day');
  const dayEnd = dayStart.clone().add(1, 'day'); // exclusive: midnight of next day
  return getSleepMinutesForPeriod(start, durationMinutes, dayStart, dayEnd);
};

// Hook pour Sommeil
export const useSommeilStats = (tasks: Task[]): TaskStatistics => {
  // Performance optimization: use stable signature instead of tasks array reference
  const tasksSignature = useMemo(() => createTasksSignature(tasks), [tasks]);

  return useMemo(() => {
    if (!tasks || tasks.length === 0) {
      return {
        dailyStats: { today: 0, yesterday: 0, lastPeriod: 0 },
        chartData: { labels: [], datasets: [{ data: [] }] },
        lastTask: null,
        isLoading: false,
        error: null
      };
    }

    let todaySum = 0;
    let yesterdaySum = 0;
    let lastSevenDaysSum = 0;
    let mostRecentTask: Task | null = null;
    let lastSevenDaysData = Array(7).fill(0);
    let labels = [];

    for (let i = 0; i < 7; i++) {
      labels.push(moment().subtract(i, 'days').format('YYYY-MM-DD'));
    }

    tasks.forEach((task) => {
      const duration = parseInt(task.label, 10);
      if (isNaN(duration) || duration <= 0) return;

      const startMoment = moment(task.date, 'YYYY-MM-DD HH:mm:ss');

      // Split duration across calendar days to handle midnight-crossing sessions
      todaySum += getSleepMinutesForDay(startMoment, duration, moment());
      yesterdaySum += getSleepMinutesForDay(startMoment, duration, moment().subtract(1, 'day'));

      for (let i = 0; i < 7; i++) {
        const minutes = getSleepMinutesForDay(startMoment, duration, moment().subtract(i, 'days'));
        lastSevenDaysData[i] += minutes;
        lastSevenDaysSum += minutes;
      }

      if (!mostRecentTask || startMoment.isAfter(moment(mostRecentTask.date, 'YYYY-MM-DD HH:mm:ss'))) {
        mostRecentTask = task;
      }
    });

    return {
      dailyStats: { today: todaySum, yesterday: yesterdaySum, lastPeriod: lastSevenDaysSum },
      chartData: {
        labels: labels.map(label => moment(label).format('DD')).reverse(),
        datasets: [{ data: lastSevenDaysData.reverse() }]
      },
      lastTask: mostRecentTask,
      isLoading: false,
      error: null
    };
  }, [tasksSignature, tasks]);
};

// Hook pour Température avec min/max
export const useThermoStats = (tasks: Task[], language: string = 'en') => {
  // Performance optimization: use stable signature instead of tasks array reference
  const tasksSignature = useMemo(() => createTasksSignature(tasks), [tasks]);

  return useMemo(() => {
    if (!tasks || tasks.length === 0) {
      return {
        dailyStats: {
          today: { min: null, max: null, avg: null, count: 0 },
          yesterday: { min: null, max: null, avg: null, count: 0 },
          last24Hours: { min: null, max: null, avg: null, count: 0 }
        },
        chartData: { labels: [], datasets: [{ data: [] }] },
        lastTask: null,
        isLoading: false,
        error: null
      };
    }

    const todayTemps: number[] = [];
    const yesterdayTemps: number[] = [];
    const last24HoursTemps: number[] = [];
    let mostRecentTask: Task | null = null;
    
    // Collecter toutes les températures des 24 dernières heures avec leur heure
    const temperaturesList: Array<{ time: string; temp: number; date: moment.Moment }> = [];

    const isFrench = language === 'fr';

    tasks.forEach((task) => {
      const taskDate = moment(task.date, 'YYYY-MM-DD HH:mm:ss');
      // Normalise comma decimal separator (French locale: "37,5" → "37.5")
      const temp = parseFloat(String(task.label).replace(',', '.'));

      // Filter out invalid temps: NaN, zero (saved when field left empty), negatives
      if (isNaN(temp) || temp <= 0) return;

      if (isToday(task.date)) todayTemps.push(temp);
      if (isYesterday(task.date)) yesterdayTemps.push(temp);
      
      if (taskDate.isAfter(moment().subtract(24, 'hours'))) {
        last24HoursTemps.push(temp);
        temperaturesList.push({
          time: taskDate.format('HH:mm'),
          temp: temp,
          date: taskDate
        });
      }

      if (!mostRecentTask || taskDate.isAfter(moment(mostRecentTask.date, 'YYYY-MM-DD HH:mm:ss'))) {
        mostRecentTask = task;
      }
    });

    // Trier par date (plus récent en haut)
    temperaturesList.sort((a, b) => b.date.diff(a.date));
    
    // Identifier min et max
    let minTemp = temperaturesList.length > 0 ? Math.min(...temperaturesList.map(t => t.temp)) : null;
    let maxTemp = temperaturesList.length > 0 ? Math.max(...temperaturesList.map(t => t.temp)) : null;
    
    const temperatureData = temperaturesList.map(item => ({
      time: item.time,
      temp: item.temp,
      isMin: item.temp === minTemp,
      isMax: item.temp === maxTemp
    }));

    const calcStats = (temps: number[]) => ({
      min: temps.length > 0 ? Math.min(...temps) : null,
      max: temps.length > 0 ? Math.max(...temps) : null,
      avg: temps.length > 0 ? temps.reduce((a, b) => a + b, 0) / temps.length : null,
      count: temps.length
    });

    return {
      dailyStats: {
        today: calcStats(todayTemps),
        yesterday: calcStats(yesterdayTemps),
        last24Hours: calcStats(last24HoursTemps)
      },
      chartData: {
        temperatureData: temperatureData
      },
      lastTask: mostRecentTask,
      isLoading: false,
      error: null
    };
  }, [tasksSignature, tasks, language]);
};

// Hook pour Diaper
export const useDiaperStats = (tasks: Task[], t: (key: string) => string) => {
  // Performance optimization: use stable signature instead of tasks array reference
  const tasksSignature = useMemo(() => createTasksSignature(tasks), [tasks]);

  return useMemo(() => {
    if (!tasks || tasks.length === 0) {
      return {
        dailyCountStats: {
          today: 0,
          yesterday: 0,
          lastPeriod: 0
        },
        countChartData: {
          labels: [],
          datasets: [{ data: [] }]
        },
        dailyStats: {
          today: { 0: 0, 1: 0, 2: 0 },
          yesterday: { 0: 0, 1: 0, 2: 0 },
          lastPeriod: { 0: 0, 1: 0, 2: 0 }
        },
        dailyContentStats: {
          today: { 0: 0, 1: 0, 2: 0 },
          yesterday: { 0: 0, 1: 0, 2: 0 },
          lastPeriod: { 0: 0, 1: 0, 2: 0 }
        },
        chartData: {
          labels: [],
          legend: [t('diapers.dur'), t('diapers.mou'), t('diapers.liquide')],
          data: [],
          barColors: ["#A8A8A8", "#C75B4A", "#E29656"]
        } as StackedChartData,
        contentChartData: {
          labels: [],
          legend: [t('diapers.pee'), t('diapers.poop'), t('diapers.both')],
          data: [],
          barColors: ["#34777B", "#C75B4A", "#E29656"]
        } as StackedChartData,
        separateCharts: {
          0: { labels: [], datasets: [{ data: [] }] },
          1: { labels: [], datasets: [{ data: [] }] },
          2: { labels: [], datasets: [{ data: [] }] }
        },
        lastTask: null,
        isLoading: false,
        error: null
      };
    }

    // General count stats (all diaper tasks)
    let todayCount = 0;
    let yesterdayCount = 0;
    let lastSevenDaysCount = 0;

    let todaySum = { 0: 0, 1: 0, 2: 0 };
    let yesterdaySum = { 0: 0, 1: 0, 2: 0 };
    let lastSevenDaysSum = { 0: 0, 1: 0, 2: 0 };

    // Stats for diaperContent (pee=0, poop=1, both=2)
    let todayContentSum = { 0: 0, 1: 0, 2: 0 };
    let yesterdayContentSum = { 0: 0, 1: 0, 2: 0 };
    let lastSevenDaysContentSum = { 0: 0, 1: 0, 2: 0 };

    let mostRecentTask: Task | null = null;
    let lastSevenDaysCountData = Array(7).fill(0);
    let lastSevenDaysData = {
      0: Array(7).fill(0),
      1: Array(7).fill(0),
      2: Array(7).fill(0),
    };
    let lastSevenDaysContentData = {
      0: Array(7).fill(0),
      1: Array(7).fill(0),
      2: Array(7).fill(0),
    };
    let labels = [];

    for (let i = 0; i < 7; i++) {
      labels.push(moment().subtract(i, 'days').format('YYYY-MM-DD'));
    }
    labels.reverse();

    tasks.forEach((task) => {
      const taskDate = moment(task.date, 'YYYY-MM-DD HH:mm:ss');

      // General count - all diaper tasks
      if (isToday(task.date)) todayCount += 1;
      if (isYesterday(task.date)) yesterdayCount += 1;
      if (isInLastNDays(task.date, 7)) lastSevenDaysCount += 1;

      // Track general count per day
      for (let i = 0; i < 7; i++) {
        if (taskDate.isSame(moment().subtract(i, 'days'), 'day')) {
          lastSevenDaysCountData[6 - i] += 1;
        }
      }

      // Support both new diaperType and legacy idCaca for backward compatibility
      const diaperType = task.diaperType ?? task.idCaca;

      // Track diaperType stats (if available)
      if (diaperType !== undefined && diaperType >= 0 && diaperType <= 2) {
        if (isToday(task.date)) todaySum[diaperType] += 1;
        if (isYesterday(task.date)) yesterdaySum[diaperType] += 1;
        if (isInLastNDays(task.date, 7)) lastSevenDaysSum[diaperType] += 1;

        for (let i = 0; i < 7; i++) {
          if (taskDate.isSame(moment().subtract(i, 'days'), 'day')) {
            lastSevenDaysData[diaperType][6 - i] += 1;
          }
        }
      }

      // Track diaperContent stats (if available)
      const diaperContent = task.diaperContent;
      if (diaperContent !== undefined && diaperContent >= 0 && diaperContent <= 2) {
        if (isToday(task.date)) todayContentSum[diaperContent] += 1;
        if (isYesterday(task.date)) yesterdayContentSum[diaperContent] += 1;
        if (isInLastNDays(task.date, 7)) lastSevenDaysContentSum[diaperContent] += 1;

        for (let i = 0; i < 7; i++) {
          if (taskDate.isSame(moment().subtract(i, 'days'), 'day')) {
            lastSevenDaysContentData[diaperContent][6 - i] += 1;
          }
        }
      }

      // Always track most recent task
      if (!mostRecentTask || taskDate.isAfter(moment(mostRecentTask.date, 'YYYY-MM-DD HH:mm:ss'))) {
        mostRecentTask = task;
      }
    });

    return {
      dailyCountStats: {
        today: todayCount,
        yesterday: yesterdayCount,
        lastPeriod: lastSevenDaysCount
      },
      countChartData: {
        labels: labels.map(label => moment(label).format('DD')),
        datasets: [{
          data: lastSevenDaysCountData,
          color: (opacity = 1) => `rgba(199, 91, 74, ${opacity})` // #C75B4A
        }]
      },
      dailyStats: {
        today: todaySum,
        yesterday: yesterdaySum,
        lastPeriod: lastSevenDaysSum
      },
      dailyContentStats: {
        today: todayContentSum,
        yesterday: yesterdayContentSum,
        lastPeriod: lastSevenDaysContentSum
      },
      chartData: {
        labels: labels.map(label => moment(label).format('DD')),
        legend: [t('diapers.dur'), t('diapers.mou'), t('diapers.liquide')],
        data: labels.map((label, index) => [
          lastSevenDaysData[0][index] > 0 ? lastSevenDaysData[0][index] : '',
          lastSevenDaysData[1][index] > 0 ? lastSevenDaysData[1][index] : '',
          lastSevenDaysData[2][index] > 0 ? lastSevenDaysData[2][index] : '',
        ]),
        barColors: ["#A8A8A8", "#C75B4A", "#E29656"]
      } as StackedChartData,
      contentChartData: {
        labels: labels.map(label => moment(label).format('DD')),
        legend: [t('diapers.pee'), t('diapers.poop'), t('diapers.both')],
        data: labels.map((label, index) => [
          lastSevenDaysContentData[0][index] > 0 ? lastSevenDaysContentData[0][index] : '',
          lastSevenDaysContentData[1][index] > 0 ? lastSevenDaysContentData[1][index] : '',
          lastSevenDaysContentData[2][index] > 0 ? lastSevenDaysContentData[2][index] : '',
        ]),
        barColors: ["#34777B", "#C75B4A", "#E29656"]
      } as StackedChartData,
      separateCharts: {
        0: {
          labels: labels.map(label => moment(label).format('DD MMM')),
          datasets: [{ data: lastSevenDaysData[0] }]
        },
        1: {
          labels: labels.map(label => moment(label).format('DD MMM')),
          datasets: [{ data: lastSevenDaysData[1] }]
        },
        2: {
          labels: labels.map(label => moment(label).format('DD MMM')),
          datasets: [{ data: lastSevenDaysData[2] }]
        }
      },
      lastTask: mostRecentTask,
      isLoading: false,
      error: null
    };
  }, [tasksSignature, tasks, t]);
};

// Hook pour Biberon - Mode Comptage
export const useBiberonCountStats = (tasks: Task[]): TaskStatistics => {
  const tasksSignature = useMemo(() => createTasksSignature(tasks), [tasks]);

  return useMemo(() => {
    if (!tasks || tasks.length === 0) {
      return {
        dailyStats: { today: 0, yesterday: 0, lastPeriod: 0 },
        chartData: { labels: [], datasets: [{ data: [] }] },
        lastTask: null,
        isLoading: false,
        error: null
      };
    }

    let todayCount = 0;
    let yesterdayCount = 0;
    let lastSevenDaysCount = 0;
    let mostRecentTask: Task | null = null;
    let lastSevenDaysData = Array(7).fill(0);
    let labels = [];

    for (let i = 0; i < 7; i++) {
      labels.push(moment().subtract(i, 'days').format('YYYY-MM-DD'));
    }

    tasks.forEach((task) => {
      if (isToday(task.date)) todayCount += 1;
      if (isYesterday(task.date)) yesterdayCount += 1;
      if (isInLastNDays(task.date, 7)) lastSevenDaysCount += 1;

      for (let i = 0; i < 7; i++) {
        if (moment(task.date, 'YYYY-MM-DD HH:mm:ss').isSame(moment().subtract(i, 'days'), 'day')) {
          lastSevenDaysData[i] += 1;
        }
      }

      const taskDate = moment(task.date, 'YYYY-MM-DD HH:mm:ss');
      if (!mostRecentTask || taskDate.isAfter(moment(mostRecentTask.date, 'YYYY-MM-DD HH:mm:ss'))) {
        mostRecentTask = task;
      }
    });

    return {
      dailyStats: { today: todayCount, yesterday: yesterdayCount, lastPeriod: lastSevenDaysCount },
      chartData: {
        labels: labels.map(label => moment(label).format('DD')),
        datasets: [{ data: lastSevenDaysData }]
      },
      lastTask: mostRecentTask,
      isLoading: false,
      error: null
    };
  }, [tasksSignature, tasks]);
};

// Hook pour Sommeil - Mode Comptage
export const useSommeilCountStats = (tasks: Task[]): TaskStatistics => {
  const tasksSignature = useMemo(() => createTasksSignature(tasks), [tasks]);

  return useMemo(() => {
    if (!tasks || tasks.length === 0) {
      return {
        dailyStats: { today: 0, yesterday: 0, lastPeriod: 0 },
        chartData: { labels: [], datasets: [{ data: [] }] },
        lastTask: null,
        isLoading: false,
        error: null
      };
    }

    let todayCount = 0;
    let yesterdayCount = 0;
    let lastSevenDaysCount = 0;
    let mostRecentTask: Task | null = null;
    let lastSevenDaysData = Array(7).fill(0);
    let labels = [];

    for (let i = 0; i < 7; i++) {
      labels.push(moment().subtract(i, 'days').format('YYYY-MM-DD'));
    }

    tasks.forEach((task) => {
      if (isToday(task.date)) todayCount += 1;
      if (isYesterday(task.date)) yesterdayCount += 1;
      if (isInLastNDays(task.date, 7)) lastSevenDaysCount += 1;

      for (let i = 0; i < 7; i++) {
        if (moment(task.date, 'YYYY-MM-DD HH:mm:ss').isSame(moment().subtract(i, 'days'), 'day')) {
          lastSevenDaysData[i] += 1;
        }
      }

      const taskDate = moment(task.date, 'YYYY-MM-DD HH:mm:ss');
      if (!mostRecentTask || taskDate.isAfter(moment(mostRecentTask.date, 'YYYY-MM-DD HH:mm:ss'))) {
        mostRecentTask = task;
      }
    });

    return {
      dailyStats: { today: todayCount, yesterday: yesterdayCount, lastPeriod: lastSevenDaysCount },
      chartData: {
        labels: labels.map(label => moment(label).format('DD')).reverse(),
        datasets: [{ data: lastSevenDaysData.reverse() }]
      },
      lastTask: mostRecentTask,
      isLoading: false,
      error: null
    };
  }, [tasksSignature, tasks]);
};

// Hook pour Allaitement
export const useAllaitementStats = (tasks: Task[]) => {
  // Performance optimization: use stable signature instead of tasks array reference
  const tasksSignature = useMemo(() => createTasksSignature(tasks), [tasks]);

  return useMemo(() => {
    if (!tasks || tasks.length === 0) {
      return {
        dailyStats: {
          today: { boobLeft: 0, boobRight: 0, total: 0 },
          yesterday: { boobLeft: 0, boobRight: 0, total: 0 },
          lastPeriod: { boobLeft: 0, boobRight: 0, total: 0 }
        },
        chartData: {
          labels: [],
          boobLeft: [],
          boobRight: [],
          total: []
        },
        lastTask: null,
        isLoading: false,
        error: null
      };
    }

    const allaitementTasks = tasks.filter(task => task.id === 5);

    let todaySum = { boobLeft: 0, boobRight: 0, total: 0 };
    let yesterdaySum = { boobLeft: 0, boobRight: 0, total: 0 };
    let lastSevenDaysSum = { boobLeft: 0, boobRight: 0, total: 0 };
    let mostRecentTask: Task | null = null;
    let lastSevenDaysData = {
      boobLeft: Array(7).fill(0),
      boobRight: Array(7).fill(0),
      total: Array(7).fill(0),
    };
    let labels = [];

    for (let i = 0; i < 7; i++) {
      labels.push(moment().subtract(i, 'days').format('YYYY-MM-DD'));
    }
    labels.reverse();

    allaitementTasks.forEach((task) => {
      const taskDate = moment(task.date, 'YYYY-MM-DD HH:mm:ss');
      const boobLeft = (typeof task.boobLeft === 'number' ? task.boobLeft : parseFloat(String(task.boobLeft) || '0')) / 60;
      const boobRight = (typeof task.boobRight === 'number' ? task.boobRight : parseFloat(String(task.boobRight) || '0')) / 60;
      const total = boobLeft + boobRight;

      if (isToday(task.date)) {
        todaySum.boobLeft += boobLeft;
        todaySum.boobRight += boobRight;
        todaySum.total += total;
      }
      if (isYesterday(task.date)) {
        yesterdaySum.boobLeft += boobLeft;
        yesterdaySum.boobRight += boobRight;
        yesterdaySum.total += total;
      }
      if (isInLastNDays(task.date, 7)) {
        lastSevenDaysSum.boobLeft += boobLeft;
        lastSevenDaysSum.boobRight += boobRight;
        lastSevenDaysSum.total += total;
      }

      for (let i = 0; i < 7; i++) {
        if (taskDate.isSame(moment().subtract(i, 'days'), 'day')) {
          lastSevenDaysData.boobLeft[6 - i] += boobLeft;
          lastSevenDaysData.boobRight[6 - i] += boobRight;
          lastSevenDaysData.total[6 - i] += total;
        }
      }

      if (!mostRecentTask || taskDate.isAfter(moment(mostRecentTask.date, 'YYYY-MM-DD HH:mm:ss'))) {
        mostRecentTask = task;
      }
    });

    return {
      dailyStats: {
        today: todaySum,
        yesterday: yesterdaySum,
        lastPeriod: lastSevenDaysSum
      },
      chartData: {
        labels: labels.map(label => moment(label).format('DD MMM')),
        boobLeft: lastSevenDaysData.boobLeft,
        boobRight: lastSevenDaysData.boobRight,
        total: lastSevenDaysData.total
      },
      lastTask: mostRecentTask,
      isLoading: false,
      error: null
    };
  }, [tasksSignature, tasks]);
};

// Hook pour Allaitement - Mode Comptage
export const useAllaitementCountStats = (tasks: Task[]) => {
  const tasksSignature = useMemo(() => createTasksSignature(tasks), [tasks]);

  return useMemo(() => {
    if (!tasks || tasks.length === 0) {
      return {
        dailyStats: {
          today: { boobLeft: 0, boobRight: 0, total: 0 },
          yesterday: { boobLeft: 0, boobRight: 0, total: 0 },
          lastPeriod: { boobLeft: 0, boobRight: 0, total: 0 }
        },
        chartData: {
          labels: [],
          boobLeft: [],
          boobRight: [],
          total: []
        },
        lastTask: null,
        isLoading: false,
        error: null
      };
    }

    const allaitementTasks = tasks.filter(task => task.id === 5);

    let todayCount = { boobLeft: 0, boobRight: 0, total: 0 };
    let yesterdayCount = { boobLeft: 0, boobRight: 0, total: 0 };
    let lastSevenDaysCount = { boobLeft: 0, boobRight: 0, total: 0 };
    let mostRecentTask: Task | null = null;
    let lastSevenDaysData = {
      boobLeft: Array(7).fill(0),
      boobRight: Array(7).fill(0),
      total: Array(7).fill(0),
    };
    let labels = [];

    for (let i = 0; i < 7; i++) {
      labels.push(moment().subtract(i, 'days').format('YYYY-MM-DD'));
    }
    labels.reverse();

    allaitementTasks.forEach((task) => {
      const taskDate = moment(task.date, 'YYYY-MM-DD HH:mm:ss');
      const hasLeft = task.boobLeft && task.boobLeft > 0;
      const hasRight = task.boobRight && task.boobRight > 0;

      if (isToday(task.date)) {
        if (hasLeft) todayCount.boobLeft += 1;
        if (hasRight) todayCount.boobRight += 1;
        if (hasLeft) todayCount.total += 1;
        if (hasRight) todayCount.total += 1;
      }
      if (isYesterday(task.date)) {
        if (hasLeft) yesterdayCount.boobLeft += 1;
        if (hasRight) yesterdayCount.boobRight += 1;
        if (hasLeft) yesterdayCount.total += 1;
        if (hasRight) yesterdayCount.total += 1;
      }
      if (isInLastNDays(task.date, 7)) {
        if (hasLeft) lastSevenDaysCount.boobLeft += 1;
        if (hasRight) lastSevenDaysCount.boobRight += 1;
        if (hasLeft) lastSevenDaysCount.total += 1;
        if (hasRight) lastSevenDaysCount.total += 1;
      }

      for (let i = 0; i < 7; i++) {
        if (taskDate.isSame(moment().subtract(i, 'days'), 'day')) {
          if (hasLeft) lastSevenDaysData.boobLeft[6 - i] += 1;
          if (hasRight) lastSevenDaysData.boobRight[6 - i] += 1;
          if (hasLeft) lastSevenDaysData.total[6 - i] += 1;
          if (hasRight) lastSevenDaysData.total[6 - i] += 1;
        }
      }

      if (!mostRecentTask || taskDate.isAfter(moment(mostRecentTask.date, 'YYYY-MM-DD HH:mm:ss'))) {
        mostRecentTask = task;
      }
    });

    return {
      dailyStats: {
        today: todayCount,
        yesterday: yesterdayCount,
        lastPeriod: lastSevenDaysCount
      },
      chartData: {
        labels: labels.map(label => moment(label).format('DD MMM')),
        boobLeft: lastSevenDaysData.boobLeft,
        boobRight: lastSevenDaysData.boobRight,
        total: lastSevenDaysData.total
      },
      lastTask: mostRecentTask,
      isLoading: false,
      error: null
    };
  }, [tasksSignature, tasks]);
};

// ─── Sleep Advanced Stats ────────────────────────────────────────────────────

export type SleepPeriod = 7 | 30 | 60 | 90;

export interface SleepGroupData {
  label: string;
  nightMinutes: number;
  napMinutes: number;
  daysCount: number;
}

export interface DailyTotal {
  date: string;   // YYYY-MM-DD
  totalMin: number;
}

export interface SleepAdvancedResult {
  groups: SleepGroupData[];
  dailyTotals: DailyTotal[];
  avgNightPerDay: number;
  avgNapPerDay: number;
  avgTotalPerDay: number;
  todayNight: number;
  todayNap: number;
  yesterdayNight: number;
  yesterdayNap: number;
  hasData: boolean;
  daysWithData: number;
}

const PERIOD_CONFIG: Record<number, { count: number; daysEach: number }> = {
  7:  { count: 7, daysEach: 1  },
  30: { count: 5, daysEach: 6  },
  60: { count: 8, daysEach: 8  },
  90: { count: 6, daysEach: 15 },
};

export const useSommeilAdvancedStats = (tasks: Task[], period: SleepPeriod): SleepAdvancedResult => {
  const tasksSignature = useMemo(() => createTasksSignature(tasks), [tasks]);

  return useMemo(() => {
    const empty: SleepAdvancedResult = {
      groups: [], dailyTotals: [], avgNightPerDay: 0, avgNapPerDay: 0, avgTotalPerDay: 0,
      todayNight: 0, todayNap: 0, yesterdayNight: 0, yesterdayNap: 0,
      hasData: false, daysWithData: 0,
    };
    if (!tasks || tasks.length === 0) return empty;

    const { count, daysEach } = PERIOD_CONFIG[period];

    // Groups ordered oldest → newest (index 0 = oldest, index count-1 = today)
    const groups: SleepGroupData[] = Array.from({ length: count }, (_, i) => {
      const daysAgoForGroupEnd = (count - 1 - i) * daysEach;
      let label: string;
      if (period === 7) {
        label = moment().subtract(daysAgoForGroupEnd, 'days').format('dd').charAt(0).toUpperCase();
      } else {
        label = moment().subtract(daysAgoForGroupEnd + daysEach - 1, 'days').format('D/M');
      }
      return { label, nightMinutes: 0, napMinutes: 0, daysCount: daysEach };
    });

    // Daily totals array — index 0 = oldest day, index period-1 = today
    const dailyTotals: DailyTotal[] = Array.from({ length: period }, (_, i) => ({
      date: moment().subtract(period - 1 - i, 'days').format('YYYY-MM-DD'),
      totalMin: 0,
    }));

    let totalNight = 0;
    let totalNap = 0;
    let todayNight = 0, todayNap = 0, yesterdayNight = 0, yesterdayNap = 0;
    const daysSet = new Set<string>();

    tasks.forEach(task => {
      const duration = parseInt(task.label, 10);
      if (isNaN(duration) || duration <= 0) return;

      const startMoment = moment(task.date, 'YYYY-MM-DD HH:mm:ss');
      const daysAgo = moment().diff(startMoment, 'days');
      if (daysAgo >= period) return;

      const isNight = (task.sleepType ?? 'nap') === 'night';
      const groupIdx = count - 1 - Math.floor(daysAgo / daysEach);

      if (groupIdx >= 0 && groupIdx < count) {
        if (isNight) groups[groupIdx].nightMinutes += duration;
        else groups[groupIdx].napMinutes += duration;
      }

      const dailyIdx = period - 1 - daysAgo;
      if (dailyIdx >= 0 && dailyIdx < period) {
        dailyTotals[dailyIdx].totalMin += duration;
      }

      if (isNight) totalNight += duration; else totalNap += duration;
      daysSet.add(startMoment.format('YYYY-MM-DD'));

      if (isToday(task.date))     { if (isNight) todayNight += duration;     else todayNap += duration;     }
      if (isYesterday(task.date)) { if (isNight) yesterdayNight += duration; else yesterdayNap += duration; }
    });

    const d = Math.max(daysSet.size, 1);
    return {
      groups,
      dailyTotals,
      avgNightPerDay: Math.round(totalNight / d),
      avgNapPerDay:   Math.round(totalNap   / d),
      avgTotalPerDay: Math.round((totalNight + totalNap) / d),
      todayNight, todayNap, yesterdayNight, yesterdayNap,
      hasData: daysSet.size > 0,
      daysWithData: daysSet.size,
    };
  }, [tasksSignature, tasks, period]);
};
