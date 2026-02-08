import { getDocs } from 'firebase/firestore';
import { usersRef, babiesRef } from '../config/firebase';
import type { DateRange, User, Baby } from '../types';
import * as XLSX from 'xlsx';

interface ExportOptions {
  dateRange: DateRange;
  includeUsers: boolean;
  includeBabies: boolean;
  includeTasks: boolean;
}

const DIAPER_TYPE_LABELS: Record<number, string> = {
  0: 'Solide',
  1: 'Molle',
  2: 'Liquide',
};

/**
 * Export data to Excel file
 */
export const exportToExcel = async (options: ExportOptions): Promise<void> => {
  const { dateRange, includeUsers, includeBabies, includeTasks } = options;

  try {
    // Create workbook
    const workbook = XLSX.utils.book_new();

    // ALWAYS fetch all data (dates are strings, not Timestamps)
    const usersSnapshot = await getDocs(usersRef);
    const babiesSnapshot = await getDocs(babiesRef);

    // Export Users
    if (includeUsers) {
      let usersData = usersSnapshot.docs.map(doc => doc.data() as User & { id: string });
      usersData = usersData.map((data, index) => ({ ...data, id: usersSnapshot.docs[index].id }));

      // Filter by date if specified
      if (dateRange.start && dateRange.end) {
        usersData = usersData.filter(data => {
          if (!data.creationDate) return false;

          let userDate: Date;
          if (typeof data.creationDate === 'object' && 'toDate' in data.creationDate) {
            userDate = (data.creationDate as any).toDate();
          } else if (typeof data.creationDate === 'string') {
            userDate = new Date(data.creationDate);
          } else {
            return false;
          }

          return userDate >= dateRange.start! && userDate <= dateRange.end!;
        });
      }

      const users = usersData.map((data) => ({
        'User ID': data.id,
        'Email': data.email || '',
        'Username': data.username || '',
        'Date de création': data.creationDate
          ? (typeof data.creationDate === 'string'
            ? data.creationDate
            : (data.creationDate as any).toDate?.().toLocaleDateString('fr-FR'))
          : '',
      }));

      if (users.length > 0) {
        const usersSheet = XLSX.utils.json_to_sheet(users);
        XLSX.utils.book_append_sheet(workbook, usersSheet, 'Utilisateurs');
      }
    }

    // Export Babies
    if (includeBabies) {
      let babiesData = babiesSnapshot.docs.map(doc => doc.data() as Baby & { docId: string });
      babiesData = babiesData.map((data, index) => ({ ...data, docId: babiesSnapshot.docs[index].id }));

      // Filter by date if specified
      if (dateRange.start && dateRange.end) {
        babiesData = babiesData.filter(data => {
          if (!data.CreatedDate) return false;
          const babyDate = new Date(data.CreatedDate);
          return babyDate >= dateRange.start! && babyDate <= dateRange.end!;
        });
      }

      const babies = babiesData.map((data) => ({
        'Baby ID': data.docId,
        'Nom': data.name || '',
        'Date de création': data.CreatedDate || '',
        'Nombre de tâches': data.tasks?.length || 0,
        'Parents (IDs)': data.user?.join(', ') || '',
        'Email': data.userEmail || '',
      }));

      if (babies.length > 0) {
        const babiesSheet = XLSX.utils.json_to_sheet(babies);
        XLSX.utils.book_append_sheet(workbook, babiesSheet, 'Bébés');
      }

      // Export Tasks if requested
      if (includeTasks) {
        const allTasks: any[] = [];

        babiesData.forEach((baby) => {
          const tasks = baby.tasks || [];

          tasks.forEach((task) => {
            // Filter tasks by date range if specified
            if (dateRange.start && dateRange.end && task.date) {
              const taskDate = new Date(task.date);
              if (taskDate < dateRange.start || taskDate > dateRange.end) {
                return; // Skip this task
              }
            }

            allTasks.push({
              'Baby ID': baby.docId,
              'Nom du bébé': baby.name || '',
              'Type': task.labelTask || 'Inconnu',
              'Date': task.date || '',
              'Valeur': task.label || '',
              'Type de couche': task.diaperType !== undefined ? DIAPER_TYPE_LABELS[task.diaperType] || '' : '',
              'Sein gauche (min)': task.boobLeft || '',
              'Sein droit (min)': task.boobRight || '',
              'Commentaire': task.comment || '',
            });
          });
        });

        if (allTasks.length > 0) {
          const tasksSheet = XLSX.utils.json_to_sheet(allTasks);
          XLSX.utils.book_append_sheet(workbook, tasksSheet, 'Tâches');
        }
      }
    }

    // Check if workbook has any sheets
    if (workbook.SheetNames.length === 0) {
      throw new Error('Aucune donnée à exporter pour la période sélectionnée');
    }

    // Generate filename
    const today = new Date().toISOString().split('T')[0];
    let filename = `tribubaby-export-${today}`;

    if (dateRange.start && dateRange.end) {
      const startDate = dateRange.start.toISOString().split('T')[0];
      const endDate = dateRange.end.toISOString().split('T')[0];
      filename = `tribubaby-export-${startDate}-to-${endDate}`;
    } else {
      filename = `tribubaby-export-all-${today}`;
    }

    // Write and download file
    XLSX.writeFile(workbook, `${filename}.xlsx`);
  } catch (error: any) {
    console.error('Export error:', error);
    throw new Error(error.message || 'Erreur lors de l\'export');
  }
};
