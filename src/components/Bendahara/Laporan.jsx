import React, { useEffect, useState } from "react";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "../../firebase";
import PieChartRAB from "../utils/PieChartRAB";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip } from "recharts";
import { color } from "framer-motion";

export default function Laporan() {
  const [tahunList, setTahunList] = useState([]);
  const [selectedTahun, setSelectedTahun] = useState("");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const [studentStats, setStudentStats] = useState({
    total: 0,
    tahunIni: 0,
    tjkt: 0,
    akl: 0,
  });

  const jenisList = [
    "SPP",
    "Uang Gedung",
    "Uang Praktek TJKT",
    "Uang Praktek AKL",
    "OSIS & Pramuka",
  ];

  useEffect(() => {
    const fetchTahunAjaran = async () => {
      try {
        const q = query(
          collection(db, "tahunAjaran"),
          orderBy("createdAt", "desc")
        );
        const snapshot = await getDocs(q);
        const list = snapshot.docs.map((doc) => doc.data().tahun);
        console.log("Daftar tahun:", list);
        setTahunList(list);
        if (list.length > 0) setSelectedTahun(list[0]);
      } catch (err) {
        console.error("Gagal memuat tahun ajaran:", err);
      }
    };
    fetchTahunAjaran();
  }, []);

  // Ambil data siswa dan rekap tagihan
  useEffect(() => {
    if (!selectedTahun) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const tempData = {};
        jenisList.forEach((j) => (tempData[j] = { tagihan: 0, uangMasuk: 0 }));

        // 🔹 Ambil semua siswa
        const studentsSnap = await getDocs(collection(db, "students"));
        let total = 0;
        let tahunIni = 0;
        let tjkt = 0;
        let akl = 0;

        const studentMap = {};
        studentsSnap.forEach((s) => {
          const data = s.data();
          total++;
          // hanya siswa aktif di tahun ajaran terpilih
          const aktif =
            data.tahunAjaran === selectedTahun &&
            data.kelas?.toUpperCase() !== "LULUS";

          if (aktif) {
            tahunIni++;
            if (data.jurusan?.toUpperCase().includes("TJKT")) tjkt++;
            if (data.jurusan?.toUpperCase().includes("AKL")) akl++;
          }

          studentMap[s.id] = data.jurusan;
        });

        setStudentStats({ total, tahunIni, tjkt, akl });

        // 🔹 Ambil tagihan tahun ajaran aktif
        const q = query(
          collection(db, "tagihan"),
          where("tahunAjaran", "==", selectedTahun)
        );
        const snapshot = await getDocs(q);

        snapshot.forEach((doc) => {
          const d = doc.data();
          const jenis = (d.jenisTagihan || "").toLowerCase();
          const nominal = Number(d.nominal || 0);
          const sudahBayar = Number(d.sudahBayar || 0);
          const studentUID = d.studentUID;
          const jurusan = studentMap[studentUID] || "";

          let key = "SPP";
          if (jenis.includes("gedung")) key = "Uang Gedung";
          else if (jenis.includes("osis") || jenis.includes("pramuka"))
            key = "OSIS & Pramuka";
          else if (jenis.includes("Praktek") || jenis.includes("praktek")) {
            if (jurusan.toUpperCase().includes("TJKT"))
              key = "Uang Praktek TJKT";
            else if (jurusan.toUpperCase().includes("AKL"))
              key = "Uang Praktek AKL";
          }

          if (!tempData[key]) tempData[key] = { tagihan: 0, uangMasuk: 0 };
          tempData[key].tagihan += nominal;
          tempData[key].uangMasuk += sudahBayar;
        });

        const arr = Object.keys(tempData).map((k) => ({
          name: k,
          tagihan: tempData[k].tagihan,
          uangMasuk: tempData[k].uangMasuk,
        }));

        setData(arr);
      } catch (err) {
        console.error("Gagal mengambil data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedTahun]);

  const totalTagihan = data.reduce((a, b) => a + b.tagihan, 0);
  const totalMasuk = data.reduce((a, b) => a + b.uangMasuk, 0);
  const totalBelumBayar = totalTagihan - totalMasuk;
  const percentage =
    totalTagihan > 0 ? ((totalMasuk / totalTagihan) * 100).toFixed(1) : 0;

  const handleExportExcel = () => {
    const exportData = data.map((row) => ({
      "Jenis Tagihan": row.name,
      "Total Tagihan (Rp)": row.tagihan,
      "Uang Masuk (Rp)": row.uangMasuk,
    }));

    exportData.push({
      "Jenis Tagihan": "TOTAL",
      "Total Tagihan (Rp)": totalTagihan,
      "Uang Masuk (Rp)": totalMasuk,
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();

    // 🧩 nama sheet aman dari karakter terlarang
    const safeSheetName = `Laporan_${selectedTahun.replace(
      /[\\/:*?[\]]/g,
      "-"
    )}`;
    XLSX.utils.book_append_sheet(wb, ws, safeSheetName);

    const fileName = `Laporan_RAB_${selectedTahun.replace(
      /[\\/:*?[\]]/g,
      "-"
    )}.xlsx`;
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([wbout], { type: "application/octet-stream" }), fileName);
  };

  return (
    <div style={styles.container}>
      <div style={styles.headerRow}>
        <h2 style={styles.pageTitle}>
          Laporan RAB Tahun Ajaran {selectedTahun}{" "}
          <span style={styles.fuzzyText}>(Dalam Pengembangan)</span>
        </h2>
        <button onClick={handleExportExcel} style={styles.downloadBtn}>
          Download Excel
        </button>
      </div>

      {/* Filter Tahun */}
      <div style={styles.filterBox}>
        <label style={styles.label}>Pilih Tahun Ajaran:</label>
        <select
          value={selectedTahun}
          onChange={(e) => setSelectedTahun(e.target.value)}
          style={styles.select}
        >
          {tahunList.map((t, i) => (
            <option key={i} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
      {/* Cards jumlah siswa */}
      <div style={styles.cardsRow}>
        <div style={{ ...styles.card, background: "#141414" }}>
          <p style={styles.cardLabel}>Total Siswa</p>
          <h3 style={{ ...styles.cardValue, color: "#00E676" }}>
            {studentStats.total}
          </h3>
        </div>
        <div style={{ ...styles.card, background: "#131b13ff" }}>
          <p style={styles.cardLabel}>Siswa Tahun Ini</p>
          <h3 style={{ ...styles.cardValue, color: "#E3E70A" }}>
            {studentStats.tahunIni}
          </h3>
        </div>
        <div style={{ ...styles.card, background: "#101820" }}>
          <p style={styles.cardLabel}>Siswa TJKT (Tahun Ini)</p>
          <h3 style={{ ...styles.cardValue, color: "#03A9F4" }}>
            {studentStats.tjkt}
          </h3>
        </div>
        <div style={{ ...styles.card, background: "#1F1020" }}>
          <p style={styles.cardLabel}>Siswa AKL (Tahun Ini)</p>
          <h3 style={{ ...styles.cardValue, color: "#FF4081" }}>
            {studentStats.akl}
          </h3>
        </div>
      </div>
      {/* Grafik */}
      <div style={styles.desc}>
        <div style={styles.chartBox}>
          <h4 style={styles.sectionTitle}>Grafik Tagihan dan Uang Masuk</h4>
          {loading ? (
            <p>Memuat grafik...</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data}>
                <XAxis dataKey="name" stroke="#bbb" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1b1b1b",
                    border: "1px solid #333",
                  }}
                  formatter={(value) =>
                    `Rp ${Number(value).toLocaleString("id-ID")}`
                  }
                />
                <Bar dataKey="tagihan" fill="#e3e70aff" radius={[3, 3, 0, 0]} />
                <Bar dataKey="uangMasuk" fill="#00E676" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        {/* Ringkasan */}
        <div style={styles.cards}>
          <div style={{ ...styles.card, background: "#08070eff" }}>
            <p style={styles.cardLabel}>Total Tagihan</p>
            <h3 style={styles.cardValue}>
              Rp {totalTagihan.toLocaleString("id-ID")}
            </h3>
          </div>
          <div style={{ ...styles.card, background: "#091309ff" }}>
            <p style={styles.cardLabel}>Total Uang Masuk</p>
            <h3 style={{ ...styles.cardValue, color: "#00E676" }}>
              Rp {totalMasuk.toLocaleString("id-ID")}{" "}
              <span style={{ color: "#aaa", fontSize: "12px" }}>
                ({percentage}%)
              </span>
            </h3>
          </div>
          <div style={{ ...styles.card, background: "#130808ff" }}>
            <p style={styles.cardLabel}> Belum Dibayar</p>
            <h3 style={{ ...styles.cardValue, color: "#FF5252" }}>
              Rp {totalBelumBayar.toLocaleString("id-ID")}
            </h3>
          </div>
        </div>
      </div>

      {/* Tabel Rekap */}
      <div style={{ display: "flex", gap: 20 }}>
        <div style={styles.tableBox}>
          <h4 style={styles.sectionTitle}>Rekap Data</h4>
          {loading ? (
            <p>Memuat tabel...</p>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Jenis Tagihan</th>
                  <th style={styles.th}>Total Tagihan</th>
                  <th style={styles.th}>Uang Masuk</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <tr key={row.name}>
                    <td style={styles.td}>{row.name}</td>
                    <td style={styles.td}>
                      Rp {row.tagihan.toLocaleString("id-ID")}
                    </td>
                    <td style={styles.td}>
                      Rp {row.uangMasuk.toLocaleString("id-ID")}
                    </td>
                  </tr>
                ))}
                {/* Baris total */}
                <tr style={{ backgroundColor: "#111" }}>
                  <td style={{ ...styles.td, fontWeight: "bold" }}>TOTAL</td>
                  <td style={{ ...styles.td, fontWeight: "bold" }}>
                    Rp {totalTagihan.toLocaleString("id-ID")}
                  </td>
                  <td
                    style={{
                      ...styles.td,
                      fontWeight: "bold",
                      color: "#00E676",
                    }}
                  >
                    Rp {totalMasuk.toLocaleString("id-ID")}
                  </td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
        <div style={{ flex: 2 }}>
          <PieChartRAB selectedTahun={selectedTahun} />
        </div>
      </div>
      <style>
        {`
@keyframes fuzzyPulse {
  0% {
    filter: blur(1px);
    text-shadow: 
      0 0 0px #ccc,
      0 0 0px #999,
      0 0 0px #aaa;
  }
  10% {
    filter: blur(1px);
    text-shadow: 
      0 0 4px #bbb,
      0 0 8px #ccc,
      0 0 12px #ddd;
  }
  40% {
    filter: blur(1px);
    text-shadow: 
      0 0 2px #ccc,
      0 0 3px #999,
      0 0 5px #aaa;
  }
}
`}
      </style>
    </div>
  );
}

// ==================== CSS STYLES ====================
const styles = {
  fuzzyText: {
    display: "inline-block",
    color: "#b7b7b7",
    fontWeight: "bold",
    marginLeft: "6px",
    animation: "fuzzyPulse 2s ease-in-out infinite",
    filter: "blur(1px)",
    textShadow: "0 0 2px #ccc, 0 0 4px #999",
  },

  container: {
    background: "linear-gradient(145deg, #0C0C0C, #181818)",
    color: "#fff",
    borderRadius: "16px",
    padding: "0px 20px",
    border: "1px solid #222",
    boxShadow: "0 0 25px rgba(124,77,255,0.1)",
  },
  pageTitle: { fontSize: "20px", fontWeight: "bold", marginBottom: "16px" },
  filterBox: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "16px",
  },
  label: { color: "#bbb", fontSize: "14px" },
  select: {
    background: "#111",
    color: "#fff",
    border: "1px solid #333",
    padding: "4px 8px",
    borderRadius: "6px",
    fontSize: "13px",
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px",
  },
  downloadBtn: {
    background: "#003d8dff",
    color: "#ffffffff",
    border: "none",
    marginRight: 10,
    height: "32px",
    borderRadius: "8px",
    padding: "6px 12px",
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: "13px",
    transition: "0.2s",
  },

  cardsRow: {
    display: "flex",
    gap: 70,
    flexWrap: "wrap",
    // justifyContent: "space-between",
    marginBottom: "15px",
  },
  cards: {
    flex: 1,
    flexWrap: "wrap",

    marginBottom: "20px",
    display: "flex",
    gap: 10,
    justifyContent: "space-between",
  },
  card: {
    minWidth: "160px",
    background: "linear-gradient(160deg, #151515, #1f1f1f)",
    border: "1px solid #333",
    borderRadius: "10px",
    padding: "10px",
  },
  cardLabel: { color: "#bbb", fontSize: "12px" },
  cardValue: { fontSize: "16px", fontWeight: "bold" },
  desc: {
    display: "flex",
    gap: 10,
  },
  chartBox: {
    flex: 4,
    background: "linear-gradient(160deg, #121212, #191919)",
    border: "1px solid #333",
    borderRadius: "10px",
    padding: "10px",
    marginBottom: "20px",
  },
  tableBox: {
    flex: 3,
    background: "linear-gradient(160deg, #121212, #1a1a1a)",
    border: "1px solid #333",
    borderRadius: "10px",
    padding: "10px",
  },
  sectionTitle: { fontSize: "14px", fontWeight: "bold", marginBottom: "8px" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "12px" },
  th: {
    textAlign: "left",
    padding: "6px",
    borderBottom: "1px solid #333",
    color: "#aaa",
  },
  td: { padding: "6px", borderBottom: "1px solid #222" },
};
