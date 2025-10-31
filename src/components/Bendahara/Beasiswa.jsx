import React, { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { db } from "../../firebase";
import { MdCheckCircle, MdError } from "react-icons/md";
import Snackbar from "@mui/material/Snackbar";
import MuiAlert from "@mui/material/Alert";

const Alert = React.forwardRef(function Alert(props, ref) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

export default function KelolaBeasiswa() {
  const [siswaList, setSiswaList] = useState([]);
  const [beasiswaList, setBeasiswaList] = useState([]);
  const [loading, setLoading] = useState(false);

  const [tahunAjaran, setTahunAjaran] = useState("");
  const [availableYears, setAvailableYears] = useState([]);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [excelFile, setExcelFile] = useState(null);

  // Search state
  const [search, setSearch] = useState("");

  //  state alert
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertType, setAlertType] = useState("success");
  const [alertMessage, setAlertMessage] = useState("");

  const [kategoriBeasiswa, setKategoriBeasiswa] = useState("sekolah");
  const [tahunInput, setTahunInput] = useState("");

  const showAlert = (message, type = "success") => {
    setAlertMessage(message);
    setAlertType(type);
    setAlertOpen(true);
  };

  const handleCloseAlert = (event, reason) => {
    if (reason === "clickaway") return;
    setAlertOpen(false);
  };

  //  Ambil daftar siswa
  useEffect(() => {
    const fetchSiswa = async () => {
      const q = query(collection(db, "students"), where("role", "==", "siswa"));
      const snap = await getDocs(q);
      const data = snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
      setSiswaList(data);
    };
    fetchSiswa();
  }, []);

  //  Ambil daftar beasiswa
  useEffect(() => {
    const fetchBeasiswa = async () => {
      const q = query(collection(db, "beasiswa"), orderBy("dibuat", "desc"));
      const snap = await getDocs(q);
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setBeasiswaList(data);

      // Ambil tahun ajaran unik
      const years = [...new Set(data.map((b) => b.tahunAjaran))].filter(
        Boolean
      );
      setAvailableYears(years);
    };
    fetchBeasiswa();
  }, []);

  //  memilih file
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) setExcelFile(file);
  };

  const handleFileUpload = async () => {
    if (!excelFile) {
      showAlert("Harap pilih file Excel terlebih dahulu.");
      return;
    }

    setLoading(true);
    try {
      console.log("📂 Mulai proses upload file:", excelFile.name);

      const data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (evt) => {
          try {
            const bstr = evt.target.result;
            const wb = XLSX.read(bstr, { type: "binary" });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const jsonData = XLSX.utils.sheet_to_json(ws);
            resolve(jsonData);
          } catch (err) {
            reject(err);
          }
        };
        reader.onerror = reject;
        reader.readAsBinaryString(excelFile);
      });

      console.log("📑 Jumlah baris Excel:", data.length);
      console.log("📑 Contoh data Excel baris pertama:", data[0]);

      let totalInserted = 0;

      for (const row of data) {
        const nis = row.nis ? String(row.nis).trim() : null;
        const jenisBeasiswa = row.jenisBeasiswa || "BOP";

        // Ambil dari input kategori (luar / sekolah)
        let nominal = 0;
        let persentase = "";

        if (kategoriBeasiswa === "luar") {
          persentase = row.persentase ? String(row.persentase).trim() : "";
          // Jika kamu ingin simpan juga nominal perkiraan, bisa ubah di sini
          // nominal = hitung dari total SPP misalnya
        } else {
          nominal = Number(row.nominal) || 0;
        }

        if (!nis) {
          console.warn("⚠️ Baris dilewati, NIS kosong:", row);
          continue;
        }

        const siswa = siswaList.find((s) => String(s.nis).trim() === nis);
        if (!siswa) {
          console.warn(`⚠️ Siswa dengan NIS ${nis} tidak ditemukan.`);
          continue;
        }

        try {
          const beasiswaData = {
            studentUID: siswa.uid,
            namaSiswa: siswa.nama,
            nis: siswa.nis,
            kelas: siswa.kelas || "",
            jurusan: siswa.jurusan || "",
            jenisBeasiswa,
            kategori: kategoriBeasiswa,
            tahunAjaran: tahunInput || "",
            status: "belum_diklaim",
            dibuat: new Date(),
          };

          if (kategoriBeasiswa === "luar") {
            beasiswaData.persentase = persentase;
          } else {
            beasiswaData.nominal = nominal;
          }

          const docRef = await addDoc(collection(db, "beasiswa"), beasiswaData);
          console.log(`💾 Disimpan Firestore (ID: ${docRef.id})`);
          totalInserted++;
        } catch (error) {
          console.error(`❌ Gagal simpan NIS ${nis}:`, error);
        }
      }

      console.log(`✅ Total beasiswa tersimpan: ${totalInserted}`);
      showAlert("✅ Import selesai!");

      // Refresh list beasiswa
      const q = query(collection(db, "beasiswa"), orderBy("dibuat", "desc"));
      const snap = await getDocs(q);
      setBeasiswaList(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error("🔥 Error import:", error);
      showAlert("Gagal import file Excel.");
    } finally {
      setLoading(false);
    }
  };

  //  Filter by tahun ajaran + search
  const filteredBeasiswa = beasiswaList.filter((b) => {
    const matchesYear = tahunAjaran ? b.tahunAjaran === tahunAjaran : true;
    const q = search.toLowerCase();
    const matchesSearch =
      b.nis?.toString().includes(q) ||
      b.namaSiswa?.toLowerCase().includes(q) ||
      b.kelas?.toLowerCase().includes(q) ||
      b.jurusan?.toLowerCase().includes(q) ||
      b.jenisBeasiswa?.toLowerCase().includes(q);
    return matchesYear && matchesSearch;
  });

  // Statistik ringkasan
  const totalBeasiswa = filteredBeasiswa.length;
  const totalPending = filteredBeasiswa.filter(
    (b) => b.status === "belum_diklaim"
  ).length;
  const totalClaimed = filteredBeasiswa.filter(
    (b) => b.status === "sudah_diklaim"
  ).length;
  const totalNominal = filteredBeasiswa.reduce(
    (sum, b) => sum + (b.nominal || 0),
    0
  );

  return (
    <div
      style={{
        padding: "0px 24px",
        background: "#121212",
        minHeight: "100vh",
        color: "#fff",
        borderRadius: 14,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h2 style={{ margin: 0 }}>📑 Kelola Beasiswa</h2>
          <select
            value={tahunAjaran}
            onChange={(e) => setTahunAjaran(e.target.value)}
            style={{
              padding: 8,
              borderRadius: 8,
              background: "#1e1e1e",
              border: "1px solid #555",
              color: "#fff",
            }}
          >
            <option value="">Semua Tahun</option>
            {availableYears.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <input
            type="text"
            placeholder="Cari NIS / Nama / Kelas / Jurusan / Jenis"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid #555",
              background: "#1e1e1e",
              color: "#fff",
              minWidth: 250,
            }}
          />
          <button
            onClick={() => setShowModal(true)}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              background: "#0a84ff",
              color: "#fff",
              fontWeight: "bold",
              border: "none",
              cursor: "pointer",
            }}
          >
            + Tambah Beasiswa
          </button>
        </div>
      </div>

      {/* Modal Input Excel */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 999,
          }}
        >
          <div
            style={{
              background: "#1e1e1e",
              padding: 24,
              borderRadius: 12,
              width: "400px",
              textAlign: "center",
            }}
          >
            <h3 style={{ marginBottom: 16 }}>📂 Import Beasiswa Excel</h3>
            <p
              style={{
                fontSize: "0.9rem",
                marginBottom: 12,
                textAlign: "left",
              }}
            >
              <a
                href="/template-beasiswa.xlsx"
                download
                style={{ color: "#0a84ff", textDecoration: "underline" }}
              >
                Download Template
              </a>
            </p>

            <div
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files[0];
                if (file) setExcelFile(file);
              }}
              onDragOver={(e) => e.preventDefault()}
              style={{
                border: "2px dashed #555",
                borderRadius: 12,
                padding: 30,
                marginBottom: 20,
              }}
            >
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                style={{ display: "none" }}
                id="fileInput"
              />
              <label
                htmlFor="fileInput"
                style={{ cursor: "pointer", color: "#CEFE06" }}
              >
                {excelFile
                  ? `📑 ${excelFile.name}`
                  : "Drag & Drop / Pilih File Excel"}
              </label>
            </div>
            <div style={{ marginBottom: 12, textAlign: "left" }}>
              <label>Kategori Beasiswa:</label>
              <select
                value={kategoriBeasiswa}
                onChange={(e) => setKategoriBeasiswa(e.target.value)}
                style={{
                  width: "100%",
                  padding: 8,
                  borderRadius: 8,
                  border: "1px solid #555",
                  background: "#1e1e1e",
                  color: "#fff",
                }}
              >
                <option value="sekolah">Luar</option>
                <option value="luar">Sekolah</option>
              </select>
            </div>

            <div style={{ marginBottom: 12, textAlign: "left" }}>
              <label>Tahun Ajaran:</label>
              <input
                type="text"
                placeholder="contoh 2025/2026"
                value={tahunInput}
                onChange={(e) => setTahunInput(e.target.value)}
                style={{
                  width: "95%",
                  padding: 8,
                  borderRadius: 8,
                  border: "1px solid #555",
                  background: "#1e1e1e",
                  color: "#fff",
                }}
              />
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <button
                onClick={() => setShowModal(false)}
                style={{
                  flex: 1,
                  padding: "8px",
                  borderRadius: 8,
                  background: "#444",
                  color: "#fff",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Batal
              </button>
              <button
                onClick={handleFileUpload}
                disabled={loading}
                style={{
                  flex: 1,
                  padding: "8px",
                  borderRadius: 8,
                  background: "#0a84ff",
                  color: "#fff",
                  fontWeight: "bold",
                  border: "none",
                  cursor: "pointer",
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Statistik */}
      <div
        style={{
          display: "flex",
          gap: 12,
          marginBottom: 24,
          flexWrap: "wrap",
        }}
      >
        {[
          { title: "Jumlah", value: totalBeasiswa, color: "#4FC3F7" },
          { title: "Belum Diklaim", value: totalPending, color: "#FFB74D" },
          { title: "Diklaim", value: totalClaimed, color: "#81C784" },
          {
            title: "Nominal (Total)",
            value: "Rp " + totalNominal.toLocaleString(),
            color: "#CEFE06",
          },
        ].map((box, i) => (
          <div
            key={i}
            style={{
              flex: "1 1 200px",
              background: "#1f1f1f",
              padding: 16,
              borderRadius: 12,
              textAlign: "center",
            }}
          >
            <h4 style={{ margin: 0 }}>{box.title}</h4>
            <h2 style={{ color: box.color, margin: "8px 0" }}>{box.value}</h2>
          </div>
        ))}
      </div>

      {/* Tabel */}
      <div
        style={{
          overflowX: "auto",
          background: "#1e1e1e",
          borderRadius: 12,
          padding: 16,
        }}
      >
        {loading ? (
          <p>Sedang memproses...</p>
        ) : filteredBeasiswa.length === 0 ? (
          <p style={{ color: "#aaa" }}>Belum ada beasiswa.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#2c2c2c" }}>
                <th style={{ padding: 12, textAlign: "left" }}>NIS</th>
                <th style={{ padding: 12, textAlign: "left" }}>Nama</th>
                <th style={{ padding: 12, textAlign: "left" }}>Kelas</th>
                <th style={{ padding: 12, textAlign: "left" }}>Jurusan</th>
                <th style={{ padding: 12, textAlign: "left" }}>Jenis</th>
                <th style={{ padding: 12, textAlign: "left", width: 150 }}>
                  Nominal/Persen
                </th>
                <th style={{ padding: 12, textAlign: "left" }}>Status</th>
                <th style={{ padding: 12, textAlign: "left" }}>Tahun Ajaran</th>
              </tr>
            </thead>
            <tbody>
              {filteredBeasiswa.map((b) => (
                <tr key={b.id} style={{ borderBottom: "1px solid #333" }}>
                  <td style={{ padding: 12 }}>{b.nis}</td>
                  <td style={{ padding: 12 }}>{b.namaSiswa}</td>
                  <td style={{ padding: 12 }}>{b.kelas}</td>
                  <td style={{ padding: 12 }}>{b.jurusan}</td>
                  <td style={{ padding: 12 }}>{b.jenisBeasiswa}</td>
                  <td style={{ padding: 12 }}>
                    {b.kategori === "luar"
                      ? `${(parseFloat(b.persentase || 0) * 100).toFixed(0)}%`
                      : `Rp ${b.nominal?.toLocaleString() || 0}`}
                  </td>

                  <td style={{ padding: 12 }}>
                    {b.status === "sudah_diklaim" ? (
                      <span style={{ color: "#22b427ff" }}>Sukses</span>
                    ) : (
                      <span style={{ color: "#0a84ff" }}>Belum</span>
                    )}
                  </td>
                  <td style={{ padding: 12 }}>{b.tahunAjaran || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
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
