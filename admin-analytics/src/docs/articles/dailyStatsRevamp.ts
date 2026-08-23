import type { DocArticle } from '../types';

export const dailyStatsRevampArticle: DocArticle = {
  id: 'daily-stats-revamp',
  title: 'Rapport quotidien : fix mémoire, contenu resserré, comparatif hebdo',
  date: '2026-08-11',
  summary:
    "L'email dailyStats ne partait plus depuis ~1 semaine (crash mémoire). Corrigé, contenu recentré sur \"Hier\" + tâches des nouveaux bébés, et ajout d'une section comparative hebdomadaire le lundi.",
  tags: ['emails', 'cloud functions', 'brevo', 'monitoring'],
  blocks: [
    {
      type: 'h2',
      text: 'Le bug : plus aucun email depuis le 5 août',
    },
    {
      type: 'p',
      text: "La fonction planifiée dailyStats (8h chaque matin) chargeait en mémoire le tableau tasks[] complet de TOUS les bébés créés depuis le lancement de l'app, alors que le rapport ne porte que sur hier et avant-hier. À mesure que la base de tâches grossissait, la fonction a fini par dépasser la limite mémoire de 512 MiB — d'abord silencieusement (le calcul plantait avant l'envoi), puis avec un vrai crash \"heap out of memory\" le 6 août. Résultat : aucun email envoyé pendant une semaine, sans alerte visible ailleurs que dans les logs Cloud Functions.",
    },
    {
      type: 'callout',
      tone: 'warning',
      text: "Diagnostiqué via firebase functions:log --only dailyStats — chercher \"Memory limit exceeded\" ou \"out of memory\" en cas de doute sur un email planifié qui ne part pas.",
    },
    {
      type: 'h2',
      text: 'Le fix : arrêter de charger ce qui n\'est pas nécessaire',
    },
    {
      type: 'list',
      items: [
        "Les bébés sont maintenant chargés en mode léger via .select('admin', 'user', 'createdDate', 'CreatedDate') — sans le champ tasks[], responsable de l'essentiel du poids mémoire.",
        "Le tasks[] complet n'est récupéré que pour les quelques bébés créés dans la fenêtre du rapport (hier/avant-hier, ou la fenêtre étendue le lundi), via une requête ciblée sur les documentId() par lots de 10.",
        "Le fetch de la collection AppInstalls a été supprimé : les données étaient chargées mais jamais utilisées dans le rapport (code mort).",
      ],
    },
    {
      type: 'h2',
      text: 'Contenu resserré : uniquement "Hier"',
    },
    {
      type: 'p',
      text: "Les sections Avant-hier, 7 derniers jours et Totaux cumulés ont été retirées — seule la section Hier restait vraiment utilisée. Elle garde son comparatif ▲▼ vs avant-hier sur les comptes créés, et gagne 3 nouvelles lignes : parmi les bébés créés hier, combien sont sans tâche, combien ont 1-2 tâches, combien en ont 3 ou plus. Un signal direct sur l'engagement immédiat des nouveaux venus.",
    },
    {
      type: 'h2',
      text: 'Nouveau : comparatif hebdomadaire, le lundi uniquement',
    },
    {
      type: 'p',
      text: "Même email, pas de fonction ni de cron supplémentaire. Quand la fonction tourne un lundi (new Date().getDay() === 1), une section additionnelle apparaît : la semaine calendaire qui vient de se terminer (lundi→dimanche) comparée à celle d'avant, avec les mêmes métriques que la section Hier — comptes créés (+ répartition iOS/Android), bébés créés, rejoints, sans bébé, et les 3 tranches de tâches — chacune avec son écart ▲▼.",
    },
    {
      type: 'h2',
      text: 'Fichiers concernés',
    },
    {
      type: 'code',
      text:
        'functions/index.js\n  fetchUsersAndBabiesLight()  → fetch léger Users + Baby (sans tasks[])\n  fetchBabiesWithTasks()     → fetch ciblé du tasks[] pour les bébés récents seulement\n  weekRange()                → semaine calendaire lundi→dimanche\n  buildDayStats()            → réutilisée telle quelle pour un jour OU une semaine (même forme de range)\n  buildHtml()                → section hebdo rendue seulement si weekly est fourni',
    },
    {
      type: 'callout',
      tone: 'info',
      text: "buildDayStats() est générique : elle prend n'importe quel { start, end } et fonctionne aussi bien pour \"hier\" que pour \"la semaine dernière\". Pas besoin d'une fonction dédiée pour l'agrégation hebdo.",
    },
    {
      type: 'h2',
      text: 'Bug additionnel (21 août) — tous les bébés affichés "sans tâche"',
    },
    {
      type: 'p',
      text: "Chaque document Baby a son propre champ id en donnée (un code de partage à 6 caractères, ex: M9MRFK), distinct de l'identifiant du document Firestore (ex: 0zqFFbE2MxHOCawsLNOs). Dans fetchBabiesWithTasks(), le code faisait { id: doc.id, ...doc.data() } — le spread s'exécutant après, il écrasait systématiquement id: doc.id avec ce champ interne. Résultat : taskCountByBabyId était indexée par le mauvais identifiant, donc toutes les recherches échouaient et chaque bébé retombait sur 0 tâche, quelle que soit son activité réelle.",
    },
    {
      type: 'callout',
      tone: 'warning',
      text: "Fix : inverser l'ordre → { ...doc.data(), id: doc.id }, pour que le vrai id Firestore gagne toujours. Repéré parce que l'utilisateur a trouvé le comptage \"sans tâche\" suspect dans l'email — vérifié ensuite en confrontant les doc.id d'un collection.get() à des .doc(id).get() individuels, qui échouaient silencieusement (docs \"introuvables\").",
    },
  ],
};
