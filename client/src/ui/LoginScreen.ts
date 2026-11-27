/**
 * Layar masuk bergaya papan judul game.
 *
 * Siswa masuk dengan NIS + kode kelas + PIN 4-6 angka. Pada login pertama PIN
 * yang diketik menjadi PIN siswa; pada login berikutnya siswa melanjutkan
 * pekerjaannya. PIN tidak pernah disimpan sebagai teks (server/src/lib/pin.ts).
 */

import { el } from './dom.js';

export interface LoginData {
  studentName?: string;
  studentId: string;
  classCode: string;
  pin: string;
}

export function renderLoginScreen(
  root: HTMLElement,
  onSubmit: (data: LoginData) => Promise<void>,
  onKembali?: () => void,
): void {
  const inputNama = el('input', {
    class: 'field',
    type: 'text',
    placeholder: 'Mis. RA atau Rina',
    maxLength: 60,
    ariaLabel: 'Nama atau inisial siswa',
  });
  const inputNis = el('input', {
    class: 'field',
    type: 'text',
    placeholder: 'Nomor induk siswa',
    maxLength: 30,
    ariaLabel: 'Nomor induk siswa',
  });
  const inputKelas = el('input', {
    class: 'field',
    type: 'text',
    placeholder: 'Contoh: XI-IPA-1',
    maxLength: 40,
    ariaLabel: 'Kode kelas',
  });

  const inputPin = el('input', {
    class: 'field',
    type: 'password',
    placeholder: '4 sampai 6 angka',
    maxLength: 6,
    ariaLabel: 'PIN',
  });
  inputPin.inputMode = 'numeric';
  inputPin.autocomplete = 'current-password';

  const pesan = el('p', { class: 'form-error' });
  const tombol = el('button', { class: 'btn btn-primary btn-block' }, '▶  MULAI MISI');

  async function kirim(): Promise<void> {
    const nama = inputNama.value.trim();
    const nis = inputNis.value.trim();
    const kelas = inputKelas.value.trim();
    const pin = inputPin.value.trim();

    if (!nis || !kelas) {
      pesan.textContent = 'NIS dan kode kelas wajib diisi.';
      return;
    }
    if (!/^\d{4,6}$/.test(pin)) {
      pesan.textContent = 'PIN harus 4 sampai 6 angka.';
      return;
    }

    pesan.textContent = '';
    tombol.disabled = true;
    tombol.textContent = 'MENYIAPKAN KOTA...';

    try {
      await onSubmit({
        studentName: nama || undefined,
        studentId: nis,
        classCode: kelas,
        pin,
      });
    } catch (err) {
      pesan.textContent = err instanceof Error ? err.message : 'Gagal memulai sesi.';
      tombol.disabled = false;
      tombol.textContent = '▶  MULAI MISI';
    }
  }

  tombol.addEventListener('click', () => void kirim());
  for (const input of [inputNama, inputNis, inputKelas, inputPin]) {
    input.addEventListener('keydown', (ev) => {
      if ((ev as KeyboardEvent).key === 'Enter') void kirim();
    });
  }

  root.replaceChildren(
    el(
      'div',
      { class: 'screen-center' },
      el(
        'div',
        { class: 'plate card' },
        el(
          'div',
          { class: 'brand' },
          el('div', { class: 'brand-badge' }, 'SDG 11 + SDG 13'),
          el('h1', { class: 'brand-title' }, 'ECOMATH MISSION'),
          el('div', { class: 'brand-sub' }, 'SUSTAINABLE CITY CHALLENGE'),
        ),
        el(
          'p',
          { class: 'prose' },
          'Kamu adalah perencana kota. Setiap keputusan alokasi lahanmu harus memenuhi kendala anggaran, kapasitas, dan lingkungan yang berlaku di kota tersebut.',
        ),
        el('label', { class: 'label' }, 'NIS atau kode siswa dari guru'),
        inputNis,
        el('label', { class: 'label' }, 'Kode kelas'),
        inputKelas,
        el('label', { class: 'label' }, 'PIN'),
        inputPin,
        el('label', { class: 'label' }, 'Inisial atau nama panggilan (wajib saat pertama kali masuk)'),
        inputNama,
        el(
          'p',
          { class: 'hint' },
          'Pertama kali masuk? Buat PIN 4–6 angka dan ingat baik-baik. Lain kali, masuk dengan NIS atau kode, kode kelas, dan PIN yang sama untuk melanjutkan pekerjaanmu. Lupa PIN? Minta guru mereset. Tidak perlu menulis nama lengkap: inisial sudah cukup.',
        ),
        pesan,
        tombol,
        onKembali ? tombolKembali(onKembali) : null,
        el(
          'p',
          { class: 'note' },
          'Datamu dipakai untuk keperluan penelitian pembelajaran matematika dan tidak dibagikan ke pihak lain.',
        ),
      ),
    ),
  );

  inputNis.focus();
}

function tombolKembali(onKembali: () => void): HTMLElement {
  const b = el('button', { class: 'btn btn-ghost btn-block' }, '←  KEMBALI');
  b.addEventListener('click', onKembali);
  return b;
}
