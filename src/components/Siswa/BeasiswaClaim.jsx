import React, { useEffect, useState } from "react";
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../firebase";
import Snackbar from "@mui/material/Snackbar";
import MuiAlert from "@mui/material/Alert";

const Alert = React.forwardRef(function Alert(props, ref) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

export default function BeasiswaClaim({ studentUID }) {
  const [beasiswaList, setBeasiswaList] = useState([]);
  const [loading, setLoading] = useState(true);
  // 🔔 state alert
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertType, setAlertType] = useState("success"); // success | error | warning | info
  const [alertMessage, setAlertMessage] = useState("");

  const showAlert = (message, type = "success") => {
    setAlertMessage(message);
    setAlertType(type);
    setAlertOpen(true);
  };

  const handleCloseAlert = (event, reason) => {
    if (reason === "clickaway") return;
    setAlertOpen(false);
  };

  // 🔄 Fetch semua beasiswa untuk siswa ini
  useEffect(() => {
    const fetchBeasiswa = async () => {
      if (!studentUID) {
        console.warn("⚠ studentUID kosong, skip fetch beasiswa");
        setLoading(false);
        return;
      }

      try {
        const q = query(
          collection(db, "beasiswa"),
          where("studentUID", "==", studentUID)
        );
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          setBeasiswaList([]);
        } else {
          const data = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setBeasiswaList(data);
        }
      } catch (error) {
        console.error("🔥 Gagal fetch beasiswa:", error);
        showAlert("Gagal memuat data beasiswa", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchBeasiswa();
  }, [studentUID]);

  const handleKlaim = async (beasiswa) => {
    try {
      if (beasiswa.status === "sudah_diklaim") return;

      // 1️⃣ Update status beasiswa jadi sudah_diklaim
      await updateDoc(doc(db, "beasiswa", beasiswa.id), {
        status: "sudah_diklaim",
      });

      // 5️⃣ Update UI
      setBeasiswaList((prev) =>
        prev.map((b) =>
          b.id === beasiswa.id ? { ...b, status: "sudah_diklaim" } : b
        )
      );

      // 💡 tampilkan pesan berbeda tergantung kategori
      if (beasiswa.kategori === "luar") {
        showAlert(
          `Beasiswa ${beasiswa.jenisBeasiswa} berhasil diklaim! (${beasiswa.persentase} dari total biaya).`,
          "success"
        );
      } else {
        const nominal = beasiswa.nominal ?? 0;
        showAlert(
          `Beasiswa ${
            beasiswa.jenisBeasiswa
          } berhasil diklaim! Total Rp ${nominal.toLocaleString()} dialokasikan.`,
          "success"
        );
      }
    } catch (error) {
      console.error("🔥 Gagal klaim beasiswa:", error);
      showAlert("Terjadi kesalahan saat klaim beasiswa.");
    }
  };

  return (
    <div className="p-4">
      <h2 style={{ fontSize: 16, fontWeight: "600" }}>Beasiswa</h2>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : beasiswaList.length === 0 ? (
        <p
          className="text-gray-600 text-sm text-center bg-white rounded-lg p-4 shadow"
          style={{ fontSize: 14 }}
        >
          Tidak ada Beasiswa
        </p>
      ) : (
        <div className="space-y-4">
          {beasiswaList.map((b) => (
            <div
              key={b.id}
              style={{
                background:
                  "linear-gradient(145deg, rgba(30,30,30,0.95), rgba(20,20,20,0.9))",
                border: "1px solid rgba(206,254,6,0.4)",
                borderRadius: "16px",
                padding: "16px 20px",
                marginBottom: 10,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                boxShadow:
                  b.status === "sudah_diklaim"
                    ? "0 0 12px rgba(255,255,255,0.05)"
                    : "0 0 16px rgba(206,254,6,0.15)",
                opacity: b.status === "sudah_diklaim" ? 0.75 : 1,
                transition: "all 0.25s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow =
                  "0 0 22px rgba(206,254,6,0.25), inset 0 0 8px rgba(255,255,255,0.05)";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow =
                  b.status === "sudah_diklaim"
                    ? "0 0 12px rgba(255,255,255,0.05)"
                    : "0 0 16px rgba(206,254,6,0.15)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              {/* Bagian kiri */}
              <div style={{ flex: 1 }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#CEFE06",
                    letterSpacing: 0.3,
                  }}
                >
                  {b.jenisBeasiswa}
                </p>
                <p
                  style={{
                    margin: "6px 0 4px",
                    fontWeight: "bold",
                    fontSize: 13,
                    color: "#fff",
                  }}
                >
                  {b.kategori === "luar"
                    ? `${(parseFloat(b.persentase) * 100).toFixed(
                        0
                      )}% dari total biaya`
                    : `Rp ${(b.nominal ?? 0).toLocaleString()}`}
                </p>
              </div>

              {/* Bagian kanan - tombol */}
              {b.status === "belum_diklaim" ? (
                <button
                  onClick={() => handleKlaim(b)}
                  style={{
                    background:
                      "linear-gradient(90deg, #CEFE06 0%, #e9ff78 100%)",
                    color: "#000",
                    padding: "8px 16px",
                    fontWeight: "bold",
                    borderRadius: "8px",
                    border: "none",
                    cursor: "pointer",
                    transition: "0.2s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                >
                  Klaim
                </button>
              ) : (
                <button
                  disabled
                  style={{
                    backgroundColor: "#333",
                    color: "#aaa",
                    padding: "8px 16px",
                    fontWeight: "bold",
                    borderRadius: "8px",
                    border: "1px solid rgba(255,255,255,0.1)",
                    cursor: "not-allowed",
                  }}
                >
                  Sukses
                </button>
              )}
            </div>
          ))}
        </div>
      )}
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
