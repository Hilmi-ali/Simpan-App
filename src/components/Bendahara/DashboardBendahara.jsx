import React, { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  writeBatch,
  deleteDoc,
  limit,
  doc,
  getDoc,
  addDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "../../firebase";
import { getAuth, signOut } from "firebase/auth";
import { useNavigate, useLocation } from "react-router-dom";
import AturKetBiaya from "./AturKetBiaya";
import UpdateKelas from "./UpdateKelas";
import Laporan from "./Laporan";
import PieChartSiswa from "../utils/PiechartSiswa";
import { FaBars } from "react-icons/fa";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Tooltip,
  Cell,
  BarChart,
  Bar,
  XAxis,
  Tooltip as RTooltip,
} from "recharts";
import {
  FaUserGraduate,
  FaChartBar,
  FaClipboardList,
  FaFileInvoiceDollar,
  FaCalendarAlt,
  FaMoneyBillWave,
  FaMoneyCheckAlt,
} from "react-icons/fa";
import EditSiswaBox from "../Allert/EditSiswaBox";
import AddSiswaModal from "../Allert/AddSiswaBox";
import ImportExcelModal from "../Allert/ImportExcelBox";
import BuatTagihan from "./BuatTagihan";
import TahunAjaranManage from "./TahunAjaranManage";
import KelolaBeasiswa from "./Beasiswa";
import { color } from "framer-motion";
import { Bot } from "lucide-react";

export default function DashboardBendahara() {
  const [siswaList, setSiswaList] = useState([]);
  const [activeMenu, setActiveMenu] = useState("dashboard");
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [loadingTambah, setLoadingTambah] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Pencarian dan Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState("terbaru");

  const [showAddChoiceModal, setShowAddChoiceModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const auth = getAuth();

  const [hoveredButton, setHoveredButton] = useState(null);

  const [showBuatTagihanModal, setShowBuatTagihanModal] = useState(false);

  const openAddChoiceModal = () => setShowAddChoiceModal(true);
  const closeAddChoiceModal = () => setShowAddChoiceModal(false);

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [hoveredMenu, setHoveredMenu] = useState(null);

  const [totalTagihan, setTotalTagihan] = useState(0);
  const [totalUangMasuk, setTotalUangMasuk] = useState(0);
  const [chartData, setChartData] = useState([]);
  const [hoveredBar, setHoveredBar] = useState(null);

  const handleOpenAddManual = () => {
    setShowAddChoiceModal(false);
    setShowAddModal(true);
  };

  const handleOpenImportExcel = () => {
    setShowAddChoiceModal(false);
    setShowImportModal(true);
  };

  //Filter
  const getFilteredAndSortedSiswa = () => {
    let filtered = siswaList.filter((siswa) => {
      const q = searchQuery.toLowerCase();
      return (
        siswa.nama?.toLowerCase().includes(q) ||
        siswa.nis?.toLowerCase().includes(q)
      );
    });

    switch (sortOption) {
      case "terbaru":
        return [...filtered].reverse(); // Asumsinya data terbaru paling akhir
      case "terlama":
        return filtered;
      case "akl":
        return [...filtered].sort((a, b) => {
          if (a.jurusan === "AKL" && b.jurusan !== "AKL") return -1;
          if (a.jurusan !== "AKL" && b.jurusan === "AKL") return 1;
          return 0;
        });
      case "tjkt":
        return [...filtered].sort((a, b) => {
          if (a.jurusan === "TJKT" && b.jurusan !== "TJKT") return -1;
          if (a.jurusan !== "TJKT" && b.jurusan === "TJKT") return 1;
          return 0;
        });
      case "nis":
        return [...filtered].sort((a, b) => a.nis.localeCompare(b.nis));
      default:
        return filtered;
    }
  };

  // Form inputs modal
  const [formNIS, setFormNIS] = useState("");
  const [formNama, setFormNama] = useState("");
  const [formJurusan, setFormJurusan] = useState("");

  const navigate = useNavigate();

  const location = useLocation();
  const [activeCase, setActiveCase] = useState("default");

  useEffect(() => {
    if (location.state?.activeMenu) {
      setActiveMenu(location.state.activeMenu);
    }
  }, [location.state]);

  const handleMenuClick = (menu) => {
    setActiveMenu(menu);
    setIsCollapsed(true); // otomatis collapse setelah klik
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/");
    } catch (error) {
      alert("Gagal logout: " + error.message);
    }
  };
  const menuItems = [
    { key: "dashboard", label: "Dashboard", icon: <FaChartBar /> },
    { key: "dataSiswa", label: "Data Siswa", icon: <FaUserGraduate /> },
    {
      key: "buatTagihan",
      label: "Buat Tagihan",
      icon: <FaFileInvoiceDollar />,
    },
    { key: "tahunAjaran", label: "Tahun Ajaran", icon: <FaCalendarAlt /> },
    { key: "updateKelas", label: "Kenaikan Kelas", icon: <FaUserGraduate /> },
    { key: "aturKetBiaya", label: "Atur Ket Biaya", icon: <FaMoneyBillWave /> },
    {
      key: "kelolaBeasiswa",
      label: "Kelola Beasiswa",
      icon: <FaMoneyCheckAlt />,
    },
    { key: "laporan", label: "Laporan", icon: <FaClipboardList /> },
  ];

  useEffect(() => {
    fetchSiswa();
  }, []);

  const fetchSiswa = async () => {
    const q = query(
      collection(db, "students"),
      where("role", "==", "siswa")
      // limit(20)
    );
    const snapshot = await getDocs(q);
    console.log(`📘 [READ] Jumlah dokumen siswa dibaca: ${snapshot.size}`);
    const list = snapshot.docs.map((doc) => ({ uid: doc.id, ...doc.data() }));
    setSiswaList(list);
  };

  const handleKelolaTagihan = (uid) => {
    navigate(`/kelola-tagihan/${uid}`, {
      state: { returnMenu: "dataSiswa" },
    });
  };

  useEffect(() => {
    const fetchTagihanDanTransaksi = async () => {
      try {
        // 🔹 Ambil semua dokumen tagihan SEKALI SAJA
        const tagihanSnapshot = await getDocs(collection(db, "tagihan"));
        console.log(
          `📘 [READ] Jumlah dokumen tagihan dibaca: ${tagihanSnapshot.size}`
        );

        const tagihanDocs = tagihanSnapshot.docs;
        let totalTagihanTemp = 0;
        let totalUangMasukTemp = 0;
        let monthlyData = {};

        // Simpan transaksi untuk semua tagihan
        const transactionsPromises = tagihanDocs.map(async (tagihanDoc) => {
          const tagihanData = tagihanDoc.data();

          // 💰 Hitung total tagihan & uang masuk
          totalTagihanTemp += tagihanData.nominal || 0;
          totalUangMasukTemp += tagihanData.sudahBayar || 0;

          // 📅 Data bulanan untuk grafik
          const date = tagihanData.tanggalBuat?.toDate();
          if (date) {
            const month = date.toLocaleString("id-ID", { month: "short" });
            if (!monthlyData[month]) {
              monthlyData[month] = { name: month, tagihan: 0, uangMasuk: 0 };
            }
            monthlyData[month].tagihan += tagihanData.nominal || 0;
            monthlyData[month].uangMasuk += tagihanData.sudahBayar || 0;
          }

          // 📜 Ambil subkoleksi riwayat pembayaran
          const riwayatRef = collection(
            db,
            "tagihan",
            tagihanDoc.id,
            "riwayatPembayaran"
          );
          const riwayatSnapshot = await getDocs(riwayatRef);
          console.log(
            `📘 [READ] Jumlah dokumen riwayatPembayaran dibaca untuk tagihan ${tagihanDoc.id}: ${riwayatSnapshot.size}`
          );

          // Format setiap transaksi
          return riwayatSnapshot.docs.map((riwayatDoc) => {
            const rData = riwayatDoc.data();
            const tanggalBayar =
              rData.tanggal instanceof Timestamp
                ? rData.tanggal.toDate()
                : new Date(rData.tanggal);

            return {
              id: riwayatDoc.id,
              nama: rData.siswaNama || "-",
              jenis: tagihanData.jenisTagihan || "-",
              jumlah: rData.nominal || 0,
              metode: rData.metode || "-",
              status: rData.status || "-",
              tanggal: tanggalBayar || null,
              tahunAjaran: tagihanData.tahunAjaran || "-",
            };
          });
        });

        // Tunggu semua transaksi selesai diambil
        const allTransactions = (
          await Promise.all(transactionsPromises)
        ).flat();

        // Urutkan transaksi terbaru
        allTransactions.sort((a, b) => b.tanggal - a.tanggal);

        // ✅ Set semua state
        setRecentTransactions(allTransactions.slice(0, 10));
        setTotalTagihan(totalTagihanTemp);
        setTotalUangMasuk(totalUangMasukTemp);
        setChartData(Object.values(monthlyData));

        console.log("✅ Transaksi terbaru:", allTransactions.slice(0, 10));
      } catch (error) {
        console.error("❌ Gagal fetch data gabungan:", error);
      }
    };

    fetchTagihanDanTransaksi();
  }, []);

  const renderContent = () => {
    switch (activeMenu) {
      case "dashboard":
        return (
          <div style={styles.contentBox}>
            <h2 style={styles.pageTitle}>Dashboard Bendahara </h2>
            <div>
              {/* Stat Cards */}
              <div style={styles.statsGrid}>
                <div style={styles.statCard}>
                  <p style={styles.statLabel}>📦 Total Siswa</p>
                  <h3 style={styles.statNumber}>{siswaList.length}</h3>
                </div>
                <div style={styles.statCard}>
                  <p style={styles.statLabel}>📄 Total Tagihan</p>
                  <h3 style={styles.statNumber}>
                    Rp {totalTagihan.toLocaleString("id-ID")}
                  </h3>
                </div>
                <div style={styles.statCard}>
                  <p style={styles.statLabel}>💰 Total Uang Masuk</p>
                  <h3 style={styles.statNumber}>
                    Rp {totalUangMasuk.toLocaleString("id-ID")}
                  </h3>
                </div>
              </div>
              {/*  Charts Row */}
              <div style={styles.rowGrid}>
                <div style={styles.chartCard}>
                  <h3 style={styles.chartTitle}>Uang Masuk per Bulan</h3>
                  <ResponsiveContainer width="100%" height={100}>
                    <BarChart data={chartData}>
                      <XAxis dataKey="name" stroke="#aaa" /> <RTooltip />
                      <Bar dataKey="uangMasuk" barSize={10}>
                        {chartData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={
                              hoveredBar === index ? "#ebeb57ff" : "#0a15adff"
                            }
                            onMouseEnter={() => setHoveredBar(index)}
                            onMouseLeave={() => setHoveredBar(null)}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div style={styles.pieChartCard}>
                  <PieChartSiswa />
                </div>
              </div>
              <div style={styles.rowGridBawah}>
                <div style={styles.chartCardTransaksi}>
                  <h3 style={styles.chartTitle}>Transaksi Terbaru</h3>
                  <div style={styles.scrollBox}>
                    <table style={styles.table}>
                      <thead>
                        <tr style={styles.tableHeader}>
                          <th style={styles.th}>Nama</th>
                          <th style={styles.th}>Tagihan</th>
                          <th style={styles.th}>Jumlah</th>
                          <th style={styles.th}>Tanggal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentTransactions.slice(0, 20).map((tx) => (
                          <tr key={tx.id} style={styles.tableRow}>
                            <td style={styles.td}>{tx.nama}</td>
                            <td style={styles.td}>{tx.jenis}</td>
                            <td style={styles.td}>
                              Rp {tx.jumlah.toLocaleString()}
                            </td>
                            <td style={styles.td}>
                              {tx.tanggal
                                ? tx.tanggal.toLocaleDateString("id-ID", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  })
                                : "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div style={styles.chartCardTagihan}>
                  <h3 style={styles.chartTitle}>Perkembangan Tagihan</h3>
                  <ResponsiveContainer width="100%" height={170}>
                    <AreaChart data={chartData}>
                      <XAxis dataKey="name" stroke="#aaa" /> <RTooltip />
                      <Area
                        type="monotone"
                        dataKey="tagihan"
                        stroke="#ffffffff"
                        fill="#0a84ff"
                        fillOpacity={0.3}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        );

      case "dataSiswa":
        return (
          <div style={styles.contentBox}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 10,
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <h2 style={{ ...styles.pageTitle }}>Data Siswa</h2>
                <input
                  type="text"
                  placeholder="Cari Nama/NIS"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    ...styles.input,
                    width: 160,
                    height: 22,
                    fontSize: 13,
                  }}
                />
                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value)}
                  style={{
                    ...styles.input,
                    width: 100,
                    height: 32,
                    fontSize: 13,
                    paddingRight: 20,
                  }}
                >
                  <option value="terbaru">Terbaru</option>
                  <option value="terlama">Terlama</option>
                  <option value="akl">AKL</option>
                  <option value="tjkt">TJKT</option>
                  <option value="nis">Urut NIS</option>
                </select>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => setShowEditModal(true)}
                  style={{
                    ...styles.button,
                    ...(hoveredButton === "edit" ? styles.buttonHover : {}),
                  }}
                  onMouseEnter={() => setHoveredButton("edit")}
                  onMouseLeave={() => setHoveredButton(null)}
                >
                  Edit Siswa
                </button>
                <button
                  onClick={openAddChoiceModal}
                  style={{
                    ...styles.button,
                    ...(hoveredButton === "tambah" ? styles.buttonHover : {}),
                  }}
                  onMouseEnter={() => setHoveredButton("tambah")}
                  onMouseLeave={() => setHoveredButton(null)}
                  disabled={loadingTambah}
                >
                  Tambah Siswa
                </button>
              </div>
            </div>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeader}>
                  <th style={styles.th}>NIS</th>
                  <th style={styles.th}>Nama</th>
                  <th style={styles.th}>Kelas</th>
                  <th style={styles.th}>Jurusan</th>
                  <th style={styles.th}>Telp</th>
                  <th style={styles.th}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {getFilteredAndSortedSiswa().map((siswa) => (
                  <tr key={siswa.uid} style={styles.tableRow}>
                    <td style={styles.td}>{siswa.nis}</td>
                    <td style={styles.td}>{siswa.nama}</td>
                    <td style={styles.td}>{siswa.kelas || "-"}</td>
                    <td style={styles.td}>{siswa.jurusan || "-"}</td>
                    <td style={styles.td}>{siswa.telp}</td>
                    <td style={styles.td}>
                      <button
                        style={{
                          ...styles.button,
                          padding: "5px 8px",
                          fontSize: 12,
                          ...(hoveredButton === siswa.uid
                            ? styles.buttonHover
                            : {}),
                        }}
                        onMouseEnter={() => setHoveredButton(siswa.uid)}
                        onMouseLeave={() => setHoveredButton(null)}
                        onClick={() => handleKelolaTagihan(siswa.uid)}
                      >
                        Kelola Tagihan
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {showEditModal && (
              <EditSiswaBox onClose={() => setShowEditModal(false)} />
            )}

            {/* Modal pilihan tambah siswa */}
            {showAddChoiceModal && (
              <div style={styles.modalOverlay} onClick={closeAddChoiceModal}>
                <div
                  style={{ ...styles.modalContent, width: 350 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <h3>Pilih Cara Tambah Siswa</h3>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 15,
                    }}
                  >
                    <button style={styles.button} onClick={handleOpenAddManual}>
                      Tambah Manual
                    </button>
                    <button
                      style={styles.button}
                      onClick={handleOpenImportExcel}
                    >
                      Import Excel
                    </button>
                    <button
                      style={{ ...styles.button, backgroundColor: "#555" }}
                      onClick={closeAddChoiceModal}
                    >
                      Batal
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Modal tambah manual  */}
            {showAddModal && (
              <AddSiswaModal
                open={showAddModal}
                onClose={() => setShowAddModal(false)}
                onSuccess={fetchSiswa}
              />
            )}

            {/* Modal import excel  */}
            {showImportModal && (
              <ImportExcelModal
                open={showImportModal}
                onClose={() => setShowImportModal(false)}
                onSuccess={fetchSiswa}
              />
            )}
          </div>
        );
      case "buatTagihan":
        return <BuatTagihan />;
      case "updateKelas":
        return <UpdateKelas />;

      case "tahunAjaran":
        return <TahunAjaranManage />;
      case "aturKetBiaya":
        return <AturKetBiaya />;
      case "kelolaBeasiswa":
        return <KelolaBeasiswa />;

      case "laporan":
        return <Laporan />;

      default:
        return null;
    }
  };

  return (
    <div style={styles.container}>
      <aside
        style={{
          ...styles.sidebar,
          width: isCollapsed ? "70px" : "230px",
          transition: "width 0.3s ease",
        }}
        onMouseEnter={() => setIsCollapsed(false)}
        onMouseLeave={() => setIsCollapsed(true)}
      >
        {/* Header */}
        <div
          style={{
            ...styles.sidebarHeader,
            justifyContent: isCollapsed ? "center" : "space-between",
          }}
        >
          {!isCollapsed && <h2 style={styles.logo}>ADMIN</h2>}
          <button
            style={styles.toggleBtn}
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            <FaBars />
          </button>
        </div>

        {/* Menu Items */}
        {menuItems.map((item) => (
          <div
            key={item.key}
            style={{ position: "relative" }}
            onMouseEnter={() => setHoveredMenu(item.key)}
            onMouseLeave={() => setHoveredMenu(null)}
          >
            <button
              onClick={() => handleMenuClick(item.key)}
              style={{
                ...(activeMenu === item.key
                  ? styles.activeMenuItem
                  : {
                      ...styles.menuItem,
                      ...(hoveredMenu === item.key ? styles.menuItemHover : {}),
                    }),
                justifyContent: "flex-start",
              }}
            >
              <span
                style={{
                  ...styles.icon,
                  ...(hoveredMenu === item.key ? styles.iconHover : {}),
                }}
              >
                {item.icon}
              </span>
              <span
                style={{
                  opacity: isCollapsed ? 0 : 1,
                  width: isCollapsed ? 0 : "auto",
                  marginLeft: isCollapsed ? 0 : 10,
                  transition: "all 0.3s ease",
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                }}
              >
                {item.label}
              </span>
            </button>

            {/* Tooltip saat collapsed */}
            {isCollapsed && hoveredMenu === item.key && (
              <div style={styles.tooltip}>{item.label}</div>
            )}
          </div>
        ))}

        {/* Logout */}
        <div style={{ marginTop: "auto", position: "relative" }}>
          <button
            onClick={() => setShowLogoutModal(true)}
            style={{
              ...styles.menuItem,
              color: "#ff6666",
              justifyContent: "flex-start",
            }}
            onMouseEnter={() => setHoveredMenu("logout")}
            onMouseLeave={() => setHoveredMenu(null)}
          >
            <span style={styles.icon}>🔓</span>
            <span
              style={{
                opacity: isCollapsed ? 0 : 1,
                width: isCollapsed ? 0 : "auto",
                marginLeft: isCollapsed ? 0 : 10,
                transition: "all 0.3s ease",
                overflow: "hidden",
                whiteSpace: "nowrap",
              }}
            >
              Logout
            </span>
          </button>

          {isCollapsed && hoveredMenu === "logout" && (
            <div style={styles.tooltip}>Logout</div>
          )}
        </div>
      </aside>

      <main style={styles.main}>{renderContent()}</main>
      {showLogoutModal && (
        <div
          style={styles.modalOverlay}
          onClick={() => setShowLogoutModal(false)}
        >
          <div
            style={{ ...styles.modalContent, width: 320 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Apakah Anda yakin ingin logout?</h3>
            <div
              style={{
                display: "flex",
                gap: 20,
                marginTop: 20,
                justifyContent: "center",
              }}
            >
              <button
                style={{
                  ...styles.button,
                  backgroundColor: "#ff3b30",
                  flex: 1,
                }}
                onClick={handleLogout}
              >
                Ya
              </button>
              <button
                style={{ ...styles.button, backgroundColor: "#555", flex: 1 }}
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
  container: {
    display: "flex",
    minHeight: "100vh",
    fontFamily: "Segoe UI, sans-serif",
    height: "100vh",
    overflow: "hidden",
    backgroundColor: "#000000ff",
    color: "#f1f1f1",
  },
  sidebar: {
    width: "230px",
    backgroundColor: "#0C0C0C",
    padding: "20px",
    display: "flex",
    position: "fixed",
    flexDirection: "column",
    left: 0,
    top: 0,
    height: "100vh",
    boxSizing: "border-box",
    zIndex: 1000,
    boxShadow: "4px 0 7px rgba(0,0,0,0.5)",
  },

  sidebarHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20",
    minHeight: "70px",
  },
  toggleBtn: {
    background: "none",
    border: "none",
    color: "#ffffff",
    cursor: "pointer",
    fontSize: 18,
    marginLeft: "auto",
  },
  logo: { fontSize: "20px", fontWeight: "bold", marginBottom: "30px" },
  menuItem: {
    background: "none",
    border: "none",
    color: "#d9d9d9ff",
    padding: "10px 8px",
    borderRadius: "6px",
    cursor: "pointer",
    textAlign: "left",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "8px",
    position: "relative",
    transition: "all 0.25s ease",
  },
  activeMenuItem: {
    backgroundColor: "transparent",
    color: "#0a84ff",
    padding: "10px 8px",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "8px",
    position: "relative",
    transition: "all 0.3s ease",
  },
  icon: { fontSize: "16px", transition: "transform 0.3s ease" },
  tooltip: {
    position: "absolute",
    left: "75px",
    top: "50%",
    transform: "translateY(-50%)",
    backgroundColor: "#333",
    color: "#fff",
    padding: "4px 8px",
    borderRadius: "4px",
    fontSize: "12px",
    whiteSpace: "nowrap",
    zIndex: 1500,
  },
  main: {
    flex: 1,
    height: "100vh",
    overflowY: "auto",
    marginLeft: "70px",
    transition: "margin-left 0.3s ease",
    padding: "15px",
    display: "flex",
    flexDirection: "column",
  },
  rowGrid: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr",
    gap: "20px",
    position: "relative",
    alignItems: "stretch",
  },
  rowGridBawah: {
    display: "grid",
    gridTemplateColumns: "3fr 2fr",
    gap: "20px",
    position: "relative",
    bottom: 89,
    width: "99%",
    alignItems: "stretch",
  },

  scrollBox: {
    maxHeight: "200px",
    overflowY: "auto",

    borderRadius: "6px",
    border: "1px solid #222",
    scrollbarWidth: "thin",
    scrollbarColor: "#555 #111",
    position: "relative",
    bottom: 20,
  },

  chartCard: {
    flex: 1,
    background: "#0C0C0C",
    padding: "15px",
    color: "#fff",
    border: "1px solid #333",
    height: "130px",
    width: "99%",
    position: "relative",
    borderRadius: "10px",
    boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
  },
  chartCardTransaksi: {
    flex: 2,
    // maxHeight: "300px", // ⬅️ batas tinggi box transaksi
    // overflow: "hidden",
    background: "#0C0C0C",
    // height: "200px",
    padding: "15px",
    color: "#fff",
    border: "1px solid #333",
    // height: "150px",
    maxHeight: "230px",
    overflow: "visible",
    width: "99%",
    borderRadius: "10px",
    boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
  },
  chartCardTagihan: {
    flex: 1,
    background: "#0C0C0C",
    // height: "200px",
    padding: "15px",
    color: "#fff",
    border: "1px solid #333",
    height: "230px",
    width: "99%",
    position: "relative",
    left: 10,
    borderRadius: "10px",
    boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
  },
  pieChartCard: {
    flex: 1,
    background: "#0C0C0C",
    // height: "200px",
    padding: "15px",
    color: "#fff",
    border: "1px solid #333",
    height: "230px",
    borderRadius: "10px",
    width: "370px",
    boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
    bottom: 100,
    left: 15,
    position: "relative",
  },
  chartContainer: { display: "flex", gap: "20px", marginTop: "20px" },
  statLabel: {
    fontSize: "14px",
    color: "#bbb",
    marginBottom: "8px",
    position: "relative",
    bottom: 6,
  },
  chartsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: "20px",
  },
  contentBox: {
    backgroundColor: "#0C0C0C",
    borderRadius: "10px",
    padding: "0 25px",
    boxShadow: "0 0 10px rgba(255,255,255,0.05)",
  },
  pageTitle: { fontSize: "22px", marginBottom: "20px" },
  statsGrid: {
    // display: "grid",
    display: "flex",
    // gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "7px",
    marginBottom: "10px",
  },
  statsContainer: { display: "flex", gap: "20px" },
  statCard: {
    width: "200px",
    height: "75px",
    border: "1px solid #333",
    backgroundColor: "#0C0C0C",
    padding: "5px 15px",
    borderRadius: "12px",
    boxShadow: "0 2px 6px rgba(0,0,0,0.5)",
  },
  statNumber: {
    fontSize: "22px",
    fontWeight: "bold",
    position: "relative",
    bottom: 8,
    marginTop: "8px",
    color: "#f0f044ff",
  },
  table: { width: "99%", borderCollapse: "collapse" },
  tableHeader: { backgroundColor: "#3a3a3c", textAlign: "left" },
  th: {
    padding: "12px",
    color: "#fff",
    fontWeight: "bold",
    borderBottom: "1px solid #555",
  },
  tableRow: { borderBottom: "1px solid #444" },
  td: { padding: "10px" },
  button: {
    padding: "8px 12px",
    backgroundColor: "#0a84ff",
    border: "none",
    borderRadius: "4px",
    color: "#fff",
    cursor: "pointer",
    transition: "all 0.2s ease-in-out",
  },
  buttonHover: {
    backgroundColor: "#ebf34fff",
    color: "#222222ff",
    boxShadow: "0 0 6px rgba(28, 85, 255, 0.6)",
    transform: "translateY(-1px)",
  },
  modalOverlay: {
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
  },
  modalContent: {
    backgroundColor: "#222",
    padding: 30,
    borderRadius: 10,
    width: "320px",
    boxShadow: "0 0 15px rgba(10, 132, 255, 0.8)",
    color: "#eee",
  },
  label: { display: "block", marginBottom: 10, fontSize: 14, color: "#ccc" },
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
  contentWrapper: { flex: 1, display: "flex", flexDirection: "column" },
  header: {
    backgroundColor: "#2c2c2e",
    padding: "15px 30px",
    borderBottom: "1px solid #444",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  appName: { fontSize: "20px", fontWeight: "bold", color: "#fff", margin: 0 },
  chartCardWide: {
    gridColumn: "span 2",
    background: "#1e1e1e",
    padding: "20px",
    borderRadius: "12px",
    boxShadow: "0 2px 6px rgba(0,0,0,0.6)",
  },
  chartTitle: {
    // marginBottom: "15px",
    fontSize: "14px",
    fontWeight: "600",
    position: "relative",
    bottom: 15,
    color: "#fff",
  },
  tableWrapper: {
    marginTop: "30px",
    background: "#1e1e1e",
    borderRadius: "12px",
    padding: "20px",
  },
  menuItemHover: {
    background: "linear-gradient(135deg, #2d2d2f, #3a3a3c)",
    color: "#ffffff",
    transform: "translateX(6px) scale(1.03)",
    boxShadow: "2px 3px 6px rgba(0,0,0,0.4)",
  },
  iconHover: { transform: "scale(1.2) rotate(5deg)" },
};
