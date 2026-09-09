export interface User {
  userId: string;
  email: string;
  username: string;
  creationDate?: any; // Firestore Timestamp (optional, may not exist on all users)
  deleted?: boolean;
  deletedAt?: string;
  provider?: 'email' | 'google' | 'apple';
  emailOptIn?: boolean;
  country?: string;
  parentAgeRange?: string;
  lastLoginDate?: string;
  appVersion?: string;
  isPremium?: boolean;
  premiumDate?: any; // Firestore Timestamp — set at purchase time (absent for bulk-granted early adopters)
  linkedBaby?: Baby;
  babyStatus?: 'created' | 'joined' | 'none';
}

export interface Task {
  uid: string;
  id: number;
  labelTask: string;
  date: string; // Date string, not Timestamp
  label: string | number; // For bottles (ml)
  idCaca?: string | number; // Legacy diaper type field
  diaperType?: number; // 0: solid, 1: soft, 2: liquid
  diaperContent?: number; // 0: pee, 1: poop, 2: both
  boobLeft?: number; // Left breast duration (minutes)
  boobRight?: number; // Right breast duration (minutes)
  milkType?: string | null; // 'artificial' | 'maternal' | null
  user: string;
  createdBy: string;
  comment: string;
}

export const parseBabyDate = (baby: { CreatedDate?: string; createdDate?: any }): Date | null => {
  if (baby.createdDate && typeof baby.createdDate === 'object' && 'toDate' in baby.createdDate) {
    return (baby.createdDate as any).toDate();
  }
  if (baby.CreatedDate) {
    const d = new Date(baby.CreatedDate);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
};

export interface Baby {
  id: string;
  name: string;
  type?: 'Boy' | 'Girl';
  birthDate?: string;
  CreatedDate?: string;
  createdDate?: any; // Firestore Timestamp (new format)
  tasks?: Task[];
  user?: string[]; // Array of user IDs (parents)
  admin?: string;
  userName?: string;
  userEmail?: string;
  profilePhoto?: string;
  height?: number;
  weight?: number;
  parentEmails?: string[];
  linkedUsers?: User[];
  memberRoles?: Record<string, string>;
  memberJoinDates?: Record<string, any>; // Firestore Timestamp per userId (absent for pre-existing members)
  firstChildFor?: Record<string, boolean>;
}

export interface AnalyticsMetrics {
  totalAccounts: number;
  totalBabies: number;
  accountsWithoutBaby: number;
  joinedExistingBaby: number;
  deletedAccounts: number;
  babiesWithMoreThan1Task: number;
  babiesWithMoreThan5Tasks: number;
  babiesWithMoreThan30Tasks: number;
  babiesWithMoreThan100Tasks: number;
  babiesWithMultipleParents: number;
  babiesActiveRecently: number;
  iosDownloads: number;
  androidDownloads: number;
  // Email opt-in & provider breakdown
  emailOptInCount: number;
  providerGoogleCount: number;
  providerAppleCount: number;
  providerEmailCount: number;
  // Previous period metrics for trends
  previousPeriod?: {
    totalAccounts: number;
    totalBabies: number;
    babiesActiveRecently: number;
  };
  // Average statistics
  averageStats?: {
    avgTasksPerBaby: number;
    avgParentsPerBaby: number;
    mostPopularTaskType: string;
    mostPopularTaskCount: number;
    avgAccountLifetime: number; // in days
  };
  // Global task distribution
  taskDistribution?: {
    totalTasks: number;
    biberon: { count: number; percentage: number };
    couche: { count: number; percentage: number };
    sante: { count: number; percentage: number };
    sommeil: { count: number; percentage: number };
    temperature: { count: number; percentage: number };
    allaitement: { count: number; percentage: number };
  };
  // Parent profile distributions
  roleDistribution?: Record<string, number>;
  ageRangeDistribution?: Record<string, number>;
  firstChildCount?: number;
  // Retention: babies active at X days after creation
  retentionByAge?: {
    d1: number; d3: number; d7: number; d15: number; d20: number; d25: number;
    d30: number; d45: number; d60: number; d75: number; d90: number;
    totalWithDate: number;
  };
  // Premium stats (always global, not date-filtered)
  premiumStats?: {
    total: number;              // achats réels (isPremium + compte créé après le bulk grant)
    today: number;              // achats du jour, datés par premiumDate
    yesterday: number;          // achats d'hier
    last7Days: number;          // achats sur les 7 derniers jours
    last30Days: number;         // achats sur les 30 derniers jours
    undatedPurchases: number;   // achats sans premiumDate (antérieurs à la v1.3.2), hors périodes
  };
  // User funnel: what users do after creating an account
  userFunnel?: {
    createdBaby: number;
    joinedBaby: number;
    noBaby: number;
    total: number;
  };
  // Dropout analysis
  dropoutAnalysis?: {
    exactly0Tasks: number;
    exactly1Task: number;
    tasks2to5: number;
    firstTaskTypeFor1Task: Record<string, number>;
    avgDaysAccountToBaby: number; minDaysAccountToBaby: number; maxDaysAccountToBaby: number;
    avgDaysAccountToFirstTask: number; minDaysAccountToFirstTask: number; maxDaysAccountToFirstTask: number;
    avgDaysBabyToFirstTask: number; minDaysBabyToFirstTask: number; maxDaysBabyToFirstTask: number;
    avgDaysActiveFor2to5: number;
    avgBabyAgeAtLastTaskDays: number;
    activeDurationBuckets: { under7: number; d7to30: number; d30to90: number; over90: number };
    babyAgeAtLastTaskBuckets: { under30: number; d30to90: number; d90to180: number; d180to365: number; over365: number };
  };
  // per-category sub-breakdowns
  biberonMilkType?: { artificial: number; maternal: number; unknown: number };
  allaitementTimerType?: { timer: number; manual: number };
  diaperContentDistribution?: { pee: number; poop: number; both: number };
  // Task distribution by baby age
  taskDistributionByAge?: {
    totalBabies: number;
    ranges: {
      [ageRange: string]: {
        totalTasks: number;
        babyCount: number;
        biberon: number;
        couche: number;
        sante: number;
        sommeil: number;
        temperature: number;
        allaitement: number;
      };
    };
  };
}

export interface BabyStats {
  baby: Baby;
  totalTasks: number;
  tasksByType: {
    bottles: { count: number; totalMl: number };
    diapers: { count: number; solid: number; soft: number; liquid: number };
    health: { count: number };
    sleep: { count: number; totalHours: number };
    temperature: { count: number; avgTemp: number };
    breastfeeding: { count: number; totalHours: number };
  };
  parentEmails: string[];
}

export type DateRange = {
  start: Date | null;
  end: Date | null;
};

export type PresetRange = 'today' | 'yesterday' | 'all' | '7days' | '30days' | '3months' | 'custom';
