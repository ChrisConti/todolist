import type { DocArticle } from '../types';

export const feedbackEmailsArticle: DocArticle = {
  id: 'feedback-emails',
  title: 'Emails de feedback automatiques (onboarding & churn)',
  date: '2026-08-11',
  summary:
    "Deux emails automatiques envoyés aux utilisateurs qui décrochent, pour comprendre pourquoi et recueillir du feedback qualitatif.",
  tags: ['emails', 'retention', 'cloud functions', 'brevo'],
  blocks: [
    {
      type: 'p',
      text: "Objectif : certains utilisateurs créent un compte mais n'ajoutent jamais de bébé, d'autres utilisent l'app quelques jours puis disparaissent. Plutôt que de deviner pourquoi, on leur envoie un email personnel (signé Delphine & Christopher) qui invite à répondre directement — pas de formulaire, pas de tracking de clic, juste une vraie question ouverte.",
    },
    {
      type: 'h2',
      text: 'Les deux segments',
    },
    {
      type: 'list',
      items: [
        "Segment « pas de bébé » : compte créé entre 48h et 30 jours, aucun Baby où l'utilisateur est admin ou dans user[].",
        "Segment « décroché » : compte de moins de 30 jours, au moins 1 tâche créée par cet utilisateur précisément (task.createdBy, pas juste « le bébé a une tâche »), aucune nouvelle tâche depuis 3 jours ou plus.",
      ],
    },
    {
      type: 'callout',
      tone: 'info',
      text: "Le segment « décroché » regarde les tâches créées par l'utilisateur lui-même, pas par le bébé. Sur un bébé partagé à 2 parents, si l'un des deux arrête de logger mais que l'autre continue, le premier reçoit quand même l'email — c'est volontaire.",
    },
    {
      type: 'h2',
      text: 'Règles anti-spam',
    },
    {
      type: 'list',
      items: [
        "Respect strict du toggle emailOptIn (Réglages > Communications) — jamais envoyé si désactivé.",
        "Un envoi maximum par motif et par utilisateur, à vie. Dès l'envoi réussi, on écrit feedbackEmailSent.noBaby ou feedbackEmailSent.churn (timestamp) sur le doc Users, qui bloque tout renvoi futur.",
        "Bornes d'ancienneté de compte sur les deux segments (48h–30j et <30j) pour ne jamais mailer de vieux comptes dormants — sans ça, le premier déploiement aurait écrit à tous les comptes historiques sans bébé d'un coup.",
        "Plafond de 40 emails par exécution, partagé entre les 2 segments. Le reliquat repart au run du lendemain plutôt que d'envoyer une vague massive.",
        "Pause de 300ms entre chaque envoi pour rester dans les limites de débit Brevo.",
        "Comptes de test exclus (android@android.com, test@apple.com).",
      ],
    },
    {
      type: 'h2',
      text: 'Déclenchement & envoi',
    },
    {
      type: 'p',
      text: "Cloud Function planifiée feedbackEmails, tous les jours à 10h (Europe/Paris) — volontairement décalée de dailyStats (8h) pour ne pas cumuler les deux exécutions. Envoi via l'API Brevo, expéditeur tribubabytracker@gmail.com (même adresse que les autres emails auto), avec reply-to sur la même adresse : toute réponse arrive directement dans la messagerie suivie par l'équipe.",
    },
    {
      type: 'h2',
      text: 'Langue de l\'email',
    },
    {
      type: 'p',
      text: "Depuis ce déploiement, un champ language (ex: \"fr\") est enregistré sur le doc Users à la création du compte (email, Google, Apple). Pour les comptes créés avant, on retombe sur une correspondance approximative via le pays (country), puis sur le français par défaut.",
    },
    {
      type: 'h2',
      text: 'Incident mémoire (11 août) — corrigé',
    },
    {
      type: 'p',
      text: "Le tout premier run (11 août, 10h) a planté en out-of-memory : findChurnCandidates chargeait le tasks[] complet de TOUS les bébés pour repérer les utilisateurs décrochés, exactement le même bug qui avait fait taire dailyStats pendant une semaine début août. Corrigé le jour même : les bébés sont maintenant chargés sans tasks[] (.select('admin', 'user')), et le tasks[] complet n'est récupéré que pour les bébés des utilisateurs déjà pré-filtrés comme éligibles au segment décroché (compte < 30j, opt-in, pas déjà mailé) — un sous-ensemble bien plus petit que l'historique complet.",
    },
    {
      type: 'h2',
      text: 'Bug additionnel (21 août) — segment "décroché" resté silencieusement cassé',
    },
    {
      type: 'p',
      text: "Même cause que le bug \"sans tâche\" de dailyStats (cf. article Rapport quotidien) : fetchBabiesWithTasks() écrasait l'id Firestore du bébé avec un champ interne du même nom (code de partage à 6 caractères). Conséquence ici : lastTaskDateForUser() ne trouvait jamais aucune tâche pour personne, donc tous les candidats du segment churn étaient éliminés (\"n'a jamais rien saisi\") — probablement aucun email churn envoyé depuis le déploiement initial, sans aucune erreur ni alerte, juste 0 envoi silencieux chaque jour.",
    },
    {
      type: 'callout',
      tone: 'warning',
      text: "Fix identique : { ...doc.data(), id: doc.id } au lieu de { id: doc.id, ...doc.data() }. Le segment \"pas de bébé\" n'était pas affecté (ne dépend pas des tâches).",
    },
    {
      type: 'h2',
      text: 'Fichiers concernés',
    },
    {
      type: 'code',
      text:
        'functions/feedbackEmails.js            → logique des segments + envoi\nfunctions/feedbackEmailTemplates.js    → textes FR/EN/ES des 2 emails\nfunctions/index.js                     → export de la fonction planifiée\nSignIn.tsx, Connection.tsx,\nutils/socialAuth.ts                    → écriture du champ language à la création du compte',
    },
    {
      type: 'callout',
      tone: 'warning',
      text: "Le code de dailyStats (rapport interne quotidien) n'a volontairement pas été touché ni factorisé avec feedbackEmails, pour ne rien risquer sur un email déjà en prod.",
    },
    {
      type: 'h2',
      text: 'Pour ajouter un nouveau segment ou email plus tard',
    },
    {
      type: 'list',
      items: [
        "Ajouter la fonction de détection dans feedbackEmails.js (même pattern que findNoBabyCandidates / findChurnCandidates).",
        "Ajouter le template FR/EN/ES dans feedbackEmailTemplates.js.",
        "Prévoir un nouveau flag dans feedbackEmailSent pour l'anti-doublon.",
        "Redéployer avec : firebase deploy --only functions",
      ],
    },
  ],
};
