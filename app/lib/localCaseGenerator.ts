import type { CityCase, Constraint, Difficulty } from "../types/game";

type Rng = () => number;
type Template = Omit<CityCase, "id" | "cityName" | "scenario" | "difficulty" | "constraints" | "facts" | "goalOptions" | "correctGoal" | "constraintOptions" | "recommendedRange"> & {
  cityRoots: string[];
  scenario: (city: string, x: string, y: string) => string;
};

export const CASE_BANK_SIZE = 10;

const templates: Template[] = [
  {
    title: "Udara Bersih, Mobilitas Terjangkau",
    cityRoots: ["Arunika", "Bumiraya", "Cakrawala"],
    initialCondition: "Polusi lalu lintas tinggi dan kebutuhan hunian terus bertambah.",
    scenario: (c, x, y) => `${c} harus menambah hunian tanpa memperburuk kualitas udara. Susun kombinasi ${x.toLowerCase()} dan ${y.toLowerCase()} yang memenuhi seluruh batas kota serta memberi layanan terbesar.`,
    variables: [
      { id: "x", name: "Blok hunian hijau", shortName: "Hunian hijau", kind: "housing" },
      { id: "y", name: "Koridor transportasi publik", shortName: "Koridor transit", kind: "transit" },
    ],
    goal: "Memaksimalkan layanan warga tanpa melanggar seluruh kendala kota.",
    reflectionQuestions: ["Apakah rancanganmu feasible?", "Kendala mana yang paling membatasi?", "Apa dampak perubahan anggaran?"],
    sdgFocus: ["SDG 11 · Kota Berkelanjutan", "SDG 13 · Aksi Iklim"],
    evidenceTargets: ["Informasi relevan", "Model SPtLDV", "Solusi feasible", "Keputusan optimal", "Refleksi"],
    optionalParkLimit: 2,
  },
  {
    title: "Transit untuk Semua",
    cityRoots: ["Sukamaju", "Tirtakota", "Nusantara"],
    initialCondition: "Akses transportasi antarkawasan masih rendah.",
    scenario: (c, x, y) => `${c} ingin memperluas mobilitas rendah emisi. Tentukan jumlah ${x.toLowerCase()} dan ${y.toLowerCase()} agar target warga terlayani tercapai dengan sumber daya terbatas.`,
    variables: [
      { id: "x", name: "Stasiun transit hijau", shortName: "Stasiun hijau", kind: "civic" },
      { id: "y", name: "Jalur bus listrik", shortName: "Jalur bus", kind: "transit" },
    ],
    goal: "Memaksimalkan layanan warga tanpa melanggar seluruh kendala kota.",
    reflectionQuestions: ["Apakah rancanganmu feasible?", "Kendala mana yang paling membatasi?", "Apa dampak perubahan anggaran?"],
    sdgFocus: ["SDG 11 · Transportasi Inklusif", "SDG 13 · Mobilitas Bersih"],
    evidenceTargets: ["Informasi relevan", "Model SPtLDV", "Solusi feasible", "Keputusan optimal", "Refleksi"],
    optionalParkLimit: 2,
  },
  {
    title: "Kota Padat, Ruang Tetap Sehat",
    cityRoots: ["Wanasari", "Kertabumi", "Lestari"],
    initialCondition: "Kepadatan meningkat, sedangkan lahan kota sangat terbatas.",
    scenario: (c, x, y) => `${c} membutuhkan pembangunan hemat lahan. Rancang kombinasi ${x.toLowerCase()} dan ${y.toLowerCase()} yang layak dan paling efektif melayani warga.`,
    variables: [
      { id: "x", name: "Rumah susun ramah lingkungan", shortName: "Rusun hijau", kind: "housing" },
      { id: "y", name: "Taman komunal", shortName: "Taman komunal", kind: "park" },
    ],
    goal: "Memaksimalkan layanan warga tanpa melanggar seluruh kendala kota.",
    reflectionQuestions: ["Apakah rancanganmu feasible?", "Kendala mana yang paling membatasi?", "Apa dampak perubahan anggaran?"],
    sdgFocus: ["SDG 11 · Permukiman Layak", "SDG 13 · Ruang Hijau"],
    evidenceTargets: ["Informasi relevan", "Model SPtLDV", "Solusi feasible", "Keputusan optimal", "Refleksi"],
    optionalParkLimit: 3,
  },
  {
    title: "Layanan Hijau untuk Kota Tumbuh",
    cityRoots: ["Harapan", "Sagara", "Nirmala"],
    initialCondition: "Kawasan baru tumbuh lebih cepat daripada layanan publiknya.",
    scenario: (c, x, y) => `${c} membuka kawasan berkelanjutan baru. Pilih jumlah ${x.toLowerCase()} dan ${y.toLowerCase()} dengan mempertimbangkan anggaran, lahan, emisi, dan target layanan.`,
    variables: [
      { id: "x", name: "Apartemen hemat energi", shortName: "Apartemen eco", kind: "housing" },
      { id: "y", name: "Pusat layanan terpadu", shortName: "Pusat layanan", kind: "civic" },
    ],
    goal: "Memaksimalkan layanan warga tanpa melanggar seluruh kendala kota.",
    reflectionQuestions: ["Apakah rancanganmu feasible?", "Kendala mana yang paling membatasi?", "Apa dampak perubahan anggaran?"],
    sdgFocus: ["SDG 11 · Layanan Dasar", "SDG 13 · Efisiensi Energi"],
    evidenceTargets: ["Informasi relevan", "Model SPtLDV", "Solusi feasible", "Keputusan optimal", "Refleksi"],
    optionalParkLimit: 2,
  },
  {
    title: "Energi Bersih di Bawah Tekanan Anggaran",
    cityRoots: ["Surya Kencana", "Mahardika", "Langit Biru"],
    initialCondition: "Emisi kota tinggi, tetapi ruang fiskal pembangunan terbatas.",
    scenario: (c, x, y) => `${c} mempercepat transisi rendah karbon. Bangun kombinasi ${x.toLowerCase()} dan ${y.toLowerCase()} yang feasible serta memberi dampak layanan terbesar.`,
    variables: [
      { id: "x", name: "Distrik atap surya", shortName: "Distrik surya", kind: "solar" },
      { id: "y", name: "Koridor mobilitas bersih", shortName: "Mobilitas bersih", kind: "transit" },
    ],
    goal: "Memaksimalkan layanan warga tanpa melanggar seluruh kendala kota.",
    reflectionQuestions: ["Apakah rancanganmu feasible?", "Kendala mana yang paling membatasi?", "Apa dampak perubahan anggaran?"],
    sdgFocus: ["SDG 11 · Infrastruktur Tangguh", "SDG 13 · Aksi Iklim"],
    evidenceTargets: ["Informasi relevan", "Model SPtLDV", "Solusi feasible", "Keputusan optimal", "Refleksi"],
    optionalParkLimit: 2,
  },
  {
    title: "Banjir Musiman, Kota Lebih Tangguh",
    cityRoots: ["Pesisir Baru", "Delta Sari", "Muara Jaya"],
    initialCondition: "Drainase kewalahan saat hujan ekstrem dan kawasan padat butuh layanan aman.",
    scenario: (c, x, y) => `${c} perlu memperkuat ketahanan iklim. Tentukan kombinasi ${x.toLowerCase()} dan ${y.toLowerCase()} agar warga lebih terlindungi tanpa melewati batas sumber daya.`,
    variables: [
      { id: "x", name: "Taman resapan kota", shortName: "Taman resapan", kind: "park" },
      { id: "y", name: "Shelter layanan iklim", shortName: "Shelter iklim", kind: "civic" },
    ],
    goal: "Memaksimalkan layanan warga tanpa melanggar seluruh kendala kota.",
    reflectionQuestions: ["Mengapa solusi ini membantu adaptasi iklim?", "Apakah semua kendala masih aman?", "Bagaimana jika lahan dikurangi?"],
    sdgFocus: ["SDG 11 · Kota Tangguh", "SDG 13 · Adaptasi Iklim"],
    evidenceTargets: ["Fakta penting", "Kendala iklim", "Solusi feasible", "Trade-off lahan", "Refleksi adaptasi"],
    optionalParkLimit: 1,
  },
  {
    title: "Kampung Transit Rendah Emisi",
    cityRoots: ["Rukun Raya", "Banyu Asri", "Karya Sentosa"],
    initialCondition: "Warga pinggiran kota sulit mengakses pusat kegiatan tanpa kendaraan pribadi.",
    scenario: (c, x, y) => `${c} ingin membuka akses setara dan menekan emisi perjalanan. Atur jumlah ${x.toLowerCase()} dan ${y.toLowerCase()} untuk memenuhi target layanan minimum.`,
    variables: [
      { id: "x", name: "Rumah dekat transit", shortName: "Hunian transit", kind: "housing" },
      { id: "y", name: "Halte bus listrik", shortName: "Halte listrik", kind: "transit" },
    ],
    goal: "Memaksimalkan layanan warga tanpa melanggar seluruh kendala kota.",
    reflectionQuestions: ["Apakah akses warga meningkat?", "Kendala mana yang menahan ekspansi?", "Apa alasan kombinasi x dan y pilihanmu?"],
    sdgFocus: ["SDG 11 · Akses Setara", "SDG 13 · Transportasi Rendah Emisi"],
    evidenceTargets: ["Akses warga", "Model pertidaksamaan", "Feasibility", "Alasan keputusan", "Perbaikan strategi"],
    optionalParkLimit: 2,
  },
  {
    title: "Revitalisasi Kawasan Industri Lama",
    cityRoots: ["Kridatama", "Puspa Industri", "Tunas Mandiri"],
    initialCondition: "Kawasan industri lama menghasilkan emisi tinggi dan butuh fungsi kota baru.",
    scenario: (c, x, y) => `${c} akan mengubah zona lama menjadi kawasan produktif rendah karbon. Pilih ${x.toLowerCase()} dan ${y.toLowerCase()} dengan model SPtLDV yang tepat.`,
    variables: [
      { id: "x", name: "Blok mixed-use hijau", shortName: "Mixed-use hijau", kind: "housing" },
      { id: "y", name: "Pusat energi bersih", shortName: "Energi bersih", kind: "solar" },
    ],
    goal: "Memaksimalkan layanan warga tanpa melanggar seluruh kendala kota.",
    reflectionQuestions: ["Apakah revitalisasi tetap rendah emisi?", "Mengapa modelmu masuk akal?", "Apa alternatif jika anggaran turun?"],
    sdgFocus: ["SDG 11 · Revitalisasi Inklusif", "SDG 13 · Dekarbonisasi"],
    evidenceTargets: ["Identifikasi kendala", "Variabel keputusan", "Batas emisi", "Solusi terbaik", "Refleksi alternatif"],
    optionalParkLimit: 2,
  },
  {
    title: "Koridor Sekolah Aman dan Hijau",
    cityRoots: ["Cerdas Lestari", "Pelita Kota", "Mandala Ilmu"],
    initialCondition: "Zona sekolah padat, akses pejalan kaki buruk, dan emisi kendaraan meningkat.",
    scenario: (c, x, y) => `${c} membangun koridor pendidikan aman. Tentukan kombinasi ${x.toLowerCase()} dan ${y.toLowerCase()} agar layanan siswa meningkat dengan sumber daya terbatas.`,
    variables: [
      { id: "x", name: "Ruang hijau sekolah", shortName: "Ruang sekolah", kind: "park" },
      { id: "y", name: "Jalur bus sekolah listrik", shortName: "Bus sekolah", kind: "transit" },
    ],
    goal: "Memaksimalkan layanan warga tanpa melanggar seluruh kendala kota.",
    reflectionQuestions: ["Apakah pilihanmu aman untuk siswa?", "Apa bukti kendala terpenuhi?", "Bagaimana solusi berubah jika target layanan naik?"],
    sdgFocus: ["SDG 11 · Ruang Publik Aman", "SDG 13 · Perjalanan Bersih"],
    evidenceTargets: ["Tujuan kota", "Kendala layanan", "Keputusan feasible", "Interpretasi hasil", "Refleksi target"],
    optionalParkLimit: 2,
  },
  {
    title: "Pulau Panas Kota Menurun",
    cityRoots: ["Teduh Raya", "Mentari Hijau", "Bayang Kota"],
    initialCondition: "Suhu kawasan pusat kota naik karena minim vegetasi dan permukaan menyerap panas.",
    scenario: (c, x, y) => `${c} ingin menurunkan pulau panas kota. Susun kombinasi ${x.toLowerCase()} dan ${y.toLowerCase()} yang memenuhi target layanan iklim dan tetap feasible.`,
    variables: [
      { id: "x", name: "Taman atap publik", shortName: "Taman atap", kind: "park" },
      { id: "y", name: "Kanopi jalan hijau", shortName: "Kanopi hijau", kind: "civic" },
    ],
    goal: "Memaksimalkan layanan warga tanpa melanggar seluruh kendala kota.",
    reflectionQuestions: ["Apakah layanan iklim cukup?", "Kendala apa yang paling ketat?", "Apakah jawabanmu wajar untuk kota nyata?"],
    sdgFocus: ["SDG 11 · Ruang Kota Nyaman", "SDG 13 · Mitigasi Iklim"],
    evidenceTargets: ["Fakta relevan", "Kendala lahan", "Target layanan", "Solusi feasible", "Kewajaran konteks"],
    optionalParkLimit: 3,
  },
];

const int = (rng: Rng, min: number, max: number) => Math.floor(rng() * (max - min + 1)) + min;
const pick = <T,>(rng: Rng, values: T[]) => values[Math.floor(rng() * values.length)];
const shuffle = <T,>(rng: Rng, values: T[]) => {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

const seededRng = (seed: string): Rng => {
  let state = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    state ^= seed.charCodeAt(i);
    state = Math.imul(state, 16777619);
  }
  return () => {
    state += 0x6D2B79F5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const satisfies = (constraint: Constraint, x: number, y: number) => {
  const value = constraint.a * x + constraint.b * y;
  return constraint.op === "<=" ? value <= constraint.limit : value >= constraint.limit;
};

export const calculateRecommendations = (constraints: Constraint[]) => {
  const service = constraints.find((item) => item.type === "service")!;
  const feasible: Array<{ x: number; y: number; service: number }> = [];
  for (let x = 0; x <= 12; x += 1) for (let y = 0; y <= 12; y += 1) {
    if (constraints.every((item) => satisfies(item, x, y))) feasible.push({ x, y, service: service.a * x + service.b * y });
  }
  feasible.sort((a, b) => b.service - a.service || a.x + a.y - b.x - b.y);
  const best = feasible[0] ?? { x: 0, y: 0, service: 0 };
  return {
    xMax: Math.max(0, ...feasible.map((p) => p.x)),
    yMax: Math.max(0, ...feasible.map((p) => p.y)),
    optimalService: best.service,
    feasibleExample: { x: best.x, y: best.y },
  };
};

function buildCase(template: Template, difficulty: Difficulty, rng: Rng, id: string): CityCase {
  const level = { Mudah: [2, 4, 7], Sedang: [3, 5, 9], Menantang: [4, 6, 11] }[difficulty];
  const targetX = int(rng, level[0], level[1]);
  const targetY = int(rng, level[0], level[1]);
  const costX = int(rng, 5, level[2]); const costY = int(rng, 6, level[2] + 2);
  const landX = int(rng, 2, 4); const landY = int(rng, 1, 4);
  const serviceX = int(rng, 9, 16); const serviceY = int(rng, 10, 18);
  const emissionX = int(rng, 2, 5); const emissionY = int(rng, 1, 4);
  const constraints: Constraint[] = [
    { id: "budget", type: "budget", label: "Anggaran", a: costX, b: costY, op: "<=", limit: costX * targetX + costY * targetY + int(rng, 1, 5), unit: "M", explanation: "Total biaya pembangunan tidak boleh melampaui anggaran." },
    { id: "land", type: "land", label: "Lahan", a: landX, b: landY, op: "<=", limit: landX * targetX + landY * targetY + int(rng, 1, 3), unit: "petak", explanation: "Pemakaian lahan tidak boleh melampaui kapasitas kota." },
    { id: "service", type: "service", label: "Layanan warga", a: serviceX, b: serviceY, op: ">=", limit: serviceX * targetX + serviceY * targetY - int(rng, 0, 7), unit: "poin", explanation: "Kapasitas layanan harus mencapai target minimum." },
    { id: "emission", type: "emission", label: "Emisi", a: emissionX, b: emissionY, op: "<=", limit: emissionX * targetX + emissionY * targetY + int(rng, 1, 4), unit: "CO₂e", explanation: "Beban emisi pembangunan tidak boleh melampaui batas." },
  ];
  const suffixes = ["Madani", "Selaras", "Hijau", "Sejahtera", "Lestari", "Resilien", "Rendah Karbon"];
  const cityName = `${pick(rng, template.cityRoots)} ${pick(rng, suffixes)}`;
  const goalOptions = shuffle(rng, [template.goal, "Menghabiskan seluruh anggaran tanpa sisa.", "Membangun unit sebanyak mungkin tanpa memeriksa kendala."]);
  const facts = shuffle(rng, [
    ...constraints.map((c) => ({ id: `fact-${c.id}`, text: `${c.a}x + ${c.b}y ${c.op === "<=" ? "≤" : "≥"} ${c.limit} (${c.label.toLowerCase()})`, relevant: true })),
    { id: "fact-color", text: "Gerbang kota akan dicat biru muda.", relevant: false },
    { id: "fact-festival", text: "Festival kota berlangsung akhir semester.", relevant: false },
  ]);
  return {
    ...template,
    id,
    cityName,
    scenario: template.scenario(cityName, template.variables[0].name, template.variables[1].name),
    difficulty,
    constraints,
    facts,
    goalOptions,
    correctGoal: goalOptions.indexOf(template.goal),
    constraintOptions: shuffle(rng, [
      { id: "budget", text: "Batas anggaran", correct: true },
      { id: "land", text: "Batas lahan", correct: true },
      { id: "service", text: "Target layanan minimum", correct: true },
      { id: "emission", text: "Batas emisi", correct: true },
      { id: "time", text: "Jadwal festival", correct: false },
      { id: "color", text: "Warna gerbang", correct: false },
    ]),
    recommendedRange: calculateRecommendations(constraints),
  };
}

export function generateCaseWithLocalRules(): CityCase {
  const rng = Math.random;
  return buildCase(pick(rng, templates), pick<Difficulty>(rng, ["Mudah", "Sedang", "Menantang"]), rng, `local-${Date.now()}-${int(rng, 100, 999)}`);
}

export function generateCasePack(count = CASE_BANK_SIZE): CityCase[] {
  const rng = Math.random;
  return Array.from({ length: count }, (_, index) => {
    const template = templates[index % templates.length];
    const difficulty = pick<Difficulty>(rng, index < 3 ? ["Mudah", "Sedang"] : ["Mudah", "Sedang", "Menantang"]);
    return buildCase(template, difficulty, rng, `pack-${Date.now()}-${index}-${int(rng, 100, 999)}`);
  });
}

// Kasus awal deterministik agar server dan browser merender data yang sama.
export const DEFAULT_CASE = buildCase(templates[0], "Sedang", () => 0.42, "default-arunika");
export const DEFAULT_CASE_PACK = templates.slice(0, CASE_BANK_SIZE).map((template, index) => {
  const difficulties: Difficulty[] = ["Mudah", "Sedang", "Sedang", "Menantang"];
  return buildCase(template, difficulties[index % difficulties.length], seededRng(`default-pack-${index}`), `default-pack-${index}`);
});
