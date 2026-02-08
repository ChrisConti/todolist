import { getDocs } from 'firebase/firestore';
import { usersRef, babiesRef, appInstallsRef } from '../config/firebase';
import type { AnalyticsMetrics, DateRange, User, Baby } from '../types';

interface AppInstall {
  platform: string;
  timestamp: any;
  version?: any;
}

/**
 * Get analytics metrics for a given date range
 */
export const getAnalyticsMetrics = async (dateRange: DateRange): Promise<AnalyticsMetrics> => {
  try {
    // ALWAYS fetch all data (CreatedDate is a string, not Timestamp, so we can't query on it)
    const usersSnapshot = await getDocs(usersRef);
    const babiesSnapshot = await getDocs(babiesRef);

    const allUsers: User[] = usersSnapshot.docs.map(doc => ({
      userId: doc.id,
      ...doc.data()
    } as User));

    const allBabies: Baby[] = babiesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Baby));

    // Fetch installs (may not exist yet)
    let allInstalls: AppInstall[] = [];
    try {
      const installsSnapshot = await getDocs(appInstallsRef);
      allInstalls = installsSnapshot.docs.map(doc => doc.data() as AppInstall);
    } catch (installsError) {
      console.warn('AppInstalls collection not accessible (may not exist yet):', installsError);
      // Continue with empty installs array
    }

    // Filter by date range if specified
    let users = allUsers;
    let babies = allBabies;

    if (dateRange.start && dateRange.end) {
      // Filter users by creationDate if it exists
      users = allUsers.filter(u => {
        if (!u.creationDate) return false;

        let userDate: Date;
        if (typeof u.creationDate === 'object' && 'toDate' in u.creationDate) {
          userDate = (u.creationDate as any).toDate();
        } else if (typeof u.creationDate === 'string') {
          userDate = new Date(u.creationDate);
        } else {
          return false;
        }

        return userDate >= dateRange.start! && userDate <= dateRange.end!;
      });

      // Filter babies by CreatedDate (string format: 'YYYY-MM-DD HH:mm:ss')
      babies = allBabies.filter(b => {
        if (!b.CreatedDate) return false;

        // Parse string date
        const babyDate = new Date(b.CreatedDate);

        // Check if date is valid
        if (isNaN(babyDate.getTime())) {
          return false;
        }

        return babyDate >= dateRange.start! && babyDate <= dateRange.end!;
      });
    }

    // Calculate metrics
    const totalAccounts = users.length;
    const totalBabies = babies.length;

    // Get user IDs who created babies (in the filtered period)
    const userIdsWithBabies = new Set<string>();
    babies.forEach(baby => {
      if (baby.user && Array.isArray(baby.user)) {
        baby.user.forEach(uid => userIdsWithBabies.add(uid));
      }
    });

    // Accounts without baby (in the filtered period)
    const accountsWithoutBaby = users.filter(u => !userIdsWithBabies.has(u.userId)).length;

    // Deleted accounts (in the filtered period)
    const deletedAccounts = users.filter(u => u.deleted === true).length;

    // Task-based metrics: count based on filtered babies
    let babiesWithMoreThan1Task = 0;
    let babiesWithMoreThan5Tasks = 0;
    let babiesWithMoreThan30Tasks = 0;
    let babiesWithMoreThan100Tasks = 0;
    let babiesWithMultipleParents = 0;
    let babiesActiveRecently = 0;

    // Calculate date 7 days ago
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    babies.forEach(baby => {
      const taskCount = baby.tasks?.length || 0;

      if (taskCount >= 1) babiesWithMoreThan1Task++;
      if (taskCount > 5) babiesWithMoreThan5Tasks++;
      if (taskCount > 30) babiesWithMoreThan30Tasks++;
      if (taskCount > 100) babiesWithMoreThan100Tasks++;

      // Count babies with multiple parents
      const parentCount = baby.user?.length || 0;
      if (parentCount > 1) babiesWithMultipleParents++;

      // Count babies with at least one task in the last 7 days
      const hasRecentTask = baby.tasks?.some(task => {
        if (!task.date) return false;
        const taskDate = new Date(task.date);
        return !isNaN(taskDate.getTime()) && taskDate >= sevenDaysAgo;
      });
      if (hasRecentTask) babiesActiveRecently++;
    });

    // Count downloads by platform
    let iosDownloads = 0;
    let androidDownloads = 0;

    allInstalls.forEach(install => {
      // Filter by date range if specified
      if (dateRange.start && dateRange.end && install.timestamp) {
        let installDate: Date;
        if (typeof install.timestamp === 'object' && 'toDate' in install.timestamp) {
          installDate = (install.timestamp as any).toDate();
        } else if (typeof install.timestamp === 'string') {
          installDate = new Date(install.timestamp);
        } else {
          return; // Skip if timestamp format is unknown
        }

        // Check if install is within date range
        if (installDate < dateRange.start! || installDate > dateRange.end!) {
          return; // Skip this install
        }
      }

      // Count by platform
      if (install.platform === 'ios') {
        iosDownloads++;
      } else if (install.platform === 'android') {
        androidDownloads++;
      }
    });

    // Calculate average statistics
    let averageStats;
    if (babies.length > 0) {
      // Average tasks per baby
      const totalTasks = babies.reduce((sum, baby) => sum + (baby.tasks?.length || 0), 0);
      const avgTasksPerBaby = Math.round((totalTasks / babies.length) * 10) / 10;

      // Average parents per baby
      const totalParents = babies.reduce((sum, baby) => sum + (baby.user?.length || 0), 0);
      const avgParentsPerBaby = Math.round((totalParents / babies.length) * 10) / 10;

      // Most popular task type
      const taskTypeCounts: { [key: string]: number } = {
        'Biberon': 0,
        'Couche': 0,
        'Santé': 0,
        'Sommeil': 0,
        'Température': 0,
        'Allaitement': 0,
      };

      const taskTypeMap: { [key: string]: string } = {
        'biberon': 'Biberon',
        'couche': 'Couche',
        'Sante': 'Santé',
        'sommeil': 'Sommeil',
        'thermo': 'Température',
        'allaitement': 'Allaitement',
      };

      babies.forEach(baby => {
        baby.tasks?.forEach(task => {
          const typeName = taskTypeMap[task.labelTask] || 'Autre';
          if (taskTypeCounts[typeName] !== undefined) {
            taskTypeCounts[typeName]++;
          }
        });
      });

      let mostPopularTaskType = 'N/A';
      let mostPopularTaskCount = 0;
      Object.entries(taskTypeCounts).forEach(([type, count]) => {
        if (count > mostPopularTaskCount) {
          mostPopularTaskType = type;
          mostPopularTaskCount = count;
        }
      });

      // Average account lifetime (for deleted accounts)
      let avgAccountLifetime = 0;
      const deletedUsersWithDates = users.filter(u => u.deleted && u.creationDate && u.deletedAt);
      if (deletedUsersWithDates.length > 0) {
        const totalLifetime = deletedUsersWithDates.reduce((sum, user) => {
          const creationDate = typeof user.creationDate === 'string'
            ? new Date(user.creationDate)
            : (user.creationDate as any).toDate();
          const deletionDate = new Date(user.deletedAt!);
          const daysDiff = Math.floor((deletionDate.getTime() - creationDate.getTime()) / (1000 * 60 * 60 * 24));
          return sum + daysDiff;
        }, 0);
        avgAccountLifetime = Math.round(totalLifetime / deletedUsersWithDates.length);
      }

      averageStats = {
        avgTasksPerBaby,
        avgParentsPerBaby,
        mostPopularTaskType,
        mostPopularTaskCount,
        avgAccountLifetime,
      };
    }

    // Calculate global task distribution
    let taskDistribution;
    const globalTaskCounts = {
      biberon: 0,
      couche: 0,
      sante: 0,
      sommeil: 0,
      temperature: 0,
      allaitement: 0,
    };

    let globalTotalTasks = 0;
    babies.forEach(baby => {
      baby.tasks?.forEach(task => {
        globalTotalTasks++;
        const type = task.labelTask;
        if (type === 'biberon') globalTaskCounts.biberon++;
        else if (type === 'couche') globalTaskCounts.couche++;
        else if (type === 'Sante') globalTaskCounts.sante++;
        else if (type === 'sommeil') globalTaskCounts.sommeil++;
        else if (type === 'thermo') globalTaskCounts.temperature++;
        else if (type === 'allaitement') globalTaskCounts.allaitement++;
      });
    });

    if (globalTotalTasks > 0) {
      taskDistribution = {
        totalTasks: globalTotalTasks,
        biberon: {
          count: globalTaskCounts.biberon,
          percentage: Math.round((globalTaskCounts.biberon / globalTotalTasks) * 100),
        },
        couche: {
          count: globalTaskCounts.couche,
          percentage: Math.round((globalTaskCounts.couche / globalTotalTasks) * 100),
        },
        sante: {
          count: globalTaskCounts.sante,
          percentage: Math.round((globalTaskCounts.sante / globalTotalTasks) * 100),
        },
        sommeil: {
          count: globalTaskCounts.sommeil,
          percentage: Math.round((globalTaskCounts.sommeil / globalTotalTasks) * 100),
        },
        temperature: {
          count: globalTaskCounts.temperature,
          percentage: Math.round((globalTaskCounts.temperature / globalTotalTasks) * 100),
        },
        allaitement: {
          count: globalTaskCounts.allaitement,
          percentage: Math.round((globalTaskCounts.allaitement / globalTotalTasks) * 100),
        },
      };
    }

    // Calculate previous period metrics for trends (if date range is specified)
    let previousPeriod;
    if (dateRange.start && dateRange.end) {
      const duration = dateRange.end.getTime() - dateRange.start.getTime();
      const previousStart = new Date(dateRange.start.getTime() - duration);
      const previousEnd = new Date(dateRange.end.getTime() - duration);

      // Filter users for previous period
      const previousUsers = allUsers.filter(u => {
        if (!u.creationDate) return false;
        let userDate: Date;
        if (typeof u.creationDate === 'object' && 'toDate' in u.creationDate) {
          userDate = (u.creationDate as any).toDate();
        } else if (typeof u.creationDate === 'string') {
          userDate = new Date(u.creationDate);
        } else {
          return false;
        }
        return userDate >= previousStart && userDate <= previousEnd;
      });

      // Filter babies for previous period
      const previousBabies = allBabies.filter(b => {
        if (!b.CreatedDate) return false;
        const babyDate = new Date(b.CreatedDate);
        if (isNaN(babyDate.getTime())) return false;
        return babyDate >= previousStart && babyDate <= previousEnd;
      });

      // Calculate active babies for previous period (7 days before previousEnd)
      const previousSevenDaysAgo = new Date(previousEnd);
      previousSevenDaysAgo.setDate(previousSevenDaysAgo.getDate() - 7);
      let previousBabiesActive = 0;
      previousBabies.forEach(baby => {
        const hasRecentTask = baby.tasks?.some(task => {
          if (!task.date) return false;
          const taskDate = new Date(task.date);
          return !isNaN(taskDate.getTime()) && taskDate >= previousSevenDaysAgo && taskDate <= previousEnd;
        });
        if (hasRecentTask) previousBabiesActive++;
      });

      previousPeriod = {
        totalAccounts: previousUsers.length,
        totalBabies: previousBabies.length,
        babiesActiveRecently: previousBabiesActive,
      };
    }

    return {
      totalAccounts,
      totalBabies,
      accountsWithoutBaby,
      deletedAccounts,
      babiesWithMoreThan1Task,
      babiesWithMoreThan5Tasks,
      babiesWithMoreThan30Tasks,
      babiesWithMoreThan100Tasks,
      babiesWithMultipleParents,
      babiesActiveRecently,
      iosDownloads,
      androidDownloads,
      previousPeriod,
      averageStats,
      taskDistribution,
    };
  } catch (error) {
    console.error('Error fetching analytics:', error);
    throw new Error('Impossible de charger les métriques');
  }
};

/**
 * Get all users (for listing)
 */
export const getAllUsers = async (): Promise<User[]> => {
  const snapshot = await getDocs(usersRef);
  return snapshot.docs.map(doc => ({
    userId: doc.id,
    ...doc.data()
  } as User));
};

/**
 * Get all babies (for listing)
 */
export const getAllBabies = async (): Promise<Baby[]> => {
  const snapshot = await getDocs(babiesRef);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Baby));
};
