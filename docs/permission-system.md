# Permission-Based UI Control

Dokumentasi sistem kontrol akses di ERP Akreditasi Faskes. Berlaku untuk portal Admin. Portal Faskes dan Surveior tidak menggunakan sistem ini.

---

## Arsitektur Keseluruhan

Sistem menggunakan **role-based access control (RBAC)** dengan dua dimensi:

| Dimensi | Lokasi | Pengaruh |
|---|---|---|
| Route visibility | `routes.js` + `Sidebar.jsx` | Menyembunyikan menu sidebar |
| Action/button visibility | `useAuth.can()` | Menyembunyikan tombol/aksi |
| API-level | `menu_actions` dari server | Backend men-drop unauthorized requests |

```
Login → API returns menu_actions[] → stored in localStorage → used everywhere
```

---

## 1. Route Visibility (Sidebar)

### Privilege Check

Setiap route dalam `routes.js` mendeklarasikan `privilege` — pasangan `[modul, action]` yang diperlukan:

```js
// routes.js
{
  path: "/dashboard",
  name: "Dashboard",
  componentName: "Dashboard",
  layout: "/admin",
  privilege: ["Dasbor Eksekutif", "Lihat"],  // modul → "Dasbor Eksekutif", action → "Lihat"
},
```

`Sidebar.jsx` membaca `menu_actions` dari `useAuth()` dan melakukan cek:

```js
// Sidebar.jsx — hasPrivilege()
function hasPrivilege(route, menuActions) {
  if (!route.privilege) return true;           // tidak ada privilege → tampil
  if (!menuActions || menuActions.length === 0) return false;
  const [modul, action] = route.privilege;
  return menuActions.some(a => a.modul === modul && a.action === action);
}
```

**Jika tidak ada `privilege` di route → route selalu tampil.**

### Hide-in-Sidebar Flag

Route dengan `hideInSidebar: true` tidak muncul di sidebar tapi **tetap accessible via URL** (berguna untuk detail pages):

```js
// routes.js
{
  path: "/pendaftaran/:id",
  name: "Detail Pendaftaran",
  componentName: "SiklusDetail",
  layout: "/admin",
  hideInSidebar: true,   // disembunyikan dari sidebar
},
```

### Role-Specific Visibility

`routeVisibleForRole()` untuk logika khusus role:

```js
// Sidebar.jsx
function routeVisibleForRole(route, roleName) {
  if (roleName === "Rekomendator" && route.name === "Penugasan") return false;
  return true;
}
```

Ini adalah **hardcoded exception** — route "Penugasan" disembunyikan dari Rekomendator. Jika perlu logika role-specific lain, pertimbangkan memindahkannya ke `privilege` field.

### Full Visibility Filter (Sidebar.jsx:58)

```js
// Items yang tampil di sidebar harus melewati SEMUA cek:
const visibleItems = (group.items || []).filter(
  r => !r.hideInSidebar          // tidak di-hidden
    && hasPrivilege(r, menuActions)    // punya privilege
    && routeVisibleForRole(r, roleName) // visible untuk role ini
);
```

---

## 2. Component-Level Action Control

Gunakan hook `useAuth` untuk cek izin pada level tombol/aksi dalam komponen.

### API

```js
const { can } = useAuth();
// can(modul: string, action: string) → boolean
```

### Contoh Penggunaan

```jsx
import { useAuth } from "@/hooks/useAuth";

function MyPage() {
  const { can } = useAuth();

  return (
    <div>
      {/* Tombol hanya tampil jika punya akses */}
      {can("Ledger/Keuangan", "Tambah") && (
        <Button onClick={handleAdd}>Tambah Entri</Button>
      )}

      {/* Aksi conditionally render */}
      {can("Pendaftaran & Validasi Dokumen", "Ubah") && (
        <Button variant="destructive" onClick={handleDelete}>
          Hapus
        </Button>
      )}
    </div>
  );
}
```

### Daftar Modul yang Umum

| Modul | Deskripsi |
|---|---|
| `Dasbor Eksekutif` | Dashboard utama & ringkasan |
| `Pendaftaran & Validasi Dokumen` | Siklus pendaftaran |
| `Kontrak & Invoicing` | Kontrak, invoicing, pembayaran |
| `Penugasan` | Penugasan surveior/verifikator |
| `Ledger/Keuangan` | Keuangan, accounting, pajak |
| `Master Data` | Lembaga, faskes, tenaga ahli |
| `Pengaturan Hak Akses` | Roles, privileges, audit trail |
| `Rekomendasi` | Workspace rekomendator |

### Daftar Action

| Action | Arti |
|---|---|
| `Lihat` | Boleh melihat halaman/data |
| `Tambah` | Boleh membuat entri baru |
| `Ubah` | Boleh mengedit data |
| `Hapus` | Boleh menghapus data |
| `Setujui` | Boleh approve/refund |

---

## 3. menu_actions dari Server

`menu_actions` dikembalikan oleh API `/auth/login` dan `/auth/me`:

```json
[
  { "modul": "Dasbor Eksekutif", "action": "Lihat" },
  { "modul": "Pendaftaran & Validasi Dokumen", "action": "Lihat" },
  { "modul": "Kontrak & Invoicing", "action": "Lihat" },
  { "modul": "Kontrak & Invoicing", "action": "Ubah" },
  ...
]
```

Disimpan di `localStorage` sebagai `menu_actions`. `useAuth` otomatis me-refresh dari `/auth/me` saat mount untuk menjaga sinkronisasi.

**Penting:** `menu_actions` adalah **permission definitions**, bukan route definitions. Route visibility menggunakan `privilege` di `routes.js` yang dicocokkan dengan `menu_actions` dari server.

---

## 4. Multi-Lembaga Context

Selain permission, ada layer `lembaga_id` yang menentukan data mana yang ditampilkan. Diatur melalui `LembagaContext`. Ini orthogonal dengan permission — user bisa punya akses "Lihat" ke modul tapi hanya untuk data lembaga tertentu.

---

## 5. Do's and Don'ts

### ✅ Do

```jsx
// Cek izin sebelum render tombol
{can("Master Data", "Ubah") && <Button onClick={edit}>Edit</Button>}

// Route tanpa privilege → tampil untuk semua role yang punya sidebar
{ path: "/profile", privilege: undefined }  // selalu tampil

// Route detail disembunyikan dari sidebar
{ path: "/pendaftaran/:id", hideInSidebar: true }
```

### ❌ Don't

```jsx
// Jangan hardcode role check di komponen — gunakan can()
{user.role === "Admin" && <Button>Hapus</Button>}  // ❌

// Gunakan can() dengan privilege dari server
{can("Kontrak & Invoicing", "Ubah") && <Button>Hapus</Button>}  // ✅
```

---

## 6. Debugging

Untuk melihat `menu_actions` user saat ini:

```js
// Browser console
console.log(JSON.parse(localStorage.getItem('menu_actions') || '[]'))
```

Untuk debug route visibility, cek kolom `privilege` di `routes.js` dan cocokkan dengan `menu_actions` user.

---

## File yang Terlibat

| File | Peran |
|---|---|
| `src/routes.js` | `privilege`, `hideInSidebar` per route |
| `src/hooks/useAuth.js` | `can()`, `menuActions` state |
| `src/components/Sidebar.jsx` | `hasPrivilege()`, `routeVisibleForRole()` |
| `src/contexts/LembagaContext.jsx` | Multi-lembaga isolation |
| API `/auth/login`, `/auth/me` | Sumber `menu_actions` |
