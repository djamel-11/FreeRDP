export const DEFAULT_TEMPLATES: Record<string, string> = {
  darija: 'السلام عليكم {name} 👋\nتوصلنا بطلبك: {product} بثمن {price} درهم.\nواش نأكدو ليك الطلب باش نشحنوه لـ {city}؟ جاوبنا بـ "نعم" لتأكيد 🙏',
  ar: 'السلام عليكم {name}،\nلقد توصلنا بطلبكم: {product} بسعر {price} درهم، التوصيل إلى {city}.\nهل تؤكدون الطلب؟ المرجو الرد بـ "نعم" للتأكيد.',
  fr: 'Bonjour {name},\nNous avons bien reçu votre commande : {product} au prix de {price} MAD, livraison à {city}.\nConfirmez-vous la commande ? Répondez "oui" pour confirmer.',
};

export function renderTemplate(tpl: string, vars: Record<string, string | number>): string {
  return tpl.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}

export function waLink(phoneE164: string, message: string): string {
  return `https://wa.me/${phoneE164.replace('+', '')}?text=${encodeURIComponent(message)}`;
}
