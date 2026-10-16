---
stepsCompleted: [1, 2, 3, 4]
session_active: false
workflow_completed: true
session_topic: Statistiques Biberon manquantes dans TribuBaby
session_goals: Identifier toutes les statistiques qu'un parent voudrait consulter sur l'alimentation au biberon, au-delà des 4 déjà définies
selected_approach: ai-recommended
techniques_used: [Question Storming, Role Playing]
ideas_generated: 31
context_file: ''
---

## Session Overview

**Topic:** Statistiques Biberon — quelles données manquent ?
**Goals:** Inventaire exhaustif des questions/besoins parentaux non couverts par les 4 stats existantes

**Principe produit clé :** L'app accompagne le suivi, elle ne prescrit pas. Les stats répondent aux questions du parent, elles n'en créent pas de nouvelles. Pas de vocation médicale — trop dangereux légalement.

---

## Technique 1 : Question Storming

### Références médicales & recommandations

**[Q-01]** : *"Mon bébé a-t-il bu suffisamment par rapport aux recommandations pour son âge/poids ?"*
**[Q-02]** : *"Mon bébé est-il dans la bonne fourchette aujourd'hui par rapport aux recommandations de son âge ?"*
**[Q-03]** : *"La quantité bue a-t-elle correctement évolué depuis la naissance ?"*
**[Q-04]** : *"L'écart entre réel et recommandé se creuse ou se réduit semaine après semaine ?"*

### Nuit & anticipation

**[Q-05]** : *"Est-ce que mon bébé se réveille souvent à cette heure-là ? C'est normal pour lui ?"*
**[Q-06]** : *"A-t-il suffisamment mangé ce soir pour tenir jusqu'au matin ?"*
**[Q-07]** : *"À quelle heure s'est-il couché ? Y a-t-il un lien entre l'heure du coucher et l'heure du réveil pour manger ?"*

### Corrélations biberon/sommeil

**[Q-08]** : *"Est-ce qu'il dort plus longtemps quand il a bu plus ? Quelle corrélation volume bu / durée de sommeil ?"*
**[Q-09]** : *"Y a-t-il une quantité seuil qui garantit une nuit complète ?"*
**[Q-10]** : *"Le type de lait (maternel vs artificiel) influence-t-il la durée du sommeil ?"*

### Référence personnelle

**[Q-11]** : *"Est-ce que les paramètres d'aujourd'hui ressemblent à ceux des nuits que j'ai considérées comme 'parfaites' ?"*
**[Q-12]** : *"Le biberon du soir est-il donné au bon moment par rapport au dernier sommeil du bébé ?"*
**[Q-13]** : *"Quel est le délai idéal entre le réveil et le biberon pour mon bébé ?"*

### Pédiatre & fréquences

**[Q-14]** : *"Quelle est la fréquence moyenne des biberons sur les 7/30 derniers jours ?"*
**[Q-15]** : *"Puis-je générer un rapport exportable à partager avec le pédiatre ?"*
**[Q-16]** : *"Y a-t-il eu des refus de biberon répétés sur les derniers jours ?"*
**[Q-17]** : *"Quelle est la durée moyenne d'une tétée/biberon ?"*
**[Q-18]** : *"Y a-t-il des variations anormales de quantité sur une courte période ?"*

### Alertes & changements

**[Q-19]** : *"À quel moment exact le comportement alimentaire a-t-il changé ?"*
**[Q-20]** : *"Qu'est-ce qui a changé précisément ? Volume, fréquence, type de lait, horaires ?"*

### Plan médical personnalisé

**[Q-21]** : *"Est-ce que je suis bien le plan d'alimentation défini par le pédiatre ?"*
**[Q-22]** : *"À quel point je m'écarte du plan prescrit sur les derniers jours ?"*

---

## Technique 2 : Role Playing

### Persona 1 — Maman qui reprend le travail

**[Q-23]** : *"Quel est le biberon habituel du soir à la sortie de la crèche — volume, type, heure ?"*
**[Q-24]** : *"Puis-je saisir rétroactivement les biberons donnés par la crèche ?"*
**[Q-25]** : *"Y a-t-il une vue 'biberons saisis par moi vs biberons saisis par d'autres' ?"*

### Persona 2 — Papa qui gère les nuits seul

**[Q-26]** : *"Combien lui donner maintenant en tenant compte de ce qu'il a déjà bu aujourd'hui ?"*
**[Q-27]** : *"Y a-t-il une corrélation entre les biberons refusés/réduits et une température élevée ou des couches anormales ?"*

### Persona 3 — Parent en transition lait maternel → artificiel

**[Q-28]** : *"Quelle est l'évolution du ratio lait maternel / artificiel semaine par semaine ?"*
**[Q-29]** : *"Suis-je sur la bonne trajectoire pour atteindre l'objectif de transition défini ?"*

### Persona 4 — Maman qui reprend l'allaitement

**[Q-30]** : *"Les doses actuelles sont-elles suffisantes pour mon bébé à ce stade ?"*
**[Q-31]** : *"Est-ce que mes données actuelles ressemblent à une période que j'ai considérée comme bien ?"*

---

## Organisation & Priorités

### Thèmes identifiés

**Thème 1 — Référence & Conformité** *(Q-01 à Q-04, Q-21, Q-22)*
Comparer le réel à une norme médicale nationale (HAS/PNNS) ou au plan personnalisé du pédiatre.
- Fourchette recommandée par âge/poids
- Évolution depuis la naissance vs courbe attendue
- Conformité au plan du pédiatre + écart mesuré

**Thème 2 — Référence Personnelle** *(Q-11, Q-23, Q-31)*
Le parent se compare à lui-même au meilleur. Feature transversale : "Définir une période de référence".
- "Mes nuits parfaites" comme benchmark
- Biberon habituel du soir (rituel établi)
- Période de référence définie par le parent

**Thème 3 — Corrélations Inter-modules** *(Q-07 à Q-10, Q-27)*
Croisement biberon + sommeil + couche + température.
- Volume bu → durée du sommeil
- Lait maternel vs artificiel → qualité de nuit
- Biberon réduit + fièvre + couche anormale = signal

**Thème 4 — Timing & Anticipation** *(Q-05, Q-06, Q-12, Q-13, Q-26)*
Stats contextuelles et temps-réel pour anticiper les besoins.
- Récurrence horaire des réveils
- Timing optimal biberon/sommeil
- Quantité restante à donner *maintenant*

**Thème 5 — Transitions & Progression** *(Q-28, Q-29, Q-30)*
Suivi d'une évolution vers un objectif défini.
- Ratio maternel/artificiel semaine par semaine
- Trajectoire vers l'objectif de transition
- Retour à une période "bien"

**Thème 6 — Communication Médicale** *(Q-14 à Q-16, Q-19, Q-20)*
Données pour le pédiatre et détection de changements comportementaux.
- Fréquence moyenne exportable
- Rapport PDF partageable
- Détection et datation des ruptures de pattern

### Priorité retenue : Thème 1 + 6 (Lien Médical)

**Contrainte validée :** Les références médicales doivent provenir de données nationales officielles françaises (HAS, PNNS) — pas de saisie libre, pas d'invention de l'app. Toujours afficher la source + disclaimer "Consultez votre pédiatre".

---

## Plans d'action

### Statistique A — Comparaison vs Références Nationales FR
*(Q-01 à Q-04)*

**Ce que c'est :** Afficher la fourchette recommandée HAS/PNNS pour l'âge du bébé et positionner le réel dedans (au-dessus / dans la fourchette / en dessous).

**Prochaines étapes :**
1. Sourcer les tableaux officiels HAS/PNNS — volumes recommandés par tranche d'âge (0-1m, 1-2m, 2-4m, 4-6m...)
2. Intégrer ces données statiques dans l'app (tableau de référence embarqué)
3. Afficher : *"Cette semaine : X ml/jour — Recommandé pour [âge] : Y-Z ml/jour"*
4. Décider positionnement Freemium ou Premium

**Contrainte :** Afficher systématiquement *"Source : HAS / PNNS"* + disclaimer *"Consultez votre pédiatre"*

---

### Statistique B — Rapport PDF Pédiatre
*(Q-14, Q-15)*

**Ce que c'est :** Un PDF exportable, visuellement soigné, résumant les données biberon sur une période choisie (7/30 jours) — graphiques, tableau de fréquences, comparaison aux références nationales.

**Prochaines étapes :**
1. Définir le contenu exact (1-2 pages)
2. Choisir une lib de génération PDF compatible Expo (`react-native-html-to-pdf` ou génération côté serveur)
3. Maquetter la mise en page : logo TribuBaby, données clés, graphique simple, tableau fréquences
4. Déclencheur : bouton *"Générer rapport"* dans les stats biberon

**Modèle :** Premium — fort argument de vente concret

---

### Statistique C — Détection de Changements
*(Q-19, Q-20)*

**Ce que c'est :** Vue *"Historique des changements"* — l'app identifie les ruptures de pattern (baisse volume, fréquence inhabituelle) et les date.

**Prochaines étapes :**
1. Définir le seuil de "changement significatif" (ex: -20% sur 3 jours consécutifs)
2. Afficher une timeline des ruptures détectées
3. Permettre au parent d'annoter (*"Début dentition", "Rhume"*) pour contextualiser

---

## Synthèse de session

**31 questions générées** via Question Storming + Role Playing
**6 thèmes identifiés**, 1 priorité retenue (Thème 1 + 6)
**3 statistiques nouvelles** avec plans d'action concrets

**Insights clés :**
- La notion de *référence personnelle* (période "bien") est un besoin récurrent — feature transversale à explorer
- Le rapport PDF pédiatre est le différenciateur Premium le plus concret et immédiatement compréhensible
- Les corrélations inter-modules (biberon/sommeil) représentent la plus forte innovation — à explorer en phase 2
- Principe directeur validé : l'app accompagne, elle ne prescrit pas

**Fichier session :** `_bmad-output/brainstorming/brainstorming-session-2026-03-29.md`
