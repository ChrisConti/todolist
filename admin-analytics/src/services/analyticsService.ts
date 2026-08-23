import { getDocsFromServer } from 'firebase/firestore';
import { usersRef, babiesRef, appInstallsRef } from '../config/firebase';
import type { AnalyticsMetrics, DateRange, User, Baby } from '../types';
import { parseBabyDate } from '../types';

// Test accounts to exclude from all stats
const TEST_EMAILS = new Set([
  'android@android.com',
  'test@apple.com',
]);

interface AppInstall {
  platform: string;
  timestamp: any;
  version?: any;
}

// Premium "achat réel" : isPremium: true ET compte créé après le bulk grant early adopter
export const PREMIUM_BULK_GRANT_CUTOFF = new Date('2026-06-10');

export const getUserCreationDate = (u: User): Date | null => {
  if (!u.creationDate) return null;
  if (typeof u.creationDate === 'object' && 'toDate' in u.creationDate) return (u.creationDate as any).toDate();
  if (typeof u.creationDate === 'string') { const d = new Date(u.creationDate); return isNaN(d.getTime()) ? null : d; }
  return null;
};

export const isRealPremiumPurchase = (u: User): boolean => {
  if (u.isPremium !== true) return false;
  const d = getUserCreationDate(u);
  return d !== null && d >= PREMIUM_BULK_GRANT_CUTOFF;
};

/**
 * Get analytics metrics for a given date range
 */
export const getAnalyticsMetrics = async (dateRange: DateRange, searchTerm?: string): Promise<AnalyticsMetrics> => {
  try {
    console.log('🔄 [DEBUG] Fetching data from Firestore at:', new Date().toISOString());

    // ALWAYS fetch all data (date filtering done client-side to support both old string and new Timestamp formats)
    // Use getDocsFromServer to bypass cache and get fresh data after deletions
    const usersSnapshot = await getDocsFromServer(usersRef);
    const babiesSnapshot = await getDocsFromServer(babiesRef);

    const allUsersRaw: User[] = usersSnapshot.docs.map(doc => ({
      userId: doc.id,
      ...doc.data()
    } as User));

    const allBabiesRaw: Baby[] = babiesSnapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    } as Baby));

    // Exclude test accounts and their babies from all stats
    const testUserIds = new Set(allUsersRaw.filter(u => TEST_EMAILS.has(u.email)).map(u => u.userId));
    const allUsers = allUsersRaw.filter(u => !TEST_EMAILS.has(u.email));
    const allBabies = allBabiesRaw.filter(b =>
      !b.admin || !testUserIds.has(b.admin)
    );

    console.log('📊 [DEBUG] Fetched from Firestore:', {
      usersCount: allUsers.length,
      babiesCount: allBabies.length,
      babyIds: allBabies.map(b => ({ id: b.id, name: b.name }))
    });

    // Fetch installs (may not exist yet)
    let allInstalls: AppInstall[] = [];
    try {
      const installsSnapshot = await getDocsFromServer(appInstallsRef);
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

      babies = allBabies.filter(b => {
        const babyDate = parseBabyDate(b);
        if (!babyDate) return false;
        return babyDate >= dateRange.start! && babyDate <= dateRange.end!;
      });
    }

    // Filter by baby name if search term is provided
    if (searchTerm && searchTerm.trim() !== '') {
      const lowerSearchTerm = searchTerm.toLowerCase().trim();
      babies = babies.filter(b =>
        b.name && b.name.toLowerCase().includes(lowerSearchTerm)
      );
      console.log('🔍 [DEBUG] After search filter:', babies.length, 'babies (search:', searchTerm, ')');
    }

    // Calculate metrics
    const totalAccounts = users.length;
    const totalBabies = babies.length;

    console.log('📈 [DEBUG] Final metrics:', { totalAccounts, totalBabies });

    // Get user IDs who have a baby — use ALL babies regardless of date filter
    const userIdsWithBabies = new Set<string>();
    allBabies.forEach(baby => {
      if (baby.user && Array.isArray(baby.user)) {
        baby.user.forEach(uid => userIdsWithBabies.add(uid));
      }
    });

    const accountsWithoutBaby = users.filter(u => !userIdsWithBabies.has(u.userId)).length;

    // Users in period who have a baby but are NOT admin of a baby created in the period
    // (includes co-parents of new babies + users who joined older babies)
    let joinedExistingBaby = 0;
    if (dateRange.start && dateRange.end) {
      const babiesInPeriodAdminIds = new Set(
        babies.map(b => b.admin).filter(Boolean)
      );
      joinedExistingBaby = users.filter(u => {
        if (babiesInPeriodAdminIds.has(u.userId)) return false; // created a baby in period
        return userIdsWithBabies.has(u.userId); // but has a baby
      }).length;
    }

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

    // Email opt-in & provider breakdown
    const emailOptInCount = users.filter(u => u.emailOptIn === true).length;
    const providerGoogleCount = users.filter(u => u.provider === 'google').length;
    const providerAppleCount = users.filter(u => u.provider === 'apple').length;
    const providerEmailCount = users.filter(u => !u.provider || u.provider === 'email').length;

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

    // Calculate task distribution by baby age
    let taskDistributionByAge;
    const ageRanges = {
      '0-1 mois': { min: 0, max: 30, totalTasks: 0, babyIds: new Set<string>(), biberon: 0, couche: 0, sante: 0, sommeil: 0, temperature: 0, allaitement: 0 },
      '1-3 mois': { min: 31, max: 90, totalTasks: 0, babyIds: new Set<string>(), biberon: 0, couche: 0, sante: 0, sommeil: 0, temperature: 0, allaitement: 0 },
      '3-6 mois': { min: 91, max: 180, totalTasks: 0, babyIds: new Set<string>(), biberon: 0, couche: 0, sante: 0, sommeil: 0, temperature: 0, allaitement: 0 },
      '6-12 mois': { min: 181, max: 365, totalTasks: 0, babyIds: new Set<string>(), biberon: 0, couche: 0, sante: 0, sommeil: 0, temperature: 0, allaitement: 0 },
      '12-18 mois': { min: 366, max: 545, totalTasks: 0, babyIds: new Set<string>(), biberon: 0, couche: 0, sante: 0, sommeil: 0, temperature: 0, allaitement: 0 },
      '18+ mois': { min: 546, max: Infinity, totalTasks: 0, babyIds: new Set<string>(), biberon: 0, couche: 0, sante: 0, sommeil: 0, temperature: 0, allaitement: 0 },
    };

    babies.forEach(baby => {
      if (!baby.birthDate || !baby.tasks) return;

      // Parse birth date (can be DD/MM/YYYY or ISO format)
      let birthDate: Date;
      if (baby.birthDate.includes('/')) {
        const [day, month, year] = baby.birthDate.split('/').map(Number);
        birthDate = new Date(year, month - 1, day);
      } else {
        birthDate = new Date(baby.birthDate);
      }

      if (isNaN(birthDate.getTime())) return;

      baby.tasks.forEach(task => {
        if (!task.date) return;

        const taskDate = new Date(task.date);
        if (isNaN(taskDate.getTime())) return;

        // Calculate age in days at the time of the task
        const ageInDays = Math.floor((taskDate.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24));
        if (ageInDays < 0) return; // Skip tasks before birth

        // Find the age range
        for (const [, range] of Object.entries(ageRanges)) {
          if (ageInDays >= range.min && ageInDays <= range.max) {
            range.totalTasks++;
            range.babyIds.add(baby.id); // Track unique babies
            const type = task.labelTask;
            if (type === 'biberon') range.biberon++;
            else if (type === 'couche') range.couche++;
            else if (type === 'Sante') range.sante++;
            else if (type === 'sommeil') range.sommeil++;
            else if (type === 'thermo') range.temperature++;
            else if (type === 'allaitement') range.allaitement++;
            break;
          }
        }
      });
    });

    // Convert to percentage format
    const ranges: { [key: string]: any } = {};
    Object.entries(ageRanges).forEach(([rangeName, data]) => {
      if (data.totalTasks > 0) {
        ranges[rangeName] = {
          totalTasks: data.totalTasks,
          babyCount: data.babyIds.size,
          biberon: data.biberon,
          couche: data.couche,
          sante: data.sante,
          sommeil: data.sommeil,
          temperature: data.temperature,
          allaitement: data.allaitement,
        };
      }
    });

    if (Object.keys(ranges).length > 0) {
      taskDistributionByAge = {
        totalBabies: babies.length,
        ranges,
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

      const previousBabies = allBabies.filter(b => {
        const babyDate = parseBabyDate(b);
        if (!babyDate) return false;
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

    // Premium stats — always computed on allUsers (not date-filtered)
    // Only counts isPremium: true explicitly set (excludes early-adopter bulk grant, see isRealPremiumPurchase)
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart.getTime() - 86400000);
    const sevenDaysStart = new Date(todayStart.getTime() - 6 * 86400000);

    const getUserDate = getUserCreationDate;
    const isRealPurchase = isRealPremiumPurchase;

    const premiumStats = {
      total: allUsers.filter(isRealPurchase).length,
      today: allUsers.filter(u => { const d = getUserDate(u); return d && d >= todayStart && isRealPurchase(u); }).length,
      yesterday: allUsers.filter(u => { const d = getUserDate(u); return d && d >= yesterdayStart && d < todayStart && isRealPurchase(u); }).length,
      last7Days: allUsers.filter(u => { const d = getUserDate(u); return d && d >= sevenDaysStart && isRealPurchase(u); }).length,
    };

    // Role distribution — aggregate across all baby.memberRoles
    const roleDistribution: Record<string, number> = {};
    babies.forEach(baby => {
      if (!baby.memberRoles) return;
      Object.values(baby.memberRoles).forEach(role => {
        if (role) roleDistribution[role] = (roleDistribution[role] || 0) + 1;
      });
    });

    // Age range distribution — from User.parentAgeRange
    const ageRangeDistribution: Record<string, number> = {};
    allUsers.forEach(u => {
      if (u.parentAgeRange) {
        ageRangeDistribution[u.parentAgeRange] = (ageRangeDistribution[u.parentAgeRange] || 0) + 1;
      }
    });

    // First child count — true entries across all baby.firstChildFor
    let firstChildCount = 0;
    babies.forEach(baby => {
      if (!baby.firstChildFor) return;
      Object.values(baby.firstChildFor).forEach(val => {
        if (val === true) firstChildCount++;
      });
    });

    // Retention: computed from last task date in tasks[] — works for all babies including historical ones
    let retentionByAge: AnalyticsMetrics['retentionByAge'];
    const RETENTION_THRESHOLDS = [1, 3, 7, 15, 20, 25, 30, 45, 60, 75, 90];
    const retentionCounts: Record<number, number> = {};
    RETENTION_THRESHOLDS.forEach(t => { retentionCounts[t] = 0; });
    let totalWithDate = 0;
    babies.forEach(baby => {
      const createdAt = parseBabyDate(baby);
      if (!createdAt || !baby.tasks?.length) return;
      const lastTaskTime = Math.max(...baby.tasks.map(t => {
        const d = new Date(t.date);
        return isNaN(d.getTime()) ? 0 : d.getTime();
      }));
      if (!lastTaskTime) return;
      totalWithDate++;
      const daysActive = Math.floor((lastTaskTime - createdAt.getTime()) / (1000 * 60 * 60 * 24));
      RETENTION_THRESHOLDS.forEach(t => { if (daysActive >= t) retentionCounts[t]++; });
    });
    if (totalWithDate > 0) {
      retentionByAge = {
        d1: retentionCounts[1], d3: retentionCounts[3], d7: retentionCounts[7],
        d15: retentionCounts[15], d20: retentionCounts[20], d25: retentionCounts[25],
        d30: retentionCounts[30], d45: retentionCounts[45], d60: retentionCounts[60],
        d75: retentionCounts[75], d90: retentionCounts[90], totalWithDate,
      };
    }

    // Dropout analysis
    const TASK_LABEL: Record<string, string> = {
      biberon: 'Biberon', couche: 'Couche', Sante: 'Santé',
      sommeil: 'Sommeil', thermo: 'Température', allaitement: 'Allaitement',
    };

    // Build userId → creationDate map for delay calculations
    const userCreationMap = new Map<string, Date>();
    allUsers.forEach(u => {
      if (!u.creationDate) return;
      const d = typeof u.creationDate === 'object' && 'toDate' in u.creationDate
        ? (u.creationDate as any).toDate()
        : new Date(u.creationDate);
      if (!isNaN(d.getTime())) userCreationMap.set(u.userId, d);
    });

    let exactly0Tasks = 0, exactly1Task = 0, tasks2to5 = 0;
    const firstTaskTypeFor1Task: Record<string, number> = {};
    let totalAccToBaby = 0, countAccToBaby = 0, minAccToBaby = Infinity, maxAccToBaby = 0;
    let totalAccToFirst = 0, countAccToFirst = 0, minAccToFirst = Infinity, maxAccToFirst = 0;
    let totalBabyToFirst = 0, countBabyToFirst = 0, minBabyToFirst = Infinity, maxBabyToFirst = 0;
    let totalDaysActive2to5 = 0, countDaysActive2to5 = 0;
    let totalBabyAgeAtLast = 0, countBabyAgeAtLast = 0;
    const activeDurationBuckets = { under7: 0, d7to30: 0, d30to90: 0, over90: 0 };
    const babyAgeAtLastTaskBuckets = { under30: 0, d30to90: 0, d90to180: 0, d180to365: 0, over365: 0 };

    babies.forEach(baby => {
      const taskCount = baby.tasks?.length || 0;

      if (taskCount === 0) { exactly0Tasks++; return; }

      // Sort tasks by date ascending
      const sorted = [...(baby.tasks || [])].sort((a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      const firstTaskDate = new Date(sorted[0].date);
      const lastTaskDate = new Date(sorted[sorted.length - 1].date);
      if (isNaN(firstTaskDate.getTime()) || isNaN(lastTaskDate.getTime())) return;

      const babyCreatedAt = parseBabyDate(baby);
      const adminCreatedAt = baby.admin ? userCreationMap.get(baby.admin) : undefined;

      // Delay: account creation → baby creation
      if (adminCreatedAt && babyCreatedAt) {
        const delay = Math.max(0, Math.floor((babyCreatedAt.getTime() - adminCreatedAt.getTime()) / 86400000));
        totalAccToBaby += delay; countAccToBaby++;
        if (delay < minAccToBaby) minAccToBaby = delay;
        if (delay > maxAccToBaby) maxAccToBaby = delay;
      }

      // Delay: account creation → first task
      if (adminCreatedAt && !isNaN(firstTaskDate.getTime())) {
        const delay = Math.max(0, Math.floor((firstTaskDate.getTime() - adminCreatedAt.getTime()) / 86400000));
        totalAccToFirst += delay; countAccToFirst++;
        if (delay < minAccToFirst) minAccToFirst = delay;
        if (delay > maxAccToFirst) maxAccToFirst = delay;
      }

      // Delay: baby creation → first task
      if (babyCreatedAt && !isNaN(firstTaskDate.getTime())) {
        const delay = Math.max(0, Math.floor((firstTaskDate.getTime() - babyCreatedAt.getTime()) / 86400000));
        totalBabyToFirst += delay; countBabyToFirst++;
        if (delay < minBabyToFirst) minBabyToFirst = delay;
        if (delay > maxBabyToFirst) maxBabyToFirst = delay;
      }

      // Baby age at last task (from birthDate)
      if (baby.birthDate) {
        let birthDate: Date;
        if (baby.birthDate.includes('/')) {
          const [d, m, y] = baby.birthDate.split('/').map(Number);
          birthDate = new Date(y, m - 1, d);
        } else {
          birthDate = new Date(baby.birthDate);
        }
        if (!isNaN(birthDate.getTime())) {
          const ageAtLast = Math.floor((lastTaskDate.getTime() - birthDate.getTime()) / 86400000);
          if (ageAtLast >= 0) {
            totalBabyAgeAtLast += ageAtLast;
            countBabyAgeAtLast++;
            if (ageAtLast < 30) babyAgeAtLastTaskBuckets.under30++;
            else if (ageAtLast < 90) babyAgeAtLastTaskBuckets.d30to90++;
            else if (ageAtLast < 180) babyAgeAtLastTaskBuckets.d90to180++;
            else if (ageAtLast < 365) babyAgeAtLastTaskBuckets.d180to365++;
            else babyAgeAtLastTaskBuckets.over365++;
          }
        }
      }

      if (taskCount === 1) {
        exactly1Task++;
        const label = TASK_LABEL[sorted[0].labelTask] || sorted[0].labelTask;
        firstTaskTypeFor1Task[label] = (firstTaskTypeFor1Task[label] || 0) + 1;
      } else if (taskCount <= 5) {
        tasks2to5++;
        const daysActive = Math.floor((lastTaskDate.getTime() - firstTaskDate.getTime()) / 86400000);
        totalDaysActive2to5 += daysActive;
        countDaysActive2to5++;
      }

      // Active duration buckets (all babies with ≥2 tasks)
      if (taskCount >= 2) {
        const daysActive = Math.floor((lastTaskDate.getTime() - firstTaskDate.getTime()) / 86400000);
        if (daysActive < 7) activeDurationBuckets.under7++;
        else if (daysActive < 30) activeDurationBuckets.d7to30++;
        else if (daysActive < 90) activeDurationBuckets.d30to90++;
        else activeDurationBuckets.over90++;
      }
    });

    const dropoutAnalysis = babies.length > 0 ? {
      exactly0Tasks,
      exactly1Task,
      tasks2to5,
      firstTaskTypeFor1Task,
      avgDaysAccountToBaby: countAccToBaby > 0 ? Math.round(totalAccToBaby / countAccToBaby) : 0,
      minDaysAccountToBaby: countAccToBaby > 0 ? minAccToBaby : 0,
      maxDaysAccountToBaby: countAccToBaby > 0 ? maxAccToBaby : 0,
      avgDaysAccountToFirstTask: countAccToFirst > 0 ? Math.round(totalAccToFirst / countAccToFirst) : 0,
      minDaysAccountToFirstTask: countAccToFirst > 0 ? minAccToFirst : 0,
      maxDaysAccountToFirstTask: countAccToFirst > 0 ? maxAccToFirst : 0,
      avgDaysBabyToFirstTask: countBabyToFirst > 0 ? Math.round(totalBabyToFirst / countBabyToFirst) : 0,
      minDaysBabyToFirstTask: countBabyToFirst > 0 ? minBabyToFirst : 0,
      maxDaysBabyToFirstTask: countBabyToFirst > 0 ? maxBabyToFirst : 0,
      avgDaysActiveFor2to5: countDaysActive2to5 > 0 ? Math.round(totalDaysActive2to5 / countDaysActive2to5) : 0,
      avgBabyAgeAtLastTaskDays: countBabyAgeAtLast > 0 ? Math.round(totalBabyAgeAtLast / countBabyAgeAtLast) : 0,
      activeDurationBuckets,
      babyAgeAtLastTaskBuckets,
    } : undefined;

    // milkType breakdown — separate for biberon and allaitement
    const biberonMilkDist = { artificial: 0, maternal: 0, unknown: 0 };
    const allaitementTimer = { timer: 0, manual: 0 };
    babies.forEach(baby => {
      baby.tasks?.forEach(task => {
        if (task.labelTask === 'biberon') {
          if (task.milkType === 'artificial') biberonMilkDist.artificial++;
          else if (task.milkType === 'maternal') biberonMilkDist.maternal++;
          else biberonMilkDist.unknown++;
        } else if (task.labelTask === 'allaitement') {
          const hasTimer = (task.boobLeft && task.boobLeft > 0) || (task.boobRight && task.boobRight > 0);
          if (hasTimer) allaitementTimer.timer++;
          else allaitementTimer.manual++;
        }
      });
    });
    const biberonMilkType = (biberonMilkDist.artificial + biberonMilkDist.maternal + biberonMilkDist.unknown) > 0
      ? biberonMilkDist : undefined;
    const allaitementTimerType = (allaitementTimer.timer + allaitementTimer.manual) > 0
      ? allaitementTimer : undefined;

    // diaperContent distribution
    const diaperDist = { pee: 0, poop: 0, both: 0 };
    babies.forEach(baby => {
      baby.tasks?.forEach(task => {
        if (task.labelTask === 'couche') {
          if (task.diaperContent === 0) diaperDist.pee++;
          else if (task.diaperContent === 1) diaperDist.poop++;
          else if (task.diaperContent === 2) diaperDist.both++;
        }
      });
    });
    const diaperContentDistribution = (diaperDist.pee + diaperDist.poop + diaperDist.both) > 0
      ? diaperDist : undefined;

    // User funnel: what users do after account creation
    // A user either created a baby (admin), joined one (member but not admin), or did nothing.
    // Multi-baby is not allowed by the app, so each user maps to exactly one category.
    const babyAdminSet = new Set<string>();
    const babyMemberSet = new Set<string>(); // in user[] but not admin
    allBabies.forEach(baby => {
      if (baby.admin) babyAdminSet.add(baby.admin);
      baby.user?.forEach(uid => {
        if (uid !== baby.admin) babyMemberSet.add(uid);
      });
    });

    let funnelCreated = 0, funnelJoined = 0, funnelNoBaby = 0;
    allUsers.forEach(u => {
      if (babyAdminSet.has(u.userId)) funnelCreated++;
      else if (babyMemberSet.has(u.userId)) funnelJoined++;
      else funnelNoBaby++;
    });
    const userFunnel = allUsers.length > 0 ? {
      createdBaby: funnelCreated,
      joinedBaby: funnelJoined,
      noBaby: funnelNoBaby,
      total: allUsers.length,
    } : undefined;

    return {
      totalAccounts,
      totalBabies,
      accountsWithoutBaby,
      joinedExistingBaby,
      deletedAccounts,
      babiesWithMoreThan1Task,
      babiesWithMoreThan5Tasks,
      babiesWithMoreThan30Tasks,
      babiesWithMoreThan100Tasks,
      babiesWithMultipleParents,
      babiesActiveRecently,
      iosDownloads,
      androidDownloads,
      emailOptInCount,
      providerGoogleCount,
      providerAppleCount,
      providerEmailCount,
      previousPeriod,
      averageStats,
      taskDistribution,
      taskDistributionByAge,
      dropoutAnalysis,
      roleDistribution: Object.keys(roleDistribution).length > 0 ? roleDistribution : undefined,
      ageRangeDistribution: Object.keys(ageRangeDistribution).length > 0 ? ageRangeDistribution : undefined,
      firstChildCount,
      retentionByAge,
      premiumStats,
      biberonMilkType,
      allaitementTimerType,
      diaperContentDistribution,
      userFunnel,
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
  const snapshot = await getDocsFromServer(usersRef);
  return snapshot.docs
    .map(doc => ({ userId: doc.id, ...doc.data() } as User))
    .filter(u => !TEST_EMAILS.has(u.email));
};

/**
 * Get all babies (for listing)
 */
export const getAllBabies = async (searchTerm?: string): Promise<Baby[]> => {
  const usersSnap = await getDocsFromServer(usersRef);
  const testIds = new Set(
    usersSnap.docs
      .map(doc => ({ userId: doc.id, ...doc.data() } as User))
      .filter(u => TEST_EMAILS.has(u.email))
      .map(u => u.userId)
  );

  const snapshot = await getDocsFromServer(babiesRef);
  let babies = snapshot.docs
    .map(doc => ({ ...doc.data(), id: doc.id } as Baby))
    .filter(b => !b.admin || !testIds.has(b.admin));

  // Filter by baby name if search term is provided
  if (searchTerm && searchTerm.trim() !== '') {
    const lowerSearchTerm = searchTerm.toLowerCase().trim();
    babies = babies.filter(b =>
      b.name && b.name.toLowerCase().includes(lowerSearchTerm)
    );
  }

  return babies;
};
