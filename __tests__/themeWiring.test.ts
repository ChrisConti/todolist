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

/**
 * Lignes appartenant à une illustration, où les couleurs sont le sujet et non
 * de l'habillage : les aperçus du paywall et la maquette d'écran verrouillé.
 *
 * La fenêtre se referme à la fin du bloc ouvert, pas à la fin du fichier. Une
 * version antérieure s'ouvrait sur `lockScreenMock: {` et courait jusqu'au
 * `});` final de la feuille, exemptant ainsi tous les styles suivants.
 */
function illustratedLines(src: string): Set<number> {
  const out = new Set<number>();
  const lines = src.split('\n');
  let depth = 0;
  let open = false;
  lines.forEach((line, i) => {
    const MOCK_KEYS = /^\s+(lockScreenMock|mockClock|activityCard|mascotGroup|mascot|mascotEmoji|startedLabel|startedTime|chronoCol|chronoLabel|chrono): \{/;
    if (MOCK_KEYS.test(line)) { out.add(i); for (let j = i + 1; j < lines.length && !/^\s+\w+: \{|^\}\)/.test(lines[j]); j++) out.add(j); }
    if (!open && /^const preview = |^function \w*Preview\(/.test(line)) {
      open = true;
      depth = 0;
    }
    if (open) {
      out.add(i);
      depth += (line.match(/\{/g) ?? []).length - (line.match(/\}/g) ?? []).length;
      if (depth <= 0 && /\}/.test(line)) open = false;
    }
    if (/preview\./.test(line)) out.add(i);
  });
  return out;
}

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
  it('aucune feuille de styles au niveau module ne lit theme', () => {
    // theme n'existe pas hors d'un composant : une telle lecture lève un
    // ReferenceError au premier import, avant tout rendu.
    //
    // Le signal fiable est une StyleSheet.create qui ne reçoit pas theme en
    // paramètre, et dont le corps le lit quand même. Une version antérieure
    // tentait de suivre les accolades pour détecter « la portée module » : le
    // JSX la perdait et elle signalait des centaines de lignes saines — un
    // garde-fou bruyant finit désactivé, donc ne protège rien.
    const faults: string[] = [];
    for (const { rel, src } of FILES) {
      const lines = src.split('\n');
      lines.forEach((line, i) => {
        if (!/StyleSheet\.create\(\{/.test(line)) return;
        if (/\(\s*theme\s*:/.test(line)) return; // fabrique : portée légitime
        // Corps de la feuille, jusqu'à son `});` en colonne 0.
        for (let j = i + 1; j < lines.length; j++) {
          if (/^\}\)/.test(lines[j])) break;
          if (/\btheme\.\w/.test(lines[j])) faults.push(`${rel}:${j + 1}  ${lines[j].trim().slice(0, 56)}`);
        }
      });
      // Et la forme mono-ligne, hors de toute feuille.
      lines.forEach((line, i) => {
        if (/^(const|let|var)\s+[A-Za-z_$][\w$]*\s*(:[^=]*)?=[^=].*\btheme\.\w/.test(line)) {
          faults.push(`${rel}:${i + 1}  ${line.trim().slice(0, 56)}`);
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

  it('aucun jeton de surface ne sert de couleur de contenu', () => {
    // Les puits de couleur prennent trois formes, et la version précédente
    // n'en voyait qu'une : la propriété `color:` d'une feuille. Les props JSX
    // (color=, placeholderTextColor=, tintColor=) et les affectations à une
    // variable (textColor = …) passaient, alors que ce sont exactement les
    // formes qui ont produit les défauts de ce chantier.
    //
    // card, background et soft changent de clair à foncé selon le thème : en
    // contenu, ils disparaissent dans l'un des deux. Les teintes de `category`
    // sont assombries pour servir de FOND ; `categoryAccent` est leur
    // équivalent lisible en contenu.
    const SURFACE = String.raw`theme\.(card|background|soft|border|separator|disabled|category\[)`;
    const SINKS = [
      // color: X  ·  textColor = X  ·  color={X}  ·  placeholderTextColor={X}
      new RegExp(String.raw`\b\w*[cC]olor\s*[:=]\s*\{?\s*` + SURFACE),
      new RegExp(String.raw`\b(tintColor|fill|stroke)\s*[:=]\s*\{?\s*` + SURFACE),
    ];
    const faults: string[] = [];
    for (const { rel, src } of FILES) {
      src.split('\n').forEach((line, i) => {
        // backgroundColor et les bordures sont des surfaces : c'est leur rôle.
        const stripped = line.replace(/\b(background|border\w*|shadow|overlay)Color\s*[:=][^,;]*/g, '');
        if (SINKS.some(r => r.test(stripped))) faults.push(`${rel}:${i + 1}`);
      });
    }
    expect(faults).toEqual([]);
  });

  it('aucune couleur nommée opaque dans un composant rendu', () => {
    // 'white' échappait au contrôle des littéraux hex, qui ne cherchait que des
    // #RRGGBB. Un `color: 'white'` sur une surface claire est le même défaut
    // qu'un `color: '#FFF'`.
    //
    // Les rgba ne sont PAS contrôlés, volontairement : un blanc translucide
    // posé sur une surface de catégorie est indépendant du thème par
    // construction, exactement comme onCategory, et aucune expression
    // régulière ne distingue ce cas d'un blanc translucide sur une surface
    // thématique. Prétendre le couvrir serait du théâtre.
    const NAMED = /\b\w*[cC]olor\s*[:=]\s*\{?\s*['"](white|black|grey|gray|silver|ivory|snow)['"]/;
    const RGBA_SINK = /(?!)/;
    const faults: string[] = [];
    for (const { rel, src } of FILES) {
      if (EXEMPT[rel]) continue;
      const illustrated = illustratedLines(src);
      src.split('\n').forEach((line, i) => {
        if (illustrated.has(i)) return;
        const stripped = line.replace(/\b(background|border\w*|shadow|overlay)Color\s*[:=][^,;]*/g, '');
        if (NAMED.test(stripped) || RGBA_SINK.test(stripped)) faults.push(`${rel}:${i + 1}`);
      });
    }
    expect(faults).toEqual([]);
  });

  it('aucune référence à la palette parallèle de statsConfig', () => {
    // STATS_CONFIG.COLORS est figé : il ne suit aucun thème, et ses références
    // échappaient au contrôle des littéraux hex.
    const faults: string[] = [];
    for (const { rel, src } of FILES) {
      if (rel === 'constants/statsConfig.ts' || EXEMPT[rel]) continue;
      if (/STATS_CONFIG\.COLORS/.test(src)) faults.push(rel);
    }
    expect(faults).toEqual([]);
  });

  it('toute illustration SVG est posée sur un fond clair', () => {
    // Les contours de ces dessins sont en #230D03, soit 1,0:1 sur le fond
    // sombre : la même luminance, donc des visages sans traits. Ils doivent
    // être enveloppés d'un IllustrationGround, ou posés sur une surface dont
    // le fond est illustrationGround.
    const SVG = /<(Boy|Girl|Stork|SleepingBaby|Logo)\s/;
    const faults: string[] = [];
    for (const { rel, src } of FILES) {
      const lines = src.split('\n');
      // Contrôle par SITE, pas par fichier : un conteneur protégé ailleurs dans
      // le même fichier ne couvre pas un dessin posé à nu.
      const grounds = lines
        .map((l, i) => ({ l, i }))
        .filter(({ l }) => /IllustrationGround|illustrationGround|svgContainer/.test(l))
        .map(({ i }) => i);
      lines.forEach((line, i) => {
        if (!SVG.test(line)) return;
        const near = grounds.some(g => Math.abs(g - i) <= 4);
        if (!near) faults.push(`${rel}:${i + 1}`);
      });
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
