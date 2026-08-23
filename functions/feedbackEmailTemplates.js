// Templates pour les emails de feedback automatiques (segments "sans bébé" et "décroché")

const FOOTER = {
  fr: "Tu reçois cet email car tu as activé les communications dans Réglages. Tu peux les désactiver à tout moment dans TribuBaby > Réglages > Communications.",
  en: "You're receiving this email because you enabled communications in Settings. You can turn them off anytime in TribuBaby > Settings > Communications.",
  es: "Recibes este email porque activaste las comunicaciones en Ajustes. Puedes desactivarlas cuando quieras en TribuBaby > Ajustes > Comunicaciones.",
};

const GREETING = {
  fr: (name) => (name ? `Bonjour ${name},` : 'Bonjour,'),
  en: (name) => (name ? `Hi ${name},` : 'Hi,'),
  es: (name) => (name ? `Hola ${name},` : 'Hola,'),
};

const NO_BABY = {
  fr: {
    subject: 'On aimerait beaucoup avoir ton avis 💛',
    paragraphs: [
      "On est l'équipe derrière TribuBaby. On a vu que tu avais créé ton compte, et on voulait juste prendre des nouvelles.",
      "On sait à quel point le quotidien avec un bébé peut être intense. Si quelque chose t'a freiné ou n'a pas été assez clair pour ajouter ton bébé, on aimerait beaucoup savoir comment s'améliorer.",
      "Si jamais tu avais 2 minutes à nous accorder pour nous dire ce qui s'est passé, ce serait merveilleux. Chaque retour nous aide énormément à rendre l'app plus utile pour les familles comme la tienne. Tu peux répondre directement à cet email, même juste quelques mots — on lit avec attention tout ce qu'on reçoit.",
      "Merci infiniment, et plein de courage pour cette belle aventure avec bébé 💛",
    ],
    signature: "Delphine et Christopher, de l'équipe TribuBaby",
  },
  en: {
    subject: "We'd love to hear from you 💛",
    paragraphs: [
      "We're the team behind TribuBaby. We saw you created your account, and just wanted to check in.",
      "We know how intense life with a baby can be. If something got in the way or wasn't clear enough when adding your baby, we'd really love to know how we can improve.",
      "If you ever have 2 minutes to share what happened, it would truly mean a lot to us. Every bit of feedback helps us make the app better for families like yours. Feel free to just reply to this email, even a few words — we read everything we receive with care.",
      "Thank you so much, and warm wishes for this beautiful journey with your baby 💛",
    ],
    signature: 'Delphine and Christopher, the TribuBaby team',
  },
  es: {
    subject: 'Nos encantaría saber de ti 💛',
    paragraphs: [
      'Somos el equipo detrás de TribuBaby. Vimos que creaste tu cuenta y solo queríamos saber cómo estás.',
      'Sabemos lo intenso que puede ser el día a día con un bebé. Si algo te lo dificultó o no quedó lo suficientemente claro para añadir a tu bebé, nos encantaría saber cómo mejorar.',
      'Si alguna vez tienes 2 minutos para contarnos qué pasó, sería maravilloso. Cada comentario nos ayuda muchísimo a mejorar la app para familias como la tuya. Puedes responder directamente a este email, aunque sean solo un par de palabras — leemos con cariño todo lo que recibimos.',
      'Muchísimas gracias, y mucho ánimo en esta bonita aventura con tu bebé 💛',
    ],
    signature: 'Delphine y Christopher, del equipo TribuBaby',
  },
};

const CHURN = {
  fr: {
    subject: 'On pensait à toi et à ton bébé 💛',
    paragraphs: [
      "On est l'équipe derrière TribuBaby. On a vu que tu avais commencé à suivre ton bébé sur l'app, et qu'on ne t'a plus revu depuis quelques jours.",
      "Pas d'inquiétude, on ne te contacte pas pour te presser — on sait que le rythme avec un bébé change tout le temps. On voulait simplement savoir si tout allait bien, et si quelque chose t'a gêné dans l'app.",
      "Si tu avais un petit moment pour nous le raconter, ce serait vraiment précieux pour nous. Ton avis compte énormément et nous aide à faire une meilleure app pour toutes les familles qui l'utilisent. Tu peux juste répondre à cet email — on lit chaque message avec beaucoup d'attention.",
      'Merci du fond du cœur, et prends bien soin de vous deux 💛',
    ],
    signature: "Delphine et Christopher, de l'équipe TribuBaby",
  },
  en: {
    subject: 'Just thinking of you and your baby 💛',
    paragraphs: [
      "We're the team behind TribuBaby. We saw you started tracking your baby on the app, and haven't seen you in a little while.",
      "No worries at all, we're not reaching out to rush you — we know how much the rhythm changes with a baby. We just wanted to check that everything is okay, and see if something bothered you about the app.",
      'If you ever had a moment to share what happened, it would mean so much to us. Your feedback really helps us build a better app for all the families using it. Feel free to just reply to this email — we read every message with a lot of care.',
      'Thank you from the bottom of our hearts, and take good care of you both 💛',
    ],
    signature: 'Delphine and Christopher, the TribuBaby team',
  },
  es: {
    subject: 'Pensando en ti y en tu bebé 💛',
    paragraphs: [
      'Somos el equipo detrás de TribuBaby. Vimos que empezaste a registrar a tu bebé en la app, y hace unos días que no sabemos de ti.',
      'No te preocupes, no te escribimos para presionarte — sabemos que el ritmo cambia constantemente con un bebé. Solo queríamos saber si todo está bien, y si algo te incomodó de la app.',
      'Si en algún momento tienes un ratito para contarnos qué pasó, sería muy valioso para nosotros. Tu opinión cuenta muchísimo y nos ayuda a construir una app mejor para todas las familias que la usan. Puedes simplemente responder a este email — leemos cada mensaje con mucho cariño.',
      'Muchas gracias de corazón, y cuídense mucho los dos 💛',
    ],
    signature: 'Delphine y Christopher, del equipo TribuBaby',
  },
};

function wrapHtml(lang, greeting, paragraphs, signature) {
  const body = [greeting, ...paragraphs, signature]
    .map((line) => `<p style="margin:0 0 16px;">${line}</p>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#FDF1E7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:14px;padding:32px 28px;">
      <tr><td style="font-size:15px;line-height:1.7;color:#333333;">
        ${body}
      </td></tr>
      <tr><td style="padding-top:12px;border-top:1px solid #f3f4f6;">
        <div style="font-size:12px;color:#9ca3af;line-height:1.5;padding-top:16px;">${FOOTER[lang]}</div>
      </td></tr>
    </table>
  </td></tr></table>
</body>
</html>`;
}

function buildEmail(template, lang, username) {
  const t = template[lang] || template.fr;
  const greetingFn = GREETING[lang] || GREETING.fr;
  const html = wrapHtml(lang, greetingFn(username), t.paragraphs, t.signature);
  return { subject: t.subject, html };
}

function buildNoBabyEmail(lang, username) {
  return buildEmail(NO_BABY, lang, username);
}

function buildChurnEmail(lang, username) {
  return buildEmail(CHURN, lang, username);
}

module.exports = { buildNoBabyEmail, buildChurnEmail };
