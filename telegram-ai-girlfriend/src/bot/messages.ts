import { DEFAULT_LANGUAGE, type Language } from '../types/index.js';

export interface Strings {
  welcome: string;
  agePrompt: string;
  ageYes: string;
  ageNo: string;
  underAge: string;
  chooseLanguage: string;
  languageSaved: string;
  welcomeBack: string;
  chatSoon: string;
  needStart: string;
  genericError: string;
}

export const LANGUAGE_BUTTONS: ReadonlyArray<{ code: Language; label: string }> = [
  { code: 'en', label: '🇬🇧 English' },
  { code: 'fr', label: '🇫🇷 Français' },
  { code: 'es', label: '🇪🇸 Español' },
  { code: 'ar', label: '🇸🇦 العربية' },
];

export const MESSAGES: Record<Language, Strings> = {
  en: {
    welcome:
      "❤️ Welcome. I'm Lina, your AI companion.\nI'm a fictional AI character — not a real person. This service is for adults aged 18 and over only.",
    agePrompt: 'Before we continue, please confirm that you are 18 or older.',
    ageYes: "✅ I'm 18+",
    ageNo: "❌ I'm under 18",
    underAge: "I'm sorry, but this service is only for adults aged 18 and over. Access is not available.",
    chooseLanguage: 'Choose your language:',
    languageSaved: "Language saved: English 🇬🇧\nI'm so happy you're here ❤️",
    welcomeBack: 'Welcome back ❤️',
    chatSoon: "Chatting with me isn't available just yet — I'm still getting ready. Come back soon! ❤️",
    needStart: 'Please send /start to begin.',
    genericError: 'Something went wrong. Please try again later.',
  },
  fr: {
    welcome:
      "❤️ Bienvenue. Je suis Lina, ta compagne IA.\nJe suis un personnage fictif généré par IA — pas une vraie personne. Ce service est réservé aux adultes de 18 ans et plus.",
    agePrompt: 'Avant de continuer, merci de confirmer que tu as 18 ans ou plus.',
    ageYes: "✅ J'ai 18 ans ou plus",
    ageNo: "❌ J'ai moins de 18 ans",
    underAge: "Désolée, ce service est réservé aux adultes de 18 ans et plus. L'accès n'est pas disponible.",
    chooseLanguage: 'Choisis ta langue :',
    languageSaved: 'Langue enregistrée : Français 🇫🇷\nJe suis si heureuse que tu sois là ❤️',
    welcomeBack: 'Contente de te revoir ❤️',
    chatSoon: "La discussion avec moi n'est pas encore disponible — je me prépare encore. Reviens bientôt ! ❤️",
    needStart: 'Envoie /start pour commencer.',
    genericError: 'Une erreur est survenue. Réessaie plus tard.',
  },
  es: {
    welcome:
      '❤️ Bienvenido. Soy Lina, tu compañera de IA.\nSoy un personaje ficticio de IA, no una persona real. Este servicio es solo para adultos de 18 años o más.',
    agePrompt: 'Antes de continuar, confirma que tienes 18 años o más.',
    ageYes: '✅ Tengo 18 años o más',
    ageNo: '❌ Soy menor de 18',
    underAge: 'Lo siento, este servicio es solo para adultos de 18 años o más. El acceso no está disponible.',
    chooseLanguage: 'Elige tu idioma:',
    languageSaved: 'Idioma guardado: Español 🇪🇸\nMe alegra mucho que estés aquí ❤️',
    welcomeBack: 'Qué bueno verte de nuevo ❤️',
    chatSoon: 'Chatear conmigo aún no está disponible; todavía me estoy preparando. ¡Vuelve pronto! ❤️',
    needStart: 'Envía /start para comenzar.',
    genericError: 'Algo salió mal. Inténtalo de nuevo más tarde.',
  },
  ar: {
    welcome:
      '❤️ أهلاً بك. أنا لينا، رفيقتك بالذكاء الاصطناعي.\nأنا شخصية خيالية من صنع الذكاء الاصطناعي وليست شخصاً حقيقياً. هذه الخدمة مخصصة للبالغين الذين تبلغ أعمارهم 18 عاماً فأكثر فقط.',
    agePrompt: 'قبل أن نتابع، يرجى تأكيد أن عمرك 18 عاماً أو أكثر.',
    ageYes: '✅ عمري 18 عاماً أو أكثر',
    ageNo: '❌ عمري أقل من 18',
    underAge: 'عذراً، هذه الخدمة مخصصة للبالغين الذين تبلغ أعمارهم 18 عاماً فأكثر فقط. الوصول غير متاح.',
    chooseLanguage: 'اختر لغتك:',
    languageSaved: 'تم حفظ اللغة: العربية 🇸🇦\nيسعدني جداً وجودك هنا ❤️',
    welcomeBack: 'مرحباً بعودتك ❤️',
    chatSoon: 'الدردشة معي غير متاحة بعد، ما زلت أستعد. عد قريباً! ❤️',
    needStart: 'أرسل /start للبدء.',
    genericError: 'حدث خطأ ما. يرجى المحاولة لاحقاً.',
  },
};

export function t(language: Language | null | undefined): Strings {
  return MESSAGES[language ?? DEFAULT_LANGUAGE];
}
