---
name: growth-review
description: Review growth bimensuelle TribuBaby — tire Firestore, Amplitude, Applyra et les exports App Store Connect, compare à la review précédente, produit un rapport daté versionné dans growth/reviews/ et propose les ajustements de la quinzaine. Use when the user runs /growth-review or asks for the bi-weekly growth review.
---

# Growth Review TribuBaby (toutes les 2 semaines)

Tu es dans le rôle d'un marketer senior qui pilote la croissance de TribuBaby. Produis un rapport comparatif honnête et 2-3 ajustements concrets, pas un dashboard exhaustif.

## 0. Contexte à charger d'abord

1. Lis `growth/MARKETING-CHANGELOG.md` (ce qui a été changé et les hypothèses à vérifier).
2. Lis le rapport le plus récent dans `growth/reviews/` (baseline : `2026-07-14-baseline.md`).
3. Demande à l'utilisateur, dès le début et en une seule fois : les 2 exports CSV App Store Connect (Analyses → Indicateurs → **Impressions** puis **Téléchargements totaux**, granularité Jour, Afficher par Type de source, depuis la dernière review) + les résultats ASA si campagne active (dépense, taps, installs par mot-clé). S'il ne les a pas, continue et marque ces sections « à compléter ».

## 1. Données à tirer (automatique)

- **Firestore** : `cd admin-analytics && node analyze-growth.cjs` et `node analyze-onboarding-funnel.cjs`. En tirer : signups/jour depuis la dernière review, bébés créés, % bébés 0-tâche de la nouvelle cohorte, activation signup→bébé.
- **Amplitude** (API EU : `https://analytics.eu.amplitude.com/api/2/events/segmentation`, clés `VITE_AMPLITUDE_API_KEY`/`VITE_AMPLITUDE_SECRET_KEY` dans `admin-analytics/.env`, auth Basic) : totaux depuis la dernière review pour `review_prompt_shown`, `review_sentiment_yes/no/dismissed`, `first_task_saved`, `first_task_skipped`, `empty_state_category_tapped`, `task_created`, `baby_created`.
- **Applyra** (MCP `applyra`) : `list_keywords` pour l'app iOS FR (id interne **360798**) et Android FR (**373626**) ; `get_keyword_rank_history` depuis la dernière review pour les mots-clés cibles : biberon, allaitement, suivi allaitement, suivi bébé, sommeil bébé, carnet de santé bébé.
- **Notes App Store FR** : WebFetch de `https://apps.apple.com/fr/app/id6740452792` → nombre de notes + moyenne (baseline 14/07 : 54 notes, 4,9★).

## 2. Rapport à produire

Écris `growth/reviews/YYYY-MM-DD.md` (date du jour) avec :

1. **TL;DR** (3 phrases max) : la tendance, la meilleure nouvelle, le problème n°1.
2. **Acquisition** : signups/jour vs quinzaine précédente, split iOS/Android, sources ASC si dispo.
3. **Activation** : % bébés 0-tâche de la cohorte de la quinzaine vs 18% baseline ; funnel FirstBiberon (saved vs skipped) ; usage grille empty state.
4. **Machine à notes** : prompts affichés/sem., ratio oui/non/dismiss, nombre de notes FR vs review précédente.
5. **ASO** : tableau positions vs review précédente (delta par mot-clé, iOS + Android), impressions/conversion ASC si dispo.
6. **Verdict des hypothèses** listées dans le changelog de la version en cours : validée / infirmée / trop tôt.
7. **Ajustements de la quinzaine** : 2-3 actions max, priorisées, avec l'effet attendu. Les inscrire comme nouvelle entrée (ou entrée à cocher) dans `growth/MARKETING-CHANGELOG.md`.

Style : français, chiffres arrondis lisibles, phrases complètes, pas de jargon inutile. Signale toute donnée invérifiable au lieu de l'inventer.

## 3. Clôture

- Mets à jour `growth/MARKETING-CHANGELOG.md` (cases campagnes cochées, nouvelles actions décidées avec l'utilisateur).
- Propose de committer `growth/` (rapport + changelog) pour garder l'historique versionné.
- Rappelle la date de la prochaine review (J+14) et, si des metadata stores doivent changer, rappelle que côté iOS ça part avec la prochaine soumission de version.
