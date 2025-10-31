// src/components/Bendahara/ClassUpdate.jsx
import React, { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { db } from "../../firebase";

export default function ClassUpdate() {
  const [siswaList, setSiswaList] = useState({});
  const [selected, setSelected] = useState({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState({ 10: false, 11: false, 12: false });
  const [tahunAktif, setTahunAktif] = useState(null);
  const [modal, setModal] = useState({ show: false, type: "", message: "" });
  const [confirmModal, setConfirmModal] = useState(false);

  const kelasList = ["10", "11", "12"];

  // Ambil tahun aktif hanya sekali
  useEffect(() => {
    const fetchTahun = async () => {
      const snap = await getDocs(collection(db, "tahunAjaran"));
      console.log(`📘 [READ] Jumlah dokumen tahun dibaca: ${snap.size}`);
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const aktif = list.find((t) => t.aktif);
      if (aktif) setTahunAktif(aktif.tahun);
    };
    fetchTahun();
  }, []);

  // Lazy load siswa hanya untuk kelas yang di-expand
  const fetchSiswaByKelas = async (kelas) => {
    if (siswaList[kelas]) return; // sudah pernah dibaca, jangan read lagi
    const siswaRef = collection(db, "students");
    const q = query(
      siswaRef,
      where("role", "==", "siswa"),
      where("kelas", "==", kelas),
      orderBy("nama")
    );
    const snap = await getDocs(q);
    const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    setSiswaList((prev) => ({ ...prev, [kelas]: data }));
    const newSelected = { ...selected };
    data.forEach((s) => (newSelected[s.id] = true));
    setSelected(newSelected);

    console.log(`✅ Data siswa kelas ${kelas} diambil:`, data.length, "orang");
  };

  // Expand & fetch jika belum
  const toggleExpand = async (kelas) => {
    const willExpand = !expanded[kelas];
    setExpanded((prev) => ({ ...prev, [kelas]: willExpand }));
    if (willExpand) {
      await fetchSiswaByKelas(kelas);
    }
  };

  // Proses kenaikan kelas
  const handleNaikKelas = async () => {
    setConfirmModal(false);
    setLoading(true);
    const result = [];

    const allSiswa = Object.values(siswaList).flat();
    await Promise.all(
      allSiswa.map(async (s) => {
        if (selected[s.id]) {
          let kelasBaru = s.kelas;
          if (s.kelas === "10") kelasBaru = "11";
          else if (s.kelas === "11") kelasBaru = "12";
          else if (s.kelas === "12") kelasBaru = "LULUS";

          if (kelasBaru !== s.kelas) {
            try {
              // jika siswa kelas 12 (akan jadi LULUS), jangan update tahunAjaran
              const updateData =
                s.kelas === "12"
                  ? { kelas: kelasBaru } // tanpa ubah tahunAjaran
                  : { kelas: kelasBaru, tahunAjaran: tahunAktif };
              await updateDoc(doc(db, "students", s.id), updateData);
              result.push({ id: s.id, success: true });
            } catch (err) {
              result.push({ id: s.id, success: false, error: err.message });
            }
          }
        }
      })
    );

    setLoading(false);

    const gagal = result.filter((r) => !r.success);
    if (gagal.length > 0) {
      setModal({
        show: true,
        type: "error",
        message: `Beberapa siswa gagal diproses: ${gagal
          .map((g) => g.id)
          .join(", ")}`,
      });
    } else {
      setModal({
        show: true,
        type: "success",
        message: "✅ Kenaikan kelas berhasil diproses!",
      });
    }
  };

  // Filter per kelas
  const filteredPerKelas = {};
  kelasList.forEach((k) => {
    const list = siswaList[k] || [];
    filteredPerKelas[k] = list.filter(
      (s) =>
        (s.nama || "").toLowerCase().includes(search.toLowerCase()) ||
        (s.nis || "").toString().toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div style={styles.box}>
      <h2 style={styles.title}>📚 Kenaikan Kelas</h2>
      <p style={{ color: "#aaa", marginBottom: 20 }}>
        Tahun ajaran aktif: <b>{tahunAktif || "-"}</b>
        <br />
        Klik kelas untuk memuat data. Hilangkan centang bagi siswa yang{" "}
        <b>tinggal kelas</b>.
      </p>

      {/* Search */}
      <input
        type="text"
        placeholder="Cari nama / NIS..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={styles.search}
      />

      {/* Group per kelas */}
      {kelasList.map((kelas) => (
        <div key={kelas} style={styles.group}>
          <div onClick={() => toggleExpand(kelas)} style={styles.groupHeader}>
            <span style={{ fontWeight: "bold" }}>Kelas {kelas}</span>
            <span>{expanded[kelas] ? "−" : "+"}</span>
          </div>

          {expanded[kelas] && (
            <div style={styles.groupBody}>
              {!siswaList[kelas] ? (
                <p style={{ color: "#777", fontSize: 13 }}>Memuat data...</p>
              ) : filteredPerKelas[kelas].length === 0 ? (
                <p style={{ color: "#777", fontSize: 13 }}>Tidak ada siswa</p>
              ) : (
                filteredPerKelas[kelas].map((s) => (
                  <label key={s.id} style={styles.item}>
                    <input
                      type="checkbox"
                      checked={selected[s.id] || false}
                      onChange={() =>
                        setSelected({ ...selected, [s.id]: !selected[s.id] })
                      }
                    />
                    <span>
                      {s.nama} ({s.nis}) - {s.kelas}
                    </span>
                  </label>
                ))
              )}
            </div>
          )}
        </div>
      ))}

      {/* Actions */}
      <div style={{ marginTop: 20, textAlign: "right" }}>
        <button
          onClick={() => setConfirmModal(true)}
          disabled={loading}
          style={styles.button}
        >
          {loading ? "Memproses..." : "Konfirmasi Naik Kelas"}
        </button>
      </div>

      {/* Modal Konfirmasi */}
      {confirmModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalBox}>
            <h3>Konfirmasi Kenaikan Kelas</h3>
            <p>
              Apakah Anda yakin ingin memproses kenaikan kelas untuk semua siswa
              yang dicentang?
            </p>
            <div
              style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}
            >
              <button style={styles.button} onClick={handleNaikKelas}>
                Ya
              </button>
              <button
                style={styles.button}
                onClick={() => setConfirmModal(false)}
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Sukses / Error */}
      {modal.show && (
        <div style={styles.modalOverlay}>
          <div
            style={{
              ...styles.modalBox,
              borderColor: modal.type === "success" ? "green" : "red",
            }}
          >
            <p>{modal.message}</p>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <button
                style={styles.button}
                onClick={() => setModal({ show: false, type: "", message: "" })}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  box: {
    backgroundColor: "#0C0C0C",
    padding: "0px 25px 30px 20px",
    borderRadius: 10,
    boxShadow: "0 0 10px rgba(255,255,255,0.05)",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#fff",
  },
  search: {
    width: "100%",
    padding: "8px 12px",
    borderRadius: 6,
    border: "1px solid #555",
    backgroundColor: "#0C0C0C",
    color: "#eee",
    marginBottom: 15,
  },
  group: {
    marginBottom: 10,
    border: "1px solid #444",
    borderRadius: 6,
    overflow: "hidden",
  },
  groupHeader: {
    backgroundColor: "#151515ff",
    padding: "8px 12px",
    cursor: "pointer",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    color: "#eee",
  },
  groupBody: {
    padding: 10,
    backgroundColor: "#0e0e0eff",
  },
  item: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "6px 4px",
    borderBottom: "1px solid #444",
    fontSize: 14,
    color: "#ddd",
  },
  button: {
    padding: "10px 15px",
    backgroundColor: "#0a84ff",
    border: "none",
    borderRadius: 6,
    color: "#fff",
    cursor: "pointer",
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    backgroundColor: "rgba(0,0,0,0.5)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  modalBox: {
    backgroundColor: "#2c2c2e",
    padding: 20,
    borderRadius: 10,
    border: "2px solid #0a84ff",
    minWidth: 300,
    color: "#fff",
  },
};
