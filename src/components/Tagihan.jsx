// === Tagihan.js (Halaman Siswa dengan Modal Pembayaran) ===
import React, { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db } from "../firebase";

export default function Tagihan() {
  const [tagihanList, setTagihanList] = useState([]);
  const [activeMenu, setActiveMenu] = useState("tagihan");
  const [selectedTagihan, setSelectedTagihan] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const fetchTagihan = async () => {
      const uid = localStorage.getItem("uid");
      if (!uid) return;
      const q = query(
        collection(db, "tagihan"),
        where("studentUID", "==", uid)
      );
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setTagihanList(list);
    };
    fetchTagihan();
  }, []);

  const handleBayarCash = async () => {
    try {
      const tagihanRef = doc(db, "tagihan", selectedTagihan.id);
      await updateDoc(tagihanRef, { konfirmasi: "cash" });
      alert("Konfirmasi pembayaran cash telah dikirim ke bendahara.");
      setShowModal(false);
      window.location.reload();
    } catch (err) {
      console.error("Gagal konfirmasi cash:", err);
    }
  };

  const TagihanList = () => (
    <div>
      <h3>Tagihan Siswa</h3>
      {tagihanList.filter((t) => t.status === "belum").length === 0 ? (
        <p>Tidak ada tagihan.</p>
      ) : (
        tagihanList
          .filter((t) => t.status === "belum")
          .map((item) => (
            <div
              key={item.id}
              style={styles.tagihanItem}
              onClick={() => {
                setSelectedTagihan(item);
                setShowModal(true);
              }}
            >
              <p>
                <strong>{item.jenisTagihan}</strong> - Rp
                {item.jumlah.toLocaleString()}
              </p>
              <p>
                Status:{" "}
                <span style={styles.belum}>{item.status.toUpperCase()}</span>
              </p>
              <p>Tanggal: {item.tanggal}</p>
            </div>
          ))
      )}
    </div>
  );

  const RiwayatList = () => (
    <div>
      <h3>Riwayat Pembayaran</h3>
      {tagihanList.filter((t) => t.status === "lunas").length === 0 ? (
        <p>Belum ada riwayat pembayaran.</p>
      ) : (
        tagihanList
          .filter((t) => t.status === "lunas")
          .map((item) => (
            <div key={item.id} style={styles.tagihanItem}>
              <p>
                <strong>{item.jenisTagihan}</strong> - Rp
                {item.jumlah.toLocaleString()}
              </p>
              <p>
                Status:{" "}
                <span style={styles.lunas}>{item.status.toUpperCase()}</span>
              </p>
              <p>Tanggal: {item.tanggal}</p>
            </div>
          ))
      )}
    </div>
  );

  const CaraPembayaran = () => (
    <div>
      <h3>Cara Pembayaran</h3>
      <ul>
        <li>Transfer ke rekening sekolah (Midtrans - sedang dikembangkan)</li>
        <li>Pembayaran via E-Wallet</li>
        <li>Atau bayar langsung ke sekolah (Cash)</li>
      </ul>
    </div>
  );

  const renderContent = () => {
    switch (activeMenu) {
      case "tagihan":
        return <TagihanList />;
      case "riwayat":
        return <RiwayatList />;
      case "cara":
        return <CaraPembayaran />;
      default:
        return null;
    }
  };

  return (
    <div style={styles.pageContainer}>
      <div style={styles.sidebar}>
        <h3 style={styles.title}>Menu</h3>
        <button
          onClick={() => setActiveMenu("tagihan")}
          style={activeMenu === "tagihan" ? styles.activeItem : styles.menuItem}
        >
          Tagihan
        </button>
        <button
          onClick={() => setActiveMenu("riwayat")}
          style={activeMenu === "riwayat" ? styles.activeItem : styles.menuItem}
        >
          Riwayat
        </button>
        <button
          onClick={() => setActiveMenu("cara")}
          style={activeMenu === "cara" ? styles.activeItem : styles.menuItem}
        >
          Cara Pembayaran
        </button>
      </div>
      <div style={styles.content}>
        <h2>Halaman Pembayaran Sekolah</h2>
        {renderContent()}
      </div>

      {/* Modal Pembayaran */}
      {showModal && selectedTagihan && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalBox}>
            <h3>Konfirmasi Pembayaran</h3>
            <p>
              <strong>{selectedTagihan.jenisTagihan}</strong> - Rp
              {selectedTagihan.jumlah.toLocaleString()}
            </p>
            <p>Tanggal: {selectedTagihan.tanggal}</p>
            <div style={{ marginTop: 20 }}>
              <button style={styles.transferBtn} disabled>
                Transfer ke BRI (Coming Soon)
              </button>
              <button style={styles.cashBtn} onClick={handleBayarCash}>
                Bayar Cash ke Sekolah
              </button>
            </div>
            <button onClick={() => setShowModal(false)} style={styles.closeBtn}>
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  pageContainer: {
    display: "flex",
    flexDirection: "row",
    minHeight: "100vh",
    backgroundColor: "#1e1e1e",
    color: "#fff",
  },
  sidebar: {
    width: "220px",
    backgroundColor: "#2c2c2c",
    padding: "20px",
  },
  title: {
    marginBottom: "15px",
    fontWeight: "bold",
    fontSize: "18px",
  },
  menuItem: {
    display: "block",
    width: "100%",
    padding: "10px 15px",
    marginBottom: "10px",
    border: "none",
    backgroundColor: "#3a3a3a",
    color: "#fff",
    textAlign: "left",
    cursor: "pointer",
    borderRadius: "4px",
  },
  activeItem: {
    backgroundColor: "#4caf50",
    color: "white",
  },
  content: {
    flex: 1,
    padding: "20px",
  },
  tagihanItem: {
    backgroundColor: "#333",
    padding: "15px",
    borderRadius: "6px",
    marginBottom: "12px",
    cursor: "pointer",
  },
  lunas: {
    color: "#4caf50",
    fontWeight: "bold",
  },
  belum: {
    color: "#e74c3c",
    fontWeight: "bold",
  },
  cashBtn: {
    padding: "8px 12px",
    backgroundColor: "#f39c12",
    border: "none",
    borderRadius: "5px",
    color: "white",
    cursor: "pointer",
    marginLeft: "10px",
  },
  transferBtn: {
    padding: "8px 12px",
    backgroundColor: "#555",
    border: "none",
    borderRadius: "5px",
    color: "#bbb",
    cursor: "not-allowed",
  },
  closeBtn: {
    marginTop: "20px",
    padding: "8px 12px",
    backgroundColor: "#888",
    border: "none",
    borderRadius: "5px",
    color: "#fff",
    cursor: "pointer",
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  modalBox: {
    backgroundColor: "#2e2e2e",
    padding: "30px",
    borderRadius: "10px",
    width: "350px",
    textAlign: "center",
  },
};
