import { cookies } from 'next/headers';

export type Locale = 'ar' | 'fr';
const dict = {
  ar: {
    appName: 'أكّد', tagline: 'أكّد طلباتك أسرع وقلّل الرفض',
    login: 'تسجيل الدخول', signup: 'إنشاء حساب', logout: 'خروج', email: 'البريد الإلكتروني', password: 'كلمة السر',
    storeName: 'اسم المتجر', fullName: 'الاسم الكامل', orders: 'الطلبات', dashboard: 'لوحة المؤشرات', team: 'الفريق',
    settings: 'الإعدادات', admin: 'الإدارة', newOrder: 'طلب جديد', import: 'استيراد', export: 'تصدير',
    name: 'اسم الزبون', phone: 'الهاتف', city: 'المدينة', address: 'العنوان', product: 'المنتج', size: 'المقاس',
    color: 'اللون', qty: 'الكمية', price: 'الثمن (درهم)', notes: 'ملاحظات', save: 'حفظ', search: 'بحث بالاسم أو الهاتف',
    status: 'الحالة', all: 'الكل', agent: 'الموظف', from: 'من', to: 'إلى', filter: 'تصفية', whatsapp: 'واتساب',
    template: 'القالب', callbackAt: 'تاريخ ورقم معاودة الاتصال', history: 'سجل الزبون', refusedBefore: 'رفض سابقًا',
    noHistory: 'لا طلبات سابقة', invalidPhone: 'رقم هاتف غير صحيح', limitReached: 'بلغت الحد الشهري للطلبات. رقّ باقتك.',
    expired: 'انتهى اشتراكك. تواصل معنا لتفعيله.', pasteHint: 'ألصق من Excel/CSV (السطر الأول عناوين الأعمدة: name, phone, city, product, price...)',
    importBtn: 'استيراد', imported: 'تم استيراد', skipped: 'تم تجاوز', exportConfirmed: 'تصدير الطلبات المؤكدة',
    ordersPerDay: 'الطلبات يوميًا', confirmRate: 'نسبة التأكيد', refusalRate: 'نسبة الرفض', topCities: 'أهم المدن', agents: 'أداء الموظفين',
    plan: 'الباقة', usage: 'الاستعمال هذا الشهر', addAgent: 'إضافة موظف', agentLimit: 'بلغت حد المستخدمين في باقتك.',
    tempPassword: 'كلمة سر مؤقتة', activate: 'تفعيل', suspend: 'إيقاف', periodEnd: 'نهاية الفترة', days: 'أيام',
    s_new: 'جديد', s_message_sent: 'تم إرسال الرسالة', s_confirmed: 'مؤكد', s_cancelled: 'ملغى', s_no_answer: 'لا يجيب',
    s_callback: 'معاودة الاتصال', s_shipped: 'تم الشحن', s_delivered: 'تم التسليم', s_returned: 'مرتجع',
    openWa: 'فتح واتساب', total: 'المجموع', none: 'لا شيء', updateStatus: 'تحديث الحالة', myTemplates: 'قوالب الرسائل', vars: 'المتغيرات',
    darija: 'الدارجة', arabic: 'العربية', french: 'الفرنسية', exported: 'مُصدَّر',
  },
  fr: {
    appName: 'Akked', tagline: 'Confirmez vos commandes plus vite, réduisez les refus',
    login: 'Connexion', signup: 'Créer un compte', logout: 'Déconnexion', email: 'E-mail', password: 'Mot de passe',
    storeName: 'Nom de la boutique', fullName: 'Nom complet', orders: 'Commandes', dashboard: 'Tableau de bord', team: 'Équipe',
    settings: 'Paramètres', admin: 'Admin', newOrder: 'Nouvelle commande', import: 'Importer', export: 'Exporter',
    name: 'Nom du client', phone: 'Téléphone', city: 'Ville', address: 'Adresse', product: 'Produit', size: 'Taille',
    color: 'Couleur', qty: 'Quantité', price: 'Prix (MAD)', notes: 'Notes', save: 'Enregistrer', search: 'Rechercher nom ou téléphone',
    status: 'Statut', all: 'Tous', agent: 'Agent', from: 'Du', to: 'Au', filter: 'Filtrer', whatsapp: 'WhatsApp',
    template: 'Modèle', callbackAt: 'Date/heure de rappel', history: 'Historique client', refusedBefore: 'A refusé avant',
    noHistory: 'Aucune commande précédente', invalidPhone: 'Numéro de téléphone invalide', limitReached: 'Limite mensuelle atteinte. Passez à un plan supérieur.',
    expired: 'Votre abonnement a expiré. Contactez-nous pour l’activer.', pasteHint: 'Collez depuis Excel/CSV (1re ligne = en-têtes : name, phone, city, product, price...)',
    importBtn: 'Importer', imported: 'Importées', skipped: 'Ignorées', exportConfirmed: 'Exporter les commandes confirmées',
    ordersPerDay: 'Commandes par jour', confirmRate: 'Taux de confirmation', refusalRate: 'Taux de refus', topCities: 'Top villes', agents: 'Performance des agents',
    plan: 'Plan', usage: 'Utilisation ce mois', addAgent: 'Ajouter un agent', agentLimit: 'Limite d’utilisateurs atteinte pour votre plan.',
    tempPassword: 'Mot de passe temporaire', activate: 'Activer', suspend: 'Suspendre', periodEnd: 'Fin de période', days: 'jours',
    s_new: 'Nouveau', s_message_sent: 'Message envoyé', s_confirmed: 'Confirmé', s_cancelled: 'Annulé', s_no_answer: 'Pas de réponse',
    s_callback: 'À rappeler', s_shipped: 'Expédié', s_delivered: 'Livré', s_returned: 'Retourné',
    openWa: 'Ouvrir WhatsApp', total: 'Total', none: 'Aucun', updateStatus: 'Mettre à jour', myTemplates: 'Modèles de messages', vars: 'Variables',
    darija: 'Darija', arabic: 'Arabe', french: 'Français', exported: 'Exporté',
  },
} as const;

export type Dict = (typeof dict)['ar'];
export async function getLocale(): Promise<Locale> {
  const v = (await cookies()).get('akked_lang')?.value;
  return v === 'fr' ? 'fr' : 'ar';
}
export async function getT() {
  const l = await getLocale();
  return { l, t: dict[l] as Dict, dir: l === 'ar' ? 'rtl' : 'ltr' } as const;
}
export const STATUSES = ['new', 'message_sent', 'confirmed', 'cancelled', 'no_answer', 'callback', 'shipped', 'delivered', 'returned'] as const;
export type Status = (typeof STATUSES)[number];
