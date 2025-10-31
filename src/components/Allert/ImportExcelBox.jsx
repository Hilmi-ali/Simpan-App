import React, { useState, useCallback } from "react";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../../firebase";
import * as XLSX from "xlsx";

export default function ImportExcelModal({ open, onClose, onSuccess }) {
  // Semua hook harus dipanggil di awal fungsi, tanpa kondisi
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFile = useCallback((e) => {
    setError("");
    const f = e.target.files[0];
    if (!f) return;
    if (!f.name.match(/\.(xls|xlsx)$/i)) {
      setError("File harus berekstensi .xls atau .xlsx");
      return;
    }
    setFile(f);
  }, []);

  const handleDrop = (e) => {
    e.preventDefault();
    setError("");
    const dt = e.dataTransfer;
    if (!dt.files.length) return;
    const f = dt.files[0];
    if (!f.name.match(/\.(xls|xlsx)$/i)) {
      setError("File harus berekstensi .xls atau .xlsx");
      return;
    }
    setFile(f);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const processFile = async () => {
    if (!file) {
      console.log("⚠️ Tidak ada file dipilih");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          console.log("✅ File dibaca, mulai parsing...");
          const data = new Uint8Array(e.target.result);
          console.log("📂 Data Uint8Array:", data);
          const workbook = XLSX.read(data, { type: "array" });
          console.log("📘 Workbook:", workbook);
          const sheetName = workbook.SheetNames[0];
          console.log("📑 Sheet yang dipakai:", sheetName);
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          console.log("📊 Data JSON hasil parsing:", jsonData);

          // Validasi kolom
          for (const item of jsonData) {
            if (
              !item.nis ||
              !item.nama ||
              !item.kelas ||
              !item.jurusan ||
              !item.angkatan ||
              !item.tahunAjaran
            ) {
              console.error("❌ Baris tidak valid:", item);
              setError(
                "Format salah. Kolom nis, nama, kelas, jurusan, angkatan wajib ada!"
              );
              setLoading(false);
              return;
            }
          }

          // Upload ke Firestore
          for (const item of jsonData) {
            console.log("⬆️ Uploading item:", item);
            await addDoc(collection(db, "students"), {
              nis: item.nis.toString(),
              nama: item.nama,
              kelas: item.kelas?.toString().trim(),
              jurusan: item.jurusan,
              telp: item.telp || "",
              angkatan: item.angkatan ? item.angkatan.toString() : "",
              tahunAjaran: item.tahunAjaran || "2025/2026",
              role: "siswa",
            });
          }
          console.log("🎉 Semua data berhasil diupload ke Firestore!");
          alert("Import berhasil!");
          onSuccess();
          onClose();
        } catch (err) {
          console.error("❌ Error saat memproses:", err);
          setError("Gagal memproses file: " + err.message);
        } finally {
          setLoading(false);
        }
      };

      reader.onerror = () => {
        console.error("❌ Error membaca file:", reader.error);
        setError("Gagal membaca file.");
        setLoading(false);
      };
      console.log("📥 Mulai baca file...");
      reader.readAsArrayBuffer(file); // <-- lebih aman
    } catch (err) {
      console.error("❌ Error luar:", err);
      setError("Gagal memproses file: " + err.message);
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginBottom: 20 }}>Import Data Siswa dari Excel</h3>

        {/* Link download template */}
        <p style={{ marginBottom: 20, fontSize: 14, color: "#aaa" }}>
          <a
            href="/template-import-data.xlsx"
            download
            style={{ color: "#0a84ff", textDecoration: "underline" }}
          >
            Download format Excel (.xlsx)
          </a>
        </p>

        <div
          style={styles.dropZone}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          {file ? (
            <p>{file.name}</p>
          ) : (
            <p>
              Drag & drop file Excel (.xls/.xlsx) di sini atau klik untuk pilih
              file
            </p>
          )}
          <input
            type="file"
            accept=".xls,.xlsx"
            onChange={handleFile}
            style={styles.fileInput}
          />
        </div>

        {error && <p style={{ color: "red" }}>{error}</p>}

        <div
          style={{
            marginTop: 20,
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{ ...styles.button, backgroundColor: "#555" }}
            disabled={loading}
          >
            Batal
          </button>
          <button
            type="button"
            onClick={processFile}
            style={styles.button}
            disabled={!file || loading}
          >
            {loading ? "Memproses..." : "Import"}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
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
    width: "600px",
    maxHeight: "80vh",
    overflowY: "auto",
    boxShadow: "0 0 15px rgba(10, 132, 255, 0.8)",
    color: "#eee",
  },
  dropZone: {
    border: "2px dashed #0a84ff",
    borderRadius: 10,
    padding: 40,
    textAlign: "center",
    color: "#aaa",
    cursor: "pointer",
    position: "relative",
  },
  fileInput: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    opacity: 0,
    cursor: "pointer",
  },
  button: {
    padding: "8px 14px",
    backgroundColor: "#0a84ff",
    border: "none",
    borderRadius: "5px",
    color: "#fff",
    cursor: "pointer",
  },
};
