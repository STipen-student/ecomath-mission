/**
 * Layar masuk bergaya papan judul game.
 *
 * Tidak ada kata sandi maupun pendaftaran akun - identitas siswa cukup
 * ditentukan kode kelas, sesuai permintaan dan sejalan dengan catatan etika
 * pada Panduan Deployment yang menyarankan meminimalkan data pengenal langsung.
 */

import { el } from './dom.js';

export interface LoginData {
  studentName: string;
  studentId?: string;
  classCode: string;
}

export function renderLoginScreen(
  root: HTMLElement,
  onSubmit: (data: LoginData) => Promise<void>,
  onKembali?: () => void,
): void {
  const inputNama = el('input', {
    class: 'field',
    type: 'text',
    placeholder: 'Nama atau inisial',
    maxLength: 60,
    ariaLabel: 'Nama atau inisial siswa',
  });
  const inputNis = el('input', {
    class: 'field',
    type: 'text',
    placeholder: 'Boleh dikosongkan',
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

  const pesan = el('p', { class: 'form-error' });
  const tombol = el('button', { class: 'btn btn-primary btn-block' }, '▶  MULAI MISI');

  async function kirim(): Promise<void> {
    const nama = inputNama.value.trim();
    const kelas = inputKelas.value.trim();

    if (!nama || !kelas) {
      pesan.textContent = 'Nama dan kode kelas wajib diisi.';
      return;
    }

    pesan.textContent = '';
    tombol.disabled = true;
    tombol.textContent = 'MENYIAPKAN KOTA...';

    try {
      await onSubmit({
        studentName: nama,
        studentId: inputNis.value.trim() || undefined,
        classCode: kelas,
      });
    } catch (err) {
      pesan.textContent = err instanceof Error ? err.message : 'Gagal memulai sesi.';
      tombol.disabled = false;
      tombol.textContent = '▶  MULAI MISI';
    }
  }

  tombol.addEventListener('click', () => void kirim());
  for (const input of [inputNama, inputNis, inputKelas]) {
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
        el('label', { class: 'label' }, 'Nama / inisial'),
        inputNama,
        el('label', { class: 'label' }, 'NIS'),
        inputNis,
        el('label', { class: 'label' }, 'Kode kelas'),
        inputKelas,
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

  inputNama.focus();
}

function tombolKembali(onKembali: () => void): HTMLElement {
  const b = el('button', { class: 'btn btn-ghost btn-block' }, '←  KEMBALI');
  b.addEventListener('click', onKembali);
  return b;
}
