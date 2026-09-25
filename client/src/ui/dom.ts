/**
 * Pembantu pembuatan elemen DOM.
 *
 * Panel antarmuka dibangun sebagai elemen HTML asli, bukan digambar di dalam
 * canvas Phaser. Alasannya praktis: siswa mengakses lewat HP, dan input HTML
 * asli memberi papan ketik seluler, ukuran sentuh, serta dukungan pembaca layar
 * yang tidak diperoleh bila teks digambar di canvas.
 */

type Anak = Node | string | null | undefined | false;

export interface AtributEl {
  class?: string;
  id?: string;
  type?: string;
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  min?: string;
  max?: string;
  step?: string;
  rows?: string;
  maxLength?: number;
  name?: string;
  html?: string;
  ariaLabel?: string;
  dataset?: Record<string, string>;
  onClick?: (ev: MouseEvent) => void;
  onInput?: (ev: Event) => void;
  onChange?: (ev: Event) => void;
}

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: AtributEl = {},
  ...anak: Anak[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);

  if (attrs.class) node.className = attrs.class;
  if (attrs.id) node.id = attrs.id;
  if (attrs.html !== undefined) node.innerHTML = attrs.html;
  if (attrs.ariaLabel) node.setAttribute('aria-label', attrs.ariaLabel);

  // <option> dan <select> menyimpan `value` sebagai properti, bukan lewat cabang
  // input di bawah. Tanpa penanganan terpisah ini, sebuah <option> tanpa atribut
  // value akan mengembalikan TEKS-nya saat select.value dibaca - bug halus yang
  // membuat id opsi (mis. "vx1") tergantikan kalimat panjang pada log event.
  if (node instanceof HTMLOptionElement || node instanceof HTMLSelectElement) {
    if (attrs.value !== undefined) node.value = attrs.value;
  }

  if (node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement) {
    if (attrs.type && node instanceof HTMLInputElement) node.type = attrs.type;
    if (attrs.value !== undefined) node.value = attrs.value;
    if (attrs.placeholder) node.placeholder = attrs.placeholder;
    if (attrs.maxLength) node.maxLength = attrs.maxLength;
    if (attrs.name) node.name = attrs.name;
    if (attrs.rows && node instanceof HTMLTextAreaElement) node.rows = Number(attrs.rows);
    if (node instanceof HTMLInputElement) {
      if (attrs.min !== undefined) node.min = attrs.min;
      if (attrs.max !== undefined) node.max = attrs.max;
      if (attrs.step !== undefined) node.step = attrs.step;
    }
  }

  if (attrs.disabled !== undefined && 'disabled' in node) {
    (node as HTMLButtonElement).disabled = attrs.disabled;
  }

  if (attrs.dataset) {
    for (const [k, v] of Object.entries(attrs.dataset)) node.dataset[k] = v;
  }

  if (attrs.onClick) node.addEventListener('click', attrs.onClick as EventListener);
  if (attrs.onInput) node.addEventListener('input', attrs.onInput);
  if (attrs.onChange) node.addEventListener('change', attrs.onChange);

  for (const a of anak) {
    if (a === null || a === undefined || a === false) continue;
    node.append(typeof a === 'string' ? document.createTextNode(a) : a);
  }

  return node;
}

export function clear(node: HTMLElement): void {
  while (node.firstChild) node.removeChild(node.firstChild);
}

/** Format angka ringkas: buang desimal yang tidak perlu. */
export function num(v: number): string {
  return Number.isInteger(v) ? String(v) : String(Math.round(v * 100) / 100);
}

/** Ubah milidetik menjadi mm:ss. */
export function jam(ms: number): string {
  const total = Math.floor(ms / 1000);
  const menit = Math.floor(total / 60);
  const detik = total % 60;
  return `${String(menit).padStart(2, '0')}:${String(detik).padStart(2, '0')}`;
}
