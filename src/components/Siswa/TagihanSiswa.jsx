import React, { useState, useEffect, useRef } from "react";
import {
  collection,
  onSnapshot,
  addDoc,
  query,
  where,
  updateDoc,
  doc,
  getDocs,
  orderBy as orderFirestore,
} from "firebase/firestore";
import { db } from "../../firebase";
import { useNavigate } from "react-router-dom";

export default function TagihanSiswa({ userData, formatRupiah }) {
  const navigate = useNavigate();

  const [localTagihanList, setLocalTagihanList] = useState([]);
  const [selectedTagihan, setSelectedTagihan] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [nominalBayar, setNominalBayar] = useState("");
  const [pendingList, setPendingList] = useState([]);
  const [selectedTahunAjaran, setSelectedTahunAjaran] = useState("");

  // State untuk custom alert modern
  const [alertMessage, setAlertMessage] = useState("");
  const [showAlertBox, setShowAlertBox] = useState(false);

  const beasiswaAppliedRef = useRef(false);

  // Ambil session dari sessionStorage
  const sessionUserData = JSON.parse(
    sessionStorage.getItem("studentSession") || "{}"
  );
  const uidSiswa = sessionUserData.id;

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Validasi login
  useEffect(() => {
    if (!uidSiswa) {
      showAlert("Silakan login terlebih dahulu.");
      navigate("/");
    }
  }, [uidSiswa, navigate]);

  const showAlert = (msg) => {
    setAlertMessage(msg);
    setShowAlertBox(true);

    // Tutup otomatis setelah 3 detik
    setTimeout(() => {
      setShowAlertBox(false);
    }, 3000);
  };

  // Ambil tagihan realtime
  useEffect(() => {
    if (!uidSiswa) return;

    const q = query(
      collection(db, "tagihan"),
      where("studentUID", "==", uidSiswa)
    );

    const unsubTagihan = onSnapshot(
      q,
      async (snapshot) => {
        const updatedList = snapshot.docs.map((doc) => {
          const data = doc.data();
          let tanggalStr = "-";
          if (data.tanggalBuat?.toDate) {
            tanggalStr = data.tanggalBuat.toDate().toLocaleDateString("id-ID");
          } else if (data.tanggalBuat) {
            tanggalStr = new Date(data.tanggalBuat).toLocaleDateString("id-ID");
          }
          return {
            id: doc.id,
            ...data,
            sisaTagihan:
              data.sisaTagihan !== undefined
                ? data.sisaTagihan
                : (data.nominal ?? 0) - (data.sudahBayar ?? 0),
            tanggal: tanggalStr,
          };
        });

        setLocalTagihanList(updatedList);

        if (updatedList.length > 0 && !selectedTahunAjaran) {
          setSelectedTahunAjaran(updatedList[0].tahunAjaran);
        }

        if (!beasiswaAppliedRef.current && updatedList.length > 0) {
          beasiswaAppliedRef.current = true;
          console.log(
            "⚙️ applyBeasiswaAutomatis() dijalankan sekali saat load awal"
          );
          await applyBeasiswaAutomatis(updatedList);
        }
      },
      (err) => console.error("Error fetching tagihan:", err)
    );

    return () => unsubTagihan();
  }, [uidSiswa]);

  const applyBeasiswaAutomatis = async (tagihanList) => {
    try {
      console.log("🔍 Mengecek beasiswa yang tersedia untuk siswa:", uidSiswa);
      const qBeasiswa = query(
        collection(db, "beasiswa"),
        where("studentUID", "==", uidSiswa)
      );
      const snapBeasiswa = await getDocs(qBeasiswa);

      if (snapBeasiswa.empty) {
        console.log("🚫 Tidak ada beasiswa untuk siswa ini");
        return;
      }

      const beasiswaData = snapBeasiswa.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      const bLuar = beasiswaData.find(
        (b) => b.kategori === "luar" && b.status === "sudah_diklaim"
      );
      const bSekolah = beasiswaData.find(
        (b) => b.kategori === "sekolah" && b.status === "sudah_diklaim"
      );

      if (bLuar && !bLuar.sudahDiterapkan) {
        console.log("🟡 Terapkan Beasiswa Luar:", bLuar.jenisBeasiswa);
        const persen =
          bLuar.persentase > 1 ? bLuar.persentase / 100 : bLuar.persentase;

        for (const t of tagihanList) {
          const namaTagihan = (t.jenisTagihan || "").toLowerCase().trim();

          // ⚠️ Skip tagihan OSIS & PRAMUKA
          if (namaTagihan.includes("osis") || namaTagihan.includes("pramuka")) {
            console.log(`🚫 Lewati potongan untuk tagihan: ${t.jenisTagihan}`);
            continue;
          }
          if (t.status === "lunas" || (t.sisaTagihan ?? 0) <= 0) continue;

          const nominalOriginal = t.nominal ?? 0;
          const nominalSetelahPotongan = Math.ceil(
            nominalOriginal * (1 - persen)
          );

          await updateDoc(doc(db, "tagihan", t.id), {
            nominal: nominalSetelahPotongan,
            sisaTagihan: nominalSetelahPotongan - (t.sudahBayar ?? 0),
            lastUpdate: new Date(),
            catatanBeasiswaLuar: `Potongan ${(persen * 100).toFixed(
              0
            )}% diterapkan.`,
          });
        }

        // tandai agar tidak dijalankan lagi
        await updateDoc(doc(db, "beasiswa", bLuar.id), {
          sudahDiterapkan: true,
        });
      }

      if (bSekolah && !bSekolah.sudahDiterapkan) {
        console.log("🟢 Terapkan Beasiswa Sekolah:", bSekolah.jenisBeasiswa);
        let sisaPotongan = bSekolah.nominal ?? 0;

        // Urutkan tagihan sesuai prioritas
        const order = ["spp", "uang gedung", "uang praktik", "osis & pramuka"];
        const normalize = (s) =>
          (s || "")
            .toLowerCase()
            .replace(/\s+/g, " ")
            .replace(/praktek/g, "praktik")
            .replace(/&/g, "dan")
            .trim();

        const urutTagihan = tagihanList
          .filter((t) => t.status === "belum")
          .sort((a, b) => {
            const ai = order.indexOf(normalize(a.jenisTagihan));
            const bi = order.indexOf(normalize(b.jenisTagihan));
            return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
          });

        for (const t of urutTagihan) {
          if (sisaPotongan <= 0) break;

          const sisaTagihan = t.sisaTagihan ?? 0;
          const potongan = Math.min(sisaTagihan, sisaPotongan);
          const sisaBaru = sisaTagihan - potongan;
          sisaPotongan -= potongan;

          const statusBaru = sisaBaru <= 0 ? "lunas" : t.status;

          await updateDoc(doc(db, "tagihan", t.id), {
            sisaTagihan: sisaBaru,
            status: statusBaru,
            lastUpdate: new Date(),
            catatanBeasiswaSekolah: `Potongan sebagian dari total Rp ${(
              bSekolah.nominal ?? 0
            ).toLocaleString()} diterapkan.`,
          });
        }

        // tandai agar tidak diterapkan lagi
        await updateDoc(doc(db, "beasiswa", bSekolah.id), {
          sudahDiterapkan: true,
        });
      }

      if (
        (bLuar && !bLuar.sudahDiterapkan) ||
        (bSekolah && !bSekolah.sudahDiterapkan)
      ) {
        showAlert("Beasiswa berhasil diterapkan ke tagihan siswa.");
        console.log("✅ Beasiswa baru diterapkan ke tagihan");
      } else {
        console.log("ℹ️ Tidak ada beasiswa aktif atau sudah diterapkan");
      }
    } catch (error) {
      console.error("🔥 Gagal menerapkan beasiswa otomatis:", error);
      showAlert("Terjadi kesalahan saat menerapkan beasiswa.");
    }
  };

  // Ambil daftar tahun ajaran unik dari tagihan
  const tahunFromTagihan = [
    ...new Set(localTagihanList.map((t) => t.tahunAjaran)),
  ].sort((a, b) => {
    const [aStart] = a.split("/").map(Number);
    const [bStart] = b.split("/").map(Number);
    return bStart - aStart; // urut dari yang terbaru
  });
  // Jika belum ada pilihan tahun ajaran, set default ke tahun terbaru
  useEffect(() => {
    if (tahunFromTagihan.length > 0 && !selectedTahunAjaran) {
      setSelectedTahunAjaran(tahunFromTagihan[0]);
    }
  }, [tahunFromTagihan, selectedTahunAjaran]);

  // Filter tagihan berdasarkan tahun
  const filteredTagihan = localTagihanList.filter(
    (t) => t.tahunAjaran === selectedTahunAjaran
  );

  // const filtered = tagihan.filter((t) => t.status === "belum");

  // Urutkan & filter tagihan berdasarkan status dan tahun ajaran
  const order = ["spp", "uang gedung", "uang praktik", "osis & pramuka"];

  // Fungsi normalisasi biar tahan typo dan variasi
  const normalize = (str = "") =>
    str
      .toLowerCase()
      .replace(/\s+/g, " ")
      .replace(/praktek/g, "praktik")
      .replace(/&/g, "dan")
      .trim();

  // Filter tagihan tahun terpilih dan status belum
  const belumTagihan = filteredTagihan.filter((t) => t.status === "belum");

  // Urutkan sesuai prioritas
  const sortedTagihan = belumTagihan.sort((a, b) => {
    const indexA = order.indexOf(normalize(a.jenisTagihan || ""));
    const indexB = order.indexOf(normalize(b.jenisTagihan || ""));
    const safeA = indexA === -1 ? order.length : indexA;
    const safeB = indexB === -1 ? order.length : indexB;
    return safeA - safeB;
  });

  // Fungsi bayar cash
  const handleBayarCash = async () => {
    if (!selectedTagihan?.id) return showAlert("Tagihan belum dipilih");
    if (!nominalBayar || isNaN(nominalBayar) || Number(nominalBayar) <= 0)
      return showAlert("Masukkan nominal yang valid");

    const bayar = Number(nominalBayar);
    const sisa = selectedTagihan.sisaTagihan ?? 0;
    if (bayar > sisa) return showAlert("Nominal bayar melebihi sisa tagihan");

    try {
      const tagihanRef = collection(
        db,
        "tagihan",
        selectedTagihan.id,
        "pendingPembayaran"
      );
      const docRef = await addDoc(tagihanRef, {
        nominal: bayar,
        metode: "cash",
        tanggal: new Date(),
        status: "menunggu",
        siswaUID: uidSiswa,
        siswaNama: userData?.nama ?? "-",
        jenisBeasiswa: userData?.jenisBeasiswa ?? "tidak ada",
      });

      setPendingList((prev) => [
        ...prev,
        {
          id: docRef.id,
          nominal: bayar,
          metode: "cash",
          tanggal: new Date().toLocaleDateString("id-ID"),
          status: "menunggu",
          siswaNama: userData?.nama ?? "-",
        },
      ]);

      setNominalBayar("");
      setShowModal(false);
      showAlert(
        `Permintaan pembayaran cash Rp ${bayar.toLocaleString()} telah dikirim ke bendahara.`
      );
    } catch (err) {
      console.error("Gagal menyimpan pembayaran pending:", err);
      showAlert("Terjadi kesalahan, silakan coba lagi.");
    }
  };

  const handleBayarTransfer = async () => {
    if (!selectedTagihan?.id) return;

    try {
      const payload = {
        orderId: "ORDER-" + Date.now(),
        amount: selectedTagihan?.sisaTagihan ?? 0,
        uid: uidSiswa,
        tagihanId: selectedTagihan?.id ?? "",
        nama: userData?.nama ?? "Siswa",
        email: userData?.email ?? "siswa@example.com",
        telp: userData?.telp ?? "08123456789",
      };

      const response = await fetch("http://localhost:5000/create-transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!data.token) {
        showAlert("Gagal membuat transaksi. Cek server atau koneksi Midtrans.");
        return;
      }

      window.snap.pay(data.token, {
        onSuccess: async (result) => {
          showAlert("Pembayaran berhasil!");
          // Simpan sementara ke Firestore
          await addDoc(
            collection(db, "tagihan", selectedTagihan.id, "riwayatPembayaran"),
            {
              nominal: Number(selectedTagihan?.sisaTagihan ?? 0),
              metode: "transfer",
              tanggal: new Date(),
              status: "lunas",
              siswaUID: uidSiswa,
              siswaNama: userData?.nama ?? "-",
              orderId: result.order_id,
            }
          );

          await updateDoc(doc(db, "tagihan", selectedTagihan.id), {
            status: "lunas",
            sudahBayar: selectedTagihan.nominal,
            sisaTagihan: 0,
          });
        },
        onPending: (result) => {
          showAlert("Pembayaran sedang diproses...");
        },
        onError: (result) => {
          console.error("Error:", result);
          showAlert("Terjadi kesalahan saat pembayaran.");
        },
        onClose: () => {
          console.log("Popup ditutup tanpa pembayaran.");
        },
      });
    } catch (err) {
      console.error("Gagal bayar transfer:", err);
      showAlert("Terjadi kesalahan saat memproses pembayaran.");
    }
  };

  return (
    <>
      <style>
        {`
          @keyframes blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.4; }
          }

          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }

          .fadeIn {
            animation: fadeIn 0.4s ease-out;
          }

          .blink {
            animation: blink 1.5s infinite;
          }
        `}
      </style>
      <h3
        style={{
          color: "rgba(255, 255, 255, 1)",
          fontSize: 16,
          fontWeight: "600",
          marginBottom: 16,
        }}
      >
        Daftar Tagihan
      </h3>

      {/* Tab Navigasi Tahun Ajaran */}
      {tahunFromTagihan.length > 0 && (
        <div
          style={{
            display: "flex",
            gap: isMobile <= 768 ? "4px" : "8px",
            marginBottom: "16px",
            flexWrap: "wrap",
          }}
        >
          {tahunFromTagihan.map((th) => (
            <button
              key={th}
              onClick={() => setSelectedTahunAjaran(th)}
              style={{
                padding: isMobile <= 768 ? "4px 10px" : "6px 14px",
                fontSize: isMobile <= 768 ? 9 : 13,
                borderRadius: 8,
                border: "1px solid #555",
                background:
                  selectedTahunAjaran === th ? "#CEFE06" : "transparent",
                color: selectedTahunAjaran === th ? "#000" : "#eee",
                fontWeight: selectedTahunAjaran === th ? 700 : 400,
                cursor: "pointer",
                transition: "0.3s",
                minWidth: isMobile <= 768 ? "70px" : "auto",
              }}
            >
              {th}
            </button>
          ))}
        </div>
      )}

      {/* List Tagihan */}
      {sortedTagihan.length === 0 ? (
        <p style={{ color: "#666", fontStyle: "italic", fontSize: 17 }}>
          Tidak ada tagihan.
        </p>
      ) : (
        sortedTagihan.map((item) => (
          <div
            key={item.id}
            style={{
              background: "#000",
              borderRadius: 16,
              height: "62px",
              border: "1px solid #555",
              padding: "15px 18px",
              paddingBottom: 23,
              marginBottom: 10,
              cursor: "pointer",
              boxShadow: "0 6px 16px rgba(0,0,0,0.1)",
            }}
            onClick={() => {
              setSelectedTagihan(item);
              setShowModal(true);
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 12,
              }}
            >
              <span
                style={{ fontSize: 14, fontWeight: 500, color: "#dce3ebff" }}
              >
                {item.jenisTagihan}
              </span>
              <span
                style={{
                  background: "#ff4757",
                  color: "#fff",
                  fontSize: 10,
                  fontWeight: 600,
                  padding: "4px 10px",
                  borderRadius: 12,
                  textTransform: "uppercase",
                  animation: "blink 2s infinite",
                }}
              >
                BAYAR
              </span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                lineHeight: 0.7,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  bottom: 14,
                  position: "relative",
                  color: "#dce3ebff",

                  // alignItems: "center",
                }}
              >
                <p>
                  <strong></strong>{" "}
                  <span
                    style={{ color: "#CEFE06", fontWeight: 600, fontSize: 13 }}
                  >
                    Rp {formatRupiah(item.sisaTagihan)}
                  </span>
                </p>
                <p>
                  Total:{" "}
                  <span style={{ color: "#2ecc71", fontWeight: 100 }}>
                    Rp {formatRupiah(item.nominal ?? 0)}
                  </span>
                </p>
              </div>
              <p
                style={{
                  color: "#6c6c6cff",
                  fontSize: 10,
                  top: 8,
                  position: "relative",
                }}
              >
                {item.tanggal
                  ? new Date(
                      item.tanggal.split("/")[2], // tahun
                      item.tanggal.split("/")[1] - 1, // bulan (0-based)
                      item.tanggal.split("/")[0] // tanggal
                    ).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })
                  : "-"}
              </p>
            </div>
          </div>
        ))
      )}
      {/* Modal Pembayaran */}
      {showModal && selectedTagihan && (
        <div
          style={{
            position: "fixed",
            bottom: 50,
            left: 0,
            width: "100%",
            height: "100%",
            backdropFilter: "blur(8px)",
            background: "rgba(0, 0, 0, 0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            animation: "fadeIn 0.2s ease-out",
            padding: "20px",
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              background:
                "linear-gradient(145deg, rgba(30,30,30,0.95), rgba(15,15,15,0.95))",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "18px",
              width: "90%",
              maxWidth: 420,
              color: "#fff",
              padding: "28px 24px",
              boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
              position: "relative",
              animation: "fadeIn 0.5s ease-out",
            }}
          >
            {/* Tombol Tutup */}
            <button
              onClick={() => setShowModal(false)}
              style={{
                position: "absolute",
                top: 10,
                right: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(255,255,255,0.1)",
                border: "none",
                width: isMobile <= 768 ? 36 : 32, // ukuran responsif
                height: isMobile <= 768 ? 22 : 32,
                borderRadius: isMobile <= 768 ? "16px" : "50%", // lonjong di HP
                color: "#fff",
                cursor: "pointer",
                fontSize: 16,
                transition: "0.3s",
              }}
              onMouseOver={(e) =>
                (e.target.style.background = "rgba(255,0,0,0.5)")
              }
              onMouseOut={(e) =>
                (e.target.style.background = "rgba(255,255,255,0.1)")
              }
            >
              ✕
            </button>

            {/* Header */}
            <h2
              style={{
                textAlign: "center",
                marginBottom: 20,
                fontSize: 20,
                color: "#CEFE06",
                letterSpacing: "0.5px",
              }}
            >
              Konfirmasi Pembayaran
            </h2>

            {/* Detail Tagihan */}
            <div style={{ marginBottom: 20, lineHeight: 1.3 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  textAlign: "center",
                  width: "100%",
                  alignItems: "center",
                }}
              >
                <h3 style={{ fontSize: 16, marginBottom: 6, color: "#fff" }}>
                  {selectedTagihan.jenisTagihan}
                </h3>
                <p style={{ fontSize: 5, color: "#aaa", marginBottom: 4 }}>
                  <span
                    style={{
                      color: "#ddd",
                      fontSize: isMobile <= 480 ? 8 : 16,
                    }}
                  >
                    {selectedTagihan.id}
                  </span>
                </p>
              </div>
              <p style={{ fontSize: 12, color: "#bbb" }}>
                Sisa Tagihan:{" "}
                <strong style={{ color: "#CEFE06" }}>
                  Rp {formatRupiah(selectedTagihan.sisaTagihan ?? 0)}
                </strong>
              </p>
              <p style={{ fontSize: 12, color: "#bbb" }}>
                Sudah Bayar:{" "}
                <span style={{ color: "#2ecc71" }}>
                  Rp {formatRupiah(selectedTagihan.sudahBayar ?? 0)}
                </span>
              </p>
              <p style={{ fontSize: 12, color: "#bbb" }}>
                Total:{" "}
                <strong style={{ color: "#0af" }}>
                  Rp {formatRupiah(selectedTagihan.nominal ?? 0)}
                </strong>
              </p>
            </div>

            {/* Catatan Beasiswa */}
            {(selectedTagihan.catatanBeasiswaSekolah ||
              selectedTagihan.catatanBeasiswaLuar) && (
              <div
                style={{
                  background: "rgba(50,100,255,0.1)",
                  borderLeft: "4px solid #4f9cff",
                  borderRadius: 10,
                  padding: "10px 14px",
                  marginBottom: 18,
                  color: "#d8e7ff",
                  fontSize: 12,
                }}
              >
                <strong style={{ color: "#4f9cff" }}>🎓 Beasiswa:</strong>
                <ul style={{ marginTop: 6, paddingLeft: 20, lineHeight: 1.3 }}>
                  {selectedTagihan.catatanBeasiswaLuar && (
                    <li>{selectedTagihan.catatanBeasiswaLuar}</li>
                  )}
                  {selectedTagihan.catatanBeasiswaSekolah && (
                    <li>{selectedTagihan.catatanBeasiswaSekolah}</li>
                  )}
                </ul>
              </div>
            )}

            {/* Input Nominal */}
            <input
              type="number"
              placeholder="Masukkan nominal pembayaran"
              value={nominalBayar}
              onChange={(e) => setNominalBayar(e.target.value)}
              style={{
                width: "90%",
                padding: "12px 14px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.15)",
                background: "rgba(255,255,255,0.05)",
                color: "#fff",
                marginBottom: 16,
                outline: "none",
                fontSize: 14,
              }}
            />

            {/* Tombol Aksi */}
            <div style={{ display: "flex", gap: 12 }}>
              <button
                // onClick={handleBayarTransfer}
                onClick={() => {
                  // Tampilkan peringatan kecil
                  const toast = document.createElement("div");
                  toast.textContent =
                    "💡 Fitur transfer sedang dalam perbaikan";
                  toast.style.position = "fixed";
                  toast.style.top = "40%";
                  toast.style.left = "50%";
                  toast.style.transform = "translateX(-50%)";
                  toast.style.background = "rgba(0,0,0,0.8)";
                  toast.style.color = "#fff";
                  toast.style.padding = "10px 20px";
                  toast.style.borderRadius = "8px";
                  toast.style.fontSize = "14px";
                  toast.style.zIndex = "9999";
                  toast.style.transition = "opacity 0.3s ease";
                  document.body.appendChild(toast);

                  // Hilangkan toast setelah 2 detik
                  setTimeout(() => {
                    toast.style.opacity = "0";
                    setTimeout(() => toast.remove(), 300);
                  }, 2000);
                }}
                // disabled={true}
                style={{
                  flex: 1,
                  background:
                    "linear-gradient(90deg, #00adddff 0%, #0072ff 100%)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  padding: "10px 0",
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: "pointer",
                  transition: "0.3s",
                }}
                onMouseOver={(e) => (e.target.style.opacity = 0.85)}
                onMouseOut={(e) => (e.target.style.opacity = 1)}
              >
                Transfer
              </button>

              <button
                onClick={handleBayarCash}
                style={{
                  flex: 1,
                  background:
                    "linear-gradient(90deg, #16a085 0%, #27ae60 100%)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  padding: "10px 0",
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: "pointer",
                  transition: "0.3s",
                }}
                onMouseOver={(e) => (e.target.style.opacity = 0.85)}
                onMouseOut={(e) => (e.target.style.opacity = 1)}
              >
                Cash
              </button>
            </div>

            {/* Daftar Pending */}
            <div
              style={{
                marginTop: 20,
                background: "rgba(255,255,255,0.04)",
                borderRadius: 10,
                padding: "10px 14px",
              }}
            >
              <h4 style={{ fontSize: 14, color: "#fff", marginBottom: 6 }}>
                Pembayaran Pending
              </h4>
              {pendingList.length === 0 ? (
                <p style={{ fontSize: 12, color: "#aaa" }}>
                  Belum ada pembayaran
                </p>
              ) : (
                <ul style={{ fontSize: 12, color: "#ddd", lineHeight: 1.5 }}>
                  {pendingList.map((p) => (
                    <li key={p.id}>
                      Rp {formatRupiah(p.nominal)} - {p.siswaNama} ({p.tanggal}){" "}
                      <span style={{ color: "#CEFE06" }}>• {p.status}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {showAlertBox && (
        <div
          style={{
            position: "fixed",
            bottom: "85%",
            // right: "50%",
            display: "flex",
            left: 20,
            alignItems: "center",
            background: "#1E1E1E",
            borderRadius: "12px",
            padding: "14px 20px",
            color: "#fff",
            boxShadow: "0 8px 25px rgba(0,0,0,0.3)",
            zIndex: 99999,
            animation: "slideUp 0.4s ease-out",
            borderLeft: "4px solid #22c55e", // hijau
            minWidth: "300px",
            maxWidth: "300px",
          }}
        >
          {/* Ikon centang */}
          <div
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "50%",
              background: "#22c55e33",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginRight: "12px",
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="#22c55e"
              style={{ width: "18px", height: "18px" }}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          {/* Pesan */}
          <div style={{ flex: 1, fontWeight: "500", fontSize: "15px" }}>
            {alertMessage}
          </div>
        </div>
      )}
    </>
  );
}
