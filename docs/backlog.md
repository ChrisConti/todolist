# Backlog

Ouvert le 17/09/2026.

---

## 1. ~~Bug — saisie manuelle impossible en allaitement~~ ✅ livré

> Corrigé sur `feat/allaitement-manuel-et-tire-lait` (commit `a9ef830`), en attente de livraison.

**Sévérité : élevée.** La catégorie allaitement est un usage central et le 2ᵉ mot-clé en trafic.
Signalé par un utilisateur le 17/09, capture à l'appui : en mode Manuel, aucun contrôle ne
s'affiche entre « 0 min » et les libellés « Sein Gauche / Sein Droit ». Impossible de saisir
autre chose que 0.

**Cause** — `components/BreastfeedingSection.tsx:337` et `:355` fabriquent un curseur vertical
en pivotant un curseur horizontal :

```js
style={{ width: 200, height: 40, transform: [{ rotate: '-90deg' }] }}
```

React Native applique la rotation à l'affichage mais **pas à la zone tactile**, qui reste le
rectangle horizontal d'origine. Le composant natif Android sous-jacent (`SeekBar`) supporte mal
d'être transformé, d'où l'absence totale de rendu. Sur iOS le rendu passe généralement — ce qui
explique que le bug soit passé inaperçu.

**Présent depuis le 11/04/2026** (commit `7753f53`), soit la création du composant.

**Deux options**
- *Courte* : curseurs à l'horizontale, empilés verticalement au lieu d'être côte à côte.
  Aucune rotation, ~15 lignes.
- *Plus robuste* (préférée) : remplacer par des boutons **− / +** avec la valeur au centre, pas
  de 1 minute. Un curseur au doigt sur 0-60 min est imprécis pour une mère qui note une tétée
  avec bébé dans les bras, et les boutons ne dépendent d'aucune bibliothèque native.

---

## 2. ~~Tire-lait~~ ✅ livré

> Livré sur `feat/allaitement-manuel-et-tire-lait` : mode, stats et bilan premium.

Demande utilisateurs récurrente. Spec détaillée : [`spec-categories.md`](spec-categories.md),
section « Étape 2 ».

**Les deux pièges à ne pas oublier**
- `breastfeedingMode` est **déjà pris** (`'timer' | 'manual'` — comment la saisie a été faite).
  Y mettre `'pumping'` corromprait la sémantique de l'historique. Utiliser un champ distinct,
  `nursingType: 'direct' | 'pumping'`, avec `'direct'` implicite pour tout l'existant.
- **L'unité change** : une tétée se mesure en temps (`boobLeft`/`boobRight`), un tire-lait en
  millilitres. Ce n'est donc pas qu'un basculement de libellé, le formulaire doit exposer un
  champ ml.

**Ce que ça débloque** — croisé avec les biberons `milkType: 'maternal'`, un bilan
production/consommation (« 450 ml tirés, 380 ml bus, stock +70 ml »). C'est ce que cherchent les
mères qui tirent, et aucune concurrente directe ne le fait correctement.

**À conditionner** : la Live Activity allaitement ne doit se déclencher que sur
`nursingType === 'direct'`, sinon l'écran verrouillé annonce une tétée en cours pendant que
bébé dort.

---

## 3. Bannière compte Instagram

Ajouter dans l'app un point d'entrée vers le compte Instagram, pour alimenter la stratégie de
contenu (cf. la décision de se concentrer sur TikTok/Instagram).

**Sens inverse de ce qui existe** : aujourd'hui les liens vont des réseaux vers l'app. Celui-ci
envoie les utilisateurs déjà acquis vers le compte, pour construire l'audience qui servira
ensuite à acquérir.

**À décider avant de coder**
- Quel emplacement ? Les Réglages sont le choix par défaut mais convertissent peu — c'est ce
  qu'on a constaté sur l'app Contractions, où la promo TribuBaby y dormait.
- Quel compte exactement, et existe-t-il déjà du contenu ? Envoyer vers un compte vide serait
  contre-productif.

**À faire dans tous les cas** : tracker le lien (event d'impression + event de clic avec une
`source`), comme fait dans l'app Contractions avec `TribuBabyPromo`. Sans le couple
impression/clic, aucun taux n'est calculable.

---

## 4. Bug — le bouton Valider chevauche le champ commentaire

**Sévérité : moyenne.** Visible en saisie d'allaitement, mode chrono : le bouton
« Valider » passe par-dessus le champ de commentaire et le masque partiellement.

**Cause** — `screens/CreateTask.tsx:693`, le pied de page est en position absolue :

```js
<View style={{ position: 'absolute', bottom: 10, left: 0, right: 0, ... }}>
```

Il flotte donc au-dessus du `ScrollView` au lieu de le suivre. Tant que le contenu
tient dans la hauteur de l'écran, rien ne se voit ; dès qu'il déborde — le mode chrono
empile deux grandes cartes — le bouton recouvre la fin du formulaire.

**Antérieur au mode sombre**, et présent aussi en clair. Découvert en testant le thème,
pas causé par lui.

**Deux options**
- *Courte* : ajouter un `paddingBottom` au `contentContainerStyle` du `ScrollView`,
  égal à la hauteur du pied. Le contenu peut alors défiler derrière sans être masqué.
- *Plus propre* : sortir le bouton du recouvrement — un pied de page en flux normal
  sous le `ScrollView`, dans un conteneur `flex: 1`. Change la structure de l'écran.

`UpdateTask.tsx` partage la même structure et mérite la même vérification.

---

## 5. Lenteur à l'ouverture de l'écran de saisie

**Sévérité : à évaluer.** Signalé le 15/10 : l'écran met un temps perceptible à
s'ouvrir après le tap sur le bouton d'ajout.

`CreateTask.tsx` fait 945 lignes, déclare une trentaine d'états, et monte les six
formulaires de catégories en même temps — plus la section allaitement, qui relit
`AsyncStorage` pour restaurer ses chronos.

**Pourquoi ça compte** : la review growth a établi que **86 % des premières tâches
arrivent dans l'heure** suivant la création du bébé. Tout se joue dans les premières
secondes d'usage, donc la latence de cet écran a un coût réel sur l'activation.

**Pistes** — ne monter que le formulaire de la catégorie sélectionnée au lieu des six,
et différer l'initialisation des chronos. À mesurer avant d'optimiser : la cause exacte
n'est pas établie.

---

## 6. Écran d'erreur — permettre d'écrire au support

**Demandé le 17/10/2026.** Quand l'app plante, l'écran « Oups ! Une erreur est
survenue » (`components/ErrorBoundary.tsx`) n'offre qu'un bouton « Réessayer ».
L'utilisateur n'a aucun moyen de signaler le problème, et nous n'en savons rien
(`componentDidCatch` se contente d'un `console.error`).

**À faire** — ajouter un bouton « Nous écrire » qui ouvre un `mailto:` vers le
support, sur le modèle de `handleContactUs` dans `Settings.tsx`, en pré-remplissant
le corps avec le message d'erreur, la version de l'app et la plateforme.

**Attention** — l'ErrorBoundary enveloppe toute l'app dans `App.tsx`, au-dessus des
providers : pas de `useTranslation` ni de thème disponibles, d'où `i18next.t()` direct.
Nouvelles clés à ajouter en FR/EN/ES. Profiter du passage pour envoyer l'erreur à
Crashlytics ou à l'analytics, au lieu du seul `console.error`.

**Contexte** — déclenché par le crash « Rendered more hooks than during the previous
render » au lancement (hook `useMemo` placé après un `return` anticipé dans `App.tsx`,
introduit par `5b6e1eb`, corrigé le 17/10).
