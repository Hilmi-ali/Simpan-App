import React, { useEffect, useState } from "react";
import { db } from "../../firebase";
import { collection, getDocs } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import { FaCheckCircle, FaReceipt } from "react-icons/fa";

export default function RiwayatSiswa({ tagihanList, userData }) {
  console.log("RiwayatSiswa render, tagihanList:", tagihanList);
  const [groupedRiwayat, setGroupedRiwayat] = useState({});
  const [loading, setLoading] = useState(true);
  const [showRiwayat, setShowRiwayat] = useState(false);
  const [riwayatPembayaran, setRiwayatPembayaran] = useState([]);
  const [selectedTagihan, setSelectedTagihan] = useState(null);
  const [expandedTahun, setExpandedTahun] = useState(null);

  const [showStruk, setShowStruk] = useState(false);
  const [selectedRiwayat, setSelectedRiwayat] = useState(null);

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  const safeFormatRupiah = (nominal) => {
    if (nominal === undefined || nominal === null) return "Rp 0";
    return "Rp " + Number(nominal).toLocaleString("id-ID");
  };

  useEffect(() => {
    const fetchTagihanWithStatus = async () => {
      try {
        const updatedList = [];
        for (const t of tagihanList) {
          const docSnap = await getDocs(
            collection(db, "tagihan", t.id, "riwayatPembayaran")
          );

          let totalBayar = 0;
          docSnap.forEach((d) => {
            totalBayar += d.data().nominal || 0;
          });

          const sisa = (t.nominal || 0) - totalBayar;
          const statusTerbaru = sisa <= 0 ? "lunas" : "belum";

          updatedList.push({ ...t, status: statusTerbaru });
        }

        const grouped = {};
        updatedList.forEach((tagihan) => {
          const tahun =
            tagihan.tahunAjaran && !isNaN(tagihan.tahunAjaran)
              ? tagihan.tahunAjaran
              : tagihan.tahunAjaran?.toString().trim() || "Tidak Diketahui";

          if (!grouped[tahun]) grouped[tahun] = [];
          grouped[tahun].push(tagihan);
        });

        setGroupedRiwayat(grouped);
        setLoading(false);
      } catch (err) {
        console.error("Gagal memuat status tagihan:", err);
        setLoading(false);
      }
    };

    if (tagihanList.length > 0) {
      fetchTagihanWithStatus();
    } else {
      setGroupedRiwayat({});
      setLoading(false);
    }
  }, [tagihanList]);

  useEffect(() => {
    if (tagihanList.length > 0) {
      const grouped = {};
      tagihanList.forEach((tagihan) => {
        const tahun = tagihan.tahunAjaran || "Tanpa Tahun";
        if (!grouped[tahun]) grouped[tahun] = [];
        grouped[tahun].push(tagihan);
      });
      console.log("Grouped Riwayat:", grouped);
      setGroupedRiwayat(grouped);
    } else {
      setGroupedRiwayat({});
    }
    setLoading(false);
  }, [tagihanList]);

  const fetchRiwayatPembayaran = async (tagihan) => {
    console.log("Mengambil riwayat untuk tagihan:", tagihan.id);
    try {
      const snap = await getDocs(
        collection(db, "tagihan", tagihan.id, "riwayatPembayaran")
      );
      const data = snap.docs.map((doc) => {
        const d = doc.data();
        let tanggalStr = "-";
        if (d.tanggal?.seconds) {
          tanggalStr = new Date(d.tanggal.seconds * 1000).toLocaleString(
            "id-ID"
          );
        } else if (d.tanggal) {
          tanggalStr = new Date(d.tanggal).toLocaleString("id-ID");
        }
        return { id: doc.id, ...d, tanggalStr };
      });
      console.log("Data Riwayat Pembayaran:", data);

      setRiwayatPembayaran(data);
      setSelectedTagihan(tagihan);
      setShowRiwayat(true);
    } catch (err) {
      console.error("Gagal ambil riwayat pembayaran:", err);
    }
  };

  if (loading) return <p>Memuat riwayat...</p>;
  if (Object.keys(groupedRiwayat).length === 0)
    return <p>Belum ada tagihan.</p>;

  return (
    <div style={{ padding: 0 }}>
      <h2 style={{ marginBottom: 15, fontSize: 16, fontWeight: "600" }}>
        Riwayat Pembayaran
      </h2>
      {Object.keys(groupedRiwayat).map((tahun) => (
        <div key={tahun} style={{ marginBottom: 20 }}>
          {/* Header Tahun Ajaran */}
          <div
            style={styles.tahunHeader}
            onClick={() =>
              setExpandedTahun(expandedTahun === tahun ? null : tahun)
            }
          >
            <span>{tahun}</span>
            <span>{expandedTahun === tahun ? "▲" : "▼"}</span>
          </div>

          {/* Daftar tagihan di tahun ini */}
          <AnimatePresence>
            {expandedTahun === tahun && (
              <motion.div
                key={tahun}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: 13,
                  marginTop: 8,
                }}
              >
                {groupedRiwayat[tahun].map((item) => (
                  <div key={item.id} style={styles.card}>
                    <div
                      style={styles.clickableTitle}
                      onClick={() => fetchRiwayatPembayaran(item)}
                    >
                      {item.jenisTagihan}
                    </div>
                    <div
                      style={{
                        ...styles.status,
                        color: item.status === "lunas" ? "#4CAF50" : "#FF4C4C",
                      }}
                    >
                      {item.status?.toUpperCase() || "-"}
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}

      {/* Modal Riwayat */}
      {showRiwayat && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0,0,0,0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "0px",
          }}
        >
          <div
            style={{
              backgroundColor: "#1b1b1b",
              padding: 16,
              borderRadius: 12,
              width: "75%",
              maxWidth: 400,
              color: "#eee",
              display: "flex",
              flexDirection: "column",
              gap: 10,
              height: "60vh",
              overflowY: "auto",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                paddingTop: 15,
                marginBottom: 20,
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: "clamp(12px, 4vw, 14px)",
                  fontWeight: 400,
                }}
              >
                Riwayat Pembayaran <br></br>
                <strong>{selectedTagihan?.jenisTagihan}</strong>
              </h3>
              <button
                onClick={() => setShowRiwayat(false)}
                style={{
                  background: "rgba(255, 255, 255, 0.1)",
                  border: "none",
                  padding: "6px 10px",
                  borderRadius: "50%",
                  color: "#fff",
                  cursor: "pointer",
                  fontSize: 16,
                }}
              >
                ✕
              </button>
            </div>

            {riwayatPembayaran.length === 0 ? (
              <p
                style={{
                  fontSize: "0.9rem",
                  textAlign: "center",
                }}
              >
                Belum ada pembayaran.
              </p>
            ) : (
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {riwayatPembayaran.map((r) => (
                  <li
                    key={r.id}
                    style={{
                      marginBottom: 6,
                      background: "#1d2027ff",
                      padding: "8px 10px",
                      borderRadius: 6,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      fontSize: "clamp(13px, 3.5vw, 14px)",
                    }}
                  >
                    <span
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                      }}
                    >
                      <span>
                        <b>{safeFormatRupiah(r.nominal)}</b> - {r.metode}
                      </span>
                      <small
                        style={{
                          fontSize: "0.7rem",
                          marginTop: 6,
                          color: "#909090",
                          letterSpacing: "0.3px",
                        }}
                      >
                        {(() => {
                          if (!r.tanggalStr) return "-";

                          const cleanTanggal = r.tanggalStr.trim();
                          const parts = cleanTanggal
                            .split("/")
                            .map((p) => parseInt(p, 10));

                          if (parts.length !== 3 || parts.some(isNaN)) {
                            return cleanTanggal;
                          }

                          const [day, month, year] = parts;
                          const namaBulan = [
                            "Januari",
                            "Februari",
                            "Maret",
                            "April",
                            "Mei",
                            "Juni",
                            "Juli",
                            "Agustus",
                            "September",
                            "Oktober",
                            "November",
                            "Desember",
                          ];

                          return `${day} ${namaBulan[month - 1]} ${year}`;
                        })()}
                      </small>
                    </span>

                    <button
                      onClick={() => {
                        setSelectedRiwayat(r);
                        setShowStruk(true);
                      }}
                      style={{
                        background: "rgba(0, 22, 133, 1)",
                        border: "none",
                        padding: "6px 10px",
                        borderRadius: 6,
                        color: "#ccccccff",
                        cursor: "pointer",
                        fontSize: "0.8rem",
                        fontWeight: "bold",
                      }}
                    >
                      Struk
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {showStruk && selectedRiwayat && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(4px)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999,
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            style={{
              width: "75%",
              maxWidth: 420,
              background:
                "linear-gradient(145deg, rgba(28,28,28,0.95), rgba(20,20,20,0.85))",
              borderRadius: 20,
              boxShadow:
                "0 8px 30px rgba(0,0,0,0.5), inset 0 0 12px rgba(255,255,255,0.05)",
              color: "#eaeaea",
              padding: "32px 26px",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Ornamen Glow */}
            <div
              style={{
                position: "absolute",
                top: -80,
                right: -80,
                width: 180,
                height: 180,
                background:
                  "radial-gradient(circle, #cfff05 0%, transparent 70%)",
                opacity: 0.08,
                borderRadius: "50%",
                pointerEvents: "none",
              }}
            />

            {/* Header Checkmark */}
            <div
              style={{
                textAlign: "center",
                marginBottom: 18,
              }}
            >
              <FaCheckCircle
                size={70}
                color="#CFFE05"
                style={{
                  filter: "drop-shadow(0 0 10px #cffe0566)",
                }}
              />
              <p
                style={{
                  fontSize: 15,
                  color: "#aaa",
                  marginTop: 10,
                }}
              >
                Pembayaran Berhasil
              </p>
            </div>

            {/* Divider halus */}
            <div
              style={{
                width: "100%",
                height: 1,
                background: "linear-gradient(90deg,#333, #555, #333)",
                margin: "10px 0 25px 0",
              }}
            />

            {/* Info Siswa */}
            <div style={{ textAlign: "center", marginBottom: 25 }}>
              <h3 style={{ margin: 0, fontSize: 18, color: "#fff" }}>
                {userData?.nama || "-"}
              </h3>
              <p
                style={{
                  margin: 0,
                  fontSize: 11,
                  color: "#999",
                  letterSpacing: 0.5,
                }}
              >
                NIS: {userData?.nis || "-"}
              </p>
            </div>

            {/* Nominal */}
            <div style={{ textAlign: "center", marginBottom: 30 }}>
              <p style={{ color: "#bbb", fontSize: 13 }}>Total Bayar</p>
              <h1
                style={{
                  color: "#CFFE05",
                  fontSize: 34,
                  fontWeight: 700,
                  letterSpacing: 0.5,
                  margin: "6px 0",
                  textShadow: "0 0 6px rgba(207,254,5,0.3)",
                }}
              >
                {safeFormatRupiah(selectedRiwayat.nominal)}
              </h1>
              <p style={{ fontSize: 14, color: "#eaeaea", marginTop: 4 }}>
                {selectedRiwayat.metode}
              </p>

              {selectedRiwayat.jenisBeasiswa && (
                <p
                  style={{
                    marginTop: 8,
                    fontSize: 13,
                    color: "#77ff77",
                    fontWeight: 600,
                  }}
                >
                  {selectedRiwayat.jenisBeasiswa}
                </p>
              )}
            </div>

            {/* Detail Tagihan */}
            <div
              style={{
                backgroundColor: "rgba(255,255,255,0.04)",
                borderRadius: 14,
                padding: "16px 20px",
                marginBottom: 25,
                boxShadow: "inset 0 0 10px rgba(0,0,0,0.5)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <FaReceipt
                  style={{ fontSize: 6, color: "#CFFE05", marginRight: 3 }}
                />
                <span style={{ fontSize: 8, color: "#ccc" }}>
                  {selectedRiwayat.id}
                </span>
              </div>

              <p
                style={{
                  margin: "6px 0 2px",
                  color: "#ccc",
                  fontSize: 10,
                  borderTop: "1px dashed #444",
                  paddingTop: 7,
                }}
              >
                Jenis Tagihan
              </p>
              <h4 style={{ margin: 0, color: "#fff", fontSize: 13 }}>
                {selectedTagihan?.jenisTagihan || "-"}
              </h4>

              <p
                style={{
                  margin: "10px 0 2px",
                  color: "#ccc",
                  fontSize: 10,
                  borderTop: "1px dashed #444",
                  paddingTop: 7,
                }}
              >
                Tahun Ajaran
              </p>
              <h4 style={{ margin: 0, color: "#fff", fontSize: 13 }}>
                {selectedTagihan?.tahunAjaran || "Tidak Diketahui"}
              </h4>

              <p
                style={{
                  margin: "10px 0 2px",
                  color: "#ccc",
                  fontSize: 10,
                  borderTop: "1px dashed #444",
                  paddingTop: 7,
                }}
              >
                Tanggal Pembayaran
              </p>
              <h4
                style={{
                  margin: 0,
                  color: "#ffffffff",
                  fontSize: 13,
                }}
              >
                {(() => {
                  if (!selectedRiwayat.tanggalStr) return "-";
                  const tanggal = new Date(selectedRiwayat.tanggalStr);
                  if (isNaN(tanggal)) return selectedRiwayat.tanggalStr;
                  return tanggal.toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  });
                })()}
              </h4>
            </div>

            {/* Footer */}
            <div style={{ textAlign: "center", marginTop: "auto" }}>
              <p
                style={{
                  color: "#666",
                  fontSize: 11,
                  letterSpacing: 0.3,
                  marginBottom: 16,
                }}
              >
                Terima kasih telah melakukan pembayaran
              </p>

              <button
                onClick={() => setShowStruk(false)}
                style={{
                  background:
                    "linear-gradient(90deg, #CFFE05 0%, #E4FF62 100%)",
                  border: "none",
                  padding: "10px 22px",
                  borderRadius: 10,
                  fontWeight: 600,
                  fontSize: 15,
                  color: "#121212",
                  cursor: "pointer",
                  transition: "0.2s",
                }}
                onMouseOver={(e) => (e.target.style.filter = "brightness(1.1)")}
                onMouseOut={(e) => (e.target.style.filter = "brightness(1)")}
              >
                Tutup
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

const styles = {
  tahunHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#2c2c2e",
    padding: "10px 12px",
    borderRadius: 6,
    color: "#fff",
    fontSize: 14,
    cursor: "pointer",
  },
  card: {
    backgroundColor: "#1c1c1e",
    color: "#fff",
    borderRadius: 8,
    padding: 12,
    boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
    display: "flex",
    flexDirection: "column",
  },
  clickableTitle: {
    fontWeight: "bold",
    fontSize: 12,
    cursor: "pointer",
    marginBottom: 6,
    color: "#fff",
  },
  status: {
    fontSize: 12,
    fontWeight: "bold",
    color: "green",
    marginBottom: 8,
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",

    backgroundColor: "rgba(0,0,0,0.6)",
    // display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
  },
  modalContent: {
    backgroundColor: "#1d2027ff",
    padding: 20,
    borderRadius: 8,
    width: "80%", // lebih fleksibel di layar kecil
    maxWidth: 420,
    width: 400,
    maxHeight: "70vh",
    overflowY: "auto",
    boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
  },
  strukButton: {
    backgroundColor: "#0a84ff",
    color: "#fff",
    padding: "4px 10px",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
  },
  closeButton: {
    margin: "2px 25px",
    backgroundColor: "red",
    color: "#fff",
    padding: "6px 12px",
    borderRadius: 6,
    height: 35,
    cursor: "pointer",
    width: "15%",
  },
};
