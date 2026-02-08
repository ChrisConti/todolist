import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { BabyStats, DateRange, Baby } from '../types';

/**
 * Search for a baby by ID and return detailed statistics
 */
export const searchBabyById = async (babyId: string, dateRange: DateRange): Promise<BabyStats> => {
  try {
    // Get baby document
    const babyDoc = await getDoc(doc(db, 'Baby', babyId));

    if (!babyDoc.exists()) {
      throw new Error('Bébé non trouvé');
    }

    const baby = {
      id: babyDoc.id,
      ...babyDoc.data(),
    } as Baby;

    // Filter tasks by date range if specified
    let tasks = baby.tasks || [];

    if (dateRange.start && dateRange.end) {
      tasks = tasks.filter((task) => {
        if (!task.date) return false;
        const taskDate = new Date(task.date);
        return taskDate >= dateRange.start! && taskDate <= dateRange.end!;
      });
    }

    // Calculate statistics
    const tasksByType = {
      bottles: { count: 0, totalMl: 0 },
      diapers: { count: 0, solid: 0, soft: 0, liquid: 0 },
      health: { count: 0 },
      sleep: { count: 0, totalHours: 0 },
      temperature: { count: 0, avgTemp: 0 },
      breastfeeding: { count: 0, totalHours: 0 },
    };

    let tempSum = 0;
    let tempCount = 0;

    tasks.forEach((task) => {
      // Use labelTask to determine type - look for keywords
      const labelLower = task.labelTask?.toLowerCase() || '';

      if (labelLower.includes('biberon') || labelLower.includes('bottle')) {
        // Type 0: Bottle
        tasksByType.bottles.count++;
        const ml = typeof task.label === 'number' ? task.label : parseInt(task.label as string) || 0;
        tasksByType.bottles.totalMl += ml;
      } else if (labelLower.includes('couche') || labelLower.includes('diaper')) {
        // Type 1: Diaper
        tasksByType.diapers.count++;
        const diaperType = task.diaperType ?? (typeof task.idCaca === 'number' ? task.idCaca : parseInt(task.idCaca as string));
        if (diaperType === 0) tasksByType.diapers.solid++;
        else if (diaperType === 1) tasksByType.diapers.soft++;
        else if (diaperType === 2) tasksByType.diapers.liquid++;
      } else if (labelLower.includes('sommeil') || labelLower.includes('sleep')) {
        // Type 3: Sleep
        tasksByType.sleep.count++;
        const duration = typeof task.label === 'number' ? task.label : parseInt(task.label as string) || 0;
        tasksByType.sleep.totalHours += duration;
      } else if (labelLower.includes('température') || labelLower.includes('temperature') || labelLower.includes('temp')) {
        // Type 4: Temperature
        tasksByType.temperature.count++;
        const temp = typeof task.label === 'number' ? task.label : parseFloat(task.label as string) || 0;
        if (temp > 0) {
          tempSum += temp;
          tempCount++;
        }
      } else if (labelLower.includes('allaitement') || labelLower.includes('breastfeeding') || labelLower.includes('breast')) {
        // Type 5: Breastfeeding
        tasksByType.breastfeeding.count++;
        const leftDuration = task.boobLeft || 0;
        const rightDuration = task.boobRight || 0;
        tasksByType.breastfeeding.totalHours += leftDuration + rightDuration;
      } else if (labelLower.includes('santé') || labelLower.includes('health')) {
        // Type 2: Health
        tasksByType.health.count++;
      }
    });

    // Calculate average temperature
    if (tempCount > 0) {
      tasksByType.temperature.avgTemp = tempSum / tempCount;
    }

    // Get parent emails
    const parentEmails: string[] = [];
    if (baby.user && Array.isArray(baby.user)) {
      for (const userId of baby.user) {
        try {
          const userDoc = await getDoc(doc(db, 'Users', userId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            if (userData.email) {
              parentEmails.push(userData.email);
            }
          }
        } catch (err) {
          console.error(`Error fetching user ${userId}:`, err);
        }
      }
    }

    // Add baby email if available
    if (baby.userEmail && !parentEmails.includes(baby.userEmail)) {
      parentEmails.push(baby.userEmail);
    }

    return {
      baby,
      totalTasks: tasks.length,
      tasksByType,
      parentEmails,
    };
  } catch (error: any) {
    console.error('Error searching baby:', error);
    throw new Error(error.message || 'Erreur lors de la recherche');
  }
};
