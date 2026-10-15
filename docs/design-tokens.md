# Design Token System — ERP Akreditasi Faskes

> Dokumen ini adalah sumber kebenaran tunggal untuk seluruh token visual
> di frontend. Setiap angka di sini dipakai di CSS dan Tailwind config.
> Jika nilai baru dibutuhkan, tambahkan di sini dulu, baru di komponen.

---

## 1. Filosofi Token

Prinsip: **bukan library komponen, melainkan bahasa visual produk ini.**

Token dibagi 3 lapisan (3-tier architecture):

1. **Primitive** — nilai mentah (mis. `slate-700: #334155`)
2. **Semantic** — peran nilai (mis. `surface-card: white`, `border-subtle: slate-200`)
3. **Component** — pemakaian komponen (mis. `stepper-dot-active: primary`)

Komponen **tidak boleh** memakai primitive langsung. Harus lewat semantic.
Ini untuk mencegah satu warna dipakai untuk dua peran berbeda.

---

## 2. Primitive Tokens

### 2.1 Neutral (Slate — warna utama non-brand)

Domain akreditasi kredibel butuh nuansa netral yang serius, tidak ke arah
warm cream (terlalu koran) dan tidak ke arah true black (terlalu tech).

```
slate-50   #F8FAFC   Page background
slate-100  #F1F5F9   Table row hover, sunken area
slate-200  #E2E8F0   Default border, divider
slate-300  #CBD5E1   Input border default, disabled text
slate-400  #94A3B8   Placeholder, meta text, icon secondary
slate-500  #64748B   Body secondary text
slate-600  #475569   Body primary text
slate-700  #334155   Heading text
slate-800  #1E293B   Sidebar background, heading emphasis
slate-900  #0F172A   Strongest text, modal overlay
```

### 2.2 Brand (Hijau LIPA MITRA NUSA)

Hijau brand sudah diputuskan sebagai `#4CAF50` (medium fresh green).
Hindari tone forest/dark green — domain ini approachable, bukan korporat
kayu.

```
brand-50   #E8F5E9   Background ringan — selected state, badge bg
brand-100  #C8E6C9   Subtle highlight
brand-500  #4CAF50   Primary action, brand identity
brand-600  #43A047   Primary hover
brand-700  #2E7D32   Primary active/pressed
brand-900  #1B5E20   Primary on light background (text)
```

### 2.3 Brand Accent (dari figur logo — 5 warna)

5 warna ini **bukan** untuk status. Dipakai untuk:
- Avatar warna berbeda antar role
- Distinguish dokumen/faskes category
- Highlight chart series

```
accent-ungu    #7E57C2
accent-merah   #EF5350
accent-orange  #FF9800
accent-kuning  #F9C846   (gelap dari #FFEB3B agar kontras 4.5:1 di body)
accent-biru    #42A5F5
```

### 2.4 Semantic Color (Status)

Status di domain ini **bukan dekorasi, melainkan kondisi bisnis**.
Setiap status punya **warna + ikon** berbeda agar aman untuk
colour-blind user (NFR-4 / kepatuhan aksesibilitas).

| Status PRD         | Token            | Fill         | Text         | Icon                     |
|--------------------|------------------|--------------|--------------|--------------------------|
| Draft              | `status-draft`   | slate-100    | slate-600    | Document outline         |
| Menunggu Validasi  | `status-wait`    | #FEF3C7      | #92400E      | Hourglass                |
| Direvisi           | `status-revise`  | #FED7AA      | #9A3412      | Pencil                   |
| Disetujui          | `status-appr`    | brand-50     | brand-900    | Check-circle             |
| Sedang Bertugas    | `status-active`  | #DBEAFE      | #1E40AF      | User-circle + dot        |
| Final / Terkunci   | `status-final`   | slate-800    | white        | Lock                     |
| Jatuh Tempo        | `status-due`     | #FEE2E2      | #991B1B      | Bell                     |
| Lunas              | `status-paid`    | brand-50     | brand-900    | Cash/check               |
| Ditolak            | `status-reject`  | #FEE2E2      | #991B1B      | X-circle                 |

Peran status: **field-level metadata, BUKAN chrome**. Status tampil
di kolom tabel dan badge di samping field — bukan sebagai background
kartu atau background halaman.

### 2.5 Typeface

**1 typeface: Inter (Google Fonts).**
Bukan Helvetica/system stack (terlalu generik), bukan serif
(terlaku koran/editorial), bukan display sans (terlalu SaaS).

```
font-sans:  Inter, system-ui, -apple-system, sans-serif
font-mono:  ui-monospace, 'SF Mono', Menlo, monospace  (untuk nomor invoice, ID)
```

Weight yang dipakai: 400 (body), 500 (emphasis), 600 (heading), 700 (page title).
Tidak pakai 300 (terlalu tipis) atau 800+ (terlalu heavy untuk data app).

### 2.6 Type Scale

Skala 1.125 ratio (major second) — cukup kecil untuk data density,
cukup besar untuk readability.

| Token          | Size   | Line-height | Weight | Usage                              |
|----------------|--------|-------------|--------|------------------------------------|
| `text-2xs`     | 10px   | 1.4         | 500    | Micro-meta (id, timestamp)         |
| `text-xs`      | 11px   | 1.45        | 500    | Badge label, table header          |
| `text-sm`      | 12px   | 1.5         | 400    | Sidebar, dense table body          |
| `text-base`    | 13px   | 1.55        | 400    | Form, body, comfortable table      |
| `text-md`      | 15px   | 1.5         | 500    | Section title                      |
| `text-lg`      | 17px   | 1.4         | 600    | Page sub-title                     |
| `text-xl`      | 20px   | 1.35        | 600    | Page title                         |
| `text-2xl`     | 24px   | 1.3         | 700    | Hero number (stat card)            |
| `text-3xl`     | 30px   | 1.25        | 700    | Login hero                         |

Tidak ada `text-4xl`+ (ini bukan landing page SaaS).

**Catatan penting:** Tabel di portal internal dominan di `text-sm` (12px).
Field di form Faskes dominan di `text-base` (13px) — Faskes bukan power
user, jadi naik sedikit agar mudah dibaca di mobile.

### 2.7 Spacing Scale

Skala 4px base, geometric (bukan random) — agar padding antar elemen
koheren tanpa terlihat seperti uniform 8px grid.

```
space-0   0
space-1   4px    (gap antara icon dan label inline)
space-2   8px    (padding input vertical, gap terkecil di list)
space-3   12px   (padding table cell)
space-4   16px   (padding card body, gap antar field)
space-5   20px   (padding card header)
space-6   24px   (page padding, gap antar section)
space-8   32px   (page margin desktop)
space-10  40px
space-12  48px   (hero spacing)
space-16  64px
```

### 2.8 Radius

**TIDAK seragam.** Setiap radius punya alasan.

```
radius-none  0       Table row, stepper line, divider — biar tegas
radius-sm    4px     Input, badge, button — biar compact
radius-md    6px     Card kecil (stat card, info panel)
radius-lg    8px     Card utama (panel data)
radius-pill  9999px  Badge status, tag — biar pill
```

Kenapa beda? Tabel di dense app harus **zero-radius** agar row
terlihat sebagai grid, bukan sebagai kartu-kartu terpisah. Card
stat butuh radius agar terasa "elevated". Ini yang membedakan
dari template SaaS yang pakai radius-lg di mana-mana.

### 2.9 Shadow

```
shadow-none    none
shadow-hairline  0 0 0 1px slate-200       (border tipis tanpa noise)
shadow-card    0 1px 2px rgba(15,23,42,.04)  (default card, sangat subtle)
shadow-card-hover  0 4px 12px rgba(15,23,42,.06)  (hover)
shadow-modal   0 20px 40px rgba(15,23,42,.12)
shadow-focus   0 0 0 3px rgba(76,175,80,.15)  (primary focus ring)
```

Shadow di sini SANGAT halus. Tujuannya depth, bukan efek.

### 2.10 Iconography

- **Stroke icons** (bukan filled) — biar konsisten dan tidak norak
- Stroke width 1.5–2px
- Ukuran default 16px (inline dengan text-sm)
- Ukuran besar 20px (di card header, stat icon)
- Library: **inline SVG custom** (sudah dibangun), bukan FontAwesome norak
- Ikon stepper: numbered circle (1–7), bukan icon kategori

### 2.11 Motion

```
duration-fast     120ms   (hover, focus)
duration-base     180ms   (state change, modal)
duration-slow     240ms   (page transition — sparingly)
ease-standard     cubic-bezier(.2,0,.2,1)   (default)
ease-out          cubic-bezier(0,0,.2,1)    (entrance)
```

Hanya untuk state yang **disebabkan user action** (hover, click, submit).
TIDAK ada entrance animation otomatis saat page load.

---

## 3. Semantic Tokens

Mapping primitive → semantic. Komponen hanya tahu semantic.

### 3.1 Surface (latar belakang)

```
surface-base       slate-50       Page background
surface-raised     white          Card, modal, dropdown
surface-sunken     slate-100      Section inside card, code area
surface-inverse    slate-800      Sidebar
surface-overlay    slate-900/50%  Modal backdrop
```

### 3.2 Border

```
border-subtle      slate-200      Default card border
border-strong      slate-300      Input border, table border
border-emphasis    slate-700      Active nav, focus outline
border-brand       brand-500      Stepper active, primary accent
```

### 3.3 Text

```
text-primary       slate-900      Heading, angka penting
text-body          slate-700      Body
text-secondary     slate-500      Meta, helper
text-muted         slate-400      Placeholder, disabled
text-on-inverse    white          Text on dark background
text-brand         brand-700      Link, brand highlight
text-danger        #991B1B        Error text
```

### 3.4 Action

```
action-primary         brand-500 bg + white text
action-primary-hover   brand-600
action-secondary       white bg + slate-300 border + slate-700 text
action-danger          #DC2626 bg + white text
action-ghost           transparent + slate-500 text
```

### 3.5 Focus

```
focus-ring     3px rgba(brand-500, .15)   + 1px brand-700 outline
```

---

## 4. Component Tokens

Setiap komponen recurrent punya **token lokal** yang mengambil
dari semantic layer.

### 4.1 StatusBadge

```
height:          20px
padding:         0 8px
font:            text-xs (11px), weight 500
radius:          radius-pill
fill:            per-table di §2.4
icon-leading:    10px, warna sama dengan text
icon-required:   YES — tidak boleh badge tanpa ikon
```

Icon wajib karena:
- Colour-blind user bisa membedakan
- Lebih cepat dipindai (pre-attentive processing)
- Konsisten dengan prinsip institutional

### 4.2 DataTable

```
header-bg:       slate-50
header-text:     slate-500, text-xs, weight 500, uppercase + tracking
row-padding:     12px 16px
row-border:      1px solid slate-100
row-hover-bg:    slate-50
row-active-bg:   brand-50 (kalau row bisa diklik)
column-num:      text-right, font-mono, text-sm
column-date:     text-sm, slate-500
cell-truncate:   1 line ellipsis (dense)
density:         56px row height
```

Filter bar di atas tabel: **height 40px, bukan 56px**.
Inline search input (icon prefix), button filter, button add.

### 4.3 Stepper (signature element)

Telah didefinisikan di memory project. Token yang dipakai:

```
line-color:           slate-200 (pending) / brand-500 (done) / #DC2626 (rejected)
dot-size:             36px (md) / 28px (sm) / 44px (lg)
dot-border:           2px
dot-completed-fill:   brand-500
dot-active-fill:      white, border brand-500
dot-pending-fill:     white, border slate-300
dot-rejected-fill:    #DC2626
label-font:           text-sm (12px), weight 500 (active 600)
label-active-color:   slate-900
label-pending-color:  slate-400
```

### 4.4 StatCard

```
padding:           20px
background:        surface-raised
border:            1px solid border-subtle
icon-container:    40×40, radius-md, brand-50 bg, brand-700 svg
value:             text-2xl, weight 700, slate-900
label:             text-sm, slate-500
trend:             text-xs, weight 500, + icon arrow
```

### 4.5 ConfirmationModal (FR-4.6)

Untuk aksi ireversibel (tombol Final, hapus siklus, dll):

```
width:             440px
padding:           24px
icon:              48px circle, danger-fill background
title:             text-lg, weight 600
body:              text-base, slate-600
action-row:        1 secondary (left) + 1 danger (right)
```

WAJIB: ikon di header (bukan dialog kosong), tombol copy menjelaskan
konsekuensi ("Finalkan dan kunci permanen" bukan "OK").

### 4.6 Toast (notifikasi)

```
position:          top-right
width:             360px
padding:           14px 16px
variant:           success | warning | danger | info
icon:              leading, 18px
duration:          4s (default), 0 = persistent untuk error
```

---

## 5. Layout Tokens

### 5.1 Breakpoint

Domain ini punya **2 usage pattern berbeda**, sehingga breakpoint
bukan satu set, melainkan **per-portal**:

| Portal    | Primary device | Min width | Layout                          |
|-----------|----------------|-----------|---------------------------------|
| Internal  | Desktop wide   | 1280px    | 240px sidebar + content         |
| Faskes    | Mobile-first   | 360px     | Single column, stepper on top   |

```
breakpoint-mobile  < 640px
breakpoint-tablet  640–1023px
breakpoint-desktop ≥ 1024px
breakpoint-wide    ≥ 1440px
```

### 5.2 Grid

**Internal portal desktop:**
```
columns:        12
gutter:         16px
container-max:  1440px
content-pad:    32px horizontal, 28px vertical
```

**Faskes portal mobile:**
```
columns:        4 (pada mobile)
gutter:         12px
content-pad:    16px
```

### 5.3 Sidebar

```
width:                 240px (expanded) / 72px (collapsed)
bg:                    slate-800
backdrop:              blur(12px)  +  rgba(slate-800, 0.92)
border-right:          1px solid rgba(slate-700, 0.6)
nav-height:            40px
nav-active-border:     3px left, brand-500
nav-active-bg:         rgba(brand-500, 0.12)
nav-text:              13px, weight 500, rgba(white, 0.65)
nav-active-text:       white
```

Breakpoint collapse: ≤ 768px → 72px + hide text (icon only).
**Tidak ada bottom-tab di mobile** untuk internal portal — staff
internal tidak pakai mobile.

---

## 6. Prinsip Implementasi Token

1. **Komponen import token, bukan hardcode.** Tidak ada hex di JSX.
2. **Token baru?** Tambah di file ini dulu, pakai kemudian.
3. **Konflik status?** Status pakai ikon. Tidak ada 2 status dengan
   warna yang sama.
4. **Accessibility**: kontras teks minimum 4.5:1. State focus wajib
   terlihat. Tidak ada info yang hanya disampaikan lewat warna.
5. **Motion**: hanya untuk state yang user-triggered. Tidak ada
   fade-in saat page load.

---

## 7. Review Pass (vs. brief)

Setelah token di atas saya tulis, saya cek bagian mana yang masih
mungkin terlihat seperti default template SaaS:

### Yang sudah DIREVISI dari default:

- **Radius tidak seragam** — tabel zero-radius, stat card 6px, main card 8px.
  Default SaaS: semua `border-radius: 8px`.
- **Type scale custom 10–30px** — bukan default Tailwind 12–48px.
  Default SaaS: ada `text-4xl` (36px) di mana-mana.
- **Tanpa warm cream** — body pakai slate-50 (cool), bukan #F4F1EA.
- **Tanpa ALL-CAPS eyebrow** — sentence case di semua label.
- **Tanpa rounded card shadow generik** — shadow sangat halus (0.04 alpha).
- **Status pakai ikon, bukan hanya warna** — untuk colour-blind aman.
- **Stepper numbered, bukan labelled icon** — karena tahap ini
  adalah urutan bisnis, bukan kategori.

### Yang masih perlu perhatian (saat implementasi nanti):

- Stepper bisa terasa generik jika step 5 (Survei) tidak visually
  *unfold* — survei adalah cabang dengan sub-tahapan, harus
  ditonjolkan sebagai differential, bukan sekedar "1 dari 7 step".
- Confirmation modal untuk tombol Final (FR-4.6) belum punya
  copy yang kontekstual — harus pakai bahasa Indonesia yang
  mencerminkan konsekuensi: "Setelah difinalkan, dokumen tidak
  dapat diubah dan tagihan honor otomatis diterbitkan ke Keuangan."
- Toast duration 4s mungkin terlalu cepat untuk staff yang
  mengetik sambil membaca notifikasi. Mungkin 6s lebih baik.

### Revisi kecil yang dilakukan setelah review:

- accent-kuning direvisi dari `#FFEB3B` → `#F9C846` agar
  kontras teks 4.5:1.
- text-sm (12px) di tabel dipertahankan karena data density
  adalah requirement, BUKAN kompromi a11y. Body form Faskes
  di text-base (13px) untuk kompensasi.
- Icon `StatusBadge` ditambahin leading icon **WAJIB**, bukan opsional.
