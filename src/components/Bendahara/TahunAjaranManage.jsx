// File: src/components/TahunAjaran/TahunAjaranManage.jsx
import React, { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  orderBy,
} from "firebase/firestore";
import { db } from "../../firebase";

export default function TahunAjaranManage() {
  const [tahunList, setTahunList] = useState([]);
  const [formTahun, setFormTahun] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchTahun = async () => {
    const snapshot = await getDocs(collection(db, "tahunAjaran"));
    const list = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => (a.tahun > b.tahun ? -1 : 1)); // terbaru di atas
    setTahunList(list);
  };

  useEffect(() => {
    fetchTahun();
  }, []);

  const handleTambahTahun = async () => {
    if (!formTahun.trim()) return;
    setLoading(true);
    try {
      await addDoc(collection(db, "tahunAjaran"), {
        tahun: formTahun.trim(),
        aktif: false,
        createdAt: new Date(),
      });
      setFormTahun("");
      fetchTahun();
    } catch (error) {
      alert("Gagal menambah tahun ajaran: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSetAktif = async (id) => {
    try {
      const batch = await getDocs(collection(db, "tahunAjaran"));
      for (let t of batch.docs) {
        await updateDoc(doc(db, "tahunAjaran", t.id), { aktif: false });
      }
      await updateDoc(doc(db, "tahunAjaran", id), { aktif: true });
      fetchTahun();
    } catch (error) {
      alert("Gagal mengatur tahun aktif: " + error.message);
    }
  };

  return (
    <div style={styles.contentBox}>
      <h2 style={styles.pageTitle}>Kelola Tahun Ajaran</h2>

      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <input
          type="text"
          placeholder="Contoh: 2024/2025"
          value={formTahun}
          onChange={(e) => setFormTahun(e.target.value)}
          style={styles.input}
        />
        <button
          onClick={handleTambahTahun}
          disabled={loading}
          style={styles.button}
        >
          Tambah
        </button>
      </div>

      <table style={styles.table}>
        <thead>
          <tr style={styles.tableHeader}>
            <th style={styles.th}>Tahun Ajaran</th>
            <th style={styles.th}>Status</th>
            <th style={styles.th}>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {tahunList.map((t) => (
            <tr key={t.id} style={styles.tableRow}>
              <td style={styles.td}>{t.tahun}</td>
              <td style={styles.td}>{t.aktif ? "Aktif" : "Tidak Aktif"}</td>
              <td style={styles.td}>
                {!t.aktif && (
                  <button
                    onClick={() => handleSetAktif(t.id)}
                    style={styles.button}
                  >
                    Set Aktif
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Styles sama dengan DashboardBendahara
const styles = {
  contentBox: {
    backgroundColor: "#0C0C0C",
    borderRadius: "10px",
    padding: "0 25px",
    boxShadow: "0 0 10px rgba(255,255,255,0.05)",
  },
  pageTitle: {
    fontSize: "22px",
    marginBottom: "35px",
  },
  input: {
    flex: 1,
    padding: "8px 10px",
    borderRadius: 5,
    border: "1px solid #555",
    backgroundColor: "#333",
    color: "#eee",
    fontSize: 14,
  },
  button: {
    padding: "8px 12px",
    backgroundColor: "#0a84ff",
    border: "none",
    borderRadius: "4px",
    color: "#fff",
    cursor: "pointer",
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
};
