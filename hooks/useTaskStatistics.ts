import { useMemo } from 'react';
import moment from 'moment';
import 'moment/locale/fr';
import { Task, DailyStats, ChartData, StackedChartData, TaskStatistics, TemperatureStats } from '../types/stats';

// Utilitaires de date
const isToday = (date: string) => moment(date, 'YYYY-MM-DD HH:mm:ss').isSame(moment(), 'day');
const isYesterday = (date: string) => moment(date, 'YYYY-MM-DD HH:mm:ss').isSame(moment().subtract(1, 'day'), 'day');
const isInLastNDays = (date: string, days: number) => moment(date, 'YYYY-MM-DD HH:mm:ss').isAfter(moment().subtract(days, 'days'));

// Hook pour Biberon
export const useBiberonStats = (tasks: Task[]): TaskStatistics => {
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
  }, [tasks]);
};

// Hook pour Sommeil
export const useSommeilStats = (tasks: Task[]): TaskStatistics => {
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
      if (isNaN(duration)) return;

      if (isToday(task.date)) todaySum += duration;
      if (isYesterday(task.date)) yesterdaySum += duration;
      if (isInLastNDays(task.date, 7)) lastSevenDaysSum += duration;

      for (let i = 0; i < 7; i++) {
        if (moment(task.date, 'YYYY-MM-DD HH:mm:ss').isSame(moment().subtract(i, 'days'), 'day')) {
          lastSevenDaysData[i] += duration;
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
        labels: labels.map(label => moment(label).format('DD')).reverse(),
        datasets: [{ data: lastSevenDaysData.reverse() }]
      },
      lastTask: mostRecentTask,
      isLoading: false,
      error: null
    };
  }, [tasks]);
};

// Hook pour Température avec min/max
export const useThermoStats = (tasks: Task[], language: string = 'en') => {
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
      const temp = parseFloat(task.label);

      if (isNaN(temp)) return;

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
  }, [tasks, language]);
};

// Hook pour Diaper
export const useDiaperStats = (tasks: Task[], t: (key: string) => string) => {
  return useMemo(() => {
    if (!tasks || tasks.length === 0) {
      return {
        dailyStats: {
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

    let todaySum = { 0: 0, 1: 0, 2: 0 };
    let yesterdaySum = { 0: 0, 1: 0, 2: 0 };
    let lastSevenDaysSum = { 0: 0, 1: 0, 2: 0 };
    let mostRecentTask: Task | null = null;
    let lastSevenDaysData = {
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
      // Support both new diaperType and legacy idCaca for backward compatibility
      const diaperType = task.diaperType ?? task.idCaca;

      if (diaperType === undefined || diaperType < 0 || diaperType > 2) return;

      if (isToday(task.date)) todaySum[diaperType] += 1;
      if (isYesterday(task.date)) yesterdaySum[diaperType] += 1;
      if (isInLastNDays(task.date, 7)) lastSevenDaysSum[diaperType] += 1;

      for (let i = 0; i < 7; i++) {
        if (taskDate.isSame(moment().subtract(i, 'days'), 'day')) {
          lastSevenDaysData[diaperType][6 - i] += 1;
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
        labels: labels.map(label => moment(label).format('DD')),
        legend: [t('diapers.dur'), t('diapers.mou'), t('diapers.liquide')],
        data: labels.map((label, index) => [
          lastSevenDaysData[0][index] > 0 ? lastSevenDaysData[0][index] : '',
          lastSevenDaysData[1][index] > 0 ? lastSevenDaysData[1][index] : '',
          lastSevenDaysData[2][index] > 0 ? lastSevenDaysData[2][index] : '',
        ]),
        barColors: ["#A8A8A8", "#C75B4A", "#E29656"]
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
  }, [tasks, t]);
};

// Hook pour Allaitement
export const useAllaitementStats = (tasks: Task[]) => {
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
  }, [tasks]);
};
