export interface User {
  userId: string;
  email: string;
  username: string;
  creationDate?: any; // Firestore Timestamp (optional, may not exist on all users)
  deleted?: boolean;
  deletedAt?: string;
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
  user: string;
  createdBy: string;
  comment: string;
}

export interface Baby {
  id: string;
  name: string;
  type?: 'Boy' | 'Girl';
  birthDate?: string;
  CreatedDate: string; // Note: Capital D
  tasks?: Task[];
  user?: string[]; // Array of user IDs (parents)
  admin?: string;
  userName?: string;
  userEmail?: string;
  profilePhoto?: string;
  height?: number;
  weight?: number;
  parentEmails?: string[]; // Added for analytics display
}

export interface AnalyticsMetrics {
  totalAccounts: number;
  totalBabies: number;
  accountsWithoutBaby: number;
  deletedAccounts: number;
  babiesWithMoreThan1Task: number;
  babiesWithMoreThan5Tasks: number;
  babiesWithMoreThan30Tasks: number;
  babiesWithMoreThan100Tasks: number;
  babiesWithMultipleParents: number;
  babiesActiveRecently: number;
  iosDownloads: number;
  androidDownloads: number;
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
