import React from "react";
import Login from "@/views/auth/Login";
import Dashboard from "@/views/admin/Dashboard";
import SiklusList from "@/views/admin/SiklusList";
import SiklusDetail from "@/views/admin/SiklusDetail";
import PenugasanList from "@/views/admin/PenugasanList";
import MasterBiayaTA from "@/views/admin/MasterBiayaTA";
import Roles from "@/views/admin/Roles";
import Privileges from "@/views/admin/Privileges";
import AuditTrail from "@/views/admin/AuditTrail";
import KontrakInvoicing from "@/views/admin/KontrakInvoicing";
import VerifikasiPembayaran from "@/views/admin/VerifikasiPembayaran";
import PiutangDashboard from "@/views/admin/PiutangDashboard";
import PiutangDetail from "@/views/admin/PiutangDetail";
import FaskesDashboard from "@/views/faskes/Dashboard";
import FaskesKontrak from "@/views/faskes/Kontrak";
import FaskesTagihan from "@/views/faskes/Tagihan";
import FaskesTagihanDetail from "@/views/faskes/TagihanDetail";
import FaskesDokumen from "@/views/faskes/Dokumen";
import RefundApproval from "@/views/keuangan/RefundApproval";
import LedgerJournal from "@/views/keuangan/LedgerJournal";
import SlipHonorarium from "@/views/keuangan/SlipHonorarium";
import ApHonorDashboard from "@/views/admin/ApHonorDashboard";
import ApHonorList from "@/views/admin/ApHonorList";
import ApHonorBayar from "@/views/admin/ApHonorBayar";
import ApHonorHistory from "@/views/admin/ApHonorHistory";
import ApHonorPaymentDetail from "@/views/admin/ApHonorPaymentDetail";
import HutangPajakList from "@/views/admin/HutangPajakList";
import HutangPajakDetail from "@/views/admin/HutangPajakDetail";
import RekonsiliasiDashboard from "@/views/keuangan/RekonsiliasiDashboard";
import BuktiPotong from "@/views/keuangan/BuktiPotong";
import KonfigurasiPajak from "@/views/keuangan/KonfigurasiPajak";
import AccountingDashboard from "@/views/accounting/Dashboard";
import AccountingCoa from "@/views/accounting/CoaList";
import AccountingKategori from "@/views/accounting/KategoriJurnal";
import AccountingJurnal from "@/views/accounting/JurnalUmum";
import AccountingBukuBesar from "@/views/accounting/BukuBesar";
import BankReceipt from "@/views/accounting/BankReceipt";
import BankDisbursement from "@/views/accounting/BankDisbursement";
import CashReceipt from "@/views/accounting/CashReceipt";
import CashDisbursement from "@/views/accounting/CashDisbursement";
import MasterLembaga from "@/views/admin/MasterLembaga";
import MasterJenisFaskes from "@/views/admin/MasterJenisFaskes";
import MasterFaskes from "@/views/admin/MasterFaskes";
import UserManagement from "@/views/admin/UserManagement";
import PksTemplateSettings from "@/views/admin/PksTemplateSettings";
import MasterTenagaAhli from "@/views/admin/MasterTenagaAhli";
import MasterBiaya from "@/views/admin/MasterBiaya";
import PengaturanPembayaran from "@/views/admin/PengaturanPembayaran";
import PengaturanMail from "@/views/admin/PengaturanMail";
import PengaturanWhatsApp from "@/views/admin/PengaturanWhatsApp";
import ProfilePage from "@/views/admin/ProfilePage";
import RekomendasiWorkspace from "@/views/rekomendator/RekomendasiWorkspace";
import RekomendasiSettings from "@/views/rekomendator/RekomendasiSettings";
import { Icon } from "@/components/navIcons";

const NavIcon = ({ name }) => React.createElement(Icon, { name, size: 18 });

var routes = [
  // ─── Auth ──────────────────────────────────────────────────────────────
  {
    path: "/login",
    name: "Login",
    component: Login,
    layout: "/auth",
  },

  // ─── Faskes portal (route prefix /faskes) ──────────────────────────────
  {
    path: "/",
    name: "Status Pengajuan",
    icon: NavIcon({ name: "home" }),
    component: FaskesDashboard,
    layout: "/faskes",
  },
  {
    path: "/kontrak/:id",
    name: "Kontrak PKS",
    component: FaskesKontrak,
    layout: "/faskes",
    hideInSidebar: true,
  },
  {
    path: "/kontrak",
    name: "Kontrak & Tanda Tangan",
    icon: NavIcon({ name: "pen" }),
    component: FaskesKontrak,
    layout: "/faskes",
  },
  {
    path: "/dokumen",
    name: "Unggah Dokumen",
    icon: NavIcon({ name: "upload" }),
    component: FaskesDokumen,
    layout: "/faskes",
  },
  {
    path: "/tagihan",
    name: "Tagihan",
    icon: NavIcon({ name: "bill" }),
    component: FaskesTagihan,
    layout: "/faskes",
  },
  {
    path: "/tagihan/:id",
    name: "Detail Tagihan",
    component: FaskesTagihanDetail,
    layout: "/faskes",
    hideInSidebar: true,
  },

  // ─── Admin internal (route prefix /admin) ──────────────────────────────
  {
    group: "Operasional",
    items: [
      {
        path: "/dashboard",
        name: "Dashboard",
        icon: NavIcon({ name: "dashboard" }),
        component: Dashboard,
        layout: "/admin",
        privilege: ["Dasbor Eksekutif", "Lihat"],
      },
      {
        path: "/pendaftaran",
        name: "Pendaftaran",
        icon: NavIcon({ name: "register" }),
        component: SiklusList,
        layout: "/admin",
        privilege: ["Pendaftaran & Validasi Dokumen", "Lihat"],
      },
      {
        path: "/kontrak-invoicing",
        name: "Kontrak & Invoicing",
        icon: NavIcon({ name: "contract" }),
        component: KontrakInvoicing,
        layout: "/admin",
        privilege: ["Kontrak & Invoicing", "Lihat"],
      },
      {
        path: "/verifikasi-pembayaran",
        name: "Verifikasi Pembayaran",
        icon: NavIcon({ name: "payment" }),
        component: VerifikasiPembayaran,
        layout: "/admin",
        privilege: ["Kontrak & Invoicing", "Lihat"],
      },
      {
        path: "/penugasan",
        name: "Penugasan",
        icon: NavIcon({ name: "assignment" }),
        component: PenugasanList,
        layout: "/admin",
        privilege: ["Penugasan", "Lihat"],
      },
    ],
  },

  {
    group: "Keuangan",
    items: [
      {
        path: "/piutang",
        name: "Dasbor Piutang",
        icon: NavIcon({ name: "money" }),
        component: PiutangDashboard,
        layout: "/admin",
        privilege: ["Dasbor Eksekutif", "Lihat"],
      },
      {
        path: "/refund-approval",
        name: "Approval Refund",
        icon: NavIcon({ name: "rotate" }),
        component: RefundApproval,
        layout: "/admin",
        privilege: ["Kontrak & Invoicing", "Setujui"],
      },
      {
        path: "/ap-honor",
        name: "Dasbor AP Honor",
        icon: NavIcon({ name: "coins" }),
        component: ApHonorDashboard,
        layout: "/admin",
        privilege: ["Ledger/Keuangan", "Lihat"],
      },
      {
        path: "/ap-honor/list",
        name: "Bayar Honor",
        icon: NavIcon({ name: "payment" }),
        component: ApHonorList,
        layout: "/admin",
        privilege: ["Ledger/Keuangan", "Lihat"],
      },
      {
        path: "/ap-honor/history",
        name: "Riwayat Pembayaran",
        icon: NavIcon({ name: "log" }),
        component: ApHonorHistory,
        layout: "/admin",
        privilege: ["Ledger/Keuangan", "Lihat"],
        hideInSidebar: false,
      },
      {
        path: "/hutang-pajak",
        name: "Hutang Pajak",
        icon: NavIcon({ name: "tax" }),
        component: HutangPajakList,
        layout: "/admin",
        privilege: ["Ledger/Keuangan", "Lihat"],
      },
      {
        path: "/hutang-pajak/:id",
        name: "Detail Hutang Pajak",
        component: HutangPajakDetail,
        layout: "/admin",
        privilege: ["Ledger/Keuangan", "Lihat"],
        hideInSidebar: true,
      },
      {
        path: "/rekonsiliasi",
        name: "Rekonsiliasi",
        icon: NavIcon({ name: "balance" }),
        component: RekonsiliasiDashboard,
        layout: "/admin",
        privilege: ["Dasbor Eksekutif", "Lihat"],
      },
      {
        path: "/bukti-potong",
        name: "Bukti Potong PPh",
        icon: NavIcon({ name: "doc" }),
        component: BuktiPotong,
        layout: "/admin",
        privilege: ["Ledger/Keuangan", "Lihat"],
      },
      {
        path: "/ledger-journal",
        name: "Ledger Journal",
        icon: NavIcon({ name: "log" }),
        component: LedgerJournal,
        layout: "/admin",
        privilege: ["Ledger/Keuangan", "Lihat"],
      },
      {
        path: "/slip-honor",
        name: "Slip Honorarium",
        icon: NavIcon({ name: "bill" }),
        component: SlipHonorarium,
        layout: "/admin",
        privilege: ["Ledger/Keuangan", "Lihat"],
      },
      {
        path: "/konfigurasi-pajak",
        name: "Konfigurasi Pajak",
        icon: NavIcon({ name: "tax" }),
        component: KonfigurasiPajak,
        layout: "/admin",
        privilege: ["Ledger/Keuangan", "Lihat"],
      },
      {
        path: "/rekomendasi",
        name: "Rekomendasi",
        icon: NavIcon({ name: "doc" }),
        component: RekomendasiWorkspace,
        layout: "/admin",
        privilege: ["Rekomendasi", "Lihat"],
      },
    ],
  },

  {
    group: "Akuntansi",
    items: [
      {
        path: "/accounting/dashboard",
        name: "Dasbor Akuntansi",
        icon: NavIcon({ name: "balance" }),
        component: AccountingDashboard,
        layout: "/admin",
        privilege: ["Ledger/Keuangan", "Lihat"],
      },
      {
        path: "/accounting/bank-masuk",
        name: "Bank Masuk (BKM)",
        icon: NavIcon({ name: "money" }),
        component: BankReceipt,
        layout: "/admin",
        privilege: ["Ledger/Keuangan", "Tambah"],
      },
      {
        path: "/accounting/bank-keluar",
        name: "Bank Keluar (BKK)",
        icon: NavIcon({ name: "money" }),
        component: BankDisbursement,
        layout: "/admin",
        privilege: ["Ledger/Keuangan", "Tambah"],
      },
      {
        path: "/accounting/kas-kecil-masuk",
        name: "Kas Kecil Masuk (KKM)",
        icon: NavIcon({ name: "coins" }),
        component: CashReceipt,
        layout: "/admin",
        privilege: ["Ledger/Keuangan", "Tambah"],
      },
      {
        path: "/accounting/kas-kecil-keluar",
        name: "Kas Kecil Keluar (KKK)",
        icon: NavIcon({ name: "coins" }),
        component: CashDisbursement,
        layout: "/admin",
        privilege: ["Ledger/Keuangan", "Tambah"],
      },
      {
        path: "/accounting/coa",
        name: "Chart of Accounts",
        icon: NavIcon({ name: "doc" }),
        component: AccountingCoa,
        layout: "/admin",
        privilege: ["Ledger/Keuangan", "Lihat"],
      },
      {
        path: "/accounting/kategori-jurnal",
        name: "Kategori Jurnal",
        icon: NavIcon({ name: "tag" }),
        component: AccountingKategori,
        layout: "/admin",
        privilege: ["Ledger/Keuangan", "Lihat"],
      },
      {
        path: "/accounting/jurnal",
        name: "Jurnal Umum",
        icon: NavIcon({ name: "log" }),
        component: AccountingJurnal,
        layout: "/admin",
        privilege: ["Ledger/Keuangan", "Lihat"],
      },
      {
        path: "/accounting/buku-besar",
        name: "Buku Besar",
        icon: NavIcon({ name: "book" }),
        component: AccountingBukuBesar,
        layout: "/admin",
        privilege: ["Ledger/Keuangan", "Lihat"],
      },
    ],
  },

  {
    group: "Master Data",
    items: [
      {
        path: "/master-lembaga",
        name: "Master Lembaga",
        icon: NavIcon({ name: "building" }),
        component: MasterLembaga,
        layout: "/admin",
        privilege: ["Master Data", "Lihat"],
      },
      {
        path: "/master-jenis-faskes",
        name: "Master Jenis Faskes",
        icon: NavIcon({ name: "tag" }),
        component: MasterJenisFaskes,
        layout: "/admin",
        privilege: ["Master Data", "Lihat"],
      },
      {
        path: "/master-faskes",
        name: "Master Faskes",
        icon: NavIcon({ name: "badge" }),
        component: MasterFaskes,
        layout: "/admin",
        privilege: ["Master Data", "Lihat"],
      },
      {
        path: "/master-tenaga-ahli",
        name: "Master Tenaga Ahli",
        icon: NavIcon({ name: "users" }),
        component: MasterTenagaAhli,
        layout: "/admin",
        privilege: ["Master Data", "Lihat"],
      },
      {
        path: "/master-biaya",
        name: "Master Biaya",
        icon: NavIcon({ name: "coins" }),
        component: MasterBiaya,
        layout: "/admin",
        privilege: ["Master Data", "Lihat"],
      },
      {
        path: "/master-biaya-ta",
        name: "Master Biaya Honor TA",
        icon: NavIcon({ name: "tax" }),
        component: MasterBiayaTA,
        layout: "/admin",
        privilege: ["Master Data", "Lihat"],
      },
      {
        path: "/user-management",
        name: "Manajemen Akun",
        icon: NavIcon({ name: "user" }),
        component: UserManagement,
        layout: "/admin",
        privilege: ["Master Data", "Lihat"],
      },
      {
        path: "/pks-template-settings",
        name: "Template PKS",
        icon: NavIcon({ name: "diploma" }),
        component: PksTemplateSettings,
        layout: "/admin",
        privilege: ["Master Data", "Lihat"],
      },
    ],
  },

  {
    group: "Pengaturan",
    items: [
      {
        path: "/pengaturan-pembayaran",
        name: "Payment Gateway",
        icon: NavIcon({ name: "card" }),
        component: PengaturanPembayaran,
        layout: "/admin",
        privilege: ["Kontrak & Invoicing", "Ubah"],
      },
      {
        path: "/pengaturan-mail",
        name: "Mail Server",
        icon: NavIcon({ name: "mail" }),
        component: PengaturanMail,
        layout: "/admin",
        privilege: ["Pengaturan Hak Akses", "Ubah"],
      },
      {
        path: "/pengaturan-whatsapp",
        name: "WhatsApp",
        icon: NavIcon({ name: "whatsapp" }),
        component: PengaturanWhatsApp,
        layout: "/admin",
        privilege: ["Pengaturan Hak Akses", "Ubah"],
      },

      {
        path: "/profile",
        name: "Profil Saya",
        title: "Profil Saya",
        component: ProfilePage,
        layout: "/admin",
        hidden: true,
      },

      {
        path: "/rekomendasi-settings",
        name: "Rekomendator",
        icon: NavIcon({ name: "doc" }),
        component: RekomendasiSettings,
        layout: "/admin",
        privilege: ["Rekomendasi", "Ubah"],
      },
      {
        path: "/roles",
        name: "Role & Hak Akses",
        icon: NavIcon({ name: "lock" }),
        component: Roles,
        layout: "/admin",
        privilege: ["Pengaturan Hak Akses", "Lihat"],
      },
      {
        path: "/privileges",
        name: "Matriks Privilege",
        icon: NavIcon({ name: "settings" }),
        component: Privileges,
        layout: "/admin",
        privilege: ["Pengaturan Hak Akses", "Lihat"],
      },
      {
        path: "/audit-trail",
        name: "Audit Trail",
        icon: NavIcon({ name: "log" }),
        component: AuditTrail,
        layout: "/admin",
        privilege: ["Pengaturan Hak Akses", "Lihat"],
      },
    ],
  },

  // Hidden detail routes
  {
    path: "/pendaftaran/:id",
    name: "Detail Pendaftaran",
    component: SiklusDetail,
    layout: "/admin",
    privilege: ["Pendaftaran & Validasi Dokumen", "Lihat"],
    hideInSidebar: true,
  },
  {
    path: "/piutang/:id",
    name: "Detail Piutang",
    component: PiutangDetail,
    layout: "/admin",
    privilege: ["Dasbor Eksekutif", "Lihat"],
    hideInSidebar: true,
  },
  {
    path: "/ap-honor/bayar",
    name: "Buat Pembayaran Honor",
    component: ApHonorBayar,
    layout: "/admin",
    privilege: ["Ledger/Keuangan", "Tambah"],
    hideInSidebar: true,
  },
  {
    path: "/ap-honor/payment/:id",
    name: "Detail Pembayaran Honor",
    component: ApHonorPaymentDetail,
    layout: "/admin",
    privilege: ["Ledger/Keuangan", "Lihat"],
    hideInSidebar: true,
  },
];

export default routes;
