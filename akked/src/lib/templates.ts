export const DEFAULT_TEMPLATES: Record<string, string> = {
  darija: 'السلام عليكم {name} 👋\nمعاك {shop}. توصلنا بطلبك: {product} بثمن {price} درهم.\nواش نأكدو ليك الطلب باش نشحنوه لـ {city}؟ جاوبنا بـ "نعم" لتأكيد 🙏',
  ar: 'السلام عليكم {name}،\nمعكم {shop}. لقد توصلنا بطلبكم: {product} بسعر {price} درهم، التوصيل إلى {city}.\nهل تؤكدون الطلب؟ المرجو الرد بـ "نعم" للتأكيد.',
  fr: 'Bonjour {name},\nCeci est {shop}. Nous avons bien reçu votre commande : {product} au prix de {price} MAD, livraison à {city}.\nConfirmez-vous la commande ? Répondez "oui" pour confirmer.',
};

export function renderTemplate(tpl: string, vars: Record<string, string | number>): string {
  return tpl.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}

export function waLink(phoneE164: string, message: string): string {
  return `https://wa.me/${phoneE164.replace('+', '')}?text=${encodeURIComponent(message)}`;
}

const ASK_ADDRESS: Record<string, string> = {
  darija: 'عافاك صيفط لينا العنوان الكامل 🏠',
  ar: 'المرجو إرسال العنوان الكامل.',
  fr: 'Merci de nous envoyer votre adresse complète.',
};
export interface MsgOrder { customer_name: string; products?: string | null; size?: string | null; color?: string | null; price: number; city?: string | null; address?: string | null; order_number?: string | null; quantity?: number | null }

/** Variables: {name} {product} {price} {city} {address} {order_number} {size} {qty} {shop}. Adds an "send your address" line when the address is missing. */
export function buildMessage(tpl: string | null | undefined, key: 'darija' | 'ar' | 'fr', o: MsgOrder, shop: string): string {
  const msg = renderTemplate(tpl || DEFAULT_TEMPLATES[key], {
    name: o.customer_name, product: [o.products, o.size, o.color].filter(Boolean).join(' '), price: o.price, city: o.city || '',
    address: o.address || '', order_number: o.order_number || '', size: o.size || '', qty: o.quantity ?? 1, shop,
  });
  return o.address && o.address.trim() ? msg : msg + '\n' + ASK_ADDRESS[key];
}
