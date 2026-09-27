# Backlog — après la 1.3.5

Noté le 17/09/2026. Trois sujets écartés de la 1.3.5 pour ne pas retarder la soumission
(prix à 4,99 € + metadata ASO).

---

## 1. Bug — saisie manuelle impossible en allaitement

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

## 2. Tire-lait

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
