// Types pour les statistiques
export interface Task {
  id: number;
  uid: string;
  date: string;
  label: string;
  boobLeft?: number;
  boobRight?: number;
  /** @deprecated Use diaperType instead. Kept for backward compatibility with existing data. */
  idCaca?: number;
  /** Type of diaper consistency: 0 = solid, 1 = soft, 2 = liquid */
  diaperType?: number;
  /** Content of diaper: 0 = pee, 1 = poop, 2 = both (optional) */
  diaperContent?: number;
  [key: string]: any;
}

export interface DailyStats {
  today: number | { [key: string]: number };
  yesterday: number | { [key: string]: number };
  lastPeriod: number | { [key: string]: number };
}

export interface ChartData {
  labels: string[];
  datasets: Array<{ data: (number | string | null)[] }>;
}

export interface StackedChartData {
  labels: string[];
  legend: string[];
  data: (number | string)[][];
  barColors: string[];
}

export interface TaskStatistics {
  dailyStats: DailyStats;
  chartData: ChartData | StackedChartData;
  lastTask: Task | null;
  isLoading: boolean;
  error: string | null;
}

export interface TemperatureStats {
  today: { min: number | null; max: number | null; avg: number | null; count: number };
  yesterday: { min: number | null; max: number | null; avg: number | null; count: number };
  last24Hours: { min: number | null; max: number | null; avg: number | null; count: number };
}
