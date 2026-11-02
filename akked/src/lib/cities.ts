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
  { name: 'Inezgane', aliases: ['إنزكان', 'انزكان'] },
  { name: 'Aït Melloul', aliases: ['ait melloul', 'أيت ملول', 'ايت ملول'] },
  { name: 'Tiznit', aliases: ['تيزنيت'] },
  { name: 'Berkane', aliases: ['بركان'] },
  { name: 'Taourirt', aliases: ['تاوريرت'] },
  { name: 'Fnideq', aliases: ['الفنيدق'] },
  { name: 'M’diq', aliases: ['mdiq', "m'diq", 'المضيق'] },
  { name: 'Martil', aliases: ['مرتيل'] },
  { name: 'Chefchaouen', aliases: ['chaouen', 'شفشاون'] },
  { name: 'Ifrane', aliases: ['إفران', 'افران'] },
  { name: 'Azrou', aliases: ['أزرو', 'ازرو'] },
  { name: 'Sidi Kacem', aliases: ['سيدي قاسم'] },
  { name: 'Sidi Slimane', aliases: ['سيدي سليمان'] },
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
  { name: 'Benslimane', aliases: ['بنسليمان'] },
  { name: 'Asilah', aliases: ['arzila', 'أصيلة', 'اصيلة'] },
  { name: 'Sefrou', aliases: ['صفرو'] },
  { name: 'Guercif', aliases: ['جرسيف'] },
  { name: 'Kelaat Sraghna', aliases: ['kalaat sraghna', 'قلعة السراغنة'] },
  { name: 'Khénifra', aliases: ['khenifra', 'خنيفرة'] },
  { name: 'Sidi Bennour', aliases: ['سيدي بنور'] },
  { name: 'Souk El Arbaa', aliases: ['سوق أربعاء الغرب', 'سوق اربعاء الغرب'] },
  { name: 'Tan-Tan', aliases: ['tantan', 'طانطان'] },
  { name: 'Smara', aliases: ['السمارة'] },
];

const norm = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ًͯ-ٟـ]/g, '')
    .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
    .replace(/[’'`´-]/g, ' ').replace(/[^\p{L}\p{N} ]/gu, '').replace(/\s+/g, ' ').trim();
const squash = (s: string) => norm(s).replace(/ /g, '');

const INDEX = new Map<string, string>();
for (const c of CITIES) for (const k of [c.name, ...(c.aliases ?? [])]) INDEX.set(squash(k), c.name);

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
