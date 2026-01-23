import { Share, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import moment from 'moment';

interface Task {
  uid?: string;
  id: number;
  labelTask?: string;
  date: string;
  label?: string | number;
  /** @deprecated Use diaperType instead. Kept for backward compatibility. */
  idCaca?: number;
  /** Type of diaper: 0 = solid, 1 = soft, 2 = liquid */
  diaperType?: number;
  boobLeft?: number;
  boobRight?: number;
  user?: string;
  createdBy?: string;
  comment?: string;
}

interface ExportOptions {
  startDate?: Date;
  endDate?: Date;
  babyName: string;
  tasks: Task[];
}

// Convert task type ID to label
const getTaskLabel = (taskId: number): string => {
  const taskLabels: { [key: number]: string } = {
    0: 'Allaitement',
    1: 'Biberon',
    2: 'Couche',
    3: 'Sommeil',
    4: 'Santé',
    5: 'Thermomètre',
  };
  return taskLabels[taskId] || 'Autre';
};

// Convert diaper type ID to label
const getDiaperLabel = (id: number): string => {
  const diaperLabels: { [key: number]: string } = {
    0: 'Dur',
    1: 'Mou',
    2: 'Liquide',
  };
  return diaperLabels[id] || '';
};

// Format duration in minutes
const formatDuration = (seconds: number): string => {
  if (!seconds) return '';
  const minutes = Math.floor(seconds / 60);
  return `${minutes} min`;
};

// Generate CSV content from tasks
export const generateCSV = (options: ExportOptions): string => {
  const { tasks, babyName, startDate, endDate } = options;

  // Filter tasks by date range if provided
  let filteredTasks = tasks;
  if (startDate || endDate) {
    filteredTasks = tasks.filter((task) => {
      const taskDate = new Date(task.date);
      if (startDate && taskDate < startDate) return false;
      if (endDate && taskDate > endDate) return false;
      return true;
    });
  }

  // Sort tasks by date (newest first)
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  // CSV Header
  const headers = [
    'Date',
    'Heure',
    'Type',
    'Détails',
    'Sein Gauche',
    'Sein Droit',
    'Créé par',
    'Commentaire',
  ];

  // Build CSV rows
  const rows = sortedTasks.map((task) => {
    const date = moment(task.date).format('DD/MM/YYYY');
    const time = moment(task.date).format('HH:mm');
    const type = task.labelTask || getTaskLabel(task.id);
    
    let details = '';
    // Support both new diaperType and legacy idCaca for backward compatibility
    const diaperType = task.diaperType ?? task.idCaca;
    if (task.id === 2 && diaperType !== undefined) {
      // Diaper task
      details = getDiaperLabel(diaperType);
    } else if (task.label) {
      details = String(task.label);
    }

    const leftBoob = task.boobLeft ? formatDuration(task.boobLeft) : '';
    const rightBoob = task.boobRight ? formatDuration(task.boobRight) : '';
    const createdBy = task.createdBy || '';
    const comment = task.comment ? `"${task.comment.replace(/"/g, '""')}"` : '';

    return [date, time, type, details, leftBoob, rightBoob, createdBy, comment];
  });

  // Combine header and rows
  const csvContent = [
    `Exportation des tâches - ${babyName}`,
    `Période: ${startDate ? moment(startDate).format('DD/MM/YYYY') : 'Début'} - ${endDate ? moment(endDate).format('DD/MM/YYYY') : "Aujourd'hui"}`,
    `Total: ${sortedTasks.length} tâches`,
    '',
    headers.join(','),
    ...rows.map((row) => row.join(',')),
  ].join('\n');

  return csvContent;
};

// Export tasks to CSV file and share
export const exportTasksToCSV = async (options: ExportOptions): Promise<void> => {
  try {
    const csvContent = generateCSV(options);
    const fileName = `tribubaby_export_${moment().format('YYYY-MM-DD_HHmm')}.csv`;
    
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      // Mobile: Save to file system and share
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      
      // Write CSV content to file with UTF-8 BOM for Excel compatibility
      const utf8BOM = '\uFEFF';
      await FileSystem.writeAsStringAsync(fileUri, utf8BOM + csvContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      // Check if sharing is available
      const isAvailable = await Sharing.isAvailableAsync();
      
      if (isAvailable) {
        // Share the file
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Exporter les tâches',
          UTI: 'public.comma-separated-values-text',
        });
      } else {
        throw new Error('Le partage de fichiers n\'est pas disponible sur cet appareil');
      }
    } else {
      // Web fallback: trigger download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  } catch (error) {
    console.error('Error exporting tasks:', error);
    throw error;
  }
};

// Get date range presets
export const getDateRangePresets = () => {
  const today = new Date();
  
  return {
    last7Days: {
      label: '7 derniers jours',
      startDate: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000),
      endDate: today,
    },
    last30Days: {
      label: '30 derniers jours',
      startDate: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000),
      endDate: today,
    },
    last3Months: {
      label: '3 derniers mois',
      startDate: new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000),
      endDate: today,
    },
    thisMonth: {
      label: 'Ce mois',
      startDate: new Date(today.getFullYear(), today.getMonth(), 1),
      endDate: today,
    },
    lastMonth: {
      label: 'Mois dernier',
      startDate: new Date(today.getFullYear(), today.getMonth() - 1, 1),
      endDate: new Date(today.getFullYear(), today.getMonth(), 0),
    },
    all: {
      label: 'Toutes les tâches',
      startDate: undefined,
      endDate: undefined,
    },
  };
};
