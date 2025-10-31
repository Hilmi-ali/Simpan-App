// src/components/SomePath/DataRiwayat.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { db } from "../../firebase";
import { collection, getDocs } from "firebase/firestore";
import "@fontsource/inter-tight";

export default function DataRiwayat() {
  const navigate = useNavigate();
  const params = useParams();
  const location = useLocation();

  // support both param names: /.../:tagihanId/... or /.../:id/...
  const tagihanId =
    params.tagihanId || params.id || location.state?.tagihanId || null;

  const [pembayaranList, setPembayaranList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeMenu, setActiveMenu] = useState("riwayat");

  const safeFormatRupiah = (nominal) =>
    "Rp " + Number(nominal || 0).toLocaleString("id-ID");

  const formatTanggal = (t) => {
    if (!t) return "-";
    // Firestore Timestamp (has seconds), or firebase v9 Timestamp object (toDate), or ISO string, or Date
    try {
      if (typeof t === "object") {
        if (t.seconds) {
          return new Date(t.seconds * 1000).toLocaleDateString("id-ID");
        }
        if (typeof t.toDate === "function") {
          return t.toDate().toLocaleDateString("id-ID");
        }
        if (t instanceof Date) {
          return t.toLocaleDateString("id-ID");
        }
      }
      // fallback: try parse string
      const parsed = new Date(t);
      if (!isNaN(parsed.getTime())) return parsed.toLocaleDateString("id-ID");
    } catch (err) {
      // ignore
    }
    return "-";
  };

  useEffect(() => {
    const fetchAllRiwayat = async () => {
      setLoading(true);
      try {
        // ambil semua tagihan (bisa filter berdasarkan siswa jika ada field siswaId)
        const tagihanSnap = await getDocs(collection(db, "tagihan"));
        const tagihanDocs = tagihanSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));

        // ambil semua riwayat pembayaran dari tiap tagihan
        const allRiwayatPromises = tagihanDocs.map(async (tagihan) => {
          const riwayatSnap = await getDocs(
            collection(db, "tagihan", tagihan.id, "riwayatPembayaran")
          );
          const riwayatData = riwayatSnap.docs.map((doc) => ({
            id: doc.id,
            tagihanId: tagihan.id,
            jenisTagihan: tagihan.jenisTagihan,
            ...doc.data(),
          }));
          return riwayatData;
        });

        const allRiwayat = (await Promise.all(allRiwayatPromises)).flat();

        // jika ada cicilan di dokumen tagihan, bisa digabung juga
        tagihanDocs.forEach((tagihan) => {
          if (tagihan.cicilan && tagihan.cicilan.length > 0) {
            tagihan.cicilan.forEach((c) => {
              allRiwayat.push({
                ...c,
                tagihanId: tagihan.id,
                jenisTagihan: tagihan.jenisTagihan,
              });
            });
          }
        });

        // set state
        setPembayaranList(allRiwayat);
      } catch (err) {
        console.error("Gagal ambil semua riwayat:", err);
        setPembayaranList([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAllRiwayat();
  }, []);

  const renderContent = () => {
    if (loading) {
      return (
        <p style={{ padding: 20, textAlign: "center", color: "#eee" }}>
          Memuat riwayat pembayaran...
        </p>
      );
    }

    return (
      <div style={styles.contentBox}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 20,
          }}
        >
          <h2 style={styles.pageTitle}>Riwayat Pembayaran</h2>
          <button style={styles.button} onClick={() => navigate(-1)}>
            ⬅ Kembali
          </button>
        </div>

        <table style={styles.table}>
          <thead>
            <tr style={styles.tableHeader}>
              <th style={styles.th}>No</th>
              <th style={styles.th}>Jenis Tagihan</th>
              <th style={styles.th}>Tanggal</th>
              <th style={styles.th}>Metode</th>
              <th style={styles.th}>Nominal</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {pembayaranList.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  style={{ textAlign: "center", color: "#aaa", padding: 20 }}
                >
                  Belum ada pembayaran untuk tagihan ini.
                </td>
              </tr>
            ) : (
              pembayaranList.map((item, index) => {
                const jenis =
                  item.jenisTagihan ||
                  item.productName ||
                  item.product ||
                  "SPP";
                const tanggalDisplay = formatTanggal(item.tanggal);
                const metode = item.metode || item.paymentMethod || "Transfer";
                const nominal = item.nominal ?? item.jumlah ?? 0;
                const status = item.status || item.state || "-";

                // warna status
                const isLunas =
                  status.toLowerCase() === "lunas" ||
                  status.toLowerCase() === "diterima";
                const bg = isLunas ? "#2a7a2a" : "#7a6600";
                const color = isLunas ? "#d4f8d4" : "#fff3c4";

                return (
                  <tr key={item.id} style={styles.tableRow}>
                    <td style={styles.td}>{index + 1}</td>
                    <td style={styles.td}>{jenis}</td>
                    <td style={styles.td}>{tanggalDisplay}</td>
                    <td style={styles.td}>{metode}</td>
                    <td style={styles.td}>{safeFormatRupiah(nominal)}</td>
                    <td style={styles.td}>
                      <span
                        style={{
                          padding: "4px 8px",
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 600,
                          color,
                          backgroundColor: bg,
                        }}
                      >
                        {status?.toUpperCase() || "-"}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <button
                        style={styles.button}
                        onClick={() =>
                          navigate("/struk-pembayaran", {
                            state: {
                              id: item.id,
                              nominal,
                              metode,
                              tanggal: item.tanggal,
                              jenis,
                              status,
                            },
                          })
                        }
                      >
                        Lihat Struk
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div style={styles.container}>
      <aside style={styles.sidebar}>
        <h2 style={styles.logo}>Data Riwayat</h2>
        <button
          onClick={() => setActiveMenu("riwayat")}
          style={
            activeMenu === "riwayat" ? styles.activeMenuItem : styles.menuItem
          }
        >
          📄 Riwayat Pembayaran
        </button>
      </aside>
      <main style={styles.main}>{renderContent()}</main>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    minHeight: "100vh",
    fontFamily: '"Inter Tight", sans-serif',
    backgroundColor: "#1c1c1e",
    color: "#f1f1f1",
  },
  sidebar: {
    width: "230px",
    backgroundColor: "#2c2c2e",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "15px",
  },
  logo: {
    fontSize: "20px",
    fontWeight: "bold",
    marginBottom: "30px",
  },
  menuItem: {
    background: "none",
    border: "none",
    color: "#aaa",
    padding: "10px 15px",
    borderRadius: "6px",
    cursor: "pointer",
    textAlign: "left",
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  activeMenuItem: {
    backgroundColor: "#0a84ff",
    color: "#fff",
    padding: "10px 15px",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  main: {
    flex: 1,
    padding: "30px",
  },
  contentBox: {
    backgroundColor: "#2c2c2e",
    borderRadius: "10px",
    padding: "25px",
    boxShadow: "0 0 10px rgba(255,255,255,0.05)",
  },
  pageTitle: {
    fontSize: "22px",
    marginBottom: "20px",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  tableHeader: {
    backgroundColor: "#3a3a3c",
    textAlign: "left",
  },
  th: {
    padding: "12px",
    color: "#fff",
    fontWeight: "bold",
    borderBottom: "1px solid #555",
  },
  tableRow: {
    borderBottom: "1px solid #444",
  },
  td: {
    padding: "10px",
  },
  button: {
    padding: "6px 12px",
    backgroundColor: "#0a84ff",
    border: "none",
    borderRadius: "6px",
    color: "#fff",
    cursor: "pointer",
    fontSize: 13,
  },
};
