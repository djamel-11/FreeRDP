import { getSetting } from './settings';
import type { Locale } from './i18n';

export interface Section { h: string; p: string[] }
const op = () => ({
  name: getSetting('operator_name') || '[…]', contact: getSetting('operator_contact') || '[…]', law: getSetting('jurisdiction') || 'المغرب / Maroc',
});

export function privacy(l: Locale): { title: string; sections: Section[] } {
  const o = op();
  return l === 'fr' ? { title: 'Politique de confidentialité', sections: [
    { h: '1. Qui sommes-nous', p: [`Akked est exploité par ${o.name}. Contact : ${o.contact}.`] },
    { h: '2. Rôles', p: ['Le vendeur est responsable du traitement des données de ses clients ; Akked agit comme sous-traitant et ne les traite que pour fournir le service. Akked est responsable des données du compte du vendeur.'] },
    { h: '3. Données traitées', p: ['Compte : nom, e-mail, mot de passe (stocké haché), rôle.', 'Commandes saisies par le vendeur : nom, téléphone, ville, adresse, produits, prix, notes, historique des statuts.', 'Messages WhatsApp via l’API officielle (si activée) et paiements d’abonnement (référence, justificatif éventuel).'] },
    { h: '4. Finalités', p: ['Gérer et confirmer les commandes, préparer les envois, fournir les statistiques, facturer l’abonnement et assurer la sécurité du service.'] },
    { h: '5. Cloisonnement', p: ['Les données de chaque vendeur sont isolées : elles ne sont jamais partagées avec un autre vendeur ni vendues.'] },
    { h: '6. Conservation', p: ['Tant que le compte est actif. Le vendeur peut exporter ou supprimer ses données à tout moment (Paramètres → Mes données). Les sauvegardes techniques sont conservées environ 14 jours.'] },
    { h: '7. Sécurité', p: ['Mots de passe hachés, clés d’API chiffrées, contrôle des rôles côté serveur, limitation des tentatives de connexion, sauvegardes régulières.'] },
    { h: '8. Vos droits (loi 09-08)', p: ['Accès, rectification, opposition et suppression. Un client final peut s’adresser au vendeur, qui peut effacer ses données depuis l’application. Vous pouvez aussi nous écrire : ' + o.contact + '.'] },
    { h: '9. Hébergement et prestataires', p: ['Les données sont hébergées chez le prestataire choisi par l’exploitant ; WhatsApp/Meta et AMEEX ne reçoivent que les données nécessaires lorsque le vendeur utilise ces intégrations.'] },
  ] } : { title: 'سياسة الخصوصية', sections: [
    { h: '1. من نحن', p: [`تُشغَّل منصة «أكّد» من طرف ${o.name}. للتواصل: ${o.contact}.`] },
    { h: '2. الأدوار', p: ['البائع هو المسؤول عن معالجة بيانات زبائنه، و«أكّد» معالِج يعالجها فقط لتقديم الخدمة. و«أكّد» مسؤولة عن بيانات حساب البائع نفسه.'] },
    { h: '3. البيانات التي نعالجها', p: ['الحساب: الاسم، البريد، كلمة السر (تُخزَّن مجزّأة)، الدور.', 'الطلبات التي يدخلها البائع: اسم الزبون وهاتفه ومدينته وعنوانه والمنتجات والثمن والملاحظات وسجل الحالات.', 'رسائل واتساب عبر الواجهة الرسمية (إن فُعّلت) ومدفوعات الاشتراك (المرجع والوصل إن وُجد).'] },
    { h: '4. الأغراض', p: ['إدارة الطلبات وتأكيدها وتجهيز الشحن وإعطاء الإحصائيات وتحصيل الاشتراك وحماية الخدمة.'] },
    { h: '5. العزل بين البائعين', p: ['بيانات كل بائع معزولة، ولا تُشارَك مع بائع آخر ولا تُباع أبدًا.'] },
    { h: '6. مدة الحفظ', p: ['ما دام الحساب نشطًا. يستطيع البائع تصدير بياناته أو حذفها في أي وقت (الإعدادات ← بياناتي). وتُحفظ النسخ الاحتياطية التقنية نحو 14 يومًا.'] },
    { h: '7. الأمان', p: ['كلمات السر مجزّأة، ومفاتيح الواجهات مشفّرة، والصلاحيات تُفرض من الخادم، ومحاولات الدخول محدودة، ونسخ احتياطية دورية.'] },
    { h: '8. حقوقك (القانون 09-08)', p: ['الاطلاع والتصحيح والاعتراض والحذف. يستطيع الزبون النهائي مراجعة البائع الذي يمكنه محو بياناته من التطبيق، ويمكنكم مراسلتنا: ' + o.contact + '.'] },
    { h: '9. الاستضافة والمزوّدون', p: ['تُستضاف البيانات لدى المزوّد الذي يختاره المشغّل. ولا يتلقى واتساب/Meta أو AMEEX إلا ما يلزم عندما يفعّل البائع هذه الربوط.'] },
  ] };
}

export function terms(l: Locale): { title: string; sections: Section[] } {
  const o = op();
  return l === 'fr' ? { title: 'Conditions d’utilisation', sections: [
    { h: '1. Service', p: [`Akked aide les vendeurs en paiement à la livraison à saisir, confirmer et expédier leurs commandes. Exploitant : ${o.name} (${o.contact}).`] },
    { h: '2. Essai et abonnement', p: ['Essai gratuit de 14 jours. Ensuite abonnement mensuel en dirhams selon le plan choisi (limites de commandes et d’utilisateurs affichées dans l’application). Paiement manuel (virement, CashPlus, Wafacash) ; l’abonnement est activé après vérification du paiement.'] },
    { h: '3. Responsabilités du vendeur', p: ['Le vendeur garantit avoir le droit de traiter les données de ses clients et d’avoir leur accord pour les contacter, notamment par WhatsApp ; il utilise le service de façon licite et sans envoi abusif de messages.'] },
    { h: '4. WhatsApp', p: ['Par défaut l’application ouvre WhatsApp avec un message prêt et c’est le vendeur qui l’envoie. Les règles de WhatsApp/Meta s’appliquent au vendeur.'] },
    { h: '5. Disponibilité', p: ['Service fourni « en l’état », sans garantie d’absence d’interruption. Le vendeur doit garder ses propres exports ; des sauvegardes sont faites mais ne remplacent pas les siennes.'] },
    { h: '6. Suspension et résiliation', p: ['Le vendeur peut supprimer son compte à tout moment. Nous pouvons suspendre un compte en cas d’abus ou de non-paiement.'] },
    { h: '7. Responsabilité', p: ['Dans les limites permises par la loi, la responsabilité de l’exploitant est limitée au montant payé pour le mois en cours.'] },
    { h: '8. Droit applicable', p: [o.law] },
  ] } : { title: 'شروط الاستعمال', sections: [
    { h: '1. الخدمة', p: [`تساعد «أكّد» بائعي الدفع عند الاستلام على إدخال طلباتهم وتأكيدها وشحنها. المشغّل: ${o.name} (${o.contact}).`] },
    { h: '2. التجربة والاشتراك', p: ['تجربة مجانية 14 يومًا، ثم اشتراك شهري بالدرهم حسب الباقة (حدود الطلبات والمستخدمين معروضة في التطبيق). الدفع يدوي (تحويل بنكي أو CashPlus أو Wafacash) ويُفعَّل الاشتراك بعد التحقق من الدفع.'] },
    { h: '3. مسؤوليات البائع', p: ['يضمن البائع أن له الحق في معالجة بيانات زبائنه وأن لديه موافقتهم على مراسلتهم، ومنها عبر واتساب، وأن يستعمل الخدمة بشكل مشروع ودون إرسال رسائل مزعجة.'] },
    { h: '4. واتساب', p: ['افتراضيًا يفتح التطبيق واتساب برسالة جاهزة ويرسلها البائع بنفسه. وتسري قواعد واتساب/Meta على البائع.'] },
    { h: '5. التوفر', p: ['تُقدَّم الخدمة «كما هي» دون ضمان عدم الانقطاع. وعلى البائع الاحتفاظ بنسخه الخاصة من بياناته؛ فالنسخ الاحتياطية للمنصة لا تغني عنها.'] },
    { h: '6. الإيقاف والإنهاء', p: ['يستطيع البائع حذف حسابه في أي وقت. ويجوز لنا إيقاف حساب عند إساءة الاستعمال أو عدم الدفع.'] },
    { h: '7. المسؤولية', p: ['في حدود ما يسمح به القانون، تقتصر مسؤولية المشغّل على المبلغ المدفوع عن الشهر الجاري.'] },
    { h: '8. القانون المطبق', p: [o.law] },
  ] };
}
