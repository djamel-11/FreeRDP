/**
 * Official AMEEX city list (city id → name), copied from the AMEEX dashboard "Add parcel" city selector.
 * NOT included: "Hub Principal" entries (different id space) and business/account ids.
 */
const RAW = `1,Marrakech
2,Meknes
3,Mhaya
4,Ain Taoujdate
5,Sabaa Aiyoun
6,Boufakrane
7,El Hajeb
8,Bouderbala
10,Boujdour
11,Tetouan
12,Martil
13,M Diq
14,Fnideq
15,Errachidia
16,Oujda
17,Nador
18,Selouane
20,Al Aaroui
21,Zaio
22,Driouch
23,Khouribga
24,Oued Zem
25,Boulanouar
26,Boujniba
27,Bir Mezoui
28,Khemisset
29,Tiflet
30,Mohammedia
31,Ain Harrouda
32,Dakhla
33,Kenitra
34,Sidi Taibi
35,Sidi Yahya El Gharb
36,ALLAL TAZI
37,Mechra Bel Ksiri
38,Sidi Sliman (reg kacem)
39,Sidi Kacem
40,Mehdya
41,Tan Tan
42,Guelmim
43,Bouizakarne
46,Atlas Saghir ifrane
47,Timoulay
48,Sidi Ifni
49,Rabat
50,Sale
51,Sale Al Jadida-سلا
52,Temara
53,Tamesna
54,Skhirat
55,Ouarzazat
56,Ait Zineb
57,Tabounte
58,Tajda
59,Timdline
60,Tifoultoute
61,Ifran
62,Azrou(reg meknes)
63,Agadir
64,Inzegane
65,Dcheira
66,Ait Meloul
67,Sidi Bibi - Agadir
68,Taghazoute
69,Fes
70,Ain Bida
71,Oulad Ettayeb
72,Ain Allah
73,Sidi Harazem
74,Essmara
75,Berrchid
76,Settat
77,Deroua
78,Nouaceur
79,Had Soualem
80,Al Hoceima
81,Ajdir (Région Hociema)
82,Boukidaren
83,Ait Kamra
84,Imzouren
85,Youssoufia
86,Essaouira
87,Ounagha
88,Taftecht
89,Had Draa
90,Mejji
91,Talmest
92,Akermoud
93,Zaouiet Bouzarktoune
94,Ghazoua
95,Smimou
96,Tamanar
97,Sidi Kaouki
98,Tanger
99,Mrirt
100,Khenifra
101,Ben Guerir
102,Taroudannt
103,Oulad Teima
104,Ait Laaza
105,Aoulouz
107,Taliouine
108,Sebt El Guerdane
109,Berkane
110,Saidia
111,Ras El Ma (REG NADOR)
112,Bni Drar
113,Ahfir
114,Aklim
115,Zeghanghane
116,Farkhana
117,Taza
118,Guercif
119,Tiznit
120,Safi
121,Had Hrara
122,Sebt Gzoula
125,Larache
126,Ksar El Kebir
127,Chefchaouen
128,Sidi Bernoussi
129,Casablanca
130,Sidi Messaoud
131,Bouskoura
132,Dar Bouaza
133,Mediouna
134,Tit Melil
135,El Kelaa Des Sraghna
136,El Jadida
138,Sidi Bouzid
140,Oualidia
141,Sidi Bennour
142,Beni Ansar
143,Izemmouren
144,Laayoune
145,El Marsa
146,Beni Mellal
147,Fquih Ben Salah
148,Sebt Oulad Nemma
149,Afourer
150,Ouled Yaiche
151,El Ksiba
152,Ain Aouda
153,Tamansourt
154,Benslimane ( reg mohamedia)
156,Kasbah Tadla
157,Chemaia
160,Ourika
161,Tahannaout
162,Ait Ourir
164,Oudaya
165,Chichaoua
166,Assilah
167,Bouznika
168,Sefrou
169,Taourirt
170,Chouiter
171,Sidi Allal el Bahraoui
172,Romani
173,Oulmas
174,Ouazzane
175,Ain Dorij
177,Sidi Redouane
179,Moqrisset
180,Zoumi
181,Harhoura
182,Laattaouia
183,Rissani
184,Arfoud
185,Merzouga
186,Taddart - TAZA -
187,Bni Bouayach
188,Azilal
189,Ouaouizeght
190,Bejaad
191,Tinghir
192,Boumalne Dades
193,Kalaat MGouna
194,Alnif
195,Bou Adel
196,Zrizer
199,Ain Aicha
200,Taounate
201,Awrir
202,Ait amira
203,Belfaa
204,Anza
205,DERDARA
206,Bab Taza
207,AKCHOUR
208,Bab berred
209,El Jebeha
210,Midelt
211,Jerada
212,Bouarfa
213,Laayoun Cherqia
214,Zagora
215,Tamegroute
216,Tagomite
217,Mhamid Lghezlane
218,Agdz
219,Nkob
220,Tazzarine
221,Taghbalte
222,Errich
223,Missour
224,Boumia
225,Tinjdad
226,Gulmima - errachidia
227,Sidi Bouknadel
228,Imintanoute
229,Demnate
230,Ouad Laou
231,Cabo Negro
232,Khmiss Zemamera
234,Sidi Smail
235,Oulad Fraj
236,Mellalyène
237,Sidi Rehal-casa
238,Assa
239,Assa
240,Rehamna
241,Lakhssas
242,Aoufous
243,Boudnib
244,Ben Ahmed - Settat -
245,Sidi Bou Othmane
246,Asni
247,Souk Elarbaa Du Gharb
248,Ajdir (Région Taza)
250,Amzmiz
251,Drarga
253,Anza - Taddart
254,Zayda
255,Outat El Haj
256,Tahla
257,Oued Amlil
258,Imouzzer Kandar
260,Biogra
261,Terfaya
262,Tazenakht
263,Figuig
264,Tendrara
266,Beni Tajjite
267,Bouanane
268,Tata
270,Mzoudia
271,Ksar Sghir
272,Tamelelt
273,El Gara
274,Mirleft
275,lqliaa
276,oulad berhil
277,zaida
279,targuist
280,issaguen
281,tala youssef
282,Jaadar
283,Midar
284,Ben Taieb
285,Kassita
286,Tafersit
287,Dar El Kebdani
288,Oulad Settout
289,Bouarg
290,Arekmane
291,Krona
292,Boudinar
293,Tamsamane
294,Annual
296,BENI CHIKER
297,Mariouari
298,Tiztoutine
299,Tamaris
300,Karia Be Mohammed
301,Taddart - Charaf - AGADIR
302,Ben Ahmed - CHEFCHAOUEN -
303,Tnine Chtouka (el jadida)
304,AIN CHGAG
305,Tafraoute
306,Houara-oulad teima
307,ERRAHMA VILLE
308,azrou ait melloul
309,Ben Yakhlef
310,El Mansouria
312,cap beddouza
313,Jemâa-Shaim
314,El Borouj
315,oulad said settat
316,sidi hajjaj (settat)
317,Ras El Ain (settat)
318,Guisser (settat)
320,Lakhyayeta
321,Nzalat Laadam
322,Oulad Zidoh
323,souiria Guedima (REG SAFI)
324,Jorf El Melha
325,Ain Beida
326,Mokrisset
327,Oulad Ayad
329,AIN ATIQ
330,Moulay Bousselham
331,Khenichet
332,Zoumi-Ouazzane
333,Teroual - Ouazzane
334,Ain Dfali-Ouazzane
335,Masmouda - Ouazzane
336,Stehat-Chefchaouen
337,Temsia-agadir
338,Tamraght
339,Had bouhssoussen
340,Moulay bouazza khenifra
341,Tagzert
342,Oulad M barek-Beni Mellal
343,Tanougha-Beni Mellal
344,Foum Oudi
345,Ikhourbane
346,Zag-VILLE
347,El Ouatia
348,Port of Tan-Tan
349,oulad oujih
350,Lalla Mimouna
351,Dlalha
352,Mers El Kheir
353,Sidi Yahya Zaer
354,Skhour Rehamna
355,Amizmiz
356,El Hanchane
357,Akka-tata
358,Tagmout-tata
359,Issafen-tata
360,Fam El Hisn-tata
362,MASSA
363,Kariat Arkman-Nador
364,Had Hrara-SAFI
365,Sidi Zouine
366,Skoura-Ouarzazate
367,Bni hdifa - Region Al hoceima
368,Bab Marzouka-Taza
369,Aknoul-taza
370,Hatane-Khouribga
371,sidi allal tazi
372,Tiddas
373,Ain Johra
374,Maâziz
376,Tīdās-Khemisset
377,Laouamra- ksar el kebir
378,Khemis Sahel
379,Krimda
380,Sidi Aissa-Beni-Mellal
381,Ouled Moussa-Beni Mellal
382,Oulad Said-Beni Mellal
383,ighram laalam-beni mellal
384,Tanougha-Beni Mellal
385,Zaouiat Cheikh
386,Ait Ali
387,Lehri-KHENIFRA
388,El Kebab-KHENIFRA
389,El Borj-KHENIFRA
391,Ouaoumana
392,Ait ishaq
393,Ait ishaK
394,Tighassaline ville
395,Aguelmous
397,Bounouar
398,HATTANE
399,Boujniba
400,Ouaouizeght
401,Adouz
402,Foum El Anceur
403,FERYATA
404,Foum Zaouia
405,Tanougha-Beni Mellal
406,Al kamoun-ksba tadla
407,Jerf El Melha
408,Zemamra
410,Sidi Smail
411,Azemmour
412,Bir Jdid
413,El Jorf Lasfar
414,Moulay Abdallah Amghar
415,El Aouamra
416,Laarache
417,Oulad Bourahma
418,Zone Franche (kenitra)
420,Ghafsai
421,sidi aadi
422,Mejjat-chichaoua
423,Ain Tekki
426,OULAD ABBOU-settat
428,AIN LEUH
429,Souihla
430,El Haj Kaddour
431,Boulemane
432,Tin Mansour
433,Arba Aounate
434,AIN BNI MATHAR
435,Tikiouine
437,Chellalat Mohammedia
438,Zouada
439,Arbaoua
440,Sidi el Aidi
443,DAR GUEDDARI
445,Tagadirt-Agadir
446,Tadouaret-Agadir
447,Leqliaa - Taddart
448,ain mediouna - taounate
449,ain aicha - taounate
450,zrizer - taounate
451,Ain Sbit
452,MERCHOUCH
453,TANANTE-AZILAL
454,Birkouate
455,Moulay Yaâcoub
456,sidi boujida
457,Oulad Tayeb
458,Ain Chkef
459,Ouled Khlifa
460,LOUDAYA
461,Tassoultante
463,Tameslouht
464,Sidi Moussa-OURIKA
465,Gueznaia - Tanger
466,TANGER-bougdour
467,AIN DALIA-tanger
468,Chraka - Tanger
469,TANGER-chaouia
471,tamchat
472,TAGANTE
473,Moulay Idriss Zerhoun
476,BOUYAFAR
477,Sidi Bousberr
478,LAMJAARA-ouazzane
480,BRIKCHA-ouazzane
481,Beni Quolla-ouazzane
482,Mzefroune-ouazzane
484,Sidi Elmoukhtar - Chichaoua
485,Ouled El Ghadbane
487,Had kourt
488,Madagh-berkan
489,Laatamna
490,Sebt ben sassi
491,AIT BAHA
493,Ribate El Kheir-sefrou
494,El Menzale-sefrou
495,Tizi Ouasli
496,MSOUN taza
499,Akhfennir
500,Gfifat-oulad teima
501,Oulad Dahou-HOUARA
502,TIMAHDITE-AZROU
503,AGOURAY
504,SIDI AADI
505,Lalla Takerkoust
506,Oulad yahya-Marrakech
507,Chrifia-Marrakech
508,Sidi Abdellah Ghiat
509,Ait Ben Haddou
510,TALSINNT
511,Aouama-Tanger
512,Ras El Ain Rehamena- Tamelelt
513,Tlauh - Tamelelt
514,EL AIOUN SIDI MELLOUK
515,Bir Tam Tam
516,Ras Tabouda
517,Zaouia Bougrine
518,El houmer-taroudant
519,Oulad Terna
520,Ouled Abbou-TAROUDANT
521,Oulad Aissa-TAROUDANT
522,Tazemmourt-taroudant
523,tamaloukt-taroudant
524,nouail-taroudant
525,oulad mhela-taroudant
526,El boura-taroudant
527,Oulad brahim-taroudant
528,Sidi moussa lhamri-TAROUDANT
529,Ahmar laglalcha-taroudant
530,IGHREM-TATA
531,ASJENN-ouazzane
532,TAFOUGHALT
533,AIN SFA-OUJDA
534,Bouhouda-taounat
535,Tahar Souk-taounat
536,bouaadl-taounat
537,Ouled azem-taounat
539,Timezgana-taounat
540,Imouzzer Marmoucha
541,MEZRAOUA-taounat
542,Ait Yaazem-meknes
544,Ourtzagh-taounat
545,Kasbat ayir-oualidia
546,Amerzgane
547,Imini-Ouarzazate
552,AIN SMEN-FES
553,Idouirane-Imintanuot
554,Tamait Izder-agadir
555,Tinzouline-zagora
557,BEN ZOLI
558,Tagounite
559,Ain el Mediour- taroudant
560,Ouled Mssaad
561,Oulad Othmane
562,Oulad Yahya Lagraire
563,Tinnegza
564,Ouled Moqaddem
565,Aït Attab
566,Oulad Aissa- el jadida
567,BRADIA
568,Souk El Had Des Bradia
570,Ouzoud
571,HOUARA-Tanger
572,MEHARZA-Tanger
573,EL MNBAR-Tanger
574,AIN BELLOUT-Tanger
575,Agouim
576,Ighrem N Ougdal
577,Tarmigt
578,Ain jiri
579,Tlata Loulad Fini
580,Tnine Beni Meskine
581,Aghbalou N serdan
582,Itzer-zaida
583,Zoualeth Dkhissa
584,Ras El Ma Fes
585,Tassaout
586,Oued Jdida
587,Ouled Slim Khrarib
588,Aghbala-beni mellal
589,Tala Youssef-hociema
590,Oulad Jerrar
591,Taghjijt
592,Toundoute
593,Ouargui
594,Bourouta
595,Foum Jamaa
596,Ghighaya
597,Imounsiss
598,Ighil Ouderdour
599,Ait El Moudden
600,Ait Taoukte
601,Agafay
602,MHAMID TEN
603,Aghroude - BenSergao
604,Imi Ouaddar`;

export interface AmeexCity { id: number; name: string }
export const AMEEX_CITIES: AmeexCity[] = RAW.split('\n').map((l) => {
  const i = l.indexOf(',');
  return { id: Number(l.slice(0, i)), name: l.slice(i + 1).trim() };
});
