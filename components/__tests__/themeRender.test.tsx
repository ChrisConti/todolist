/**
 * Test de fumée du rendu : monte les composants de présentation dans les deux
 * thèmes et vérifie qu'ils ne plantent pas.
 *
 * Complément du garde-fou statique (__tests__/themeWiring.test.ts) : celui-ci
 * lit le source, celui-là exécute le rendu. Un `theme.foo.bar` sur un jeton
 * absent, un `styles.x` indéfini ou une règle des hooks violée n'apparaissent
 * qu'à l'exécution.
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { lightTheme, darkTheme } from '../../constants/theme';

let mockTheme = lightTheme;
jest.mock('../../Context/ThemeContext', () => ({
  useTheme: () => ({ theme: mockTheme }),
}));
jest.mock('../../services/analytics', () => ({ logEvent: jest.fn() }));

import SleepStackedChart from '../stats/SleepStackedChart';
import SleepOmsBlock from '../stats/SleepOmsBlock';
import SleepFeedbackWidget from '../stats/SleepFeedbackWidget';
import StatsContainer from '../stats/StatsContainer';
import { RythmeChart } from '../RythmeChart';
import { TendanceChart } from '../TendanceChart';
import { SingleDayTimeline, CompareDayTimeline } from '../BiberonTimeline';
import ItemParameter from '../../ItemParameter';
import IllustrationGround from '../IllustrationGround';

const SLEEP_GROUP = { label: 'L', nightMinutes: 480, napMinutes: 120, daysCount: 1 };

/** Chaque entrée : un nom, et une fonction qui rend le composant. */
const CASES: [string, () => React.ReactElement][] = [
  ['SleepStackedChart',  () => <SleepStackedChart groups={[SLEEP_GROUP as any]} />],
  ['SleepStackedChart vide', () => <SleepStackedChart groups={[]} />],
  ['SleepOmsBlock',      () => <SleepOmsBlock avgTotalMin={840} avgNightMin={600} avgNapMin={240} babyBirthDate="2025-01-01" />],
  ['SleepFeedbackWidget', () => <SleepFeedbackWidget userId="u1" />],
  ['StatsContainer',     () => <StatsContainer><></></StatsContainer>],
  ['RythmeChart',        () => <RythmeChart tasks={[]} />],
  ['TendanceChart',      () => <TendanceChart tasks={[]} />],
  ['SingleDayTimeline',  () => <SingleDayTimeline tasks={[]} />],
  ['CompareDayTimeline', () => <CompareDayTimeline todayTasks={[]} yesterdayTasks={[]} />],
  ['ItemParameter',      () => <ItemParameter title="x" icon="account" iconFamily="MaterialCommunityIcons" />],
  ['IllustrationGround', () => <IllustrationGround><></></IllustrationGround>],
];

describe.each([['clair', lightTheme], ['sombre', darkTheme]])('thème %s', (_name, theme) => {
  beforeEach(() => { mockTheme = theme; });

  it.each(CASES)('%s se monte sans planter', (_label, mount) => {
    expect(() => render(mount())).not.toThrow();
  });
});
