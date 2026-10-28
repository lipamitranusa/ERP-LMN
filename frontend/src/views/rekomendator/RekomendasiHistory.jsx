import React, { useState } from "react";
import { useApi } from "@/hooks/useApi";
import { formatDateTime } from "../../utils/dateFormat";
import { Button } from "@/components/ui/button";
import RekomendasiDetailModal, { StatusBadge } from "./RekomendasiDetail";

export default function RekomendasiHistory() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);

  const params = new URLSearchParams();
  if (q.trim()) params.set("q", q.trim());
  if (status) params.set("status", status);
  params.set("per_page", "15");
  params.set("page", String(page));

  const { data, isLoading } = useApi(
    ["rekomendasi-history", q, status, page],
    "/rekomendasi/history?" + params.toString()
  );

  const items = Array.isArray(data?.data) ? data.data : [];
  const lastPage = data?.last_page || 1;
  const total = data?.total || 0;

  const { data: detailData, isLoading: detailLoading } = useApi(
    ["rekomendasi-detail", selected?.id],
    selected ? "/rekomendasi/" + selected.id : "/rekomendasi",
    { enabled: !!selected }
  );
  const detail = detailData?.data ?? null;

  return (
    <div>
      <div style={{ marginBottom: "24px" }}>
        <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "600", color: "#1E293B" }}>
          Riwayat Siklus Validasi
        </h2>
        <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748B" }}>
          Daftar siklus akreditasi yang sudah divalidasi oleh rekomendator.
        </p>
      </div>

      <div className="card" style={{ padding: "12px 16px", marginBottom: "16px", display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
        <input
          type="text"
          value={q}
          onChange={e => { setQ(e.target.value); setPage(1); }}
          placeholder="Cari nama faskes..."
          style={{
            flex: "1 1 240px", height: "34px", padding: "0 10px", fontSize: "13px",
            border: "1px solid #E2E8F0", borderRadius: "6px", background: "#fff", color: "#0F172A",
          }}
        />
        <select
          value={status}
          onChange={e => { setStatus(e.target.value); setPage(1); }}
          style={{
            height: "34px", padding: "0 10px", fontSize: "13px",
            border: "1px solid #E2E8F0", borderRadius: "6px", background: "#fff", color: "#0F172A",
          }}
        >
          <option value="">Semua status</option>
          <option value="disetujui">Disetujui</option>
          <option value="ditolak">Ditolak</option>
        </select>
        {(q || status) && (
          <Button variant="ghost" size="sm" onClick={() => { setQ(""); setStatus(""); setPage(1); }}>
            Reset
          </Button>
        )}
      </div>

      {isLoading ? (
        <div style={{ padding: "40px", textAlign: "center", color: "#94A3B8" }}>Memuat...</div>
      ) : items.length === 0 ? (
        <div className="card" style={{ padding: "48px", textAlign: "center" }}>
          <div style={{ fontSize: "14px", fontWeight: 500, color: "#1E293B" }}>Belum ada riwayat</div>
          <div style={{ fontSize: "12px", color: "#94A3B8", marginTop: "4px" }}>
            Siklus yang sudah divalidasi akan tampil di sini.
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <div className="table-container" style={{ border: "none", borderRadius: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Faskes</th>
                  <th>Jenis Faskes</th>
                  <th>Lembaga</th>
                  <th>Surveior</th>
                  <th>Verifikator</th>
                  <th>Item</th>
                  <th>Status</th>
                  <th>Tanggal Keputusan</th>
                  <th style={{ width: "100px" }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 500, color: "#0F172A" }}>{item.faskes_nama || "—"}</td>
                    <td style={{ color: "#475569" }}>{item.faskes_jenis || "—"}</td>
                    <td style={{ color: "#475569" }}>{item.lembaga_nama || "—"}</td>
                    <td style={{ color: "#475569", fontSize: "12px" }}>
                      {item.surveyors?.length
                        ? item.surveyors.map(s => s.nama).filter(Boolean).join(", ")
                        : "—"}
                    </td>
                    <td style={{ color: "#475569" }}>{item.verifikator_nama || "—"}</td>
                    <td style={{ color: "#64748B", fontSize: "12px", textAlign: "center" }}>
                      {item.jumlah_item_verifikasi ?? 0}
                    </td>
                    <td><StatusBadge status={item.status_rekomendasi} /></td>
                    <td style={{ color: "#64748B", fontSize: "12px" }}>
                      {formatDateTime(item.direkomendasikan_at)}
                    </td>
                    <td>
                      <Button size="sm" onClick={() => setSelected(item)}>
                        Detail
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {total > 0 && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px" }}>
          <div style={{ fontSize: "12px", color: "#64748B" }}>
            Total {total} siklus · Halaman {data?.current_page || 1} dari {lastPage}
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              Sebelumnya
            </Button>
            <Button variant="outline" size="sm" disabled={page >= lastPage} onClick={() => setPage(p => p + 1)}>
              Berikutnya
            </Button>
          </div>
        </div>
      )}

      {selected && (
        <RekomendasiDetailModal
          title={`Detail Rekomendasi — ${selected.faskes_nama || "—"}`}
          detail={detail}
          loading={detailLoading}
          onClose={() => setSelected(null)}
          footer={
            <div style={{ padding: "12px 24px", borderTop: "1px solid #F1F5F9", display: "flex", justifyContent: "flex-end", flexShrink: 0 }}>
              <Button variant="outline" onClick={() => setSelected(null)}>
                Tutup
              </Button>
            </div>
          }
        />
      )}
    </div>
  );
}
