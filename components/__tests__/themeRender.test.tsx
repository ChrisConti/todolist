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

/**
 * Des données NON VIDES, sinon le montage ne prouve rien.
 *
 * Une première version passait des tableaux vides : SingleDayTimeline,
 * CompareDayTimeline et RythmeChart sortent alors sur un `return null` avant
 * d'avoir touché un seul jeton, et le test concluait « se monte sans planter »
 * en n'ayant rendu que `null`. CompareDayTimeline est précisément le composant
 * dont une correction de couleur était censée être couverte ici.
 */
const bottle = (h: number, uid: string) => ({
  uid, id: 0, label: '120', milkType: 'maternal',
  date: `2026-10-15 ${String(h).padStart(2, '0')}:00:00`,
});
const BOTTLES = [bottle(8, 'a'), bottle(12, 'b'), bottle(16, 'c'), bottle(20, 'd')];

/**
 * Chaque entrée : un nom, une fonction de rendu, et si le composant rend `null`
 * par conception.
 *
 * Un composant verrouillé construit quand même ses styles — son `useMemo`
 * s'exécute avant la sortie précoce — donc le montage prouve que le thème est
 * branché et que les jetons existent. Il ne prouve pas les couleurs de son JSX.
 * La distinction est explicite pour qu'on ne la confonde pas avec une
 * couverture réelle.
 */
const CASES: { name: string; mount: () => React.ReactElement; gated?: boolean }[] = [
  { name: 'SleepStackedChart', mount: () => <SleepStackedChart groups={[SLEEP_GROUP as any]} /> },
  { name: 'SleepStackedChart vide', mount: () => <SleepStackedChart groups={[]} /> },
  { name: 'SleepOmsBlock', mount: () => <SleepOmsBlock avgTotalMin={840} avgNightMin={600} avgNapMin={240} babyBirthDate="2025-01-01" period={7} daysWithData={7} /> },
  // Ne s'affiche qu'à la 3ᵉ visite, lue dans AsyncStorage : rend null ici.
  { name: 'SleepFeedbackWidget', mount: () => <SleepFeedbackWidget userId="u1" />, gated: true },
  // hasData={false} atteint la branche vide, celle qui rend IllustrationGround.
  { name: 'StatsContainer vide', mount: () => <StatsContainer hasData={false}><></></StatsContainer> },
  { name: 'StatsContainer chargement', mount: () => <StatsContainer loading><></></StatsContainer> },
  { name: 'RythmeChart', mount: () => <RythmeChart tasks={BOTTLES as any} /> },
  { name: 'TendanceChart', mount: () => <TendanceChart tasks={BOTTLES as any} /> },
  { name: 'SingleDayTimeline', mount: () => <SingleDayTimeline tasks={BOTTLES as any} /> },
  { name: 'CompareDayTimeline', mount: () => <CompareDayTimeline todayTasks={BOTTLES as any} yesterdayTasks={BOTTLES as any} /> },
  { name: 'ItemParameter', mount: () => <ItemParameter title="x" icon="account" iconFamily="MaterialCommunityIcons" backgroundColor={undefined} iconColor={undefined} textColor={undefined} /> },
  { name: 'IllustrationGround', mount: () => <IllustrationGround><></></IllustrationGround> },
];

describe.each([['clair', lightTheme], ['sombre', darkTheme]])('thème %s', (_name, theme) => {
  beforeEach(() => { mockTheme = theme; });

  // Un seul paramètre : avec plusieurs, Jest prend le dernier pour un callback
  // `done` et chaque cas expire au bout de cinq secondes.
  it.each(CASES)('$name se monte et rend quelque chose', ({ mount, gated }) => {
    let tree: ReturnType<typeof render> | undefined;
    expect(() => { tree = render(mount()); }).not.toThrow();
    // Sans cette assertion, un composant qui sort sur `return null` passerait
    // le test sans qu'aucune de ses couleurs ait été évaluée.
    if (!gated) expect(tree!.toJSON()).not.toBeNull();
  });
});
