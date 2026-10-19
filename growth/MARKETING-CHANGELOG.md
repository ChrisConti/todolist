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
1. ~~Bébés 0-tâche : 18% → <10% (FirstBiberon + grille).~~ **Validée** *(corrigé le 12/09)* — 10-11% sur juillet et août, bébés à naître écartés. Le « infirmée » du 23/08 venait de ce biais de mesure.
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

## v1.3.5 — 30/09/2026 (iOS uniquement) — *entrée ajoutée a posteriori le 19/10*

**Metadata App Store FR** (décidée à la review du 23/08)
- Titre `Tribu Baby : Suivi Bébé Simple` → `Tribu Baby : Suivi Biberon`
- Sous-titre `Biberon, Allaitement, Sommeil` → `Bébé, Allaitement, Sommeil`
- Keywords supposés inchangés (non vérifié : sous-titre et keywords réellement en ligne avant la 1.3.7 n'ont pas été relus dans ASC) ; description et captures modifiées en même temps.

**Résultat (review du 19/10)** : « biberon » #20 → #16-18 seulement ; « suivi bébé », « journal bébé » et « sommeil bébé » hors du top 100 dès le 01/10 ; inscriptions iOS ~31 → 25/semaine. Hypothèse « Suivi (titre) + Bébé (sous-titre) suffit » **infirmée**.

## Review du 19/10/2026

Rapport complet : [`reviews/2026-10-19.md`](reviews/2026-10-19.md).

**Actions décidées**
- [x] **Metadata iOS avec la 1.3.7** — saisie dans App Store Connect le 19/10/2026, part avec la soumission 1.3.7 (en ligne à l'approbation Apple) :
  - Titre → `Tribu Baby: Suivi Bébé Biberon` (30)
  - Sous-titre → `Allaitement, Tire-lait, Sieste` (30)
  - Keywords → `tétée,couche,sommeil,nourrisson,carnet,santé,journal,repas,croissance,nouveau,né,nounou,crèche` (94)
- [ ] Publier la 1.3.x sur le Play Store (reconduit — dépend du chantier Premium Android).
- [ ] Exports App Store Connect fournis à chaque review.

**Hypothèses à vérifier à la review du ~02/11**
1. « suivi bébé » de retour dans le top 30 iOS.
2. « tire lait » entre dans le top 50 iOS.
3. Inscriptions iOS revenues à ~30/semaine.
4. « biberon » se maintient dans le top 20 malgré le titre plus chargé.
