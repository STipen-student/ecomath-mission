# Spesifikasi Mesin Skoring — Ecomath Mission

Dokumen ini memetakan setiap deskriptor rubrik pada `EcomathMission_ECD_Framework.docx`
ke fungsi kode yang mengimplementasikannya, mencatat seluruh angka ambang batas,
dan mendaftar setiap keputusan operasional yang diambil ketika dokumen ECD tidak
menyebut angka secara eksplisit.

Tujuannya satu: **setiap angka pada data penelitian dapat ditelusuri kembali ke
perilaku siswa dan ke baris kode yang menghasilkannya.** Dokumen ini dimaksudkan
untuk dilampirkan atau dikutip pada BAB III skripsi sebagai definisi operasional
instrumen.

**Versi rubrik: `1.0.0`** — tersimpan pada kolom `Score.scoring_version` di setiap
baris skor. Naikkan versi ini setiap kali ambang batas atau logika rubrik berubah,
dan **jangan gabungkan data dari dua versi rubrik yang berbeda** dalam satu analisis.

---

## 1. Peta modul

| Berkas | Tanggung jawab |
|---|---|
| `server/src/domain/types.ts` | Bentuk data task, kendala, fungsi tujuan |
| `server/src/domain/events.ts` | Skema log event (Bagian 5.1 dokumen ECD) |
| `server/src/domain/feasibility.ts` | Apakah titik (x, y) memenuhi kendala |
| `server/src/domain/optimum.ts` | Titik pojok, titik optimum, jarak relatif dari optimum |
| `server/src/tasks/level1-4.ts` | Bank skenario (data, bukan logika) |
| `server/src/tasks/index.ts` | Assembly rule dan pemilihan task |
| `server/src/scoring/observables.ts` | Log mentah → observable variables |
| `server/src/scoring/k1.ts` … `k4.ts` | Rubrik per klaim |
| `server/src/scoring/thresholds.ts` | **Seluruh angka yang dapat disetel** |
| `server/src/scoring/index.ts` | Orkestrator `scoreAttempt` |
| `server/src/scoring/feedback.ts` | Terjemahan skor → kalimat umpan balik untuk siswa |
| `server/src/routes/teacher.routes.ts` | Rekap kelas dan rincian pekerjaan untuk guru |

Mesin skoring bersifat **murni**: `scoreAttempt(task, events)` tidak menyentuh
database, jaringan, maupun jam sistem. Log yang sama selalu menghasilkan skor yang
sama, dan seluruh skor dapat dihitung ulang kapan pun langsung dari tabel `EventLog`.

---

## 2. Alur penskoran

```
EventLog (database)
        │
        ▼
rowsToRawEvents()          parse payload JSON, buang event tak dikenal
        │
        ▼
deriveObservables()        rekonstruksi timeline → variabel agregat per sesi
        │
        ├──► scoreK1()     Memahami Masalah
        ├──► scoreK2()     Merencanakan Penyelesaian
        ├──► scoreK3()     Melaksanakan Rencana
        └──► scoreK4()     Memeriksa Kembali
                │
                ▼
        weightedComposite()   bobot per level
                │
                ▼
        Score + trace (jejak audit JSON)
```

---

## 3. Observable variables

Diturunkan di `scoring/observables.ts`. Nama pada dokumen ECD dipetakan sebagai berikut.

| Nama pada dokumen | Nama pada kode | Cara dihitung |
|---|---|---|
| `identify_variables_action` | `identifyVariableCount`, `variablesCorrect` | Penetapan **terakhir** untuk x dan y; benar bila keduanya cocok opsi kunci |
| `misconception_flag_translate` | `firstConstraintMisconception` | Klasifikasi `write_constraint` **pertama** |
| `constraint_count_written` | `constraintCountWritten` | Banyak kendala **berbeda** yang dicoba disusun |
| `objective_function_selected` | `objectiveSelected`, `objectiveCorrect`, `objectiveBeforeFirstMove` | Urutan `select_objective` terhadap `move_slider` pertama |
| `planning_time_ms` | `planningTimeMs` | Waktu sampai aksi konstruksi pertama |
| `final_position_xy` | `finalPosition`, `finalPositionValid` | Payload `attempt_submit` terakhir |
| `boundary_violation_count` | `boundaryViolationCount` | Banyak event `reject_by_system` |
| `corner_point_check_action` | `cornerPointsChecked`, `cornerCheckBeforeFirstSubmit` | Titik pojok **unik** yang dihitung siswa |
| `post_solution_edit_count` | `postSolutionEditCount` | `move_slider` setelah submit valid pertama |
| `tradeoff_acknowledgement_action` | `reflectionClosedQuality` | Bobot kualitas opsi refleksi tertutup (0–3) |
| `feasibility_reflection_response` | `reflectionOpenText` | Teks jawaban terbuka |
| `jumlah_revisi` | `structuralRevisionCount`, `minorRevisionCount` | Dipisah: perubahan koefisien/arah vs perubahan konstanta saja |
| `konsistensi_setelah_event_distraktor` | `reviseAfterEventCount`, `postEventValid` | Aksi setelah `distractor_shown` |

### 3.1 Pencocokan pertidaksamaan dan deteksi miskonsepsi

Siswa menyusun pertidaksamaan lewat *constraint builder* (koefisien terstruktur),
bukan teks bebas. Pertidaksamaan dinormalisasi ke bentuk kanonik `a·x + b·y ≤ c`
lalu diskalakan, sehingga bentuk ekuivalen dikenali sama:

- `x ≥ 2y`, `x − 2y ≥ 0`, `2x − 4y ≥ 0`, dan `2y − x ≤ 0` → **semuanya benar**

Urutan pemeriksaan (`classifyConstraint`), dari paling ringan ke paling berat:

| Hasil | Arti | Dampak pada K1 |
|---|---|---|
| `none` | identik dengan kunci | dapat mencapai skor 3 |
| `unit_scale` | arah benar, konstanta salah skala | skor 2 |
| `sign_flip` | arah pertidaksamaan terbalik | skor 1 |
| `swap_vars` | peran x dan y tertukar | skor 1 |
| `structural` | tidak menyerupai kendala mana pun | skor 1 |

---

## 4. Rubrik per klaim

### K1 — Memahami Masalah (`scoring/k1.ts`)

| Skor | Kondisi pada kode |
|---|---|
| 0 | `identifyVariableCount === 0` **atau** `!variablesCorrect` |
| 1 | Variabel benar, tetapi: tidak ada kendala disusun sama sekali, **atau** kendala pertama `sign_flip`/`swap_vars`/`structural`, **atau** tidak satu pun kendala benar |
| 2 | Variabel benar dan **minimal satu** kendala benar, tetapi tidak seluruhnya tepat pada percobaan pertama |
| 3 | `allConstraintsCorrectFirstTry` **dan** `constraintCountCorrect ≥ expectedConstraintCount` |

**Keputusan operasional.** Deskriptor rubrik tidak mencakup kasus "variabel benar
tetapi siswa tidak pernah menyusun satu pun pertidaksamaan". Kasus itu ditempatkan
pada skor 1, karena bukti penerjemahan — inti klaim K1 — tidak pernah muncul,
sementara skor 0 sudah didefinisikan khusus untuk kegagalan identifikasi variabel.

### K2 — Merencanakan Penyelesaian (`scoring/k2.ts`)

| Skor | Kondisi pada kode |
|---|---|
| 0 | `!objectiveSelected` **atau** `!objectiveBeforeFirstMove` |
| 1 | `constraintCountWritten < expectedConstraintCount` |
| 2 | `!cornerCheckBeforeFirstSubmit` **atau** `!objectiveCorrect` |
| 3 | Selain di atas |

**Keputusan operasional — pemisahan konstruk dari K1.** Skor 1 vs 2 memakai jumlah
kendala yang **disusun**, bukan yang **benar**. Ketepatan terjemahan sudah dinilai
K1; memakainya lagi di K2 berarti satu kesalahan siswa dihukum dua kali dan membuat
K1–K2 berkorelasi secara artifisial, yang merusak validitas diskriminan antar-klaim
pada analisis butir. Uji `k2.test.ts` → *"pemisahan konstruk dari K1"* mengunci
perilaku ini.

**Keputusan operasional — `planning_time_ms` tidak menjadi gerbang skor.** Dokumen
menyebut variabel ini sebagai observable, tetapi rubrik K2 dirumuskan atas *urutan
aksi*, bukan durasi. Ambang durasi sangat sensitif pada kecepatan membaca siswa.
Nilainya tetap dicatat dan diekspor sebagai variabel deskriptif.

**Keputusan operasional — task tanpa fungsi tujuan.** Level 1–2 tidak memiliki
fungsi tujuan matematis. Agar rubrik K2 tetap berlaku seragam, seluruh task memiliki
daftar `goalOptions`: pada Level 3–4 berisi fungsi tujuan sesungguhnya, pada Level
1–2 berisi rumusan tujuan tugas. Keduanya memancarkan event `select_objective` yang
sama, sehingga bukti "merencanakan sebelum bertindak" tetap terukur tanpa mengarang
optimasi yang memang tidak ada pada soal.

### K3 — Melaksanakan Rencana (`scoring/k3.ts`)

Varian **`standard`** (task dengan fungsi tujuan, Level 3–4):

| Skor | Kondisi |
|---|---|
| 0 | Tidak pernah submit, **atau** posisi akhir di luar daerah penyelesaian |
| 1 | Valid, tetapi `relativeGap > 0,05` |
| 2 | `relativeGap ≤ 0,05` tetapi `boundaryViolationCount > ambang` |
| 3 | `relativeGap ≤ 0,05` dan `boundaryViolationCount ≤ ambang` |

Varian **`feasibility_only`** (task tanpa fungsi tujuan, Level 1–2):

| Skor | Kondisi |
|---|---|
| 0 | Tidak pernah submit, atau posisi akhir tidak valid |
| 1 | Valid, tetapi `boundaryViolationCount > 2 × ambang` |
| 2 | Valid, tetapi `boundaryViolationCount > ambang` |
| 3 | Valid dan `boundaryViolationCount ≤ ambang` |

Varian yang dipakai selalu tercatat pada kolom `criterion` di jejak audit.

**Level 4 dinilai terhadap kendala PASCA-event.** Bila `distractor_shown` sudah
tercatat, kelayakan dan titik optimum dihitung memakai kendala hasil revisi — itulah
aturan yang berlaku saat siswa melakukan submit terakhirnya. Perilaku *merevisi*
dinilai terpisah pada K4, sehingga tidak ada penghitungan ganda.

### K4 — Memeriksa Kembali (`scoring/k4.ts`)

Varian **`standard`** (Level 4, event distraktor muncul):

| Skor | Kondisi |
|---|---|
| 0 | Tidak ada revisi setelah event, **atau** refleksi tidak dijawab / kualitas 0 |
| 1 | Ada revisi, tetapi solusi baru tetap melanggar kendala baru |
| 2 | Revisi berhasil, `reflectionQuality` bernilai 1 atau 2 |
| 3 | Revisi berhasil dan `reflectionQuality === 3` |

Varian **`reflection_only`** (Level 1–3) dan **`distractor_not_fired`** (Level 4 saat
event tidak sempat muncul): skor = `reflectionQuality` apa adanya.

`reflectionQuality = ⌊(kualitas_tertutup + skor_terbuka) / 2⌋`

Pembulatan **ke bawah** dipakai — bukan nilai maksimum — supaya skor 3 hanya
tercapai bila kedua bentuk jawaban sama-sama lengkap. Ini membatasi peluang siswa
memperoleh skor tertinggi hanya karena menebak opsi tertutup yang tepat.

---

## 5. Heuristik penilaian jawaban terbuka K4

> **Peringatan validitas.** Penskoran otomatis teks terbuka dipilih peneliti secara
> sadar demi kepraktisan pengambilan data. Heuristik ini mendeteksi **penanda
> bahasa**, bukan kebenaran penalaran.

Skor 0–3 untuk `reflectionOpenText`:

| Skor | Kondisi |
|---|---|
| 0 | < 12 karakter atau < 3 kata, frasa non-jawaban ("tidak tahu", "bingung"), atau tidak menyebut istilah domain **dan** tidak ada penanda trade-off |
| 1 | Menyebut istilah domain, tetapi tanpa penanda trade-off |
| 2 | Menyebut istilah domain **dan** ada penanda trade-off |
| 3 | Poin 2 **ditambah** penanda justifikasi atau rujukan angka |

Daftar penanda lengkap ada di `scoring/thresholds.ts` → `K4_MARKERS`. Istilah domain
per task ada di `reflection.expectedTerms` pada berkas bank skenario.

**Batas yang diketahui dan didokumentasikan** (diuji eksplisit di `k4.test.ts`):

- Kalimat hafalan yang memuat penanda tepat **tetap** memperoleh skor tinggi.
- Penalaran benar yang ditulis tanpa penanda trade-off memperoleh skor rendah.

**Mitigasi yang tersedia:**

1. Teks mentah siswa selalu tersimpan utuh pada `EventLog` — tidak pernah hilang.
2. Kolom `Score.k4ManualOverride` menampung koreksi manual rater kedua tanpa
   menimpa skor otomatis, sehingga **selisih keduanya dapat dihitung sebagai bukti
   reliabilitas antar-penilai** pada laporan penelitian.
3. Endpoint `POST /api/admin/k4-override` menghitung ulang `raw_sum` dan komposit
   berbobot secara otomatis setelah koreksi.
4. Kolom `K4_auto`, `K4_manual`, `K4`, dan `K4_overridden` tersedia terpisah pada
   `scores_long.csv`.

---

## 6. Seluruh ambang batas

Semuanya terkumpul di `server/src/scoring/thresholds.ts`.

| Konstanta | Nilai | Dasar penetapan |
|---|---|---|
| `optimumToleranceRatio` | `0,05` | Keputusan peneliti. Gap dinormalisasi terhadap **rentang** nilai Z antar titik pojok, bukan terhadap \|Z*\|, agar makna "5%" setara pada soal maksimasi skor maupun minimisasi biaya |
| `violationThresholdFor(n)` | `n` (jumlah kendala substantif) | Keputusan peneliti. Satu penolakan per kendala masih wajar sebagai eksplorasi batas; lebih dari itu menandakan pencarian coba-coba |
| `feasibilityOnlyLenientMultiplier` | `2` | Pembeda skor 1 vs 2 pada task tanpa fungsi tujuan |
| `minOpenTextChars` / `minOpenTextWords` | `12` / `3` | Ambang "tidak dijawab / asal isi" pada deskriptor K4 skor 0 |
| `distractorFallbackMs` | `720000` (12 menit) | Cadangan pemicu event, lihat §7 |
| `constraintMatchTolerance` | `1e-6` | Menyerap pembulatan desimal pada koefisien seperti 0,04 dan 0,25 |

### Ambang efektif per task

| Level | Jumlah kendala substantif | Ambang `boundary_violation_count` |
|---|---|---|
| 1 | 2 | 2 |
| 2 | 2–3 | 2–3 |
| 3 | 2–3 | 2–3 |
| 4 | 3 | 3 |

### Bobot komposit per level

| Level | K1 | K2 | K3 | K4 | Dasar |
|---|---|---|---|---|---|
| 1 | 0,40 | 0,25 | 0,25 | 0,10 | Fokus bukti K1 dominan (§4.2) |
| 2 | 0,30 | 0,30 | 0,25 | 0,15 | Fokus bukti K1–K2 |
| 3 | 0,20 | 0,30 | 0,30 | 0,20 | Fokus bukti K2–K3 |
| 4 | 0,15 | 0,20 | 0,25 | **0,40** | Fokus bukti K3–K4, K4 diperbesar (§2) |

Jumlah bobot tiap level tepat 1,0 (diverifikasi `taskbank.test.ts`), sehingga
komposit berbobot berada pada rentang 0–3 dan sebanding antar level. Jumlah mentah
`K1+K2+K3+K4` (0–12) **ikut disimpan** pada kolom terpisah, sehingga kedua bentuk
skor tersedia tanpa perlu menghitung ulang.

---

## 7. Penambahan dan penyimpangan terhadap dokumen ECD

Setiap butir di bawah adalah hal yang **tidak** ada pada dokumen asli, atau berbeda
darinya. Semuanya perlu disebutkan pada bagian metodologi.

### 7.1 Event `distractor_shown` (penambahan)

Dokumen mendaftar sembilan jenis event. Satu jenis ditambahkan: `distractor_shown`,
dipancarkan **oleh server**, bukan oleh siswa. Penilaian K4 menuntut pemisahan aksi
"sebelum" dan "sesudah" event kebijakan; tanpa penanda waktu tersimpan, pemisahan itu
mustahil dilakukan. Payload-nya mencatat `trigger`: `first_valid_submit` atau
`time_fallback`.

### 7.2 Event `set_zone_center` (penambahan)

Siswa dapat memindahkan titik pusat pembangunan tiap zona dengan mengetuk peta.
Perpindahan itu dicatat sebagai event `set_zone_center` dengan payload
`{ variable, col, row }`.

**Event ini tidak dipakai rubrik mana pun.** Letak zona adalah pilihan tata kota
dan tidak memengaruhi nilai x maupun y — jumlah zona tetap sepenuhnya ditentukan
slider. Ia dicatat karena mengubah keadaan yang terlihat siswa, dan prinsip
instrumen ini adalah setiap perubahan keadaan meninggalkan jejak. Bagi peneliti,
jejaknya tersedia sebagai data proses tambahan.

Uji `scoring.test.ts` → *"mengabaikan set_zone_center sepenuhnya saat menghitung
skor"* membandingkan skor log dengan dan tanpa event ini, dan akan gagal bila
suatu saat ada rubrik yang diam-diam membacanya.

**Mengapa jumlah zona tidak ditentukan dengan mengecat ubin.** Peta hanya punya
seratusan petak, sedangkan sebagian task menuntut x sampai 210 hektar dan titik
optimum `L3-SDG13-A` berada di 33,33 ton. Bila jumlah zona ikut ditentukan
banyaknya ubin, nilai x dan y terkunci pada kelipatan satu petak, titik optimum
menjadi tak terjangkau, dan K3 akan menghukum seluruh siswa karena keterbatasan
tampilan — bukan karena penalaran mereka. Karena itu slider menentukan BERAPA,
peta menentukan DI MANA.

### 7.3 Pemicu cadangan event distraktor (penambahan)

Dokumen menetapkan event muncul "setelah siswa submit solusi awal yang valid".
Siswa yang tidak pernah mencapai solusi valid karenanya tidak akan pernah
menghasilkan bukti K4 sama sekali. Setelah **12 menit**, sistem memunculkan event
apa pun status solusinya, dan pemicunya dicatat sebagai `time_fallback` sehingga
kasus ini dapat dipisahkan saat analisis.

### 7.4 Jumlah kendala Level 1 (ketidakcocokan pada dokumen)

Tabel §10 mencantumkan "Jml Kendala = 1" untuk seluruh varian Level 1, sedangkan
narasi ketiga varian meminta siswa menuliskan **dua** pertidaksamaan. Sesuai
keputusan peneliti, skoring K2 memakai angka dari narasi (`expectedConstraintCount = 2`),
sementara angka tabel disimpan terpisah pada `blueprintConstraintCount` untuk
keperluan Item-Claim Blueprint. Endpoint `GET /api/admin/blueprint` menampilkan
kedua angka berdampingan.

### 7.5 Revisi `L4-SDG13-A` (perbaikan cacat instrumen)

Angka asli dokumen menghasilkan **daerah penyelesaian kosong**:

```
x + y ≥ 60  dan  12x + 18y ≤ 900   ⟹  x ≥ 30
x + y ≥ 60  dan  15x + 2y  ≤ 400   ⟹  x ≤ 21,5
```

Tidak ada kombinasi mesin yang memenuhi ketiganya — soal mustahil dikerjakan.
Sesuai keputusan peneliti, **anggaran operasional dinaikkan dari Rp 900 juta menjadi
Rp 1.080 juta**. Kendala emisi 400 kg tetap menjadi kendala pengikat, dan mekanisme
kendala implisit "separuh dari 800" dipertahankan utuh. Optimum awal: 21 mesin fosil
dan 39 mesin listrik (Z = 954 juta).

Selain itu, **tarif karbon pada event distraktor dinaikkan dari Rp 4 juta menjadi
Rp 8 juta per unit**. Pada Rp 4 juta, mesin fosil (12+4 = 16) masih lebih murah
daripada mesin listrik (18), sehingga titik optimum **tidak bergeser** — bertentangan
dengan bukti K4 yang diharapkan dokumen. Pada Rp 8 juta, optimum bergeser ke
0 fosil dan 60 listrik, persis seperti yang dituju desain item.

Uji `domain.test.ts` → *"setiap task Level 4 benar-benar menggeser titik optimumnya"*
mencegah cacat serupa lolos pada varian yang ditambahkan kemudian.

### 7.6 Tabel data pada Level 2 (penambahan kecil)

Dokumen hanya menyertakan tabel data pada `L2-SDG11-A`. Tabel ditambahkan pada dua
varian Level 2 lainnya agar seluruhnya konsisten dengan task feature "cerita + tabel
data" pada §4.2. Isi tabel hanya merangkum angka yang sudah ada di narasi.

### 7.7 Kendala implisit disembunyikan dari panel (penerapan §9)

Panel kendala real-time menampilkan status terpenuhi/dilanggar untuk **seluruh**
kendala, tetapi **isi** kendala berjenis `implicit` disembunyikan sampai event
distraktor mengumumkannya. Menampilkan `15x + 2y ≤ 400` secara utuh akan memberikan
jawaban yang justru harus disimpulkan siswa dari kalimat "separuh dari 800", dan
meniadakan hal yang ingin diukur Level 4. Untuk alasan yang sama, daftar kandidat
titik pojok dihitung **tanpa** kendala tersirat — siswa yang mengabaikannya akan
memilih titik yang kemudian ditolak sistem, dan penolakan itulah bukti K3/K4.

### 7.8 Identitas visual variabel mengikuti makna, bukan sumbu

Setiap variabel membawa field `visual` pada data task: `nature` (ruang hijau),
`clean` (energi bersih), `housing` (hunian), atau `neutral` (industri,
infrastruktur, fosil). Peta menggambar zona berdasarkan field itu, bukan
berdasarkan sumbu x/y.

Ini bukan sekadar pilihan estetika. Bila warna dikunci ke sumbu — x selalu hijau,
y selalu kuning — maka pada **lima dari dua belas skenario** yang menempatkan
variabel ramah lingkungan di sumbu y, siswa akan melihat pepohonan tumbuh saat
menambah mesin fosil dan blok beton tumbuh saat memperluas ruang terbuka hijau.
Visual yang berlawanan dengan maknanya merusak penalaran trade-off SDG yang
justru menjadi inti klaim K4.

Dua uji menjaganya: setiap task wajib memakai identitas berbeda untuk kedua
variabelnya (agar kedua zona terbedakan di peta), dan tujuh variabel ruang hijau
yang teridentifikasi wajib bernilai `nature`.

### 7.9 Antarmuka tidak memaksa urutan pengerjaan (keputusan desain)

Seluruh panel terbuka sejak awal. Bila urutan dipaksakan (identifikasi → tujuan →
kendala → slider), event `select_objective` mustahil terjadi setelah `move_slider`,
sehingga deskriptor **K2 skor 0** tidak akan pernah muncul pada data mana pun dan
rubrik kehilangan daya pembedanya.

---

## 7.10 Umpan balik siswa terpisah dari deskriptor rubrik

Deskriptor rubrik ditulis untuk peneliti dan memuat istilah seperti
`boundary_violation_count`. `scoring/feedback.ts` menerjemahkan setiap kombinasi
(klaim, skor, bukti) menjadi dua kalimat berbahasa siswa: apa yang terjadi, dan
langkah berikutnya.

**Modul ini tidak mengubah skor sedikit pun** — hanya cara menyampaikannya.
Deskriptor asli tetap dikirim pada field `rubric` respons `/api/submit` dan
ditampilkan utuh pada halaman guru, sehingga jejak audit tidak pernah hilang.

Tiga sifat dijaga uji `feedback.test.ts`: selalu ada saran untuk setiap
kombinasi klaim dan skor (termasuk skor 3), tidak ada istilah teknis internal
yang bocor ke kalimat siswa, dan kalimat berubah mengikuti perilaku siswa yang
sesungguhnya — termasuk membedakan "tidak menjawab refleksi" dari "menjawab
tetapi belum bermutu", karena menuduh siswa diam padahal ia menulis akan
meruntuhkan kepercayaan pada seluruh umpan balik.

**Disimpan apa adanya, bukan hanya dapat dihitung ulang.** Kolom `Score.feedback`
menyimpan JSON `{ claims, overallMessage }` — persis kalimat yang dikirim ke
client saat `/api/submit` dipanggil. Ini disengaja berbeda dari `Score.trace`:
`trace` cukup menyimpan deskriptor rubrik dan bukti karena keduanya deterministik
terhadap versi rubrik yang tercatat pada `scoringVersion`, tetapi kalimat pada
`scoring/feedback.ts` dapat direvisi tanpa menaikkan versi rubrik (skornya tidak
berubah). Tanpa penyimpanan terpisah ini, menghitung ulang kalimat dari `trace`
di kemudian hari dapat menghasilkan teks yang berbeda dari yang benar-benar
dilihat siswa saat mengerjakan — merusak catatan "apa yang terjadi saat itu"
yang penting bagi laporan penelitian. Halaman guru membaca kolom ini langsung
(field `studentFeedback` pada `GET /api/admin/attempt/:id`), bukan memanggil
ulang `buildStudentFeedback()`.

## 7.11 Peninjauan K4 oleh guru sebagai jalur mitigasi

Halaman guru (`/guru.html`) menampilkan jawaban terbuka siswa apa adanya
berdampingan dengan skor K4 otomatis, beserta kendali untuk mengoreksinya.
Inilah jalur mitigasi resmi atas keterbatasan heuristik yang didokumentasikan
pada Bagian 5.

Skor otomatis **tidak pernah ditimpa**: koreksi disimpan pada kolom terpisah
`Score.k4ManualOverride`. Konsekuensinya, selisih skor mesin dan skor guru dapat
dihitung langsung dari kolom `K4_auto` dan `K4` pada `scores_long.csv` sebagai
bukti kesepakatan antar-penilai pada laporan penelitian.

## 7.12 Kesimpulan lintas level ditulis terpisah dari kesimpulan per level

`GET /api/admin/student/:sessionId` merangkum seluruh level yang dikerjakan
satu siswa: skor tiap level, rata-rata tiap klaim (K1–K4) lintas level, dan satu
kalimat kesimpulan (`buildSessionConclusion()` di `scoring/feedback.ts`).

**Ini bukan pemanggilan ulang `buildOverallMessage()`.** Fungsi itu menyapa
siswa langsung ("kamu") dan bekerja pada skor bulat 0–3 satu level. Kesimpulan
lintas level dibaca guru, ditulis orang ketiga ("siswa ini"), dan bekerja pada
**rata-rata** yang bisa pecahan (mis. 2,33). Ambang batasnya karena itu sengaja
diberi jarak dari ujung skala — "menguasai" pada rata-rata ≥ 2,5, bukan harus
tepat 3 — karena siswa yang konsisten skor 3 pada tiga level lalu turun ke 2
pada satu level sudah pantas disebut menguasai, bukan ditahan menunggu rata-rata
sempurna yang jarang tercapai pada instrumen empat level.

Rata-rata per klaim memakai nilai **efektif** K4 (`effectiveScore().k4`, sudah
memperhitungkan `k4ManualOverride`), sehingga profil pada laporan guru selalu
konsisten dengan angka pada tabel ringkasan kelas — keduanya dihitung dari
fungsi yang sama, `lib/scoreView.ts`.

Rincian teknis (jejak audit rubrik, log mentah) sengaja **tidak diulang** di
endpoint ini — tetap hidup di `GET /api/admin/attempt/:id` per level, dan
halaman guru membukanya sebagai modal bertumpuk di atas laporan siswa bila
diperlukan. Memisahkan keduanya menjaga laporan siswa tetap ringkas: gambaran
besar dulu, rincian teknis atas permintaan.

## 7.13 Meter kendala dan titik pojok memakai tulisan siswa, bukan kunci jawaban

Sebelum perubahan ini, meter kendala di HUD dan daftar kandidat titik pojok
selalu dihitung dari `task.constraints` — kunci jawaban asli yang dikirim server
saat task dimuat. Konsekuensinya, siswa dapat menggeser slider sampai meter
hijau tanpa pernah menerjemahkan narasi menjadi pertidaksamaan sendiri: K3
(melaksanakan rencana) bisa "lolos" murni dengan membaca warna meter, sama
sekali lepas dari apakah K1/K2 (memahami, merencanakan) benar-benar dikuasai.
Panel "Kendala" pun jadi opsional secara de facto — dapat dilewati tanpa
konsekuensi visual apa pun.

**Perbaikannya**: `client/src/ui/PlayScreen.ts` sekarang menyimpan tulisan
siswa per slot (`tulisanKendala: (TulisanKendala | null)[]`), dan KEDUA panel
dihitung dari situ:

- **Meter HUD** — slot yang belum ditulis tampil netral (bukan hijau/merah,
  `.meter.is-empty`) dan mengarahkan siswa membuka panel Kendala. Slot yang
  sudah ditulis diuji terhadap **hipotesis siswa sendiri**: `evaluate()`
  dipanggil atas array yang dibangun dari `tulisanKendala`, bukan dari
  `task.constraints`.
- **Titik pojok** — `cornerCandidates()` dipanggil dengan argumen yang sama.
  Sebelum seluruh slot terisi, kandidat yang muncul hanyalah sudut kotak batas
  slider; setelah lengkap namun keliru, kandidatnya pun ikut keliru — dan itu
  disengaja, ditulis eksplisit pada `docs/SCORING_SPEC.md` ini agar tidak
  disalahartikan sebagai bug oleh maintainer berikutnya.

**Apa yang TETAP memakai kunci jawaban** (tidak berubah): kelayakan saat
`kirim()` (attempt_submit/reject_by_system), warna rona peta (feasible/
melanggar), dan seluruh isi `terapkanDistractor()`. Ini wajib — validitas skor
bergantung pada kelayakan yang selalu diuji terhadap kebenaran asli, dan server
tetap menghitung ulang semuanya sendiri dari `EventLog` saat submit (§lihat
Bagian 2). Perubahan pada bagian ini murni MENGURANGI bantuan visual yang
sebelumnya bocor lewat UI — tidak mengubah satu baris pun logika skoring, dan
karena itu tidak menuntut migrasi `SCORING_VERSION`.

Non-negativitas (x ≥ 0, y ≥ 0) tetap diambil dari kunci jawaban meski tidak
ditulis siswa — bukan kebocoran, karena nilainya universal dan identik di
seluruh dua belas task (bukan bagian dari `expectedConstraintCount`, sehingga
tidak pernah menjadi bagian dari apa yang "diminta ditulis" narasi).

Efek yang diharapkan: ketidaksesuaian antara meter (hijau, berdasarkan tulisan
sendiri) dan rona peta (merah, berdasarkan kebenaran) saat siswa salah
menerjemahkan kendala kini terlihat langsung di layar — momen itulah bukti
K4 ("memeriksa kembali") yang justru ingin diukur instrumen ini, bukan sesuatu
yang perlu dihindari.

---

## 7.14 Tombol "Bangun" membulatkan ke titik grid TERDEKAT YANG LAYAK, bukan sekadar terdekat

Ditemukan lewat data pemain sungguhan (attempt Level 3, task `L3-SDG13-A`):
siswa menulis kedua kendala dengan benar, memeriksa titik pojok lewat "Hitung"
dan mendapat `(33.33, 16.67)` — titik optimum sejati task ini — lalu menekan
"Bangun". Tombol itu men-set `sliderX.value`/`sliderY.value` langsung ke nilai
pecahan tadi; `<input type="range" step="0.5">` men-sanitasi assignment
tersebut dengan membulatkan ke kelipatan step TERDEKAT SECARA ARITMETIKA,
tanpa peduli kelayakan. Untuk `(33.33, 16.67)` itu berarti dibulatkan ke
`(33.5, 16.5)` — yang ternyata melanggar `0,5x + 0,2y ≤ 20` (hasilnya 20,05)
— padahal tetangganya, `(33, 17)`, sama-sama berjarak dekat dan masih layak.
Siswa yang perhitungannya benar berakhir "MELANGGAR" murni karena arah
pembulatan bawaan browser, bukan karena kesalahan penalaran — sebuah artefak
UI yang keliru dibaca sebagai "kunci jawabannya salah".

**Perbaikannya**: `PlayScreen.titikGridTerdekat()` — dipanggil oleh tombol
"Bangun" sebelum meng-set slider — menghitung keempat kombinasi
floor/ceil dari `(x, y)` terhadap step masing-masing sumbu, menyaring yang
memenuhi `evaluate()` atas **tulisan kendala siswa sendiri** (konsisten dengan
§7.13), lalu memilih yang jaraknya paling dekat ke titik hasil hitungan. Hanya
jika tak ada satu pun kombinasi yang layak, baru jatuh ke pembulatan biasa
(perilaku lama). Ini murni perbaikan UX pada satu tombol — tidak menyentuh
`kirim()`, tidak menyentuh kelayakan yang dihitung ulang di server, dan tidak
menuntut migrasi `SCORING_VERSION`.

---

## 7.15 Kunci jawaban lengkap ditampilkan setelah level disubmit

Sebelum ini, layar hasil (`ResultScreen.ts`) hanya menampilkan titik optimum
dan nilai Z dalam satu baris kecil (`catatanOptimum`) — cukup untuk konfirmasi,
tapi tidak cukup sebagai bahan belajar. Siswa yang salah tak punya cara
melihat APA yang seharusnya ditulis, hanya tahu bahwa jawabannya salah.

**Perbaikannya**: `kunciJawabanSection()` di `client/src/ui/ResultScreen.ts`
menambahkan panel `<details>` (terlipat secara bawaan, berjudul "LIHAT KUNCI
JAWABAN") yang tampil SETELAH `feedback` dan `catatanOptimum`, berisi:

- Seluruh kendala sebenarnya (`task.constraints`, termasuk kendala tersirat
  yang selama pengerjaan disembunyikan lewat `disembunyikan()`) dalam bentuk
  terbaca, dengan label `TERSIRAT` pada yang implisit.
- Fungsi tujuan (`task.objective.display`), bila level punya fungsi tujuan.
- Seluruh titik pojok daerah penyelesaian, dihitung dari `cornerCandidates()`
  atas kendala SEBENARNYA (bukan tulisan siswa — berbeda dari §7.13/§7.14
  yang sengaja memakai tulisan siswa SELAMA pengerjaan). Titik yang cocok
  dengan `hasil.optimum.point` (dari respons server, toleransi 0,01) ditandai
  "★ TERBAIK".
- Satu kalimat kesimpulan: menyebut titik terbaik dan Z bila level punya
  fungsi tujuan, atau penjelasan bahwa SEMUA titik dalam daerah penyelesaian
  adalah jawaban benar bila level tidak punya fungsi tujuan (Level 1 dan 2 —
  lihat `level1.ts`/`level2.ts`, `objective.type === 'none'`).

**Kenapa aman membocorkan kendala tersirat di sini, padahal selama pengerjaan
sengaja disembunyikan**: `task.constraints` sudah lengkap di memori client
sejak task dimuat (lihat `server/src/routes/task.routes.ts` — hanya titik
optimum yang ditahan sampai submit, bukan koefisien kendala). Persoalannya
murni UI: menyembunyikannya SELAMA pengerjaan memaksa siswa menyimpulkan
sendiri (itulah yang diukur K1); menampilkannya SETELAH selesai adalah tujuan
instruksional yang berbeda dan sah — siswa perlu mencocokkan pekerjaannya
dengan jawaban yang benar untuk belajar dari kesalahan.

Perubahan ini murni penambahan UI di client (`ResultScreen.ts`, `app.ts`
meneruskan `task` ke `renderResultScreen`) — tidak ada endpoint atau field
respons baru, tidak menyentuh mesin skoring, tidak menuntut migrasi
`SCORING_VERSION`.

---

## 7.16 Activity Selection adaptif (opsional, bersaklar)

Dokumen §4.2 mengizinkan sistem memilih task "secara acak berstrata **atau
adaptif** ... sehingga tiap siswa dapat memperoleh permukaan soal berbeda
**tanpa mengubah tingkat kesulitan konstruknya**". Implementasi ini mengambil
opsi kedua, dan anak kalimat terakhir itu menjadi seluruh batasannya.

Dalam ECD penuh (Mislevy), adaptivitas berumah di **Activity Selection
Process**, satu dari empat proses *delivery architecture*. Jadi ini penerapan
kerangka, bukan penyimpangan darinya.

### Apa yang diadaptasi — dan apa yang tidak

**Diadaptasi**: varian mana dalam SATU level yang disajikan. Beban permukaan
tiap varian diperingkat dari fitur task §4.1:

```
bebanPermukaan = expectedConstraintCount + bebanJenisBilangan
bebanJenisBilangan: simple_integer 0 · large_integer 0,34 · decimal_mixed 0,67
```

Pecahannya sengaja < 1 agar selisih satu kendala selalu mengalahkan selisih
jenis bilangan — struktur sistem pertidaksamaan tetap penentu utama, beban
aritmetika hanya lapisan di atasnya. Dijaga uji `adaptive.test.ts`.

**TIDAK diadaptasi**, dua-duanya haram:

1. **Melewati atau mengulang level.** Keempat level tetap wajib bagi semua
   siswa. Bila siswa lemah dirutekan agar tidak sampai Level 4, ia tak pernah
   menghadapi event distraktor — satu-satunya pemicu bukti K4 — sehingga K4-nya
   menjadi **tidak terukur**, bukan nol. Melaporkan 0 untuk klaim tanpa bukti
   adalah pelanggaran ECD yang sesungguhnya.
2. **Petunjuk, pengungkapan kendala tersirat, atau pengurangan jumlah kendala
   yang wajib ditulis.** Semua itu mengubah BUKTI yang tersedia, sehingga
   K1=3 milik dua siswa tidak lagi bermakna sama — dan observable variable yang
   tidak bermakna sama merusak seluruh argumen bukti.

### Sinyal kemampuan

Rerata **klaim dominan level yang akan disajikan** (kolom "Fokus bukti" §4.2),
diambil dari level-level yang sudah dinilai. Level 3 berfokus K2–K3, maka
kesiapan siswa untuk Level 3 dibaca dari K2–K3 miliknya — bukan dari K1 yang
mungkin sudah lama kuat, atau K4 yang belum sempat terukur.

Ambang pada `tasks/adaptive.ts` (`ADAPTIVE_THRESHOLDS`): rendah ≤ 1,0;
tinggi ≥ 2,0; selebihnya sedang. Tanpa data level sebelumnya → acak berstrata.

`planningTimeMs` dan turunan kecepatan lain **sengaja tidak dipakai**: siswa
yang lambat karena perangkatnya lambat akan dirutekan ke soal mudah dan skornya
tertekan oleh sebab yang sama sekali di luar konstruk — ancaman keadilan yang
khas asesmen berbasis permainan.

### Level 1 dan 4 tidak punya ruang adaptif

Ketiga varian Level 1 berbeban sama (2 kendala, bilangan bulat sederhana,
naratif), begitu pula Level 4 (3 kendala, bilangan bulat besar, grafik
parsial). Ini **bukan kekurangan** — justru bentuk paralel setara yang §4.2
tuntut lewat penyetaraan (*equating*). Sistem menandainya apa adanya
(`tanpaRuangAdaptif: true`) dan jatuh ke acak berstrata, alih-alih berpura-pura
mengadaptasi. Adaptivitas karenanya hanya benar-benar bekerja di Level 2 dan 3.

### Jejak audit

Setiap pemberian soal menulis event **`adaptive_selection`** — dipancarkan
server, bukan siswa — berisi mode yang berlaku, pita kemampuan, rerata klaim
yang dibaca, dan peringkat seluruh kandidat beserta bebannya. Tanpa baris ini,
data hasil administrasi adaptif dan fixed-form tidak dapat dipisahkan saat
analisis, dan tidak ada cara mengaudit mengapa seorang siswa menerima varian
tertentu.

Seperti `set_zone_center` (§7.2), event ini **tidak dibaca rubrik mana pun** —
ia keputusan sistem, bukan perilaku siswa, sehingga tidak boleh menjadi bukti
atas klaim apa pun tentang siswa. Tiga uji menjaganya, termasuk satu yang
membuktikan skor identik untuk log yang sama apa pun pita yang tercatat.

### Saklar dan peringatan validitas

`ADAPTIVE_MODE` menetapkan keadaan awal; guru dapat mengubahnya saat berjalan
lewat portal guru (`GET`/`POST /api/admin/adaptive`). Perubahan saat berjalan
**tidak bertahan melewati restart** — disengaja, supaya mode yang dinyalakan
untuk demonstrasi tidak tanpa sengaja tertinggal menyala pada sesi pengambilan
data berikutnya.

> **Beban permukaan di atas adalah peringkat rasional dari fitur task, BUKAN
> kesulitan butir hasil kalibrasi empiris.** Selama butir belum dikalibrasi
> (Rasch/IRT atas data uji coba), skor mentah siswa yang menerima varian
> berbeda **tidak sepenuhnya sebanding**.

Karena itu **matikan (`ADAPTIVE_MODE=false`) saat pengambilan data skripsi**:
administrasi berbentuk fixed-form, skor sebanding tanpa perlu IRT, dan
validitasnya tidak dapat digugat. Nyalakan untuk demonstrasi dan pengembangan
lanjutan. Peringatan ini ditampilkan berdampingan dengan saklarnya di portal
guru — bukan disembunyikan di dokumentasi — supaya terbaca pada saat seseorang
menyalakannya.

Perubahan ini tidak menyentuh satu baris pun logika rubrik dan karena itu tidak
menuntut migrasi `SCORING_VERSION`.

---

## 7.17 Tutorial antarmuka sebelum Level 1

**Ancaman yang disasar: *construct-irrelevant variance*.** Instrumen ini
mengklaim mengukur kemampuan pemecahan masalah matematis. Siswa yang memperoleh
K1 = 0 karena tidak menemukan panel "Variabel" bukan bukti bahwa ia tidak mampu
memahami masalah — itu bukti bahwa antarmukanya belum terpelajari. Skor semacam
itu mengukur ketrampilan memakai aplikasi, dan setiap poin yang hilang
karenanya melemahkan klaim validitas instrumen.

Tutorial berpemandu dijalankan **sebelum Level 1** untuk memastikan kesulitan
yang tersisa dapat diatribusikan pada kemampuan siswa, bukan pada aplikasinya.

### Batas yang menentukan: mekanik boleh diajarkan, translasi tidak

Tutorial memberikan **seluruh jawaban matematisnya** — pertidaksamaan, rumusan
tujuan, dan makna variabel — untuk disalin siswa. Yang dilatih semata-mata
mekaniknya: kotak mana diisi apa, tombol Simpan di mana, panel dibuka dari mana.

Batas ini wajib dijaga: **menerjemahkan narasi menjadi pertidaksamaan adalah
konstruk K1 yang justru diukur instrumen.** Bila tutorial pernah mengajarkan
cara menerjemahkan, ia mengajarkan jawaban dan K1 berhenti mengukur apa pun.
Mengetik ke dalam kotak bukan konstruk; menerjemahkan adalah konstruk.

Konteks latihannya (taman sekolah: pot bunga dan bangku) sengaja dijauhkan dari
SDG 11/13 dan dari seluruh struktur soal pada bank skenario, agar tidak ada
efek pemanasan terhadap konteks mana pun yang akan dinilai.

### Memakai PlayScreen yang sama, bukan tiruannya

`TutorialScreen` memuat `PlayScreen` yang identik dengan yang dipakai keempat
level, hanya dengan task latihan. Tutorial yang menampilkan tiruan antarmuka
akan melatih hal yang berbeda dari yang nanti dihadapi siswa — dan justru
menambah kebingungan yang hendak dihapusnya.

Panduan **tidak memaksa urutan**: ia mendeteksi aksi lewat callback yang sama
dengan yang dipakai pencatat log, lalu mencentang langkah bersangkutan. Memaksa
urutan di tutorial akan menanamkan kebiasaan berurutan yang tidak berlaku pada
level sungguhan (lihat §7.9).

### Isolasi total dari data penelitian

Task latihan didefinisikan **sepenuhnya di client**
(`client/src/ui/tutorialTask.ts`), tidak pernah diminta ke `/api/task`, tidak
membuat `TaskAttempt`, dan tidak memanggil `logger` sama sekali. Diverifikasi
langsung di peramban: setelah satu sesi tutorial penuh, basis data berisi
**0 baris `EventLog`** dan **0 `TaskAttempt`** ber-`taskId = 'TUTORIAL'`.

Dua uji pada `adaptive.test.ts` menjaga agar id `TUTORIAL` tidak pernah bocor ke
bank soal server — bila bocor, ia dapat terpilih assembly rule dan ikut terskor.

### Yang dikirim ke server: ringkasan sebagai kovariat

`POST /api/session/:id/tutorial` menyimpan empat angka pada tabel `Session`:
`tutorialStatus` (completed/skipped), `tutorialDurationMs`,
`tutorialMissteps`, `tutorialSteps`.

Ini **kovariat penelitian, bukan bukti atas klaim mana pun tentang siswa**, dan
tidak masuk ke rumus skor. Gunanya: memeriksa apakah antarmuka masih menyumbang
varians. Bila siswa yang melewati tutorial atau banyak salah langkah cenderung
berskor lebih rendah, sebagian kesulitan mereka berasal dari aplikasinya — dan
itu temuan yang harus dilaporkan, bukan disembunyikan.

Laporan per siswa di portal guru memunculkan **catatan tafsir** bila siswa
melewati tutorial atau melakukan ≥ 5 salah langkah, supaya guru tidak salah
membaca skor rendah sebagai semata-mata ketidakmampuan matematis.

Endpoint bersifat idempoten, dan kegagalan mengirim ringkasan **tidak
menghalangi** siswa masuk Level 1 — tutorial adalah alat bantu, bukan gerbang.
Tutorial juga dapat dilewati, dan pelewatannya tercatat.

Perubahan ini menambah empat kolom nullable pada `Session` dan satu endpoint;
tidak menyentuh mesin skoring, tidak menuntut migrasi `SCORING_VERSION`.

---

## 8. Cakupan pengujian

`cd server && npm test` — 253 uji, seluruhnya lolos.

| Berkas | Jumlah | Cakupan |
|---|---|---|
| `k1.test.ts` | 16 | Deteksi miskonsepsi + deskriptor 0–3 |
| `k2.test.ts` | 8 | Deskriptor 0–3 + pemisahan konstruk dari K1 |
| `k3.test.ts` | 12 | Varian standard dan feasibility_only + penilaian pasca-event |
| `k4.test.ts` | 18 | Tiga varian aturan, heuristik teks, **batas heuristik** |
| `scoring.test.ts` | 15 | Tiga arketipe siswa, reproduktibilitas, komposit |
| `domain.test.ts` | 18 | Kelayakan, titik pojok, nilai optimum acuan |
| `taskbank.test.ts` | 69 | Integritas 12 task, assembly rule, kelengkapan opsi, identitas visual |
| `api.integration.test.ts` | 48 | Alur HTTP penuh, validasi, kebocoran kunci jawaban, laporan guru |
| `feedback.test.ts` | 17 | Umpan balik siswa + kesimpulan lintas level untuk laporan guru |
| `eventNarrator.test.ts` | 13 | Terjemahan tiap jenis event ke kalimat, bertahan dari data rusak |

Uji rubrik memakai log sintetis dari tiga arketipe siswa — **"sempurna"**,
**"trial-error"**, dan **"gagal total"** — sesuai permintaan desain instrumen.
Nilai optimum acuan pada `domain.test.ts` dihitung manual dari model matematis
dokumen, sehingga perubahan hasil kode akan langsung ketahuan.

---

## 9. Menghitung ulang skor setelah revisi ambang batas

Karena skoring selalu dihitung dari `EventLog`, revisi ambang batas tidak menuntut
pengambilan data ulang:

1. Ubah nilai pada `server/src/scoring/thresholds.ts`.
2. Naikkan `SCORING_VERSION`.
3. Jalankan `npm test` — uji yang gagal menunjukkan perilaku mana yang berubah.
4. Panggil ulang `POST /api/submit` untuk tiap percobaan, atau tulis skrip yang
   memanggil `scoreAttempt()` atas seluruh baris `EventLog` dan mem-`upsert` `Score`.
5. Ekspor ulang, dan **pisahkan** data lama dari data baru berdasarkan kolom
   `scoring_version`.
