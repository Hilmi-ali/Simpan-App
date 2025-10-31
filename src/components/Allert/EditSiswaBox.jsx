import React, { useState } from "react";
import { toast } from "react-toastify";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../firebase";
import { FaSearch, FaUserEdit } from "react-icons/fa";

export default function EditSiswaBox({ onClose }) {
  const [nis, setNis] = useState("");
  const [dataSiswa, setDataSiswa] = useState(null);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);

  const handleCari = async () => {
    if (!nis.trim()) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, "students"),
        where("nis", "==", nis.trim())
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const docRef = snapshot.docs[0];
        setDataSiswa({
          id: docRef.id,
          nama: docRef.data().nama,
          kelas: docRef.data().kelas || "",
          jurusan: docRef.data().jurusan || "",
          telp: docRef.data().telp || "",
          angkatan: docRef.data().angkatan || "",
          tahunAjaran: docRef.data().tahunAjaran || "",
        });
        toast.success(" Data ditemukan!");
      } else {
        setDataSiswa(null);
        toast.warn("⚠️ Data tidak ditemukan");
      }
    } catch (err) {
      toast.error("❌ Gagal mencari siswa: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!dataSiswa) return;
    setUpdating(true);
    try {
      const ref = doc(db, "students", dataSiswa.id);
      await updateDoc(ref, {
        nama: dataSiswa.nama,
        kelas: dataSiswa.kelas,
        jurusan: dataSiswa.jurusan,
        telp: dataSiswa.telp,
        angkatan: dataSiswa.angkatan,
        tahunAjaran: dataSiswa.tahunAjaran,
      });
      toast.success(" Data siswa berhasil diperbarui!");
      onClose(); // Tutup modal
    } catch (err) {
      toast.error("❌ Gagal update: " + err.message);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <FaUserEdit style={{ marginRight: 8 }} />
          <h3 style={{ margin: 0 }}>Edit Data Siswa</h3>
        </div>

        <div style={styles.divider} />

        <label style={styles.label}>Cari berdasarkan NIS</label>
        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          <input
            type="text"
            value={nis}
            onChange={(e) => setNis(e.target.value)}
            style={styles.input}
            placeholder="Masukkan NIS"
          />
          <button
            style={{ ...styles.button, background: "#007aff" }}
            onClick={handleCari}
            disabled={loading}
          >
            {loading ? "..." : <FaSearch />}
          </button>
        </div>

        {dataSiswa && (
          <>
            <div style={styles.formGrid}>
              <div style={styles.formCol}>
                <label style={styles.label}>Nama</label>
                <input
                  type="text"
                  value={dataSiswa.nama}
                  onChange={(e) =>
                    setDataSiswa({ ...dataSiswa, nama: e.target.value })
                  }
                  style={styles.input}
                />

                <label style={styles.label}>Kelas</label>
                <input
                  type="text"
                  value={dataSiswa.kelas}
                  onChange={(e) =>
                    setDataSiswa({ ...dataSiswa, kelas: e.target.value })
                  }
                  style={styles.input}
                />

                <label style={styles.label}>Jurusan</label>
                <input
                  type="text"
                  value={dataSiswa.jurusan}
                  onChange={(e) =>
                    setDataSiswa({ ...dataSiswa, jurusan: e.target.value })
                  }
                  style={styles.input}
                />
              </div>

              <div style={styles.formCol}>
                <label style={styles.label}>Telepon</label>
                <input
                  type="text"
                  value={dataSiswa.telp}
                  onChange={(e) =>
                    setDataSiswa({ ...dataSiswa, telp: e.target.value })
                  }
                  style={styles.input}
                />

                <label style={styles.label}>Angkatan</label>
                <input
                  type="text"
                  value={dataSiswa.angkatan}
                  onChange={(e) =>
                    setDataSiswa({ ...dataSiswa, angkatan: e.target.value })
                  }
                  style={styles.input}
                />

                <label style={styles.label}>Tahun Ajaran</label>
                <input
                  type="text"
                  value={dataSiswa.tahunAjaran}
                  onChange={(e) =>
                    setDataSiswa({
                      ...dataSiswa,
                      tahunAjaran: e.target.value,
                    })
                  }
                  style={styles.input}
                />
              </div>
            </div>

            <div style={styles.footer}>
              <button style={styles.cancelBtn} onClick={onClose}>
                Batal
              </button>
              <button
                style={styles.saveBtn}
                onClick={handleUpdate}
                disabled={updating}
              >
                {updating ? "Menyimpan..." : "Simpan Perubahan"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    backgroundColor: "rgba(0,0,0,0.6)",
    backdropFilter: "blur(6px)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
  },
  modal: {
    background: "linear-gradient(145deg, #1e1e1e, #2d2d2d)",
    color: "#f5f5f5",
    padding: "35px 40px",
    borderRadius: "20px",
    width: "450px",
    animation: "fadeIn 0.3s ease",
  },
  header: {
    display: "flex",
    alignItems: "center",
    fontSize: 20,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 10,
  },
  divider: {
    height: 2,
    width: "100%",
    background:
      "linear-gradient(90deg, rgba(0,122,255,0.8), rgba(255,255,255,0.2))",
    margin: "10px 0 25px",
    borderRadius: 2,
  },
  formGrid: {
    display: "flex",
    justifyContent: "space-between",
    gap: "30px",
    marginBottom: 30,
  },
  formCol: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
  },
  label: {
    fontSize: 13,
    color: "#ccc",
    marginBottom: 5,
    marginTop: 5,
  },
  input: {
    width: "92%",
    padding: "10px 12px",
    borderRadius: "10px",
    border: "1px solid #444",
    backgroundColor: "#2b2b2b",
    color: "#fff",
    fontSize: 14,
    outline: "none",
    transition: "0.25s ease",
    marginBottom: 14,
  },
  button: {
    padding: "8px 14px",
    border: "none",
    borderRadius: 10,
    cursor: "pointer",
    height: 37,
    color: "#fff",
    fontWeight: "bold",
    transition: "0.3s",
    boxShadow: "0 0 10px rgba(0,122,255,0.3)",
  },
  footer: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 10,
  },
  cancelBtn: {
    padding: "10px 20px",
    background: "#444",
    borderRadius: 10,
    border: "none",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 500,
  },
  saveBtn: {
    padding: "10px 20px",
    background: "linear-gradient(135deg, #007aff, #0091ff)",
    borderRadius: 10,
    border: "none",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 600,
    boxShadow: "0 0 15px rgba(0,122,255,0.4)",
  },
};
