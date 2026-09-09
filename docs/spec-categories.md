# Spec — Extension des catégories (tire-lait, diversification)

Rédigé le 09/09/2026. Contexte : demandes récurrentes d'utilisateurs pour de nouvelles
catégories de tâches. Analyse de marché : [analyse Applyra du 09/09](#annexe--données-de-marché).

## Principe directeur

L'app a 6 catégories (0-5) câblées en dur dans ~6 fichiers, avec **45 branches
`selectedImage === N`** dans `CreateTask.tsx`, 33 dans `UpdateTask.tsx`, 13 dans `Card.js`.

**On ne refond pas les 6 formulaires existants.** Ils sont éprouvés, les réécrire est du risque
pur sans bénéfice visible. On extrait uniquement les *métadonnées* dans un registre, et le
rendu générique ne sert qu'aux nouvelles catégories.

---

## Étape 0 — Compatibilité inter-versions (bloquant)

`Card.js:62-67` n'a aucun fallback : `task.id == 6` fait retourner `undefined` à la fonction
d'icône, la carte s'affiche vide. L'app étant partagée entre plusieurs membres qui ne sont pas
sur la même version, un parent en 1.4 saisissant un tire-lait casse l'affichage chez le
co-parent resté en 1.3.4.

**Rien ne peut être livré avant ces deux éléments, sur les deux plateformes :**

1. **Rendu de repli** dans `Card.js`, `TaskDetail.tsx` et les stats : catégorie inconnue →
   icône générique + `labelTask` brut + date. Jamais d'écran vide, jamais de crash.
2. **Contrôle de version** — pas de nouvelle dépendance nécessaire : un doc Firestore
   `Config/appVersion` lu au démarrage.

```
Config/appVersion
  minVersionIos:      "1.3.5"   // bandeau incitatif en dessous
  minVersionAndroid:  "1.3.5"
  blockVersionIos:    "1.0.0"   // blocage dur, réservé aux ruptures d'intégrité
  blockVersionAndroid:"1.0.0"
```

**Deux niveaux, jamais un seul.** Le bandeau incitatif est le défaut. Le blocage dur est
réservé aux cas où continuer corromprait les données. Un « mettez à jour ou vous ne pouvez
plus rien faire » à 3h du matin pendant un biberon est un 1★ garanti, et la note de 4,94★
est l'actif principal de l'app.

**Limite à connaître** : le contrôle de version ne protège que les divergences *futures*. Il ne
peut rien pour les utilisateurs Android bloqués en 1.2.2 — seule la publication Play Store
les débloque. Adoption iOS observée : 273 actifs sur 280 en 1.3.4 (97%), donc rapide.

---

## Étape 1 — Registre de catégories

Fichier unique `constants/categories.ts`, source de vérité pour :
`CreateTask.IMAGES`, `handleImageType`, `returnLabel`, `TASK_TYPES`, `TASK_LABELS`,
`Home.FILTER_CATEGORIES`, `Home.EMPTY_GRID_CATEGORIES`, `Card.js`.

```ts
export interface CategoryDef {
  id: number;
  key: string;           // = labelTask, contrat avec le dashboard admin et l'export CSV
  icon: React.FC<{height: number; width: number}>;
  asset: any;            // require() pour le sélecteur
  color: string;
  labelKey: string;      // clé i18n
  minAgeMonths?: number; // suggestion selon l'âge du bébé (cf. étape 3)
  legacy: boolean;       // true = formulaire bespoke existant, false = rendu par schéma
}
```

`key` est un **contrat inter-systèmes** : `analyticsService.ts` et `exportService.ts` s'en
servent comme clé de regroupement. Toute nouvelle catégorie doit y être ajoutée, sinon elle
tombe dans « Autre » côté dashboard.

Les 6 catégories existantes sont déclarées `legacy: true` et continuent d'utiliser leurs
formulaires actuels. Aucun changement de comportement à cette étape.

---

## Étape 2 — Tire-lait, comme mode d'allaitement

### Modèle de données

**Ne pas réutiliser `breastfeedingMode`** : le champ existe et stocke `'timer' | 'manual'`
(comment la saisie a été faite). Y mettre `'pumping'` corromprait la sémantique de
l'historique.

```ts
// sur Task, catégorie 5 uniquement
nursingType?: 'direct' | 'pumping';  // absent ⇒ 'direct' (tout l'historique)
pumpedMl?: number;                    // quantité tirée, uniquement si pumping
```

### Pourquoi ce n'est pas « juste un mode »

L'unité de mesure change. Une tétée se mesure en **temps** (`boobLeft`/`boobRight`, en
secondes). Un tire-lait se mesure en **millilitres** — c'est la raison même de tirer son lait.
Le formulaire doit donc exposer un champ ml quand `nursingType === 'pumping'`, la durée
devenant secondaire (utile pour le rendement ml/min).

### Ce que ça débloque

Les biberons portent déjà `milkType: 'maternal' | 'artificial'` en ml. Croisé avec `pumpedMl`,
on obtient un **bilan production / consommation** :

> Cette semaine : 450 ml tirés · 380 ml de lait maternel bus · stock +70 ml

C'est ce que cherchent les mères qui tirent — gérer leur stock de congélation. Aucune
concurrente directe ne le fait correctement.

### Pièges vérifiés

| Point | État | Action |
|---|---|---|
| Widget biberon | Alimenté par `id === 0` uniquement | Aucune pollution, rien à faire |
| Live Activity allaitement | Réagit à la catégorie 5 | **Conditionner à `nursingType === 'direct'`** — sinon l'écran verrouillé annonce une tétée en cours pendant que bébé dort |
| Stats allaitement | Somme `boobLeft + boobRight` | Exclure les sessions `pumping` du temps de tétée, les compter à part |
| Export CSV | `utils/exportTasks.ts:157-159` | Ajouter une colonne ml tirés |

### Stats

Sur le modèle de `BiberonInsights` (qui sépare déjà maternel/artificiel) :
temps de tétée directe · volume tiré · rendement ml/min · bilan production/consommation.

---

## Étape 3 — Diversification alimentaire

### L'intuition structurante

« Ce que bébé aime » est un **état**, pas une série temporelle. Toutes les catégories
actuelles sont des événements (on compte, on cumule, on regarde le dernier). La
diversification n'a pas cette forme : l'objet intéressant est **l'aliment**, avec un statut qui
évolue.

**Donc deux objets, pas un :**

| | Nature | Stockage |
|---|---|---|
| **Le répertoire** | état — la liste des aliments et leur statut | sur le bébé |
| **Les repas** | événement — « purée carotte à 12h » | une tâche (catégorie 6) |

Les deux s'alimentent : saisir un repas avec un aliment inconnu crée son entrée au répertoire.

### Le répertoire

```ts
// Baby.foodRepertoire — dictionnaire indexé par identifiant d'aliment
{
  carotte: {
    firstTriedAt: '2026-03-12',
    timesEaten: 3,
    verdict: 'likes' | 'dislikes' | 'neutral' | null,
    reaction: 'none' | 'rash' | 'digestive' | 'refusal' | null,
    isAllergen: false,
    note?: string,
  }
}
```

Rendu comme un carnet, rangé près du profil du bébé — **pas dans les stats** :

```
🥕 Carotte     introduite le 12/03 · 3 fois · ❤️ aime
🥦 Brocoli     introduit le 20/03 · 2 fois · ✋ refuse
🥚 Œuf         introduit le 02/04 · ⚠️ réaction cutanée
🐟 Poisson     pas encore introduit
```

### La contrainte de conception n°1 : la fatigue de saisie

C'est le risque principal identifié par l'analyse de marché, et l'app y est déjà exposée
(15% des bébés n'ont jamais une seule tâche). **Objectif : 2 taps pour enregistrer un repas.**

- Grille d'aliments fréquents en accès direct, sur le modèle de `ML_CHIPS` / `MED_CHIPS`
  qui existent déjà
- Les aliments déjà introduits remontent en tête
- Le verdict (aime / n'aime pas) se pose **plus tard**, depuis le carnet, jamais au moment
  du repas
- Aucun champ obligatoire au-delà de l'aliment

### Le calendrier des allergènes — la vraie différenciation

C'est le sous-ensemble le mieux placé : 3 concurrents seulement, notés 2,0 en moyenne, et
c'est la seule intention utilitaire du créneau (le reste est du contenu/recettes).

- Liste des allergènes majeurs avec âge repère d'introduction
- Journal de réaction daté à chaque introduction
- **Export PDF pour le pédiatre** — réutilise l'infrastructure d'export existante

### Encadrement médical

L'app est classée **Medical** sur l'App Store et les recommandations d'introduction
alimentaire varient selon les pays (PNNS en France, OMS, AAP aux US).

Le modèle à suivre existe déjà dans l'app : l'onglet sommeil avancé s'appuie explicitement
sur les recommandations OMS. Reprendre ce pattern :

- Citer la source (« selon le PNNS »)
- Formuler en repères (« généralement introduit vers 6 mois »), jamais en prescription
- **Ne jamais personnaliser médicalement** en fonction des données de ce bébé précis
- Disclaimer visible : l'app ne remplace pas l'avis du pédiatre

### Suggérer plutôt que configurer

`birthDate` est connu. La nourriture solide n'a aucun sens à 2 semaines et devient centrale à
5 mois. Plutôt qu'une checklist, une invitation au bon moment :

> Bébé a 5 mois — activer le suivi des repas ?

**Pas de question à l'inscription.** Justification par les données de l'app : 15% des bébés
n'ont jamais une tâche, 86% des premières tâches arrivent dans l'heure, l'âge médian du bébé
à l'inscription est de 13 jours. Ajouter un écran de configuration au signup défait
exactement ce que FirstBiberon vient de corriger — et à 13 jours, un parent ne sait pas s'il
va tirer son lait ni ce que bébé mangera dans 5 mois.

---

## Étape 4 — Visibilité des catégories

`Baby.enabledCategories: number[]` — **par bébé, pas par utilisateur.**

L'argument de vente de l'app est que tout le monde voit la même chose. Si la nounou masque
« tire-lait », les saisies de la mère deviennent invisibles pour elle. Les catégories
décrivent **comment ce bébé est nourri et soigné**, pas une préférence personnelle.

Règles :
- Modifiable par n'importe quel membre, comme toute donnée du bébé
- Désactiver une catégorie **n'efface jamais** les tâches existantes : elles restent visibles
  dans l'historique et les stats
- Une catégorie désactivée disparaît du sélecteur de saisie et de la grille empty state
- Réglage dans Settings comme **rattrapage**, pas comme passage obligé

---

## Séquencement

| Ordre | Livrable | Dépend de |
|---|---|---|
| 1 | Publier sur le Play Store | — (action growth en attente) |
| 2 | Fallback catégorie inconnue + contrôle de version, **2 plateformes** | 1 |
| 3 | Registre de catégories (refactor invisible) | — |
| 4 | Tire-lait (`nursingType` + ml + stats + Live Activity conditionnée) | 2, 3 |
| 5 | `enabledCategories` + réglage Settings | 3 |
| 6 | Repas + répertoire d'aliments | 2, 3, 5 |
| 7 | Calendrier allergènes + export PDF | 6 |

Les étapes 3 et 4 sont indépendantes de la 1 côté code, mais rien ne doit **sortir** avant
que l'étape 2 soit adoptée sur les deux plateformes.

## Points ouverts

- **Tire-lait et jumeaux** : tirer son lait est un acte de la mère, pas rattaché à un bébé.
  Sur un compte multi-bébés, à quel bébé rattacher la session ? Non tranché.
- **Gratuité** : décidé gratuit pour cette itération. À noter que la fiche Play Store affirme
  « 100 % gratuit, pas de version premium cachée » — toute bascule ultérieure vers du premium
  sur ces catégories contredirait ce texte.
- **i18n** : toute chaîne nouvelle doit partir en FR/EN/ES simultanément (règle projet). Le
  répertoire d'aliments implique un vocabulaire d'aliments traduit — volume non négligeable.

---

## Annexe — Données de marché

Analyse Applyra du 09/09/2026, App Store FR.

**Mot-clé principal** — `diversification alimentaire` : difficulté **26**, trafic **37**,
KEI « excellent ». Meilleur rapport difficulté/trafic que tout le portefeuille actuel
(allaitement 49/70, biberon 37/58, suivi bébé 67/49).
`suivi repas bébé` : difficulté **16**, trafic **25**.

**Réserve** : sur 60 mots-clés analysés, la quasi-totalité est à trafic 8. Seuls trois
dépassent 20. C'est une longue traîne, pas un gisement — l'effet sera sans commune mesure
avec un top 10 sur « biberon ».

**Qualité des concurrents** — note moyenne par cluster : 2,1 · 2,7 · 2,0 · 2,8 · 3,2 · 3,4 ·
3,3 · 2,8. TribuBaby est à 4,94.

**Structure du marché** : le classement sur « diversification alimentaire » est occupé par des
applis de **recettes** (Cuisinez pour bébé 4,93/1219 notes, BEABA, May), pas par des trackers.
Le seul tracker positionné, Miam Miam, a 7 notes à 3,71. Diagnostic Applyra sur le cluster
tracking : *« la plupart des trackers sont des journaux génériques ; il manque une base
d'aliments qui suit les réactions dans le temps »*.

**Justification réelle — la rétention, pas l'acquisition.** L'âge médian du bébé à
l'inscription est de 13 jours : les utilisateurs arrivent à la naissance. Un tracker de
nourrisson s'use vers 6 mois. La diversification commence à 4-6 mois, précisément quand les
utilisateurs commencent à partir. L'enjeu est d'étendre la durée de vie de ~6 mois à 12-18
mois — donc plus de tâches, plus de prompts d'avis, plus de notes, et la boucle ASO existante
qui s'entretient.

**Risques relevés** : fatigue de saisie (principal), churn à 12-18 mois quand bébé mange comme
les grands, responsabilité médicale sur le calendrier d'introduction.
