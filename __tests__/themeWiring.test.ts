/**
 * Garde-fou statique du mode sombre.
 *
 * Les tests de ce projet ne montent aucun composant : ils vérifient des
 * fonctions pures, parfois recopiées depuis l'écran qu'ils prétendent tester.
 * Une conversion de thème cassée passe donc inaperçue — c'est arrivé une fois,
 * l'app est morte au lancement avec 228 tests au vert.
 *
 * Ce fichier lit le source de chaque fichier converti et vérifie les erreurs de
 * branchement qui ne provoquent ni erreur de type ni échec de test, mais un
 * plantage à l'exécution ou un écran illisible.
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const SKIP = /node_modules|__tests__|\.test\.|android|ios|functions|admin-analytics|growth|scripts|\.expo/;

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (SKIP.test(full)) continue;
    if (entry.isDirectory()) sourceFiles(full, out);
    else if (/\.(tsx|ts|js)$/.test(entry.name)) out.push(full);
  }
  return out;
}

const FILES = sourceFiles(ROOT).map(f => ({ rel: path.relative(ROOT, f), src: fs.readFileSync(f, 'utf8') }));

/** Fichiers volontairement non thématiques, avec la raison. */
const EXEMPT: Record<string, string> = {
  'components/ErrorBoundary.tsx': 'composant classe monté hors du ThemeProvider',
  'constants/theme.ts':           'définit la palette',
  'Style.js':                     'code mort, plus aucun import',
  'assets/GoogleLogo.tsx':        'couleurs de marque Google',
  // Code mort : aucun import nulle part. Si un jour l'un d'eux revient dans
  // l'arbre de rendu, le retirer d'ici le fera échouer, ce qui est voulu.
  'components/stats/timeline/Timeline7Days.tsx':       'code mort',
  'components/stats/timeline/Timeline30Days.tsx':      'code mort',
  'components/stats/timeline/TimelineComparison.tsx':  'code mort',
  'components/stats/cards/StatCard.tsx':               'code mort',
};

describe('branchement du thème', () => {
  it('aucune constante au niveau module ne lit theme', () => {
    // theme n'existe pas hors d'un composant : une telle constante lève un
    // ReferenceError au premier import, avant tout rendu.
    const faults: string[] = [];
    for (const { rel, src } of FILES) {
      src.split('\n').forEach((line, i) => {
        if (/^(const|let|var)\s+[A-Za-z_$][\w$]*\s*(:[^=]*)?=.*\btheme\./.test(line)) {
          faults.push(`${rel}:${i + 1}  ${line.trim().slice(0, 70)}`);
        }
      });
    }
    expect(faults).toEqual([]);
  });

  it('aucune expression JSX ne contient {theme.x} imbriqué', () => {
    // color={cond ? {theme.accent} : y} ne compile pas ; produit par un
    // remplacement automatique à l'intérieur d'accolades existantes.
    const faults: string[] = [];
    for (const { rel, src } of FILES) {
      src.split('\n').forEach((line, i) => {
        if (/[?:]\s*\{theme\./.test(line)) faults.push(`${rel}:${i + 1}`);
      });
    }
    expect(faults).toEqual([]);
  });

  it('chaque fabrique de styles est appelée dans un useMemo', () => {
    const faults: string[] = [];
    for (const { rel, src } of FILES) {
      for (const m of src.matchAll(/^const (make[A-Z]\w*) = \(theme: Theme\)/gm)) {
        const factory = m[1];
        if (!new RegExp(`useMemo\\(\\(\\) => ${factory}\\(theme\\)`).test(src)) {
          faults.push(`${rel} — ${factory} définie mais jamais appelée`);
        }
      }
    }
    expect(faults).toEqual([]);
  });

  it('tout fichier qui appelle useTheme() l\'importe', () => {
    const faults: string[] = [];
    for (const { rel, src } of FILES) {
      if (/\buseTheme\(\)/.test(src) && !/import\s*\{[^}]*useTheme[^}]*\}\s*from/.test(src)) {
        faults.push(rel);
      }
    }
    expect(faults).toEqual([]);
  });

  it('aucun import n\'est inséré au milieu d\'un import multiligne', () => {
    // Un import glissé après la première ligne d'un import { ... } multiligne
    // coupe le fichier en deux et casse la compilation.
    const faults: string[] = [];
    for (const { rel, src } of FILES) {
      const lines = src.split('\n');
      let open = false;
      lines.forEach((line, i) => {
        if (open && /^import\s/.test(line)) faults.push(`${rel}:${i + 1}`);
        if (/^import\s*\{[^}]*$/.test(line)) open = true;
        if (open && /\}\s*from/.test(line)) open = false;
      });
    }
    expect(faults).toEqual([]);
  });

  it('aucun jeton de surface ne sert de couleur de texte', () => {
    // card et background changent de clair à foncé selon le thème : en texte,
    // ils disparaissent dans l'un des deux. 41 sites étaient concernés.
    const faults: string[] = [];
    for (const { rel, src } of FILES) {
      src.split('\n').forEach((line, i) => {
        if (/\bcolor:\s*theme\.(card|background|soft|border|separator|disabled)\b/.test(line)) {
          faults.push(`${rel}:${i + 1}`);
        }
        // Les teintes de `category` sont assombries pour servir de fond ;
        // `categoryAccent` est leur équivalent lisible en texte.
        if (/\bcolor:\s*theme\.category\[/.test(line)) faults.push(`${rel}:${i + 1}`);
      });
    }
    expect(faults).toEqual([]);
  });

  it('aucune référence à la palette parallèle de statsConfig', () => {
    // STATS_CONFIG.COLORS est figé : il ne suit aucun thème, et ses références
    // échappaient au contrôle des littéraux hex.
    const faults: string[] = [];
    for (const { rel, src } of FILES) {
      if (rel === 'constants/statsConfig.ts') continue;
      if (/STATS_CONFIG\.COLORS/.test(src)) faults.push(rel);
    }
    expect(faults).toEqual([]);
  });

  it('aucun composant rendu ne garde de couleur en dur', () => {
    // Hors exemptions listées, une teinte figée ne suit pas le thème. Les
    // ombres portées et les valeurs transparentes sont permises.
    const faults: string[] = [];
    for (const { rel, src } of FILES) {
      if (EXEMPT[rel] || !/StyleSheet\.create|style=\{\{/.test(src)) continue;
      const hits = (src.match(/'#[0-9A-Fa-f]{3,8}'|"#[0-9A-Fa-f]{3,8}"/g) ?? [])
        .filter(c => !/^'#0{3,6}'$/.test(c));
      // Les illustrations figent délibérément les deux palettes. L'exemption
      // ne vaut que pour les lignes d'une feuille nommée, jamais pour le
      // fichier entier : une simple clé de traduction y suffisait, ce qui
      // exemptait les 34 couleurs de Settings.tsx.
      const illustrated = new Set<number>();
      let inPreview = false;
      src.split('\n').forEach((line, i) => {
        if (/^const preview = |^function \w*Preview\(|lockScreenMock: \{/.test(line)) inPreview = true;
        else if (inPreview && /^\}\);?$|^\}$/.test(line)) inPreview = false;
        if (inPreview || /themeDark:|themeLight:|preview\./.test(line)) illustrated.add(i);
      });
      const offending = src.split('\n')
        .map((line, i) => ({ line, i }))
        .filter(({ line, i }) => !illustrated.has(i) && /'#[0-9A-Fa-f]{3,8}'|"#[0-9A-Fa-f]{3,8}"/.test(line))
        .filter(({ line }) => !/shadowColor|#000'/.test(line));
      if (offending.length) {
        faults.push(`${rel} — ${offending.map(o => `L${o.i + 1}`).join(' ')}`);
      }
    }
    expect(faults).toEqual([]);
  });
});
