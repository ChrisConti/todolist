# Marketing Changelog — TribuBaby

Ce qu'on change à chaque version (produit growth, metadata stores, campagnes), pour corréler avec les courbes. Une entrée par version/quinzaine — la review `/growth-review` s'appuie dessus.

## v1.3.3 — 14/07/2026

**Produit (growth)**
- Écran `FirstBiberon` après création du bébé : saisie antidatée du dernier biberon (heure, lait, ml), bouton Passer → Home. Events : `first_task_saved`, `first_task_skipped`.
- Grille empty state sur Home (0 tâche récente) : 6 carrés activités → CreateTask préfiltré. Event : `empty_state_category_tapped`.
- Review prompt refondu : 3 prompts consommés / 365 j glissants (au lieu de 3 à vie), dismiss non consommé (+10 tâches, min 7 j entre prompts), « oui » → cooldown 6 mois, « non » → 1 retry à 90 j puis stop. Base historique resollicitée via migration.

**Metadata App Store FR** (avant : sous-titre « Biberon, Couches, Sommeil » ; keywords « tétée, ml, allaitement, sommeil, nourrisson, carnet, nuit, nounou, sieste, repas, journal, lait »)
- Sous-titre → `Biberon, Allaitement, Sommeil` (allaitement = trafic 70, monté du champ keywords au sous-titre qui pèse plus)
- Keywords → `tétée,couche,nourrisson,carnet,santé,journal,lait,repas,sieste,croissance,nouveau,né,crèche,nounou` (98 car. ; retirés : ml, nuit, doublon sommeil ; ajoutés : santé, couche, croissance, nouveau, né, crèche)

**Play Store FR**
- Description courte → « Suivi bébé partagé : biberon, allaitement, sommeil, couches. Simple et gratuit. »

**Campagnes lancées**
- [ ] PPO screenshots App Store Connect (date : ___) — non lancée au 23/08
- [ ] Apple Search Ads €50, FR iOS, exact match, €5/j (date : ___) — non lancée au 23/08
- [ ] OneLink AppsFlyer `insta_bio` + `insta_story`, lien en bio Instagram (date : ___) — non lancée au 23/08

**Hypothèses à vérifier à la review du ~28/07** → vérifiées le 23/08
1. ~~Bébés 0-tâche : 18% → <10% (FirstBiberon + grille).~~ **Infirmée** — 15%, iOS seulement.
2. ~~Volume de prompts review ×2-3, notes FR 54 → 70+.~~ **Partielle** — notes 81 ✅, volume ×1,8.
3. ~~« suivi allaitement » entre dans le top 100 iOS FR.~~ **Validée** — #28.
4. ~~Conversion fiche (ASC) remonte au-dessus de 5%.~~ **Validée** — 4,9-6,8%/sem.

## v1.3.4 — 19/07/2026 (iOS uniquement)

**Produit**
- Live Activity allaitement : timer de tétée sur écran verrouillé + Dynamic Island.

Pas de changement de metadata ni de campagne. Non publiée sur le Play Store (voir ci-dessous).

## Review du 23/08/2026

Rapport complet : [`reviews/2026-08-23.md`](reviews/2026-08-23.md) · Plan d'exécution détaillé : [`plan-2026-08-23.md`](plan-2026-08-23.md).

**Constat bloquant** : la 1.3.x n'a jamais été publiée en production sur le Play Store. 100% des utilisateurs Android actifs tournent en **1.2.2**. Les chantiers de la 1.3.3 (FirstBiberon, grille empty state, fix review prompt) et la description courte Play Store n'ont donc jamais atteint Android, et l'ASO Android est passé entièrement hors top 100.

**Actions décidées pour la quinzaine (→ ~06/09)**
- [ ] **Publier la 1.3.4 sur le Play Store** (bloquant, à faire en premier) + publier la description courte FR décidée le 14/07.
- [ ] **ASO iOS — prochaine soumission** : renforcer « biberon » (#20, trafic 58) et « allaitement » (#29, trafic 70) dans titre/sous-titre pour viser le top 10 ; arbitrer les mots-clés à trafic 8 déjà en top 15 (journal bébé, couche bébé, carnet de santé bébé).
- [ ] **Cadrer la relance J+1** (notification aux bébés à 0-1 tâche) pour la 1.3.5 — le blocage est le retour dans l'app, plus la première saisie.
- [ ] Élucider le pic d'impressions du 1er août (315 en un jour, 1,9% de conversion).

**Hypothèses à vérifier à la review du ~06/09**
1. Android : mots-clés « suivi bébé » et « suivi allaitement » de retour dans le top 100 après publication.
2. Bébés 0-tâche de la cohorte Android post-1.3.4 alignés sur iOS (~15%).
3. Impressions recherche iOS : ~250/sem → 350+/sem si « biberon » ou « allaitement » entre dans le top 10.
4. Notes FR 81 → 95+.
