import { AMEEX_CITIES } from './ameex-cities';
/**
 * Canonical city names used in delivery-company files.
 * NOTE: default list uses common French spellings. Replace/extend with the official AMEEX list
 * (one entry per city: canonical name + aliases in Arabic/French/Darija spellings).
 */
export const CITIES: { name: string; aliases?: string[] }[] = [
  { name: 'Casablanca', aliases: ['casa', 'الدار البيضاء', 'دار البيضاء', 'البيضاء', 'كازا', 'dar el beida'] },
  { name: 'Rabat', aliases: ['الرباط'] },
  { name: 'Marrakech', aliases: ['marrakesh', 'مراكش'] },
  { name: 'Fès', aliases: ['fes', 'fez', 'فاس'] },
  { name: 'Tanger', aliases: ['tangier', 'tanja', 'طنجة'] },
  { name: 'Agadir', aliases: ['أكادير', 'اكادير'] },
  { name: 'Meknès', aliases: ['meknes', 'مكناس'] },
  { name: 'Oujda', aliases: ['وجدة'] },
  { name: 'Kénitra', aliases: ['kenitra', 'القنيطرة'] },
  { name: 'Tétouan', aliases: ['tetouan', 'تطوان', 'titouan'] },
  { name: 'Salé', aliases: ['sale', 'سلا'] },
  { name: 'Témara', aliases: ['temara', 'تمارة'] },
  { name: 'Mohammedia', aliases: ['المحمدية'] },
  { name: 'El Jadida', aliases: ['eljadida', 'الجديدة'] },
  { name: 'Safi', aliases: ['آسفي', 'اسفي'] },
  { name: 'Béni Mellal', aliases: ['beni mellal', 'بني ملال'] },
  { name: 'Nador', aliases: ['الناظور', 'الناضور'] },
  { name: 'Khouribga', aliases: ['خريبكة'] },
  { name: 'Settat', aliases: ['سطات'] },
  { name: 'Berrechid', aliases: ['برشيد'] },
  { name: 'Larache', aliases: ['العرائش'] },
  { name: 'Ksar El Kebir', aliases: ['ksar el-kebir', 'alcazar', 'القصر الكبير'] },
  { name: 'Taza', aliases: ['تازة'] },
  { name: 'Khémisset', aliases: ['khemisset', 'الخميسات'] },
  { name: 'Essaouira', aliases: ['الصويرة'] },
  { name: 'Errachidia', aliases: ['الرشيدية'] },
  { name: 'Ouarzazate', aliases: ['ورزازات'] },
  { name: 'Al Hoceïma', aliases: ['al hoceima', 'alhoceima', 'الحسيمة'] },
  { name: 'Guelmim', aliases: ['كلميم'] },
  { name: 'Laâyoune', aliases: ['laayoune', 'layoune', 'العيون'] },
  { name: 'Dakhla', aliases: ['الداخلة'] },
  { name: 'Taroudant', aliases: ['تارودانت'] },
  { name: 'Inezgane', aliases: ['inzegane', 'إنزكان', 'انزكان'] },
  { name: 'Aït Melloul', aliases: ['ait melloul', 'أيت ملول', 'ايت ملول'] },
  { name: 'Tiznit', aliases: ['تيزنيت'] },
  { name: 'Berkane', aliases: ['بركان'] },
  { name: 'Taourirt', aliases: ['تاوريرت'] },
  { name: 'Fnideq', aliases: ['الفنيدق'] },
  { name: 'M’diq', aliases: ['mdiq', "m'diq", 'المضيق'] },
  { name: 'Martil', aliases: ['مرتيل'] },
  { name: 'Chefchaouen', aliases: ['chaouen', 'شفشاون'] },
  { name: 'Ifrane', aliases: ['إفران', 'افران'] },
  { name: 'Azrou', aliases: ['azrou(reg meknes)', 'أزرو', 'ازرو'] },
  { name: 'Sidi Kacem', aliases: ['سيدي قاسم'] },
  { name: 'Sidi Slimane', aliases: ['sidi sliman (reg kacem)', 'سيدي سليمان'] },
  { name: 'Youssoufia', aliases: ['اليوسفية'] },
  { name: 'Ben Guerir', aliases: ['benguerir', 'بن جرير'] },
  { name: 'Fquih Ben Salah', aliases: ['الفقيه بن صالح'] },
  { name: 'Azilal', aliases: ['أزيلال', 'ازيلال'] },
  { name: 'Midelt', aliases: ['ميدلت'] },
  { name: 'Zagora', aliases: ['زاكورة'] },
  { name: 'Tinghir', aliases: ['تنغير'] },
  { name: 'Oued Zem', aliases: ['وادي زم'] },
  { name: 'Skhirat', aliases: ['الصخيرات'] },
  { name: 'Bouznika', aliases: ['بوزنيقة'] },
  { name: 'Benslimane', aliases: ['benslimane ( reg mohamedia)', 'بنسليمان'] },
  { name: 'Asilah', aliases: ['arzila', 'أصيلة', 'اصيلة'] },
  { name: 'Sefrou', aliases: ['صفرو'] },
  { name: 'Guercif', aliases: ['جرسيف'] },
  { name: 'Kelaat Sraghna', aliases: ['el kelaa des sraghna', 'kelaa des sraghna', 'kalaat sraghna', 'قلعة السراغنة'] },
  { name: 'Khénifra', aliases: ['khenifra', 'خنيفرة'] },
  { name: 'Sidi Bennour', aliases: ['سيدي بنور'] },
  { name: 'Souk El Arbaa', aliases: ['souk elarbaa du gharb', 'souk elarbaa', 'سوق أربعاء الغرب', 'سوق اربعاء الغرب'] },
  { name: 'Tan-Tan', aliases: ['tantan', 'طانطان'] },
  { name: 'Smara', aliases: ['essmara', 'السمارة'] },
];

const norm = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ًͯ-ٟـ]/g, '')
    .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
    .replace(/[’'`´-]/g, ' ').replace(/[^\p{L}\p{N} ]/gu, '').replace(/\s+/g, ' ').trim();
const squash = (s: string) => norm(s).replace(/ /g, '');

/** AMEEX's own spelling is authoritative: key → {id, name} (first id wins for duplicate names). */
const AMEEX_BY_KEY = new Map<string, { id: number; name: string }>();
for (const c of AMEEX_CITIES) if (!AMEEX_BY_KEY.has(squash(c.name))) AMEEX_BY_KEY.set(squash(c.name), c);

/** key → canonical name. Our aliases map onto the AMEEX spelling when AMEEX has the city. */
const INDEX = new Map<string, string>();
for (const c of CITIES) {
  const keys = [c.name, ...(c.aliases ?? [])];
  const fuzzy = (k: string) => {
    const s = squash(k); if (s.length < 5) return undefined;
    const m = [...AMEEX_BY_KEY].filter(([a]) => a.length >= 5 && lev1(s, a));
    return m.length === 1 ? m[0][1] : undefined; // only when unambiguous
  };
  const hit = keys.map((k) => AMEEX_BY_KEY.get(squash(k))).find(Boolean) ?? keys.map(fuzzy).find(Boolean);
  for (const k of keys) INDEX.set(squash(k), hit?.name ?? c.name);
}
for (const [k, c] of AMEEX_BY_KEY) if (!INDEX.has(k)) INDEX.set(k, c.name);

/** AMEEX numeric city id for a canonical name, or null if AMEEX doesn't list it. */
export const ameexIdFor = (name: string | null): number | null => (name ? AMEEX_BY_KEY.get(squash(name))?.id ?? null : null);

function lev1(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++;
  if (a.length === b.length) return a.slice(i + 1) === b.slice(i + 1) || (a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2));
  const [s, l] = a.length < b.length ? [a, b] : [b, a];
  return s.slice(i) === l.slice(i + 1);
}

/** Returns the canonical city name, or null if it can't be matched confidently. */
export function canonicalCity(input: string | null | undefined): string | null {
  const k = squash(input ?? '');
  if (!k) return null;
  const exact = INDEX.get(k);
  if (exact) return exact;
  if (k.length < 5) return null;
  const hits = new Set<string>();
  for (const [alias, name] of INDEX) if (alias.length >= 5 && lev1(k, alias)) hits.add(name);
  return hits.size === 1 ? [...hits][0] : null; // typo tolerance only when unambiguous
}
