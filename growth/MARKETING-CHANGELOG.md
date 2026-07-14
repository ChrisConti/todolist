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
- [ ] PPO screenshots App Store Connect (date : ___)
- [ ] Apple Search Ads €50, FR iOS, exact match, €5/j (date : ___)
- [ ] OneLink AppsFlyer `insta_bio` + `insta_story`, lien en bio Instagram (date : ___)

**Hypothèses à vérifier à la review du ~28/07**
1. Bébés 0-tâche : 18% → <10% (FirstBiberon + grille).
2. Volume de prompts review ×2-3, notes FR 54 → 70+.
3. « suivi allaitement » entre dans le top 100 iOS FR (ajout metadata).
4. Conversion fiche (ASC) remonte au-dessus de 5% (notes fraîches + PPO).
