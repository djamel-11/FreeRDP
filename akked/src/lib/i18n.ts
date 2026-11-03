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
    ameexTitle: 'ربط AMEEX', ameexId: 'API ID', ameexKey: 'API Key (يُحفظ مشفّرًا؛ اتركه فارغًا للإبقاء على القديم)', ameexSent: 'تم الإرسال إلى AMEEX', ameexSend: 'إرسال إلى AMEEX', ameexParcel: 'رقم الطرد', ameexOff: 'تم فصل AMEEX', ameexSaved: 'تم الحفظ',
    ameex_notconfirmed: 'يجب أن يكون الطلب مؤكدًا', ameex_already: 'سبق إرساله', ameex_nocreds: 'اربط حساب AMEEX من الإعدادات أولًا', ameex_nocity: 'مدينة غير معروفة أو بدون رقم AMEEX', ameex_fail: 'رفضه AMEEX أو تعذّر الاتصال', quickAdd: 'إضافة سريعة', pasteOrder: 'ألصق الطلب هنا (من واتساب أو إنستغرام أو أي مكان)', parseHint: 'يمكنك لصق عدة طلبات: افصل بينها بسطر فارغ، أو سطر لكل طلب', saveAll: 'حفظ الكل', foundN: 'تم التعرف على', badPhone: 'رقم غير صحيح', fullForm: 'نموذج كامل', remove: 'حذف', added: 'تمت إضافة', confirmNav: 'تأكيد', laneSend: 'للإرسال', laneReply: 'بانتظار الرد', skip: 'تخطي', sendWa: 'إرسال واتساب', openChat: 'فتح المحادثة', btnConfirm: '✅ مؤكد', btnCancel: '❌ ملغى', btnNoAnswer: '📵 لا يجيب', btnLater2h: '⏰ بعد ساعتين', btnTomorrow: '⏰ غدًا', allDone: 'لا شيء بانتظارك 🎉', startConfirm: 'ابدأ التأكيد', exampleOrder: 'مثال:\nسارة 0612345678 كازا فستان 199 درهم', remaining: 'المتبقي', messagePreview: 'الرسالة', call: 'اتصال', cityWarn: 'مدينة غير معروفة في طلبات مؤكدة (صحّحها قبل التصدير)', darija: 'الدارجة', arabic: 'العربية', french: 'الفرنسية', exported: 'مُصدَّر',
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
    ameexTitle: 'Connexion AMEEX', ameexId: 'API ID', ameexKey: 'API Key (chiffrée ; laisser vide pour conserver)', ameexSent: 'Envoyé à AMEEX', ameexSend: 'Envoyer à AMEEX', ameexParcel: 'Code colis', ameexOff: 'AMEEX déconnecté', ameexSaved: 'Enregistré',
    ameex_notconfirmed: 'La commande doit être confirmée', ameex_already: 'Déjà envoyé', ameex_nocreds: 'Connectez AMEEX dans les paramètres', ameex_nocity: 'Ville inconnue ou sans ID AMEEX', ameex_fail: 'Refusé par AMEEX ou erreur réseau', quickAdd: 'Ajout rapide', pasteOrder: 'Collez la commande ici (WhatsApp, Instagram, n’importe où)', parseHint: 'Vous pouvez coller plusieurs commandes : séparez-les par une ligne vide, ou une ligne par commande', saveAll: 'Tout enregistrer', foundN: 'Détecté', badPhone: 'Numéro invalide', fullForm: 'Formulaire complet', remove: 'Supprimer', added: 'Ajoutées', confirmNav: 'Confirmer', laneSend: 'À envoyer', laneReply: 'En attente de réponse', skip: 'Passer', sendWa: 'Envoyer WhatsApp', openChat: 'Ouvrir la discussion', btnConfirm: '✅ Confirmé', btnCancel: '❌ Annulé', btnNoAnswer: '📵 Pas de réponse', btnLater2h: '⏰ Dans 2 h', btnTomorrow: '⏰ Demain', allDone: 'Rien en attente 🎉', startConfirm: 'Commencer la confirmation', exampleOrder: 'Exemple :\nSara 0612345678 casa robe 199 dh', remaining: 'Restant', messagePreview: 'Message', call: 'Appeler', cityWarn: 'Ville non reconnue dans des commandes confirmées (corrigez avant export)', darija: 'Darija', arabic: 'Arabe', french: 'Français', exported: 'Exporté',
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
