# 📊 Récapitulatif des Analytics Firebase - Tribu Baby

Après optimisation et standardisation (snake_case), voici toutes les données que tu peux analyser dans Firebase Analytics.

---

## 🎯 **1. ACQUISITION UTILISATEURS**

### Téléchargements par OS
**Source :** Automatique Firebase (pas d'événement custom)

**Ce que tu peux voir :**
- Nombre total de téléchargements
- Répartition iOS vs Android
- Versions d'OS utilisées
- Pays d'origine

**Où le voir :** Firebase Console → Analytics → Demographics

---

### Créations de compte
**Événement :** `user_signup`

**Paramètres :**
- `user_id` - ID utilisateur Firebase
- `method` - "email" (pour l'instant)
- `country` - Pays de l'utilisateur

**Ce que tu peux analyser :**
- Nombre total d'inscriptions
- Inscriptions par jour/semaine/mois
- Taux de conversion visiteur → inscription
- Pays avec le plus d'inscriptions

**Dashboard recommandé :**
```
Métrique : Nombre d'événements user_signup
Dimension : Date, Country
Filtre : method = email
```

---

### Erreurs d'inscription
**Événement :** `signup_error`

**Paramètres :**
- `error_code` - Code d'erreur technique
- `error_type` - Type d'erreur (email_in_use, network_error, general, firestore_error)

**Ce que tu peux analyser :**
- Taux d'échec d'inscription
- Principales causes d'échec
- Problèmes techniques récurrents

**Alertes recommandées :**
- Si error_type = 'firestore_error' > 5% → problème serveur
- Si error_type = 'network_error' > 10% → problème réseau/Firebase

---

## 👶 **2. CRÉATION & GESTION BÉBÉS**

### Bébés créés avec succès
**Événement :** `baby_created`

**Paramètres :**
- `baby_type` - "Boy" ou "Girl"
- `baby_id` - ID unique du bébé
- `user_id` - ID utilisateur
- `has_photo` - true/false (photo ajoutée ?)
- `has_weight` - true/false (poids renseigné ?)
- `has_height` - true/false (taille renseignée ?)

**Ce que tu peux analyser :**
- Nombre total de bébés créés
- Ratio Boy/Girl
- % d'utilisateurs qui ajoutent une photo
- % d'utilisateurs qui renseignent poids/taille
- Profils complets vs profils minimaux

**KPIs clés :**
```
- Taux de complétion profil = has_photo + has_weight + has_height
- Engagement initial = % avec les 3 remplis
```

**Segmentation :**
- Par type (Boy vs Girl)
- Par niveau de complétion (photo seule, tous les champs, etc.)

---

### Échecs de création bébé
**Événement :** `baby_creation_failed`

**Paramètres :**
- `baby_type` - "Boy" ou "Girl"
- `user_id` - ID utilisateur
- `error_code` - Code d'erreur
- `error` - Message d'erreur

**Ce que tu peux analyser :**
- Taux d'échec de création
- Causes principales d'échec
- Utilisateurs bloqués

**Alertes :**
- Si taux d'échec > 5% → investigation urgente

---

### Partage familial - Code copié
**Événement :** `baby_code_copied`

**Paramètres :**
- `baby_id` - ID du bébé partagé
- `user_id` - ID utilisateur qui copie

**Ce que tu peux analyser :**
- Intention de partage (copie du code)
- Bébés les plus partagés
- Utilisateurs qui partagent vs qui ne partagent pas

**Funnel de partage :**
```
1. baby_created → 2. baby_code_copied → 3. baby_joined
```
Permet de voir le taux de conversion à chaque étape.

---

### Rejoindre un bébé
**Événement :** `baby_joined`

**Paramètres :**
- `baby_id` - ID du bébé rejoint
- `baby_name` - Nom du bébé
- `baby_type` - "Boy" ou "Girl"
- `user_id` - ID du nouvel utilisateur
- `timestamp` - Moment du join

**Ce que tu peux analyser :**
- Nombre de familles multi-utilisateurs
- Croissance virale (partage familial)
- Délai entre création et premier join
- Bébés avec le plus de membres

**Métriques virales :**
```
Coefficient K = baby_joined / baby_created
Si K > 1 → croissance virale positive
```

---

### Quitter un bébé
**Événement :** `baby_left`

**Paramètres :**
- `baby_id` - ID du bébé quitté
- `user_id` - ID utilisateur qui quitte
- `timestamp` - Moment du départ

**Ce que tu peux analyser :**
- Taux de churn (désengagement)
- Raisons de départ (corrélé avec autres données)
- Durée de vie moyenne avant de quitter

**Alertes churn :**
- Si baby_left augmente → problème d'engagement
- Ratio baby_left / baby_joined → santé de la rétention

---

## 📝 **3. ACTIVITÉS (TÂCHES)**

### Tâches créées
**Événement :** `task_created`

**Paramètres :**
- `task_type` - Type de tâche (biberon, couche, sommeil, sante, thermo, allaitement)
- `task_id` - ID numérique (0-5)
- `has_label` - true/false (valeur renseignée ?)
- `has_note` - true/false (commentaire ajouté ?)
- `user_id` - ID utilisateur

**Ce que tu peux analyser :**
- Nombre total de tâches créées
- Tâches créées par jour/semaine
- Types de tâches les plus utilisés
- % d'utilisateurs qui ajoutent des notes
- % d'utilisateurs qui renseignent les détails (label)

**Engagement utilisateur :**
```
- Utilisateurs actifs = users avec task_created dans les 7 derniers jours
- Tâches par utilisateur (moyenne)
- Tâches par bébé (moyenne)
```

**Top types de tâches :**
```sql
SELECT task_type, COUNT(*) as total
FROM task_created
GROUP BY task_type
ORDER BY total DESC
```

**Richesse du contenu :**
```
% avec note = has_note=true / total
% avec détails = has_label=true / total
```

---

### Échecs de création tâche
**Événement :** `task_creation_failed`

**Paramètres :**
- `task_type` - Type de tâche
- `task_id` - ID numérique
- `user_id` - ID utilisateur
- `error_code` - Code d'erreur
- `error` - Message d'erreur

**Ce que tu peux analyser :**
- Taux d'échec par type de tâche
- Problèmes techniques récurrents
- Types de tâches les plus problématiques

**Alertes :**
- Si taux d'échec > 2% → bug à investiguer

---

## 📤 **4. EXPORT DE DONNÉES**

### Export réussi
**Événement :** `tasks_exported`

**Paramètres :**
- `period` - Période exportée (last7Days, last30Days, etc.)
- `task_count` - Nombre de tâches exportées
- `baby_id` - ID du bébé
- `user_id` - ID utilisateur

**Ce que tu peux analyser :**
- Utilisation de la feature export
- Périodes les plus exportées
- Utilisateurs power (beaucoup d'exports)
- Volume moyen de données exportées

**Adoption feature :**
```
% utilisateurs qui exportent = unique users avec tasks_exported / total users
```

---

## ⭐ **5. NOTATION APP STORE**

### Modal review affichée
**Événement :** `review_prompt_shown`

**Paramètres :**
- `task_count` - Nombre de tâches quand la modal apparaît
- `prompt_number` - Numéro du prompt (1-5)
- `prompts_remaining` - Prompts restants avant d'arrêter

**Ce que tu peux analyser :**
- Combien d'utilisateurs voient le prompt
- À quel moment (nombre de tâches)
- Fréquence d'affichage

---

### Clic pour noter
**Événement :** `review_write_clicked`

**Paramètres :** Aucun

**Ce que tu peux analyser :**
- Nombre d'utilisateurs qui cliquent pour noter
- Taux de conversion (shown → clicked)

**Taux de conversion :**
```
Conversion = review_write_clicked / review_prompt_shown
Benchmark : 5-15% est normal
```

---

### Modal fermée sans noter
**Événement :** `review_prompt_dismissed`

**Paramètres :** Aucun

**Ce que tu peux analyser :**
- Nombre d'utilisateurs qui refusent de noter
- Taux de refus

**Funnel de notation :**
```
1. review_prompt_shown (100%)
   ├─ 2a. review_write_clicked (X%)
   └─ 2b. review_prompt_dismissed (Y%)

X + Y devrait = 100%
```

---

## 📱 **6. NAVIGATION (SCREEN VIEWS)**

### Écrans trackés (3 écrans clés)

**1. Home**
- Écran principal d'accueil
- Premier écran après login
- Permet de mesurer : sessions actives, durée sur l'écran principal

**2. CreateTask**
- Écran d'ajout d'activité
- Permet de mesurer : engagement création, parcours utilisateur

**3. Settings**
- Écran de paramètres
- Permet de mesurer : utilisateurs qui explorent l'app, changements de config

**Ce que tu peux analyser :**
- Flux de navigation (quel écran mène à quel écran)
- Temps passé sur chaque écran
- Taux de sortie par écran
- Parcours utilisateur type

---

## 📈 **7. DASHBOARDS RECOMMANDÉS**

### Dashboard 1 : Vue d'ensemble
```
- Total users (user_signup)
- Total babies (baby_created)
- Total tasks (task_created)
- Active users (7 derniers jours avec task_created)
```

### Dashboard 2 : Acquisition
```
- Inscriptions par jour
- Taux d'erreur signup (signup_error / user_signup)
- Pays top 5
- Conversion visiteur → signup
```

### Dashboard 3 : Engagement
```
- Tâches par jour
- Tâches par type (graphique)
- Taux de complétion profil bébé
- Utilisateurs actifs quotidiens (DAU)
```

### Dashboard 4 : Viralité
```
- baby_code_copied
- baby_joined
- Coefficient K = baby_joined / baby_created
- Délai moyen entre création et premier join
```

### Dashboard 5 : Rétention
```
- baby_left par semaine
- Churn rate = baby_left / (baby_created + baby_joined)
- Durée de vie moyenne
```

### Dashboard 6 : Qualité
```
- Taux d'échec création bébé
- Taux d'échec création tâche
- Erreurs par type
```

### Dashboard 7 : Monétisation future
```
- tasks_exported (feature premium potentielle)
- Utilisateurs power (>100 tâches)
- Engagement profond
```

---

## 🎯 **8. KPIs CLÉS À SUIVRE**

### Acquisition
- ✅ **Inscriptions/jour** (user_signup)
- ✅ **Taux d'erreur signup** (signup_error / user_signup)

### Activation
- ✅ **% bébés créés après signup** (baby_created / user_signup)
- ✅ **Temps moyen inscription → 1er bébé**

### Engagement
- ✅ **Tâches/utilisateur/jour**
- ✅ **DAU** (Daily Active Users avec task_created)
- ✅ **WAU** (Weekly Active Users)
- ✅ **Tâches/bébé**

### Rétention
- ✅ **Churn rate** (baby_left / total babies)
- ✅ **Durée de vie moyenne**

### Viralité
- ✅ **Coefficient K** (baby_joined / baby_created)
- ✅ **% bébés partagés** (baby_code_copied / baby_created)
- ✅ **Taux de conversion partage** (baby_joined / baby_code_copied)

### Qualité produit
- ✅ **Taux d'échec création** (failed / created pour babies et tasks)
- ✅ **Taux de conversion review** (review_write_clicked / review_prompt_shown)

---

## 🔔 **9. ALERTES RECOMMANDÉES**

### Critiques (bloquer la croissance)
```
⚠️ Taux d'échec baby_created > 5%
⚠️ Taux d'échec task_created > 2%
⚠️ signup_error type=firestore_error > 5%
```

### Importantes (impact engagement)
```
⚠️ Churn rate > 10% sur 7 jours
⚠️ DAU en baisse de >20%
⚠️ Coefficient K < 0.3 (pas de viralité)
```

### À surveiller
```
⚠️ Taux de conversion review < 5%
⚠️ % profils incomplets > 50%
⚠️ tasks_exported en baisse (si feature importante)
```

---

## 📊 **10. EXEMPLE DE RAPPORT HEBDOMADAIRE**

```markdown
# 📊 Tribu Baby - Semaine du [DATE]

## 🎯 Métriques principales
- 👥 Nouveaux utilisateurs : X (+Y% vs semaine dernière)
- 👶 Bébés créés : X (+Y%)
- 📝 Tâches créées : X (+Y%)
- 🔄 Utilisateurs actifs (DAU) : X

## 📈 Croissance
- Inscriptions : [graphique]
- Bébés créés : [graphique]
- Tâches : [graphique]

## 🔥 Engagement
- Tâches/utilisateur : X.X
- % utilisateurs actifs : X%
- Top 3 types de tâches :
  1. Biberon - XX%
  2. Couche - XX%
  3. Sommeil - XX%

## 🌍 Viralité
- Coefficient K : X.X
- Bébés partagés : X (XX%)
- Nouveaux membres famille : X

## ⚠️ Points d'attention
- Taux d'échec création : X%
- Churn rate : X%
- Principales erreurs : [liste]

## ⭐ Review App Store
- Prompts affichés : X
- Clics notation : X (taux XX%)
- Utilisateurs qui ont noté : X
```

---

## 💡 **11. CONSEILS D'ANALYSE**

### Comparaisons utiles
- Semaine N vs Semaine N-1
- Jour de semaine vs Weekend
- Nouveaux users vs Users existants
- iOS vs Android

### Cohortes à créer
- Users par semaine d'inscription
- Users par pays
- Users avec/sans photo bébé
- Users mono vs multi-bébé

### Funnels critiques
```
1. Acquisition : Download → Signup → Baby Created → First Task
2. Partage : Baby Created → Code Copied → Baby Joined
3. Review : Prompt Shown → Write Clicked
```

---

## 🎓 **RÉSUMÉ**

**Tu peux maintenant tracker :**
- ✅ 13 événements business critiques
- ✅ 3 screen views pour navigation
- ✅ ~20 paramètres différents (snake_case)

**Tes données sont maintenant :**
- ✅ Propres et standardisées
- ✅ Conformes aux best practices Firebase
- ✅ Optimisées (suppression du bruit)
- ✅ Prêtes pour l'analyse et les dashboards

**Ce que tu ne trackais PAS avant et qui est maintenant visible :**
- 🔍 Tous les paramètres en snake_case correctement formatés
- 🔍 Moins de bruit (9 événements inutiles supprimés)
- 🔍 Navigation simplifiée (3 écrans clés vs 10)
