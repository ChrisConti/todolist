// Mock native modules that can't run in Jest (no native bridge)
jest.mock('expo-file-system', () => ({
  File: jest.fn().mockImplementation(() => ({
    write: jest.fn().mockResolvedValue(undefined),
    uri: 'file://mock/path.csv',
  })),
  Paths: { document: '/mock/documents' },
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn().mockResolvedValue(true),
  shareAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

import { generateCSV } from '../exportTasks';

// Mock i18next so tests don't need a full i18n setup
jest.mock('i18next', () => ({
  getFixedT: (_lang: string) => (key: string, opts?: any) => {
    const map: Record<string, string> = {
      'export.taskTypes.bottle':       'Bottle',
      'export.taskTypes.diaper':       'Diaper',
      'export.taskTypes.health':       'Health',
      'export.taskTypes.sleep':        'Sleep',
      'export.taskTypes.temperature':  'Temperature',
      'export.taskTypes.breastfeeding':'Breastfeeding',
      'export.diaperType.solid':       'Hard',
      'export.diaperType.soft':        'Soft',
      'export.diaperType.liquid':      'Liquid',
      'export.diaperContent.pee':      'Pee',
      'export.diaperContent.poop':     'Poop',
      'export.diaperContent.both':     'Pee + Poop',
      'export.headers.date':           'Date',
      'export.headers.time':           'Time',
      'export.headers.type':           'Type',
      'export.headers.quantity':       'Quantity',
      'export.headers.consistency':    'Consistency',
      'export.headers.content':        'Content',
      'export.headers.leftBreast':     'Left',
      'export.headers.rightBreast':    'Right',
      'export.headers.createdBy':      'Created by',
      'export.headers.comment':        'Comment',
      'export.title':                  opts?.babyName ? `Tasks - ${opts.babyName}` : 'Tasks',
      'export.period':                 opts ? `${opts.start} - ${opts.end}` : '',
      'export.total':                  opts?.count !== undefined ? `Total: ${opts.count}` : '',
      'export.periodStart':            'Start',
      'export.periodEnd':              'End',
      'ml':                            'ml',
      'celsius':                       '°C',
    };
    return map[key] ?? key;
  },
}));

const BASE_OPTS = { babyName: 'Léo', tasks: [] };

describe('generateCSV — structure', () => {
  it('returns a string', () => {
    const csv = generateCSV(BASE_OPTS);
    expect(typeof csv).toBe('string');
  });

  it('includes baby name in header', () => {
    const csv = generateCSV({ ...BASE_OPTS, babyName: 'Emma' });
    expect(csv).toContain('Emma');
  });

  it('includes column headers row', () => {
    const csv = generateCSV(BASE_OPTS);
    expect(csv).toContain('Date,Time,Type');
  });
});

describe('generateCSV — task rows', () => {
  it('generates a row per task', () => {
    const tasks = [
      { id: 0, date: '2025-01-10 10:00:00', label: '120' },
      { id: 1, date: '2025-01-10 11:00:00', diaperType: 0, diaperContent: 0 },
    ];
    const csv = generateCSV({ ...BASE_OPTS, tasks });
    const lines = csv.split('\n').filter(l => l.trim() !== '');
    // title, period, total, headers, 2 task rows = 6 non-empty lines
    expect(lines.length).toBe(6);
  });

  it('bottle — includes ml quantity', () => {
    const tasks = [{ id: 0, date: '2025-01-10 10:00:00', label: '150' }];
    const csv = generateCSV({ ...BASE_OPTS, tasks });
    expect(csv).toContain('150 ml');
  });

  it('sleep — formats duration correctly (90 min → 1h 30min)', () => {
    const tasks = [{ id: 3, date: '2025-01-10 22:00:00', label: '90' }];
    const csv = generateCSV({ ...BASE_OPTS, tasks });
    expect(csv).toContain('1h 30min');
  });

  it('sleep — formats short duration (45 min)', () => {
    const tasks = [{ id: 3, date: '2025-01-10 22:00:00', label: '45' }];
    const csv = generateCSV({ ...BASE_OPTS, tasks });
    expect(csv).toContain('45 min');
  });

  it('temperature — includes celsius unit', () => {
    const tasks = [{ id: 4, date: '2025-01-10 10:00:00', label: '37.5' }];
    const csv = generateCSV({ ...BASE_OPTS, tasks });
    expect(csv).toContain('37.5 °C');
  });

  it('diaper — diaperType fallback to legacy idCaca', () => {
    const tasks = [{ id: 1, date: '2025-01-10 10:00:00', idCaca: 1, diaperContent: 1 }];
    const csv = generateCSV({ ...BASE_OPTS, tasks });
    expect(csv).toContain('Soft');
    expect(csv).toContain('Poop');
  });

  it('breastfeeding — both sides durations present', () => {
    // boobLeft/boobRight are in seconds: 5 min = 300s, 3 min = 180s
    const tasks = [{ id: 5, date: '2025-01-10 10:00:00', boobLeft: 300, boobRight: 180 }];
    const csv = generateCSV({ ...BASE_OPTS, tasks });
    expect(csv).toContain('5 min');
    expect(csv).toContain('3 min');
  });

  it('comment — double-quotes are escaped', () => {
    const tasks = [{ id: 0, date: '2025-01-10 10:00:00', label: '100', comment: 'Said "hello"' }];
    const csv = generateCSV({ ...BASE_OPTS, tasks });
    expect(csv).toContain('"Said ""hello"""');
  });
});

describe('generateCSV — date filtering', () => {
  const tasks = [
    { id: 0, date: '2025-01-08 10:00:00', label: '100' }, // outside range
    { id: 0, date: '2025-01-10 10:00:00', label: '150' }, // inside range
    { id: 0, date: '2025-01-12 10:00:00', label: '200' }, // outside range
  ];

  it('filters tasks to the given date range', () => {
    const csv = generateCSV({
      ...BASE_OPTS,
      tasks,
      startDate: new Date('2025-01-09T00:00:00'),
      endDate:   new Date('2025-01-11T23:59:59'),
    });
    expect(csv).toContain('150 ml');
    expect(csv).not.toContain('100 ml');
    expect(csv).not.toContain('200 ml');
  });

  it('returns all tasks when no date range provided', () => {
    const csv = generateCSV({ ...BASE_OPTS, tasks });
    expect(csv).toContain('100 ml');
    expect(csv).toContain('150 ml');
    expect(csv).toContain('200 ml');
  });
});

describe('generateCSV — maxTasks', () => {
  it('limits rows to maxTasks (sorted newest first)', () => {
    const tasks = [
      { id: 0, date: '2025-01-08 10:00:00', label: '100' },
      { id: 0, date: '2025-01-10 10:00:00', label: '200' },
      { id: 0, date: '2025-01-12 10:00:00', label: '300' },
    ];
    const csv = generateCSV({ ...BASE_OPTS, tasks, maxTasks: 2 });
    // Newest first: 300, 200 — 100 should be excluded
    expect(csv).toContain('300 ml');
    expect(csv).toContain('200 ml');
    expect(csv).not.toContain('100 ml');
  });
});
