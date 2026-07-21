import type { CityCase, Constraint, Difficulty } from "../types/game";

type Rng = () => number;
type Template = Omit<CityCase, "id" | "cityName" | "scenario" | "difficulty" | "constraints" | "facts" | "goalOptions" | "correctGoal" | "constraintOptions" | "recommendedRange"> & {
  cityRoots: string[];
  scenario: (city: string, x: string, y: string) => string;
};

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
    optionalParkLimit: 2,
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
  const suffixes = ["Madani", "Selaras", "Hijau", "Sejahtera", "Lestari"];
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

// Kasus awal deterministik agar server dan browser merender data yang sama.
export const DEFAULT_CASE = buildCase(templates[0], "Sedang", () => 0.42, "default-arunika");

