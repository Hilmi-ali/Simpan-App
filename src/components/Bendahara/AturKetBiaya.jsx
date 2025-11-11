import React, { useEffect, useState } from "react";
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "../../firebase";
import Snackbar from "@mui/material/Snackbar";
import MuiAlert from "@mui/material/Alert";

const Alert = React.forwardRef(function Alert(props, ref) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

export default function AturKetTagihan() {
  const [ketList, setKetList] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [angkatan, setAngkatan] = useState("");
  const [nominalSPP, setNominalSPP] = useState("");
  const [nominalUangGedung, setNominalUangGedung] = useState("");
  const [nominalPramukaOsis, setNominalPramukaOsis] = useState("");
  const [nominalUangPraktik, setNominalUangPraktik] = useState("");
  const [keterangan, setKeterangan] = useState("");
  const [jurusan, setJurusan] = useState("TJKT");
  const [isSaving, setIsSaving] = useState(false);

  // 🔔 state alert
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertType, setAlertType] = useState("success"); // success | error | warning | info
  const [alertMessage, setAlertMessage] = useState("");

  const showAlert = (message, type = "success") => {
    setAlertMessage(message);
    setAlertType(type);
    setAlertOpen(true);
  };

  const handleCloseAlert = (event, reason) => {
    if (reason === "clickaway") return;
    setAlertOpen(false);
  };

  // Ambil data keterangan tagihan
  useEffect(() => {
    const fetchData = async () => {
      const q = query(
        collection(db, "keteranganTagihan"),
        orderBy("angkatan", "asc")
      );
      const snapshot = await getDocs(q);
      setKetList(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    };
    fetchData();
  }, []);

  const handleSave = async () => {
    if (isSaving) return;

    if (
      !angkatan ||
      !nominalSPP ||
      !nominalUangGedung ||
      !nominalPramukaOsis ||
      !nominalUangPraktik ||
      !jurusan
    ) {
      showAlert("Lengkapi semua field!");
      return;
    }

    try {
      setIsSaving(true);
      console.log("🔍 Cek angkatan:", typeof angkatan, angkatan);

      // 🔍 Cek apakah kombinasi angkatan + jurusan sudah ada
      const existing = ketList.find(
        (item) =>
          item.angkatan === angkatan &&
          item.jurusan.toLowerCase() === jurusan.toLowerCase()
      );

      if (existing) {
        showAlert("Keterangan untuk angkatan dan jurusan ini sudah ada!");
        setIsSaving(false);
        return;
      }

      await addDoc(collection(db, "keteranganTagihan"), {
        angkatan: angkatan,
        jurusan,
        spp: parseInt(nominalSPP),
        uangGedung: parseInt(nominalUangGedung),
        pramukaOsis: parseInt(nominalPramukaOsis),
        uangPraktik: parseInt(nominalUangPraktik),
        keterangan,
        dibuatPada: new Date(),
      });

      showAlert("Keterangan tagihan berhasil ditambahkan!");
      console.log("✅ Data berhasil disimpan untuk:", angkatan, jurusan);
      window.location.reload();
    } catch (error) {
      console.error("Gagal menambah keterangan:", error);
      showAlert("Terjadi kesalahan, coba lagi.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Atur Keterangan Tagihan</h2>
      <button style={styles.addBtn} onClick={() => setShowModal(true)}>
        + Tambah Keterangan Tagihan
      </button>

      <div style={styles.tableWrapper}>
        {ketList.length === 0 ? (
          <p style={{ color: "#aaa", textAlign: "left", padding: "20px" }}>
            Belum ada keterangan tagihan.
          </p>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Angkatan</th>
                <th style={styles.th}>Jurusan</th>
                <th style={styles.th}>SPP</th>
                <th style={styles.th}>Uang Gedung</th>
                <th style={styles.th}>Pramuka & Osis</th>
                <th style={styles.th}>Uang Praktik</th>
                <th style={styles.th}>Keterangan</th>
              </tr>
            </thead>
            <tbody>
              {ketList.map((item, index) => (
                <tr
                  key={item.id}
                  style={{
                    ...styles.tr,
                    background: index % 2 === 0 ? "#2a2a2a" : "#1f1f1f",
                  }}
                >
                  <td style={styles.td}>{item.angkatan}</td>
                  <td style={styles.td}>{item.jurusan || "-"}</td>
                  <td style={styles.td}>
                    Rp {(item.spp ?? 0).toLocaleString("id-ID")}
                  </td>
                  <td style={styles.td}>
                    Rp {(item.uangGedung ?? 0).toLocaleString("id-ID")}
                  </td>
                  <td style={styles.td}>
                    Rp {(item.pramukaOsis ?? 0).toLocaleString("id-ID")}
                  </td>
                  <td style={styles.td}>
                    Rp {(item.uangPraktik ?? 0).toLocaleString("id-ID")}
                  </td>
                  <td style={styles.td}>{item.keterangan || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Input */}
      {showModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalBox}>
            <h3 style={{ marginBottom: 20, color: "#00a84ffaf" }}>
              Tambah Keterangan Tagihan
            </h3>

            {/* Input Angkatan */}
            <div style={styles.inputGroup}>
              <label style={styles.label}>Angkatan</label>
              <input
                type="number"
                placeholder="Contoh: 2010"
                value={angkatan}
                onChange={(e) => setAngkatan(e.target.value)}
                style={styles.input}
              />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Jurusan</label>
              <select
                value={jurusan}
                onChange={(e) => setJurusan(e.target.value)}
                style={styles.input}
              >
                <option value="TJKT">TJKT</option>
                <option value="AKL">AKL</option>
              </select>
            </div>

            {/* Grid untuk nominal tagihan */}
            <div style={styles.grid}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>SPP (Rp)</label>
                <input
                  type="number"
                  placeholder="Nominal SPP"
                  value={nominalSPP}
                  onChange={(e) => setNominalSPP(e.target.value)}
                  style={styles.input}
                />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Uang Gedung (Rp)</label>
                <input
                  type="number"
                  placeholder="Nominal Uang Gedung"
                  value={nominalUangGedung}
                  onChange={(e) => setNominalUangGedung(e.target.value)}
                  style={styles.input}
                />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Pramuka & Osis (Rp)</label>
                <input
                  type="number"
                  placeholder="Nominal Pramuka & Osis"
                  value={nominalPramukaOsis}
                  onChange={(e) => setNominalPramukaOsis(e.target.value)}
                  style={styles.input}
                />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Uang Praktik (Rp)</label>
                <input
                  type="number"
                  placeholder="Nominal Uang Praktik"
                  value={nominalUangPraktik}
                  onChange={(e) => setNominalUangPraktik(e.target.value)}
                  style={styles.input}
                />
              </div>
            </div>

            {/* Keterangan */}
            <div style={styles.inputGroup}>
              <label style={styles.label}>Keterangan</label>
              <input
                type="text"
                placeholder="Contoh: /tahun"
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                style={styles.input}
              />
            </div>

            <div style={styles.modalActions}>
              <button
                style={styles.cancelBtn}
                onClick={() => setShowModal(false)}
              >
                Batal
              </button>
              <button style={styles.saveBtn} onClick={handleSave}>
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
      <Snackbar
        open={alertOpen}
        autoHideDuration={4000}
        onClose={handleCloseAlert}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={handleCloseAlert}
          severity={alertType}
          sx={{ width: "100%" }}
        >
          {alertMessage}
        </Alert>
      </Snackbar>
    </div>
  );
}

const styles = {
  container: { padding: "0px 20px", color: "#eee", backgroundColor: "#0C0C0C" },

  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "rgba(255, 255, 255, 1)",
    marginBottom: 16,
  },
  addBtn: {
    backgroundColor: "#0b2cb2ff",
    color: "#ffffffff",
    padding: "10px 18px",
    borderRadius: 8,
    border: "none",
    cursor: "pointer",
    fontWeight: "700",
    marginBottom: 20,
  },

  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    backdropFilter: "blur(1px)",
    width: "100%",
    height: "100%",
    background: "rgba(0,0,0,0.7)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
    marginBottom: 12,
  },
  label: {
    marginBottom: 4,
    fontSize: 14,
    color: "#aaa",
  },
  input: {
    padding: 10,
    borderRadius: 6,
    border: "1px solid #555",
    background: "#222",
    color: "#eee",
  },

  modalBox: {
    background: "#1b1b1b",
    padding: 20,
    borderRadius: 10,
    display: "flex",
    flexDirection: "column",
    gap: 6,
    minWidth: 300,
  },
  input: {
    padding: 10,
    borderRadius: 6,
    border: "1px solid #555",
    background: "#222",
    color: "#eee",
  },
  modalActions: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: 10,
  },
  saveBtn: {
    background: "#0b2cb2ff",
    border: "none",
    padding: "10px 16px",
    color: "#fff",
    borderRadius: 6,
    cursor: "pointer",
  },
  cancelBtn: {
    background: "#b72b2b",
    border: "none",
    padding: "10px 16px",
    borderRadius: 6,
    cursor: "pointer",
    color: "#fff",
  },
  tableWrapper: {
    marginTop: "20px",
    background: "#121212",
    padding: "20px",
    borderRadius: "16px",
    boxShadow: "0 6px 25px rgba(0,0,0,0.25)",
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontFamily: "'Inter', sans-serif",
    color: "#eee",
  },
  th: {
    textAlign: "left",
    padding: "14px 16px",
    background: "#0b2cb2ff",
    color: "#ffffffff",
    fontWeight: "700",
    fontSize: "14px",
    borderBottom: "2px solid #07259fff",
  },
  tr: {
    transition: "background 0.3s ease",
    cursor: "pointer",
  },
  td: {
    textAlign: "left",
    padding: "12px 16px",
    fontSize: "14px",
    color: "#e5e5e5",
    borderBottom: "1px solid #333",
  },
};
