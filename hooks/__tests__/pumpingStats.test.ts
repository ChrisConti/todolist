/**
 * Les trois défauts de calcul du tire-lait, remontés par une relecture.
 *
 * Aucun n'était visible en lecture du diff : il fallait suivre la donnée depuis
 * l'écran qui la fournit jusqu'au hook qui la consomme.
 */

/** Jours calendaires distincts couverts par des séances. */
const spanDays = (dates: string[]): number =>
  Math.max(1, new Set(dates.map(d => new Date(d).toISOString().slice(0, 10))).size);

/** Signature de mémoïsation, telle que le hook la construit. */
const signature = (tasks: any[]): string =>
  tasks.length === 0
    ? 'empty'
    : tasks
        .map(t => `${t.uid}-${t.date}-${t.label || ''}-${t.nursingType || ''}-${t.pumpedLeftMl ?? ''}-${t.pumpedRightMl ?? ''}`)
        .join('|');

describe('quantité tirée par jour', () => {
  it('compte deux jours pour deux séances à cheval sur minuit', () => {
    // L'ancien calcul mesurait l'intervalle écoulé : 12 h, arrondi à 1 jour,
    // soit 600 ml par jour au lieu de 300.
    const dates = ['2026-10-14T20:00:00Z', '2026-10-15T08:00:00Z'];
    expect(spanDays(dates)).toBe(2);
    expect(600 / spanDays(dates)).toBe(300);
  });

  it('compte sept jours pour une semaine de tirage quotidien', () => {
    // L'ancien calcul en trouvait six, d'où 17 % de surestimation.
    const dates = Array.from({ length: 7 }, (_, i) => `2026-10-${10 + i}T07:00:00Z`);
    expect(spanDays(dates)).toBe(7);
  });

  it('compte un seul jour pour plusieurs séances le même jour', () => {
    expect(spanDays(['2026-10-15T08:00:00Z', '2026-10-15T20:00:00Z'])).toBe(1);
  });

  it('ne divise jamais par zéro', () => {
    expect(spanDays([])).toBe(1);
  });
});

describe('signature de mémoïsation', () => {
  const base = { uid: 'a', date: '2026-10-15 08:00:00', label: 0, nursingType: 'pumping', pumpedLeftMl: 60, pumpedRightMl: 0 };

  it('change quand une quantité par sein est modifiée', () => {
    // Le défaut : les tirages ont tous label 0, donc l'ancienne signature
    // — uid, date, label — était identique avant et après l'édition.
    const after = { ...base, pumpedLeftMl: 120 };
    expect(signature([after])).not.toBe(signature([base]));
  });

  it('change quand une tétée est convertie en tirage', () => {
    const feed = { ...base, nursingType: 'direct', pumpedLeftMl: undefined, pumpedRightMl: undefined };
    expect(signature([feed])).not.toBe(signature([base]));
  });

  it('reste stable quand rien ne change', () => {
    expect(signature([base])).toBe(signature([{ ...base }]));
  });
});

describe('bilan production / consommation', () => {
  // L'écran de catégorie ne transmettait que les tâches de catégorie 5 : aucun
  // biberon n'atteignait le hook, donc le lait bu valait toujours 0 et le
  // solde la production entière.
  const balance = (pumpedMl: number, bottleTasks: any[]) => {
    const drunk = bottleTasks
      .filter(t => t.id === 0 && t.milkType === 'maternal')
      .reduce((s, t) => s + Number(t.label || 0), 0);
    return { pumpedMl, maternalMl: drunk, balance: pumpedMl - drunk };
  };

  it('retranche les biberons de lait maternel', () => {
    const bottles = [
      { id: 0, milkType: 'maternal', label: 120 },
      { id: 0, milkType: 'maternal', label: 100 },
    ];
    expect(balance(600, bottles)).toEqual({ pumpedMl: 600, maternalMl: 220, balance: 380 });
  });

  it('ignore les biberons de lait artificiel', () => {
    const bottles = [{ id: 0, milkType: 'artificial', label: 150 }];
    expect(balance(600, bottles).maternalMl).toBe(0);
  });

  it('sans biberon transmis, le solde égalait la production — le défaut', () => {
    expect(balance(600, []).balance).toBe(600);
  });
});
