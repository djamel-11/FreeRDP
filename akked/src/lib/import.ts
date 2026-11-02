import Papa from 'papaparse';
import { normalizePhone } from './phone';

export interface ParsedOrder {
  customer_name: string; phone: string; city: string; address: string; products: string;
  size: string; color: string; quantity: number; price: number; notes: string;
}
const ALIASES: Record<keyof ParsedOrder, string[]> = {
  customer_name: ['name', 'customer', 'nom', 'client', 'الاسم', 'customer_name'],
  phone: ['phone', 'tel', 'telephone', 'téléphone', 'mobile', 'الهاتف', 'رقم الهاتف'],
  city: ['city', 'ville', 'المدينة'],
  address: ['address', 'adresse', 'العنوان'],
  products: ['product', 'produit', 'products', 'المنتج'],
  size: ['size', 'taille', 'pointure', 'المقاس'],
  color: ['color', 'couleur', 'اللون'],
  quantity: ['quantity', 'qty', 'quantité', 'quantite', 'الكمية'],
  price: ['price', 'prix', 'total', 'amount', 'montant', 'الثمن', 'السعر'],
  notes: ['notes', 'note', 'comment', 'commentaire', 'ملاحظات'],
};

export function parseOrders(text: string): { rows: ParsedOrder[]; errors: { line: number; reason: string }[] } {
  const delimiter = text.split('\n')[0]?.includes('\t') ? '\t' : '';
  const res = Papa.parse<Record<string, string>>(text.trim(), {
    header: true, skipEmptyLines: true, delimiter, transformHeader: (h) => h.trim().toLowerCase(),
  });
  const rows: ParsedOrder[] = []; const errors: { line: number; reason: string }[] = [];
  res.data.forEach((r, i) => {
    const pick = (k: keyof ParsedOrder) => {
      for (const a of ALIASES[k]) if (r[a] != null && String(r[a]).trim() !== '') return String(r[a]).trim();
      return '';
    };
    const phone = normalizePhone(pick('phone'));
    if (!phone) return void errors.push({ line: i + 2, reason: 'invalid_phone' });
    if (!pick('customer_name')) return void errors.push({ line: i + 2, reason: 'missing_name' });
    rows.push({
      customer_name: pick('customer_name'), phone, city: pick('city'), address: pick('address'),
      products: pick('products'), size: pick('size'), color: pick('color'),
      quantity: Math.max(1, parseInt(pick('quantity')) || 1),
      price: parseFloat(pick('price').replace(',', '.')) || 0, notes: pick('notes'),
    });
  });
  return { rows, errors };
}
