import { Share, Platform } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import moment from 'moment';
import i18next from 'i18next';

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
  /** Content of diaper: 0 = pee, 1 = poop, 2 = both */
  diaperContent?: number;
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
  language?: string;
}

// Convert task type ID to label (with i18n)
const getTaskLabel = (taskId: number, t: any): string => {
  const taskMap: { [key: number]: string } = {
    0: t('export.taskTypes.bottle'),
    1: t('export.taskTypes.diaper'),
    2: t('export.taskTypes.health'),
    3: t('export.taskTypes.sleep'),
    4: t('export.taskTypes.temperature'),
    5: t('export.taskTypes.breastfeeding'),
  };
  return taskMap[taskId] || 'Autre';
};

// Convert diaper type ID to label (with i18n)
const getDiaperTypeLabel = (id: number, t: any): string => {
  const diaperMap: { [key: number]: string } = {
    0: t('export.diaperType.solid'),
    1: t('export.diaperType.soft'),
    2: t('export.diaperType.liquid'),
  };
  return diaperMap[id] || '';
};

// Convert diaper content ID to label (with i18n)
const getDiaperContentLabel = (id: number, t: any): string => {
  const contentMap: { [key: number]: string } = {
    0: t('export.diaperContent.pee'),
    1: t('export.diaperContent.poop'),
    2: t('export.diaperContent.both'),
  };
  return contentMap[id] || '';
};

// Format duration (seconds to minutes or hours)
const formatDuration = (seconds: number, language: string = 'fr'): string => {
  if (!seconds) return '';
  const minutes = Math.floor(seconds / 60);
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (language === 'en') {
      return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
    } else if (language === 'es') {
      return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
    } else {
      return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
    }
  }
  return `${minutes} min`;
};

// Generate CSV content from tasks
export const generateCSV = (options: ExportOptions & { maxTasks?: number }): string => {
  const { tasks, babyName, startDate, endDate, language = 'fr', maxTasks } = options;

  // Get translation function
  const t = i18next.getFixedT(language);

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
  let sortedTasks = [...filteredTasks].sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  // Limit to maxTasks if specified
  if (maxTasks && sortedTasks.length > maxTasks) {
    sortedTasks = sortedTasks.slice(0, maxTasks);
  }

  // CSV Header (translated)
  const headers = [
    t('export.headers.date'),
    t('export.headers.time'),
    t('export.headers.type'),
    t('export.headers.quantity'),
    t('export.headers.consistency'),
    t('export.headers.content'),
    t('export.headers.leftBreast'),
    t('export.headers.rightBreast'),
    t('export.headers.createdBy'),
    t('export.headers.comment'),
  ];

  // Build CSV rows
  const rows = sortedTasks.map((task) => {
    const date = moment(task.date).format('DD/MM/YYYY');
    const time = moment(task.date).format('HH:mm');
    const type = task.labelTask || getTaskLabel(task.id, t);

    let quantity = '';
    let consistency = '';
    let content = '';
    let leftBoob = '';
    let rightBoob = '';

    // Handle different task types
    if (task.id === 1) {
      // DIAPER (Couche)
      const diaperType = task.diaperType ?? task.idCaca;
      consistency = diaperType !== undefined ? getDiaperTypeLabel(diaperType, t) : '';
      content = task.diaperContent !== undefined ? getDiaperContentLabel(task.diaperContent, t) : '';
    } else if (task.id === 0) {
      // BOTTLE (Biberon)
      quantity = task.label ? `${task.label} ${t('ml')}` : '';
    } else if (task.id === 3) {
      // SLEEP (Sommeil)
      quantity = task.label ? formatDuration(Number(task.label) * 60, language) : '';
    } else if (task.id === 4) {
      // TEMPERATURE (Thermomètre)
      quantity = task.label ? `${task.label} ${t('celsius')}` : '';
    } else if (task.id === 5) {
      // BREASTFEEDING (Allaitement)
      leftBoob = task.boobLeft ? formatDuration(task.boobLeft, language) : '';
      rightBoob = task.boobRight ? formatDuration(task.boobRight, language) : '';
      const totalMin = ((task.boobLeft || 0) + (task.boobRight || 0)) / 60;
      quantity = totalMin > 0 ? `${Math.round(totalMin)} min` : '';
    } else if (task.label) {
      // Other tasks
      quantity = String(task.label);
    }

    const createdBy = task.createdBy || '';
    const comment = task.comment ? `"${task.comment.replace(/"/g, '""')}"` : '';

    return [date, time, type, quantity, consistency, content, leftBoob, rightBoob, createdBy, comment];
  });

  // Title and metadata (translated)
  const periodStart = startDate ? moment(startDate).format('DD/MM/YYYY') : t('export.periodStart');
  const periodEnd = endDate ? moment(endDate).format('DD/MM/YYYY') : t('export.periodEnd');

  // Combine header and rows
  const csvContent = [
    t('export.title', { babyName }),
    t('export.period', { start: periodStart, end: periodEnd }),
    t('export.total', { count: sortedTasks.length }),
    '',
    headers.join(','),
    ...rows.map((row) => row.join(',')),
  ].join('\n');

  return csvContent;
};

// Export tasks to CSV file and share
export const exportTasksToCSV = async (options: ExportOptions & { maxTasks?: number }): Promise<void> => {
  try {
    const csvContent = generateCSV(options);
    const fileName = `tribubaby_export_${moment().format('YYYY-MM-DD_HHmm')}.csv`;

    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      // Mobile: Save to file system and share (using new File API)
      const file = new File(Paths.document, fileName);

      // Write CSV content to file with UTF-8 BOM for Excel compatibility
      const utf8BOM = '\uFEFF';
      await file.write(utf8BOM + csvContent);

      const fileUri = file.uri;

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

// Get date range presets (with i18n support)
export const getDateRangePresets = (t: any) => {
  const today = new Date();

  return {
    last24Hours: {
      label: t('export.periods.last24Hours'),
      startDate: new Date(today.getTime() - 24 * 60 * 60 * 1000),
      endDate: today,
    },
    last7Days: {
      label: t('export.periods.last7Days'),
      startDate: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000),
      endDate: today,
    },
    last30Days: {
      label: t('export.periods.last30Days'),
      startDate: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000),
      endDate: today,
    },
    last60Days: {
      label: t('export.periods.last60Days'),
      startDate: new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000),
      endDate: today,
    },
    all: {
      label: t('export.periods.all'),
      startDate: undefined,
      endDate: undefined,
      maxTasks: 500,
    },
  };
};
