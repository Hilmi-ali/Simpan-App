import React, { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../firebase";
import { toast } from "react-toastify";

export default function AddTagihanBox({ onClose, refreshTagihan }) {
  const [kelas, setKelas] = useState("");
  const [jurusan, setJurusan] = useState("");
  const [jenisTagihan, setJenisTagihan] = useState("");
  const [nominal, setNominal] = useState("");
  const [tahunAjaran, setTahunAjaran] = useState("");

  const [kelasList, setKelasList] = useState([]);
  const [jurusanList, setJurusanList] = useState([]);
  const [tahunList, setTahunList] = useState([]);

  const [loading, setLoading] = useState(false);

  // Ambil daftar kelas & jurusan
  useEffect(() => {
    const fetchKelasJurusan = async () => {
      const q = query(collection(db, "students"), where("role", "==", "siswa"));
      const snapshot = await getDocs(q);
      const kelasSet = new Set();
      const jurusanSet = new Set();
      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        if (data.kelas && data.kelas.toUpperCase() !== "LULUS") {
          kelasSet.add(data.kelas);
        }
        if (data.jurusan) jurusanSet.add(data.jurusan);
      });
      setKelasList([...kelasSet].sort());
      setJurusanList([...jurusanSet].sort());
    };
    fetchKelasJurusan();
  }, []);

  // Ambil daftar tahun ajaran
  useEffect(() => {
    const fetchTahun = async () => {
      try {
        const snapshot = await getDocs(collection(db, "tahunAjaran"));
        const tahunList = snapshot.docs.map((doc) => doc.data().tahun);
        tahunList.sort((a, b) => b.localeCompare(a));
        setTahunList(tahunList);
        if (tahunList.length > 0) setTahunAjaran(tahunList[0]);
      } catch (err) {
        console.error("Gagal ambil tahun ajaran:", err);
      }
    };
    fetchTahun();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading) return;

    if (!jenisTagihan.trim() || !nominal.trim()) {
      toast.warn("Jenis tagihan dan nominal harus diisi!");
      return;
    }
    if (!tahunAjaran) {
      toast.warn("Pilih tahun ajaran terlebih dahulu!");
      return;
    }

    setLoading(true);
    try {
      // let conditions = [where("role", "==", "siswa")];
      let conditions = [where("role", "==", "siswa")];
      if (kelas) conditions.push(where("kelas", "==", kelas));
      if (jurusan) conditions.push(where("jurusan", "==", jurusan));

      const q = query(collection(db, "students"), ...conditions);
      const snapshot = await getDocs(q);

      // Filter manual siswa aktif
      const activeStudents = snapshot.docs.filter((doc) => {
        const kelas = (doc.data().kelas || "").trim().toLowerCase();
        return kelas && kelas !== "lulus";
      });

      if (activeStudents.length === 0) {
        toast.warn("Tidak ditemukan siswa aktif dengan filter yang dipilih.");
        setLoading(false);
        return;
      }

      // Buat tagihan untuk setiap siswa
      const promises = activeStudents.map((doc) => {
        return addDoc(collection(db, "tagihan"), {
          studentUID: doc.id,
          jenisTagihan: jenisTagihan.trim(),
          nominal: parseInt(nominal),
          sudahBayar: 0,
          sisaTagihan: parseInt(nominal),
          status: "belum",
          tahunAjaran,
          tanggalBuat: serverTimestamp(),
        });
      });

      await Promise.all(promises);
      toast.success("Tagihan berhasil dibuat!");

      // reset form
      setJenisTagihan("");
      setNominal("");
      setKelas("");
      setJurusan("");
      setTahunAjaran("");

      if (refreshTagihan) refreshTagihan();
      onClose();
    } catch (error) {
      toast.error("Gagal membuat tagihan: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        backgroundColor: "rgba(0,0,0,0.6)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 9999,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "#222",
          padding: 30,
          borderRadius: 10,
          width: "350px",
          boxShadow: "0 0 15px rgba(10, 132, 255, 0.8)",
          color: "#eee",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3>Buat Tagihan Baru</h3>
        <form onSubmit={handleSubmit}>
          <label style={styles.label}>
            Tahun Ajaran
            <select
              value={tahunAjaran}
              onChange={(e) => setTahunAjaran(e.target.value)}
              style={styles.input}
              required
            >
              <option value="">Pilih Tahun Ajaran</option>
              {tahunList.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>

          <label style={styles.label}>
            Pilih Kelas (opsional)
            <select
              value={kelas}
              onChange={(e) => setKelas(e.target.value)}
              style={styles.input}
            >
              <option value="">Semua Kelas</option>
              {kelasList.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </label>

          <label style={styles.label}>
            Pilih Jurusan (opsional)
            <select
              value={jurusan}
              onChange={(e) => setJurusan(e.target.value)}
              style={styles.input}
            >
              <option value="">Semua Jurusan</option>
              {jurusanList.map((j) => (
                <option key={j} value={j}>
                  {j}
                </option>
              ))}
            </select>
          </label>

          <label style={styles.label}>
            Jenis Tagihan
            <input
              type="text"
              value={jenisTagihan}
              onChange={(e) => setJenisTagihan(e.target.value)}
              style={styles.input}
              placeholder="Contoh: SPP"
              required
            />
          </label>

          <label style={styles.label}>
            Total Nominal (Rp)
            <input
              type="number"
              value={nominal}
              onChange={(e) => setNominal(e.target.value)}
              style={styles.input}
              min="0"
              required
            />
          </label>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 10,
              marginTop: 20,
            }}
          >
            <button
              type="button"
              style={{ ...styles.button, backgroundColor: "#555" }}
              onClick={onClose}
              disabled={loading}
            >
              Batal
            </button>
            <button type="submit" style={styles.button} disabled={loading}>
              {loading ? "Membuat..." : "Buat Tagihan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles = {
  label: {
    display: "block",
    marginBottom: 10,
    fontSize: 14,
    color: "#ccc",
  },
  input: {
    width: "100%",
    padding: "8px 10px",
    borderRadius: 5,
    border: "1px solid #555",
    backgroundColor: "#333",
    color: "#eee",
    fontSize: 14,
    marginTop: 4,
  },
  button: {
    padding: "8px 14px",
    backgroundColor: "#0a84ff",
    border: "none",
    borderRadius: 5,
    color: "#fff",
    cursor: "pointer",
  },
};
