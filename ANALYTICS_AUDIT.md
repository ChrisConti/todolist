# Audit des Analytics Firebase

## ✅ Événements NÉCESSAIRES (demandés)

| Besoin | Événement actuel | Statut | Fichier |
|--------|------------------|--------|---------|
| 1. Téléchargements par OS | Automatique Firebase | ✅ OK | N/A (Firebase natif) |
| 2. Création de compte | `user_signup` | ✅ OK | SignIn.tsx:96 |
| 3. Bébés créés | `baby_created` | ✅ OK | Baby.tsx:186 |
| 4. Tâches créées | `task_created` | ✅ OK | CreateTask.tsx:225 |
| 5. Bébés failed | `baby_creation_failed` | ✅ OK | Baby.tsx:214 |
| 6. Tâches failed création | `task_creation_failed` | ✅ OK | CreateTask.tsx:256 |
| 7. Clics notation | `review_write_clicked` | ✅ OK | ReviewPromptContext.tsx:139 |

---

## 📊 Événements EN PLUS (actuellement trackés)

### Catégorie: Review/Notation
| Événement | Utilité | Recommandation |
|-----------|---------|----------------|
| `review_prompt_shown` | Voir combien ont vu le prompt | 🟢 **GARDER** - utile pour calculer taux de conversion |
| `review_prompt_dismissed` | Voir combien ont fermé sans noter | 🟢 **GARDER** - utile pour calculer taux de conversion |
| `review_modal_opened_manually` | Ouverture manuelle depuis Settings | 🟡 **OPTIONNEL** - peu utilisé |

### Catégorie: Erreurs création compte
| Événement | Utilité | Recommandation |
|-----------|---------|----------------|
| `signup_error` | Debug erreurs inscription | 🟢 **GARDER** - important pour identifier les problèmes |

### Catégorie: Famille/Partage
| Événement | Utilité | Recommandation |
|-----------|---------|----------------|
| `baby_code_copied` | Voir engagement partage familial | 🟢 **GARDER** - indicateur d'engagement |
| `baby_joined` | Voir adoption familiale | 🟢 **GARDER** - indicateur de croissance |
| `baby_join_error` | Debug erreurs de join | 🟡 **OPTIONNEL** - utile pour debug |
| `baby_left` | Voir churn/désengagement | 🟢 **GARDER** - indicateur de rétention |

### Catégorie: Mise à jour bébé
| Événement | Utilité | Recommandation |
|-----------|---------|----------------|
| `baby_updated` | Voir modifications profil bébé | 🟡 **OPTIONNEL** - peu critique |
| `baby_update_failed` | Debug erreurs mise à jour | 🔴 **SUPPRIMER** - peu utile |

### Catégorie: Modification/Suppression tâches
| Événement | Utilité | Recommandation |
|-----------|---------|----------------|
| `task_updated` | Voir modifications tâches | 🟡 **OPTIONNEL** - peu critique |
| `task_update_failed` | Debug erreurs mise à jour tâches | 🔴 **SUPPRIMER** - peu utile |
| `task_deleted` | Voir suppressions tâches | 🟡 **OPTIONNEL** - peut indiquer erreurs utilisateur |
| `task_delete_failed` | Debug erreurs suppression | 🔴 **SUPPRIMER** - peu utile |

### Catégorie: Export
| Événement | Utilité | Recommandation |
|-----------|---------|----------------|
| `tasks_exported` | Voir utilisation feature export | 🟢 **GARDER** - indicateur d'utilisation feature |
| `export_failed` | Debug erreurs export | 🔴 **SUPPRIMER** - peu utile |

### Catégorie: Navigation (Screen Views)
| Événement | Utilité | Recommandation |
|-----------|---------|----------------|
| 10 screen views | Voir parcours utilisateur | 🟡 **SIMPLIFIER** - garder seulement les écrans clés |

---

## 🎯 Recommandations finales

### À GARDER (essentiels + utiles)
- ✅ `user_signup`
- ✅ `signup_error`
- ✅ `baby_created`
- ✅ `baby_creation_failed`
- ✅ `baby_joined`
- ✅ `baby_left`
- ✅ `baby_code_copied`
- ✅ `task_created`
- ✅ `task_creation_failed`
- ✅ `tasks_exported`
- ✅ `review_prompt_shown`
- ✅ `review_write_clicked`
- ✅ `review_prompt_dismissed`

**Total: 13 événements**

### À SUPPRIMER (peu utiles)
- ❌ `baby_updated`
- ❌ `baby_update_failed`
- ❌ `baby_join_error`
- ❌ `task_updated`
- ❌ `task_update_failed`
- ❌ `task_deleted`
- ❌ `task_delete_failed`
- ❌ `export_failed`
- ❌ `review_modal_opened_manually`

**Total: 9 événements à retirer**

### Screen Views - Simplifier
**Garder uniquement:**
- `Home` - Écran principal
- `CreateTask` - Ajout activité
- `Settings` - Paramètres

**Supprimer:**
- `SignIn`, `Baby`, `BabyTab`, `EditBaby`, `JoinBaby`, `UpdateTask`, `ExportTasks`

---

## 📝 Actions à prendre

1. **Standardiser en snake_case** tous les paramètres (babyId → baby_id, etc.)
2. **Supprimer** les 9 événements listés ci-dessus
3. **Simplifier** les screen views (garder 3 au lieu de 10)
4. **Vérifier** que tous les événements essentiels fonctionnent bien

Veux-tu que je fasse ces modifications ?
