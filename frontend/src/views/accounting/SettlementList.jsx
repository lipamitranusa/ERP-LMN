import React, { useState } from "react";
import { useApi, useMutate } from "@/hooks/useApi";
import { withLembaga } from "@/lib/api";
import { formatDate } from "../../utils/dateFormat";

function formatRp(n) {
  return `Rp ${Number(n || 0).toLocaleString("id-ID")}`;
}

const REF_TYPE_LABEL = {
  settlement_piutang: { label: "Pelunasan Piutang", color: "#DCFCE7", text: "#166534" },
  settlement_ap_honor: { label: "Pelunasan Hutang Honor", color: "#FEF3C7", text: "#92400E" },
  settlement_ap_pajak: { label: "Pelunasan Hutang Pajak", color: "#DBEAFE", text: "#1E40AF" },
};

const REF_TYPE_FILTER = [
  { value: "", label: "Semua" },
  { value: "settlement_piutang", label: "Pelunasan Piutang" },
  { value: "settlement_ap_honor", label: "Pelunasan Hutang Honor" },
  { value: "settlement_ap_pajak", label: "Pelunasan Hutang Pajak" },
];

export default function SettlementList() {
  const [refType, setRefType] = useState("");
  const [q, setQ] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const params = new URLSearchParams();
  if (refType) params.append("ref_type", refType);
  if (q) params.append("q", q);
  if (dateFrom) params.append("tanggal_dari", dateFrom);
  if (dateTo) params.append("tanggal_sampai", dateTo);

  const { data, isLoading, error } = useApi(
    ["settlement-list", refType, q, dateFrom, dateTo],
    "/keuangan/settlement?" + params.toString()
  );
  const entries = data?.data ?? [];

  const { data: settings, mutate: reloadSettings } = useApi(
    "settlement-settings",
    "/keuangan/settlement/settings"
  );
  const [editBank, setEditBank] = useState(false);
  const [selectedCoa, setSelectedCoa] = useState("");
  const [saveLoading, setSaveLoading] = useState(false);
  const [rebuildMsg, setRebuildMsg] = useState("");

  const rebuildMutate = useMutate(["settlement-list"], {
    onSuccess: (r) => {
      setRebuildMsg(r?.message || "Rebuild selesai.");
    },
  });

  const handleSaveBank = async () => {
    if (!selectedCoa) return;
    setSaveLoading(true);
    try {
      const token = localStorage.getItem("token");
      const r = await fetch(withLembaga("/api/keuangan/settlement/settings"), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ default_bank_coa_id: selectedCoa }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.message || "Gagal menyimpan.");
      }
      setEditBank(false);
      reloadSettings();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleRebuild = async () => {
    if (!window.confirm("Rebuild jurnal settlement + jurnal akrual (pendapatan & beban) untuk seluruh data historis? (aman dijalankan berulang)")) return;
    setRebuildMsg("Memproses…");
    try {
      await rebuildMutate.mutateAsync({
        path: "/keuangan/settlement/rebuild",
        method: "POST",
        body: { scope: "all" },
      });
      // Refresh list
      window.location.reload();
    } catch (err) {
      setRebuildMsg("Gagal: " + err.message);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "18px", fontWeight: "600", color: "hsl(var(--foreground))" }}>
            Jurnal Settlement AP/AR
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: "13px", color: "hsl(var(--muted-foreground))" }}>
            Pencatatan kas otomatis saat piutang (AR) dan hutang (AP) dilunasi
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={handleRebuild}
            disabled={rebuildMutate.isLoading}
            style={{
              padding: "6px 14px", fontSize: "12px", fontWeight: 600,
              background: rebuildMutate.isLoading ? "#E2E8F0" : "#FFFFFF",
              border: "1px solid #CBD5E1", borderRadius: "6px",
              color: "#334155", cursor: rebuildMutate.isLoading ? "not-allowed" : "pointer",
            }}
          >
            {rebuildMutate.isLoading ? "Memproses…" : "Rebuild Jurnal"}
          </button>
        </div>
      </div>

      {/* Pengaturan Akun Kas/Bank Default */}
      <div style={{
        background: "var(--card)", border: "1px solid hsl(var(--border))", borderRadius: "8px",
        padding: "14px 18px", marginBottom: "16px",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <div style={{ fontSize: "11px", fontWeight: "600", color: "hsl(var(--muted-foreground))", textTransform: "uppercase", marginBottom: "4px" }}>
              Akun Kas/Bank Default
            </div>
            {settings?.data?.default_bank_coa ? (
              <div style={{ fontSize: "14px", fontWeight: 600, color: "hsl(var(--foreground))" }}>
                {settings.data.default_bank_coa.kode} — {settings.data.default_bank_coa.nama}
              </div>
            ) : (
              <div style={{ fontSize: "13px", color: "hsl(var(--muted-foreground))" }}>
                Belum diatur — akan fallback ke Bank BCA (1102) atau Kas (1101)
              </div>
            )}
          </div>
          {!editBank ? (
            <button
              onClick={() => {
                setSelectedCoa(settings?.data?.default_bank_coa?.id || "");
                setEditBank(true);
              }}
              style={{
                padding: "6px 14px", fontSize: "12px", fontWeight: 600,
                background: "#4CAF50", color: "#FFFFFF", border: "none",
                borderRadius: "6px", cursor: "pointer",
              }}
            >
              Ubah
            </button>
          ) : (
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <select
                value={selectedCoa}
                onChange={(e) => setSelectedCoa(e.target.value)}
                style={{
                  padding: "6px 10px", fontSize: "13px",
                  border: "1px solid #CBD5E1", borderRadius: "6px", minWidth: "240px",
                }}
              >
                <option value="">— Pilih akun —</option>
                {settings?.data?.bank_options?.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.kode} — {o.nama}
                  </option>
                ))}
              </select>
              <button
                onClick={handleSaveBank}
                disabled={saveLoading || !selectedCoa}
                style={{
                  padding: "6px 14px", fontSize: "12px", fontWeight: 600,
                  background: saveLoading ? "#E2E8F0" : "#4CAF50",
                  color: "#FFFFFF", border: "none", borderRadius: "6px",
                  cursor: saveLoading ? "not-allowed" : "pointer",
                }}
              >
                Simpan
              </button>
              <button
                onClick={() => setEditBank(false)}
                style={{
                  padding: "6px 14px", fontSize: "12px", fontWeight: 600,
                  background: "var(--card)", color: "hsl(var(--muted-foreground))", border: "1px solid #CBD5E1",
                  borderRadius: "6px", cursor: "pointer",
                }}
              >
                Batal
              </button>
            </div>
          )}
        </div>
      </div>

      {rebuildMsg && (
        <div style={{
          padding: "10px 14px", marginBottom: "12px", borderRadius: "6px",
          background: rebuildMsg.startsWith("Gagal") ? "#FEE2E2" : "#DCFCE7",
          color: rebuildMsg.startsWith("Gagal") ? "#991B1B" : "#166534",
          fontSize: "13px",
        }}>
          {rebuildMsg}
        </div>
      )}

      {/* Filter Bar */}
      <div style={{
        display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "12px",
        background: "var(--card)", border: "1px solid hsl(var(--border))", borderRadius: "8px",
        padding: "10px 14px",
      }}>
        <select
          value={refType}
          onChange={(e) => setRefType(e.target.value)}
          style={{ padding: "6px 10px", fontSize: "13px", border: "1px solid #CBD5E1", borderRadius: "6px" }}
        >
          {REF_TYPE_FILTER.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          placeholder="Dari"
          style={{ padding: "6px 10px", fontSize: "13px", border: "1px solid #CBD5E1", borderRadius: "6px" }}
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          placeholder="Sampai"
          style={{ padding: "6px 10px", fontSize: "13px", border: "1px solid #CBD5E1", borderRadius: "6px" }}
        />
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari nomor / keterangan / ref id…"
          style={{ flex: 1, minWidth: "180px", padding: "6px 10px", fontSize: "13px", border: "1px solid #CBD5E1", borderRadius: "6px" }}
        />
      </div>

      {isLoading && <div style={{ padding: "40px", textAlign: "center", color: "hsl(var(--muted-foreground))" }}>Memuat…</div>}
      {error && <div style={{ padding: "20px", color: "#DC2626", fontSize: "13px" }}>Gagal memuat: {error.message}</div>}

      {!isLoading && !error && (
        <div style={{ background: "var(--card)", border: "1px solid hsl(var(--border))", borderRadius: "8px", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ background: "var(--muted)", color: "hsl(var(--muted-foreground))" }}>
                <th style={th}>Nomor Jurnal</th>
                <th style={th}>Tanggal</th>
                <th style={th}>Tipe Settlement</th>
                <th style={th}>Keterangan</th>
                <th style={{ ...th, textAlign: "right" }}>Nominal</th>
                <th style={th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: "32px", textAlign: "center", color: "hsl(var(--muted-foreground))" }}>
                    Belum ada jurnal settlement. Settlement jurnal otomatis dibuat setiap kali
                    bukti pembayaran Faskes diterima atau pembayaran hutang dilakukan.
                  </td>
                </tr>
              )}
              {entries.map((e) => {
                const ref = REF_TYPE_LABEL[e.ref_type] || { label: e.ref_type, color: "#F1F5F9", text: "#475569" };
                return (
                  <tr key={e.id} style={{ borderTop: "1px solid hsl(var(--border))" }}>
                    <td style={{ ...td, fontFamily: "monospace" }}>{e.nomor}</td>
                    <td style={td}>{formatDate(e.tanggal)}</td>
                    <td style={td}>
                      <span style={{
                        display: "inline-block", padding: "2px 10px", borderRadius: "9999px",
                        fontSize: "11px", fontWeight: 600,
                        background: ref.color, color: ref.text,
                      }}>{ref.label}</span>
                    </td>
                    <td style={{ ...td, color: "hsl(var(--muted-foreground))" }}>{e.keterangan}</td>
                    <td style={{ ...td, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                      {formatRp(e.total_debit)}
                    </td>
                    <td style={td}>
                      {e.is_balanced ? (
                        <span style={{ color: "#16A34A", fontSize: "11px", fontWeight: 600 }}>✓ Balanced</span>
                      ) : (
                        <span style={{ color: "#DC2626", fontSize: "11px", fontWeight: 600 }}>✗ Tidak balance</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const th = {
  padding: "10px 14px", textAlign: "left", fontSize: "11px",
  fontWeight: 600, color: "hsl(var(--muted-foreground))", textTransform: "uppercase",
  letterSpacing: "0.05em", borderBottom: "1px solid hsl(var(--border))",
};
const td = { padding: "10px 14px", color: "hsl(var(--foreground))" };
