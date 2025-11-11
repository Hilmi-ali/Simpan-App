import React, { useEffect, useState, useRef } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  getDoc,
  addDoc,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../../firebase";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import "@fontsource/lexend";
import "@fontsource/inter-tight";
import RiwayatSiswa from "./RiwayatSiswa";
import TagihanSiswa from "./TagihanSiswa";
import BeasiswaSiswa from "./BeasiswaClaim";

export default function DashboardSiswa() {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [tagihanList, setTagihanList] = useState([]);
  const [activeMenu, setActiveMenu] = useState("beranda");
  const [selectedTagihan, setSelectedTagihan] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const [selectedTahunAjaran, setSelectedTahunAjaran] = useState("");
  const [tahunOptions, setTahunOptions] = useState([]);
  const [keteranganTagihan, setKeteranganTagihan] = useState(null);

  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);
  const sidebarRef = useRef(null);

  const studentSession = JSON.parse(
    sessionStorage.getItem("studentSession") || "{}"
  );
  const studentId = studentSession.id;

  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (windowWidth <= 768) {
      setIsSidebarOpen(false);
    } else {
      setIsSidebarOpen(true);
    }
  }, [windowWidth]);

  useEffect(() => {
    if (!studentId) {
      navigate("/");
      return;
    }

    const fetchSiswa = async () => {
      try {
        const docRef = doc(db, "students", studentId);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) {
          sessionStorage.clear();
          navigate("/");
          return;
        }
        const data = docSnap.data();
        setUserData({ id: studentId, ...data });

        if (data.angkatan && data.jurusan) {
          const angkatanStr = data.angkatan.toString().trim();
          const jurusanStr = (data.jurusan || "").trim().toUpperCase();

          const q = query(
            collection(db, "keteranganTagihan"),
            where("angkatan", "==", angkatanStr),
            where("jurusan", "==", jurusanStr)
          );
          const querySnap = await getDocs(q);
          if (!querySnap.empty) setKeteranganTagihan(querySnap.docs[0].data());
        }

        const currentYear = new Date().getFullYear();
        let options = [`${currentYear}/${currentYear + 1}`];

        if (data.kelas === 11) {
          options = [
            `${currentYear - 1}/${currentYear}`,
            `${currentYear}/${currentYear + 1}`,
          ];
        } else if (data.kelas === 12) {
          options = [
            `${currentYear - 2}/${currentYear - 1}`,
            `${currentYear - 1}/${currentYear}`,
            `${currentYear}/${currentYear + 1}`,
          ];
        }

        setTahunOptions(options);
        setSelectedTahunAjaran(options[options.length - 1]);
        setLoading(false);
      } catch (err) {
        console.error("Error ambil data siswa:", err);
        alert("Terjadi kesalahan, silakan login ulang.");
        navigate("/");
      }
    };

    fetchSiswa();
  }, [navigate, studentId]);

  useEffect(() => {
    const fetchTagihan = async () => {
      if (!userData) return;
      try {
        console.log("Fetching tagihan untuk siswa:", userData.id);
        const q = query(
          collection(db, "tagihan"),
          where("studentUID", "==", userData.id)
        );
        const snap = await getDocs(q);
        const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

        const sortedData = data.sort((a, b) => {
          const normalize = (str) =>
            (str || "")
              .toLowerCase()
              .trim()
              .replace(/\s+/g, "")
              .replace("&", "dan");

          const orderMap = {
            spp: 1,
            uanggedung: 2,
            uangpraktek: 3,
            uangpraktik: 3,
            pramukaosis: 4,
            osispramuka: 4,
            osisdanpramuka: 4,
            pramukadanosis: 4,
          };

          const jenisA = normalize(a.jenis);
          const jenisB = normalize(b.jenis);
          const idxA = Object.keys(orderMap).find((key) =>
            jenisA.includes(key)
          );
          const idxB = Object.keys(orderMap).find((key) =>
            jenisB.includes(key)
          );

          const rankA = idxA ? orderMap[idxA] : 999;
          const rankB = idxB ? orderMap[idxB] : 999;

          return rankA - rankB;
        });

        console.log("Tagihan setelah diurutkan:", sortedData);
        setTagihanList(sortedData);
      } catch (err) {
        console.error("Gagal fetch tagihan siswa:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTagihan();
  }, [userData]);

  const handleLogout = async () => {
    try {
      const studentId = sessionStorage.getItem("studentId");

      if (studentId) {
        const studentRef = doc(db, "students", studentId);
        await updateDoc(studentRef, { activeSession: null });
      }

      sessionStorage.clear();

      setShowLogoutModal(false);

      toast.success("Berhasil logout.");
      navigate("/");

      console.log("Logout berhasil");
    } catch (err) {
      console.error("Gagal logout:", err);
      alert("Gagal logout. Silakan coba lagi.");
    }
  };

  const formatRupiah = (value) => {
    if (!value) return "0";
    return value.toLocaleString("id-ID");
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target) &&
        window.innerWidth <= 768 &&
        isSidebarOpen
      ) {
        setIsSidebarOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isSidebarOpen]);

  const handleMenuClick = (menu) => {
    setActiveMenu(menu);
    if (windowWidth <= 768) {
      setIsSidebarOpen(false);
    }
  };

  // Item Beranda
  const items = keteranganTagihan
    ? [
        {
          nama: "SPP",
          jumlah: keteranganTagihan.spp,
          style: {
            border: "1px solid rgba(63, 63, 63, 0.6)",
            color: "#CEFE06",
            borderRadius: "12px",
            padding: "12px",
            fontWeight: "bold",
          },
        },
        {
          nama: "Uang Gedung",
          jumlah: keteranganTagihan.uangGedung,
          style: {
            backgroundColor: "#0e0e0eff",
            border: "10px solid #CEFE06",
            color: "#CEFE06",
            borderRadius: "12px",
            padding: "12px",
            fontWeight: "bold",
          },
        },
        {
          nama: "Uang Praktik",
          jumlah: keteranganTagihan.uangPraktik,
          style: {
            backgroundColor: "#000000",
            border: "10px solid #CEFE06",
            color: "#CEFE06",
            borderRadius: "12px",
            padding: "12px",
            fontWeight: "bold",
          },
        },
        {
          nama: "Pramuka & OSIS",
          jumlah: keteranganTagihan.pramukaOsis,
          style: {
            backgroundColor: "#000000",
            border: "10px solid #CEFE06",
            color: "#CEFE06",
            borderRadius: "12px",
            padding: "12px",
            fontWeight: "bold",
          },
        },
      ]
    : [];

  const renderContent = () => {
    if (activeMenu === "beranda") {
      return (
        <>
          <h3 style={styles.sectionTitle}>Rincian Pembayaran</h3>
          <div style={styles.dashboardGrid}>
            {items.map((item, idx) => (
              <div
                key={idx}
                style={{ ...styles.dashboardCard, background: item.gradient }}
              >
                <div style={styles.dashboardCardContent}>
                  <span style={styles.dashboardCardTitle}>{item.nama}</span>
                </div>
                <span style={styles.dashboardCardAmount}>
                  Rp {formatRupiah(item.jumlah ?? 0)}
                </span>
              </div>
            ))}
          </div>
        </>
      );
    }
    if (activeMenu === "tagihan") {
      return (
        <TagihanSiswa
          userData={userData}
          tagihanList={tagihanList}
          selectedTahunAjaran={selectedTahunAjaran}
          setSelectedTahunAjaran={setSelectedTahunAjaran}
          tahunOptions={tahunOptions}
          setSelectedTagihan={setSelectedTagihan}
          setShowModal={setShowModal}
          formatRupiah={formatRupiah}
        />
      );
    }

    if (activeMenu === "riwayat") {
      return tagihanList.length > 0 ? (
        <RiwayatSiswa
          tagihanList={tagihanList}
          userData={userData}
          formatRupiah={(nominal) => "Rp " + nominal.toLocaleString()}
        />
      ) : (
        <p>Belum ada riwayat pembayaran</p>
      );
    }
    if (activeMenu === "beasiswa") {
      return tagihanList.length > 0 ? (
        <BeasiswaSiswa
          studentUID={userData.id} // <-- tambahkan ini
          tagihanList={tagihanList}
          userData={userData}
          formatRupiah={(nominal) => "Rp " + nominal.toLocaleString()}
        />
      ) : (
        <p>Belum ada Beasiswa </p>
      );
    }

    return (
      <>
        <h3 style={styles.sectionTitle}>Cara Pembayaran</h3>
        <ol style={styles.paymentList}>
          <p>1. Pilih Tagihan</p>
          <p>2. Masukkan Nominal</p>
          <p>3. Tap Bayar</p>
          <p>4. Setor Uang ke Bendahara </p>
          <p>5. Pembayaran Berhasil</p>
        </ol>
      </>
    );
  };

  if (loading)
    return (
      <p style={{ color: "#ddd", textAlign: "center", marginTop: 50 }}>
        Memuat data...
      </p>
    );

  return (
    <div style={styles.pageContainer}>
      <button
        style={{
          display: windowWidth <= 768 ? "flex" : "none",
          position: "fixed",
          justifyContent: "center",
          alignItems: "center",
          top: 16,
          width: 34,
          left: isSidebarOpen ? 230 : 16,
          zIndex: 10000,
          padding: 8,
          marginTop: 12,
          borderRadius: 6,
          backgroundColor: isSidebarOpen ? "#CEFE06" : "transparent",
          border: "none",
          color: isSidebarOpen ? "#000" : "#fff",
          fontWeight: "700",
          cursor: "pointer",
          transition: "left 0.3s ease",
        }}
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
      >
        ☰
      </button>
      <aside
        ref={sidebarRef}
        style={{
          ...styles.sidebar,
          transform:
            windowWidth <= 768
              ? isSidebarOpen
                ? "translateX(0)"
                : "translateX(-100%)"
              : "translateX(0)",
        }}
      >
        <h2 style={styles.sidebarTitle}>Dashboard</h2>
        <nav style={styles.nav}>
          <button
            style={
              activeMenu === "beranda"
                ? styles.navButtonActive
                : styles.navButton
            }
            onClick={() => handleMenuClick("beranda")}
          >
            Beranda
          </button>
          <button
            style={
              activeMenu === "tagihan"
                ? styles.navButtonActive
                : styles.navButton
            }
            onClick={() => handleMenuClick("tagihan")}
          >
            Tagihan
          </button>
          <button
            style={
              activeMenu === "riwayat"
                ? styles.navButtonActive
                : styles.navButton
            }
            onClick={() => handleMenuClick("riwayat")}
          >
            Riwayat
          </button>
          <button
            style={
              activeMenu === "beasiswa"
                ? styles.navButtonActive
                : styles.navButton
            }
            onClick={() => handleMenuClick("beasiswa")}
          >
            {" "}
            Beasiswa
          </button>
          <button
            style={
              activeMenu === "cara" ? styles.navButtonActive : styles.navButton
            }
            onClick={() => handleMenuClick("cara")}
          >
            Cara Bayar
          </button>
          <button
            style={styles.logoutBtn}
            onClick={() => setShowLogoutModal(true)}
          >
            Logout
          </button>
        </nav>
      </aside>
      <main
        style={{
          ...styles.mainContent,
          marginLeft: windowWidth <= 768 ? 0 : 240,
        }}
      >
        {userData && (
          <section style={styles.userInfo}>
            <h1 style={styles.userName}>{userData.nama}</h1>
            <div style={styles.userMeta}>
              <span>{userData.nis}</span>
              <span>{userData.jurusan || "-"}</span>
              <span>{userData.kelas || "-"}</span>
            </div>
          </section>
        )}
        <section style={styles.contentArea}>{renderContent()}</section>
      </main>

      {showLogoutModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalBox}>
            <h3 style={{ fontSize: "1.1rem", marginBottom: 10 }}>
              Konfirmasi Logout
            </h3>
            <p style={{ fontSize: "0.9rem", marginBottom: 15 }}>
              Apakah Anda yakin ingin keluar?
            </p>
            <div style={styles.modalActions}>
              <button style={styles.yesBtn} onClick={handleLogout}>
                Ya
              </button>
              <button
                style={styles.cancelBtn}
                onClick={() => setShowLogoutModal(false)}
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  pageContainer: {
    display: "flex",
    minHeight: "100vh",
    backgroundColor: "#000000",
    color: "#e0e0e0",
    fontFamily: '"Inter Tight", sans-serif',
    flexDirection: "row",
  },
  sidebar: {
    width: 240,
    backgroundColor: "#000000",
    padding: 24,
    display: "flex",
    flexDirection: "column",
    boxShadow: "2px 0 6px rgba(0,0,0,0.7)",
    position: "fixed",
    left: 0,
    top: 0,
    bottom: 0,
    transition: "transform 0.3s ease",
    zIndex: 9999,
  },
  sidebarTitle: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 20,
    marginBottom: 24,
    letterSpacing: 1.5,
  },
  nav: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    flexGrow: 1,
  },
  navButton: {
    backgroundColor: "#000000",
    border: "1px solid rgba(75, 75, 75, 0.6)",
    color: "#ddd",
    padding: "14px 18px",
    fontSize: 14,
    borderRadius: 12,
    cursor: "pointer",
    textAlign: "left",
    transition: "background-color 0.3s ease",
  },
  navButtonActive: {
    backgroundColor: "#CEFE06",
    border: "",
    color: "#000",
    padding: "14px 18px",
    fontSize: 14,
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: "700",
    textAlign: "left",
  },
  logoutBtn: {
    marginTop: "auto",
    backgroundColor: "#b72b2b",
    border: "none",
    padding: "14px 18px",
    color: "#fff",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: "700",
    transition: "background-color 0.3s ease",
  },
  mainContent: {
    flex: 1,
    overflowY: "auto",
    padding: "16px 20px",
    marginLeft: 240,
  },
  userInfo: {
    marginBottom: 15,
    paddingLeft: 35,
    borderBottom: "1px solid #8d8d8dff",
    paddingBottom: 15,
  },
  userName: {
    fontSize: 18,
    fontWeight: 700,
    marginBottom: 8,
    color: "#fff",
  },
  userMeta: {
    display: "flex",
    gap: 20,
    color: "#fff",
    fontSize: 14,
    flexWrap: "wrap",
  },
  contentArea: {
    maxWidth: "100%",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 16,
    color: "#fff",
  },
  emptyText: {
    color: "#fff",
    fontStyle: "italic",
  },
  tagihanCard: {
    backgroundColor: "#222",
    padding: 18,
    borderRadius: 10,
    marginBottom: 16,
    cursor: "pointer",
    boxShadow: "0 0 5px rgba(10,170,255,0.3)",
    transition: "transform 0.2s ease",
  },
  tagihanHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  tagihanTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0af",
  },
  statusBelum: {
    backgroundColor: "#3c45e7ff",
    color: "#fff",
    fontWeight: "700",
    padding: "4px 10px",
    borderRadius: 20,
    fontSize: 12,
  },
  statusLunas: {
    backgroundColor: "#4caf50",
    color: "#fff",
    fontWeight: "700",
    padding: "4px 10px",
    borderRadius: 20,
    fontSize: 12,
  },
  tagihanAmount: {
    fontSize: 16,
    color: "#ccc",
    marginBottom: 6,
  },
  tagihanDate: {
    fontSize: 13,
    color: "#888",
  },
  paymentList: {
    listStyle: "inside disc",
    fontSize: 13,
    lineHeight: 0.6,
    color: "#fff",
    paddingLeft: 10,
  },
  dashboardGrid: {
    display: "grid",
    gridTemplateColumns: "1fr",
    flexDirection: "column",
    gap: 10,
    marginTop: 20,
  },
  dashboardCard: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    justifyContent: "space-between",
    borderRadius: 12,
    border: "1px solid #414141ff",
    padding: "12px 16px",
    boxShadow: "0 0 8px rgba(0,0,0,0.5)",
    cursor: "default",
    minHeight: 40,
  },
  dashboardCardContent: {
    display: "flex",
    flexDirection: "column",
  },
  dashboardCardTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: "#dee8ffff",
  },
  dashboardCardAmount: {
    fontSize: 15,
    fontWeight: "500",
    color: "#f1ff32ff",
    marginTop: 8,
  },
  modalOverlay: {
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
    padding: "10px", // supaya modal tidak mepet di HP
  },
  modalBox: {
    backgroundColor: "#1b1b1b",
    padding: 20,
    borderRadius: 12,
    width: "55%",
    maxWidth: 400,
    minWidth: "unset",
    color: "#eee",
    display: "flex",
    flexDirection: "column",
    gap: 12,
    boxShadow: "0 6px 16px rgba(0,0,0,0.5)",
  },
  modalActions: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: 10,
    gap: 8,
    width: "100%",
  },
  closeBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    background: "#b72b2b",
    border: "none",
    padding: "6px 12px",
    borderRadius: 6,
    color: "#fff",
    cursor: "pointer",
  },
  transferBtn: {
    backgroundColor: "#555",
    border: "none",
    padding: "10px 16px",
    borderRadius: 6,
    color: "#ccc",
    cursor: "not-allowed",
  },
  cashBtn: {
    backgroundColor: "#0af",
    border: "none",
    padding: "10px 16px",
    borderRadius: 6,
    color: "#121212",
    cursor: "pointer",
  },
  cancelBtn: {
    backgroundColor: "#888",
    border: "none",
    padding: "10px 0",
    borderRadius: 6,
    color: "#fff",
    cursor: "pointer",
    flex: 1,
    textAlign: "center",
    transition: "background 0.2s ease",
  },
  yesBtn: {
    backgroundColor: "#CEFE06",
    border: "none",
    padding: "10px 0",
    borderRadius: 6,
    color: "#121212",
    cursor: "pointer",
    flex: 1,
    textAlign: "center",
    fontWeight: "bold",
    transition: "background 0.2s ease, transform 0.1s ease",
  },
  card: {
    background: "#000",
    borderRadius: "16px",
    padding: "18px",
    marginBottom: "16px",
    boxShadow: "0 6px 16px rgba(0,0,0,0.1)",
    cursor: "pointer",
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "12px",
  },
  jenisTagihan: {
    fontSize: "18px",
    fontWeight: "600",
    color: "#dce3ebff",
  },
  status: {
    background: "#ff4757",
    color: "#fff",
    fontSize: "13px",
    fontWeight: "600",
    padding: "4px 10px",
    borderRadius: "12px",
    textTransform: "uppercase",
    animation: "blink 1.5s infinite",
  },
  cardBody: {
    fontSize: "15px",
    lineHeight: "1.6",
    color: "#dce3ebff",
  },
  sisa: {
    color: "#e74c3c",
    fontWeight: "600",
  },
  total: {
    color: "#2ecc71",
    fontWeight: "600",
  },
};
