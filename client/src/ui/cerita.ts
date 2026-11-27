/**
 * Cerita yang menyambungkan seluruh misi: prolog, satu babak sebelum tiap
 * level, dan epilog.
 *
 * BATAS TERHADAP INSTRUMEN:
 *   - Teks soal (narasi task) TIDAK diubah. Cerita hanya membingkai, dan judul
 *     soal disebut apa adanya.
 *   - Layar cerita tampil SEBELUM layar target belajar, saat pencatat log belum
 *     berjalan, jadi waktu membaca cerita tidak terhitung pada observable mana pun.
 *   - Cerita tidak memberi petunjuk isi kendala atau jawaban.
 */

import type { TaskDto } from '../api/types.js';
import { el } from './dom.js';

const MENTOR = 'Bu Laras';
const WILAYAH = 'Kepulauan Nusa Lestari';

export interface Adegan {
  babak: string;
  judul: string;
  paragraf: string[];
  tombol: string;
}

export function prolog(nama: string): Adegan {
  return {
    babak: 'PROLOG',
    judul: 'Surat dari Dewan Wilayah',
    paragraf: [
      `${WILAYAH} sedang tumbuh cepat. Kota-kotanya butuh rumah, jalan, dan ruang hijau, tetapi lahan dan anggaran terbatas, dan iklim makin tidak menentu.`,
      `Dewan Wilayah menunjukmu, ${nama}, sebagai perencana kota muda. Tugasmu: menata empat kota agar tetap layak huni dan ramah lingkungan.`,
      `${MENTOR}, Kepala Badan Perencanaan, akan mendampingimu. "Setiap keputusan kota punya batas," katanya. "Tugas kita bukan melanggar batas itu, tapi menemukan pilihan terbaik di dalamnya."`,
    ],
    tombol: '▶  TERIMA TUGAS',
  };
}

/**
 * Cerita khusus untuk setiap soal (12 kasus), dalam satu alur besar: perjalanan
 * perencana kota mengelilingi Kepulauan Nusa Lestari bersama Bu Laras.
 *
 * Cerita hanya membingkai suasana dan tokoh. Cerita TIDAK menyebut angka,
 * hubungan antarvariabel, atau kendala, karena itu bagian dari soal yang harus
 * diterjemahkan siswa sendiri (K1).
 */
const CERITA: Record<string, { judul: string; paragraf: string[] }> = {
  'L1-SDG11-A': {
    judul: 'Ecoville yang sesak',
    paragraf: [
      'Kapal merapat di Ecoville, kota kecil yang lahannya tinggal sepetak. Anak-anak bermain bola di pinggir jalan karena taman sudah lama berubah jadi deretan rumah.',
      'Pak Wiryo, ketua RT, menyambutmu. "Kami butuh rumah baru, tapi kami juga rindu pohon," katanya. Bu Laras menyerahkan berkas pertamamu: rencana ruang hijau dan permukiman.',
    ],
  },
  'L1-SDG13-A': {
    judul: 'Asap di terminal Ecoville',
    paragraf: [
      'Pagi di terminal Ecoville selalu berbau solar. Pak Darto, sopir bus paling senior, batuk sambil memanaskan mesin bus tuanya.',
      '"Katanya bus listrik itu senyap dan bersih," ujarnya. "Tapi garasi kita sempit." Bu Laras tersenyum. "Itulah tugasmu: atur armada baru kota ini."',
    ],
  },
  'L1-SDG11&13-A': {
    judul: 'Jalan untuk siapa?',
    paragraf: [
      'Satu ruas jalan di pusat Ecoville jadi rebutan. Pemilik toko ingin tempat parkir, sementara Mbak Sari dan teman-teman pesepedanya ingin lajur yang aman.',
      '"Lebar jalan tidak bisa ditambah," kata Bu Laras sambil menunjuk peta. "Kita harus membaginya dengan adil."',
    ],
  },
  'L2-SDG11-A': {
    judul: 'Rumah untuk keluarga muda',
    paragraf: [
      'Di Greenhaven, antrean rumah subsidi makin panjang. Bu Maya, guru SD, sudah tiga tahun menunggu rumah untuk keluarganya.',
      'Dua tipe rumah sudah dirancang, lengkap dengan biaya dan kebutuhan lahannya. "Anggaran kota ada batasnya," kata Bu Laras. "Baca tabelnya pelan-pelan."',
    ],
  },
  'L2-SDG13-A': {
    judul: 'Listrik dari langit dan angin',
    paragraf: [
      'Greenhaven masih bergantung pada pembangkit diesel tua. Saat badai, listrik padam berjam-jam dan rumah sakit memakai genset.',
      'Pak Rendra dari perusahaan listrik kota membawa dua pilihan: panel surya komunal dan turbin angin mini. "Dana dan ruangnya terbatas," katanya. "Pilih komposisinya dengan cermat."',
    ],
  },
  'L2-SDG11&13-A': {
    judul: 'Pabrik di sebelah taman',
    paragraf: [
      'Greenhaven ingin lapangan kerja baru dari zona industri rendah emisi, tetapi warga takut kehilangan ruang hijau mereka.',
      'Di balai kota, warga dan pengusaha berdebat sampai malam. Bu Laras menengahi: "Keduanya bisa ada, asal aturannya ditulis dengan jelas."',
    ],
  },
  'L3-SDG11-A': {
    judul: 'Kota yang nyaman dijalani',
    paragraf: [
      'Distrik baru di Meridian masih berupa tanah lapang. Survei warga menunjukkan satu keinginan: kota yang nyaman untuk berjalan dan bersantai.',
      '"Kali ini Dewan meminta hasil terbaik, bukan sekadar yang boleh," kata Bu Laras. "Ada banyak pilihan yang sah, dan tugasmu menemukan yang paling menguntungkan warga."',
    ],
  },
  'L3-SDG13-A': {
    judul: 'Gunungan sampah Meridian',
    paragraf: [
      'Tempat pembuangan sampah Meridian hampir penuh. Setiap hari truk mengangkut sampah, dan baunya sampai ke pasar.',
      'Bu Nita, pengelola bank sampah, menawarkan dua cara: pengomposan dan daur ulang. "Keduanya punya biaya dan jejak karbon berbeda," katanya. Dewan ingin cara yang paling hemat.',
    ],
  },
  'L3-SDG11&13-A': {
    judul: 'Menumbuhkan kota ke atas',
    paragraf: [
      'Meridian terus melebar dan menelan sawah di pinggirnya. Arsitek kota, Pak Hadi, mengusulkan hunian vertikal yang hemat energi, diselingi koridor hijau yang menyerap karbon.',
      '"Kita cari indeks keberlanjutan setinggi mungkin," kata Bu Laras. "Tapi ingat, setiap pilihan punya harga."',
    ],
  },
  'L4-SDG11-A': {
    judul: 'Krisis lahan Meridian Utara',
    paragraf: [
      'Ribuan keluarga di Meridian Utara tinggal di rumah sewa yang sempit. Mereka butuh perumahan terjangkau, secepatnya.',
      'Namun kota ini juga terikat standar kota sehat, dan aturannya tidak tertulis langsung dalam angka. "Baca baik-baik," pesan Bu Laras. "Dan bersiaplah, kebijakan bisa berubah di tengah jalan."',
    ],
  },
  'L4-SDG13-A': {
    judul: 'Transisi energi mendadak',
    paragraf: [
      'Kawasan industri Meridian Selatan masih menderu dengan mesin-mesin fosil. Kabut tipis selalu menggantung di atas pabrik.',
      'Bu Ratna, pemilik pabrik terbesar, khawatir biaya membengkak bila beralih ke mesin listrik. "Peraturan emisi daerah juga harus dipatuhi," kata Bu Laras. "Dan kabarnya akan ada aturan baru."',
    ],
  },
  'L4-SDG11&13-A': {
    judul: 'Rencana induk Solantis',
    paragraf: [
      'Perjalananmu berakhir di Solantis, kota baru yang belum berpenghuni. Semua yang kamu pelajari diuji di sini: hunian, ruang hijau, dan ketahanan iklim.',
      'Hujan tropis di wilayah ini sangat deras, dan studi lingkungan memberi syarat yang harus kamu simpulkan sendiri. "Ini kota terakhirmu," kata Bu Laras. "Buat rencana yang bisa dibanggakan, dan siap direvisi bila keadaan berubah."',
    ],
  },
  'L3-SDG11-B': {
    judul: 'Alun-alun yang sejuk',
    paragraf: [
      'Alun-alun lama Meridian berdebu dan panas. Pedagang pasar ingin tempat berjualan, warga ingin tempat berteduh.',
      '"Tidak ada satu jawaban yang paling benar," kata Bu Laras. "Tunjukkan semua rencana yang memenuhi aturan, lalu pilih satu yang kamu yakini."',
    ],
  },
  'L3-SDG13-B': {
    judul: 'Gunungan sampah Meridian',
    paragraf: [
      'Tempat pembuangan sampah Meridian hampir penuh, dan truk-truk tua mengepulkan asap setiap pagi.',
      'Bu Nita dari Dinas Lingkungan Hidup ingin armada listrik. "Anggaran, daya angkut, dan garasi harus cocok semua," katanya. "Coba gambarkan pilihan-pilihannya."',
    ],
  },
  'L3-SDG11&13-B': {
    judul: 'Matahari untuk sekolah dan gang',
    paragraf: [
      'Listrik di sekolah Meridian sering padam, dan gang-gang kampung gelap di malam hari.',
      'Pak Hadi menawarkan panel surya dan lampu jalan tenaga surya. "Dananya terbatas, tetapi dayanya harus cukup," kata Bu Laras. "Periksa setiap rencana dengan teliti."',
    ],
  },
  'L4-SDG11-B': {
    judul: 'Kampung di tepi sungai',
    paragraf: [
      'Kampung di tepi sungai Meridian sering kebanjiran. Warga setuju pindah ke kampung susun, asal ruang hijaunya tetap ada.',
      'Aturan ruang hijaunya tertulis dalam persen, bukan hektar. "Hitung sendiri batasnya," pesan Bu Laras. "Dan bersiaplah, aturan bisa berubah di tengah jalan."',
    ],
  },
  'L4-SDG13-B': {
    judul: 'Angkot rendah emisi',
    paragraf: [
      'Angkot-angkot tua Meridian mengepulkan asap di setiap perempatan. Koperasi angkot ingin beralih ke angkot listrik, tetapi dananya terbatas.',
      '"Batas emisinya tidak ditulis langsung," kata Bu Laras. "Baca baik-baik, dan kabarnya target iklim kota akan diperketat."',
    ],
  },
  'L4-SDG11&13-B': {
    judul: 'Rencana induk Solantis',
    paragraf: [
      'Perjalananmu berakhir di Solantis, kawasan baru yang belum berpenghuni. Semua yang kamu pelajari diuji di sini: hunian, ruang hijau, dan ketahanan iklim.',
      'Pedomannya ditulis sebagai perbandingan, dan hujan tropis di sini sangat deras. "Ini kota terakhirmu," kata Bu Laras. "Buat rencana yang memenuhi semua aturan, dan siap direvisi bila keadaan berubah."',
    ],
  },
};

/**
 * Kesan akhir tiap kasus, dipakai sebagai jembatan ke kasus berikutnya.
 * `sah`: rancangan disahkan Dewan. `belum`: rancangan akhir masih melanggar.
 * Tidak menyebut angka maupun jawaban.
 */
const JEJAK: Record<string, { sah: string; belum: string }> = {
  'L1-SDG11-A': {
    sah: 'Di Ecoville, anak-anak kini bermain di bawah pohon-pohon muda, dan Pak Wiryo berjanji merawat taman barunya.',
    belum: 'Di Ecoville, rencana ruang hijau masih dibahas ulang. Pak Wiryo menitip pesan: "Jangan lupa kami."',
  },
  'L1-SDG13-A': {
    sah: 'Di terminal Ecoville, Pak Darto kini menyetir bus listrik yang senyap, dan batuknya mulai berkurang.',
    belum: 'Di terminal Ecoville, armada baru belum disetujui. Pak Darto masih memanaskan bus tuanya setiap pagi.',
  },
  'L1-SDG11&13-A': {
    sah: 'Di pusat Ecoville, Mbak Sari dan teman-temannya kini bersepeda di lajur yang aman, dan pemilik toko tetap punya tempat parkir.',
    belum: 'Di pusat Ecoville, pembagian jalan masih diperdebatkan. Mbak Sari berharap kamu kembali suatu hari.',
  },
  'L2-SDG11-A': {
    sah: 'Di Greenhaven, Bu Maya akhirnya mendapat kunci rumah barunya. Ia mengirim foto keluarganya di depan pintu.',
    belum: 'Di Greenhaven, pembangunan rumah subsidi tertunda karena hitungannya belum cocok. Bu Maya masih menunggu.',
  },
  'L2-SDG13-A': {
    sah: 'Di Greenhaven, panel surya dan kincir angin mulai berputar. Saat badai terakhir, rumah sakit tidak lagi padam.',
    belum: 'Di Greenhaven, pembangkit bersih belum disetujui. Pak Rendra menyiapkan genset untuk musim badai.',
  },
  'L2-SDG11&13-A': {
    sah: 'Di Greenhaven, zona industri bersih dibuka berdampingan dengan taman. Warga dan pengusaha berjabat tangan di balai kota.',
    belum: 'Di Greenhaven, pembagian kawasan masih ditolak Dewan, dan perdebatan di balai kota belum selesai.',
  },
  'L3-SDG11-A': {
    sah: 'Di Meridian, distrik baru kini ramai pejalan kaki sore hari, dan survei kenyamanan warga naik.',
    belum: 'Di Meridian, distrik baru masih setengah jadi. Warga menunggu taman dan trotoar yang dijanjikan.',
  },
  'L3-SDG13-A': {
    sah: 'Di Meridian, gunungan sampah mulai menyusut. Bu Nita membuka kelas kompos untuk ibu-ibu pasar.',
    belum: 'Di Meridian, rencana pengolahan sampah belum lolos, dan bau dari tempat pembuangan masih tercium di pasar.',
  },
  'L3-SDG11&13-A': {
    sah: 'Di Meridian, menara hunian hemat energi berdiri di antara koridor hijau, dan sawah di pinggir kota terselamatkan.',
    belum: 'Di Meridian, rencana hunian vertikal dikembalikan untuk dihitung ulang. Pak Hadi menyimpan maketnya baik-baik.',
  },
  'L4-SDG11-A': {
    sah: 'Di Meridian Utara, keluarga-keluarga pertama pindah ke perumahan baru yang tetap dikelilingi ruang hijau.',
    belum: 'Di Meridian Utara, rencana perumahan belum memenuhi standar kota sehat, dan antrean warga masih panjang.',
  },
  'L4-SDG13-A': {
    sah: 'Di Meridian Selatan, mesin-mesin listrik mulai bekerja dan kabut di atas pabrik perlahan menipis.',
    belum: 'Di Meridian Selatan, rencana transisi energi belum lolos aturan emisi, dan kabut masih menggantung di atas pabrik.',
  },
  'L4-SDG11&13-A': {
    sah: 'Di Solantis, kota baru siap dihuni: rumah rendah karbon dan ruang hijau yang menyerap hujan tropis.',
    belum: 'Di Solantis, rencana induk masih perlu direvisi sebelum warga pertama datang.',
  },
  'L3-SDG11-B': {
    sah: 'Di Meridian, pedagang kembali berjualan di pasar rakyat, dan anak-anak bermain di ruang hijau alun-alun.',
    belum: 'Di Meridian, rencana alun-alun masih dibahas ulang. Pedagang dan warga menunggu keputusan Dewan.',
  },
  'L3-SDG13-B': {
    sah: 'Di Meridian, truk dan motor gerobak listrik mengangkut sampah tanpa asap, dan gunungan sampah mulai menyusut.',
    belum: 'Di Meridian, armada listrik belum disetujui, dan truk tua masih mengepulkan asap setiap pagi.',
  },
  'L3-SDG11&13-B': {
    sah: 'Di Meridian, sekolah tidak lagi padam, dan gang-gang kampung terang setiap malam.',
    belum: 'Di Meridian, rencana energi surya dikembalikan untuk dihitung ulang, dan gang masih gelap.',
  },
  'L4-SDG11-B': {
    sah: 'Di tepi sungai Meridian, keluarga-keluarga pindah ke kampung susun yang dikelilingi ruang hijau.',
    belum: 'Di tepi sungai Meridian, rencana kampung susun belum memenuhi aturan ruang hijau, dan warga masih menunggu.',
  },
  'L4-SDG13-B': {
    sah: 'Di jalan-jalan Meridian, angkot listrik melaju senyap, dan udara di perempatan mulai bersih.',
    belum: 'Di jalan-jalan Meridian, rencana armada belum lolos batas emisi, dan asap angkot tua masih mengepul.',
  },
  'L4-SDG11&13-B': {
    sah: 'Di Solantis, kawasan baru siap dihuni: rumah rendah karbon diimbangi taman dan kolam yang menyerap hujan tropis.',
    belum: 'Di Solantis, rencana induk masih perlu direvisi sebelum warga pertama datang.',
  },
};

/** Kasus yang selesai sebelum kasus ini, untuk menyambung cerita. */
export interface KasusSebelumnya {
  taskId: string;
  judul: string;
  layak: boolean;
}

/** Kalimat penyambung dari kasus sebelumnya ke kasus berikutnya. */
function jembatan(prev: KasusSebelumnya | null): string | null {
  if (!prev) return null;
  const j = JEJAK[prev.taskId];
  const kesan = j ? (prev.layak ? j.sah : j.belum) : `Berkas "${prev.judul}" sudah kamu serahkan ke Dewan.`;
  return `${kesan} Bu Laras menutup berkas itu, lalu kapal kembali berlayar.`;
}

/** Cerita sebelum sebuah soal. Teks soal tetap di layar misi dan tidak diubah. */
export function babak(level: number, task: TaskDto, sebelumnya: KasusSebelumnya | null = null): Adegan {
  const c = CERITA[task.id] ?? { judul: task.title, paragraf: [`Berkas berikutnya dari Bu Laras: "${task.title}".`] };
  const sambung = jembatan(sebelumnya);
  return {
    babak: `PERJALANAN ${level} DARI 4`,
    judul: c.judul,
    paragraf: sambung ? [sambung, ...c.paragraf] : c.paragraf,
    tombol: `▶  LANJUT KE LEVEL ${level}`,
  };
}

export function epilog(nama: string, kota: string[], kasus: KasusSebelumnya[] = []): Adegan {
  const daftar = kota.length > 0 ? kota.map((k) => `"${k}"`).join(', ') : 'kota-kota yang kamu kunjungi';
  const kesan = kasus.map((k) => {
    const j = JEJAK[k.taskId];
    return j ? (k.layak ? j.sah : j.belum) : null;
  }).filter((x): x is string => x !== null);
  return {
    babak: 'EPILOG',
    judul: 'Nusa Lestari menyala',
    paragraf: [
      `Malam turun di ${WILAYAH}. Dari atas kapal, kamu melihat lampu kota menyala satu per satu: ${daftar}.`,
      ...kesan,
      `Warga yang kamu temui sepanjang perjalanan kini punya kota yang lebih layak huni. "Kamu tidak hanya membangun kota, ${nama}," kata ${MENTOR}. "Kamu belajar menilai keputusanmu sendiri. Itu yang membuat perencana terus berkembang."`,
      'Lihat kembali kota-kotamu di Peta Wilayah, atau bermain bebas di Kota Bebas.',
    ],
    tombol: '▶  LIHAT RINGKASAN',
  };
}

/**
 * Ilustrasi cerita. Diketuk tiga kali = misi tersembunyi "Tiket jalan pintas".
 * Hanya CustomEvent ke jendela; tidak ada event log dan tidak ada skor.
 */
function ilustrasiRahasia(): HTMLElement {
  let ketuk = 0;
  const gambar = el('div', { class: 'cerita-ilustrasi', ariaLabel: 'Ilustrasi kota' }, '🏝️🏘️🌳');
  gambar.addEventListener('click', () => {
    ketuk++;
    if (ketuk === 3) window.dispatchEvent(new CustomEvent('ecomath:rahasia', { detail: 'tiket-jalan-pintas' }));
  });
  return gambar;
}

/** Layar satu adegan cerita. */
export function renderAdegan(root: HTMLElement, a: Adegan, onLanjut: () => void): void {
  const tombol = el('button', { class: 'btn btn-primary btn-block' }, a.tombol);
  tombol.addEventListener('click', onLanjut);
  root.replaceChildren(
    el(
      'div',
      { class: 'screen-center' },
      el(
        'div',
        { class: 'plate card cerita' },
        el('div', { class: 'brand-badge' }, a.babak),
        el('h2', { class: 'cerita-judul' }, a.judul),
        ilustrasiRahasia(),
        ...a.paragraf.map((p) => el('p', { class: 'prose cerita-paragraf' }, p)),
        tombol,
      ),
    ),
  );
}
