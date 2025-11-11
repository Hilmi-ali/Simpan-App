import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { db } from "../../firebase";
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  getDoc,
  orderBy,
  deleteDoc,
} from "firebase/firestore";
import { toast } from "react-toastify";
import { FaCheck, FaTimes } from "react-icons/fa";

// Helper functions
const formatTanggal = (tanggal) => {
  if (!tanggal) return "-";
  if (typeof tanggal === "string") return tanggal;
  if (tanggal.seconds)
    return new Date(tanggal.seconds * 1000).toLocaleDateString("id-ID", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  return "-";
};

const formatRupiah = (num) => `Rp ${num?.toLocaleString() || 0}`;

export default function KelolaTagihan() {
  const { uid } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const returnMenu = location.state?.returnMenu || "dashboard";

  const [hovered, setHovered] = useState(null);

  const [siswa, setSiswa] = useState(null);
  const [tagihanList, setTagihanList] = useState([]);
  const [form, setForm] = useState({ jenis: "", nominal: "" });
  const [modalTagihan, setModalTagihan] = useState(null);
  const [pendingPembayaran, setPendingPembayaran] = useState([]);
  const [showTambahModal, setShowTambahModal] = useState(false);

  const [tahunAjaranList, setTahunAjaranList] = useState([]);

  const [modalBayar, setModalBayar] = useState(null);
  const [formPembayaran, setFormPembayaran] = useState({
    nominal: "",
    metode: "cash",
    tanggal: "",
    siswaNama: "",
    siswaUID: "",
  });

  useEffect(() => {
    const fetchTahunAjaran = async () => {
      try {
        const q = query(
          collection(db, "tahunAjaran"),
          orderBy("createdAt", "desc")
        );
        const snapshot = await getDocs(q);
        const list = snapshot.docs.map((doc) => doc.data().tahun);
        setTahunAjaranList(list);
      } catch (error) {
        console.error("Gagal memuat tahun ajaran:", error);
      }
    };

    fetchTahunAjaran();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch siswa
        const siswaSnap = await getDocs(
          query(collection(db, "students"), where("__name__", "==", uid))
        );
        if (!siswaSnap.empty) setSiswa(siswaSnap.docs[0].data());

        // Fetch tagihan
        const tagihanSnap = await getDocs(
          query(collection(db, "tagihan"), where("studentUID", "==", uid))
        );

        const list = tagihanSnap.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            nominal: data.nominal ?? data.jumlah ?? 0,
            sudahBayar: data.sudahBayar ?? 0,
            sisaTagihan:
              (data.nominal ?? data.jumlah ?? 0) - (data.sudahBayar ?? 0),
            tanggal: formatTanggal(data.tanggal),
            pembayaranPending: [],
          };
        });

        // Fetch pending pembayaran
        const listWithPending = await Promise.all(
          list.map(async (item) => {
            const bayarSnap = await getDocs(
              collection(db, "tagihan", item.id, "pendingPembayaran")
            );
            item.pembayaranPending = bayarSnap.docs
              .filter((d) => d.data().status === "menunggu")
              .map((d) => ({ id: d.id, ...d.data() }));
            return item;
          })
        );

        setTagihanList(listWithPending);
      } catch (err) {
        console.error(err);
        toast.error("Gagal memuat data siswa/tagihan");
      }
    };

    fetchData();
  }, [uid]);

  // Tambah pembayaran manual
  const handleTambahPembayaran = async (tagihanId) => {
    if (!formPembayaran.nominal || isNaN(formPembayaran.nominal)) {
      toast.error("Nominal tidak valid");
      return;
    }

    try {
      const siswaSnap = await getDoc(doc(db, "students", uid));
      const siswaData = siswaSnap.exists() ? siswaSnap.data() : {};

      const pembayaranRef = collection(
        db,
        `tagihan/${tagihanId}/pendingPembayaran`
      );
      await addDoc(pembayaranRef, {
        nominal: parseInt(formPembayaran.nominal, 10),
        metode: formPembayaran.metode,
        status: "menunggu",
        tanggal: formPembayaran.tanggal
          ? new Date(formPembayaran.tanggal)
          : new Date(),
        siswaNama: siswaData.nama || "-",
        siswaUID: uid,
      });

      toast.success("Pembayaran berhasil ditambahkan!");
      setModalBayar(null);
      setFormPembayaran({
        nominal: "",
        metode: "cash",
        tanggal: "",
        siswaNama: "",
        siswaUID: "",
      });
    } catch (err) {
      console.error(err);
      toast.error("Gagal menambahkan pembayaran");
    }
  };

  const handleTambahTagihan = async () => {
    if (!form.jenis || !form.nominal || !form.tahunAjaran) {
      toast.error("Lengkapi semua field sebelum menyimpan!");
      return;
    }

    try {
      const docRef = await addDoc(collection(db, "tagihan"), {
        studentUID: uid,
        jenisTagihan: form.jenis,
        nominal: parseInt(form.nominal, 10),
        sisaTagihan: parseInt(form.nominal, 10),
        sudahBayar: 0,
        status: "belum",
        tahunAjaran: form.tahunAjaran,
        tanggalBuat: new Date(),
      });

      setTagihanList((prev) => [
        ...prev,
        {
          id: docRef.id,
          studentUID: uid,
          jenisTagihan: form.jenis,
          nominal: parseInt(form.nominal, 10),
          sisaTagihan: parseInt(form.nominal, 10),
          sudahBayar: 0,
          status: "belum",
          tahunAjaran: form.tahunAjaran,
          tanggalBuat: new Date(),
        },
      ]);

      setShowTambahModal(false);
      setForm({ jenis: "", nominal: "", tahunAjaran: "" });
      toast.success("Tagihan berhasil ditambahkan!");
    } catch (error) {
      console.error("Gagal menambahkan tagihan:", error);
      toast.error("Terjadi kesalahan saat menambahkan tagihan");
    }
  };

  // Buka modal pembayaran
  const handleBukaModal = async (tagihan) => {
    setModalTagihan(tagihan);
    try {
      const pembayaranSnap = await getDocs(
        collection(db, `tagihan/${tagihan.id}/pendingPembayaran`)
      );
      const pending = pembayaranSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setPendingPembayaran(pending);
    } catch (err) {
      console.error(err);
      toast.error("Gagal memuat pembayaran pending");
    }
  };

  // Konfirmasi cicilan
  const handleKonfirmasiCicilan = async (tagihanId, pembayaranId, nominal) => {
    try {
      const tagihanRef = doc(db, "tagihan", tagihanId);
      const pembayaranRef = doc(
        db,
        `tagihan/${tagihanId}/pendingPembayaran`,
        pembayaranId
      );

      const tagihanSnap = await getDoc(tagihanRef);
      const tagihanData = tagihanSnap.data();

      const sudahBayarBaru = (tagihanData.sudahBayar || 0) + nominal;
      const sisaTagihanBaru = (tagihanData.nominal || 0) - sudahBayarBaru;
      const statusBaru = sisaTagihanBaru <= 0 ? "lunas" : "belum";

      // Update total bayar tagihan
      await updateDoc(tagihanRef, {
        sudahBayar: sudahBayarBaru,
        sisaTagihan: sisaTagihanBaru,
        status: statusBaru,
      });

      // Simpan ke riwayatPembayaran
      const pembayaranSnap = await getDoc(pembayaranRef);
      const pembayaranData = pembayaranSnap.data();
      await addDoc(collection(db, `tagihan/${tagihanId}/riwayatPembayaran`), {
        ...pembayaranData,
        status: "diterima",
        dikonfirmasiPada: new Date(),
      });

      // Hapus dari pendingPembayaran
      await deleteDoc(pembayaranRef);

      // Update state lokal
      setTagihanList((prev) =>
        prev.map((t) =>
          t.id === tagihanId
            ? {
                ...t,
                sudahBayar: sudahBayarBaru,
                sisaTagihan: sisaTagihanBaru,
                status: statusBaru,
                pembayaranPending: t.pembayaranPending.filter(
                  (p) => p.id !== pembayaranId
                ),
              }
            : t
        )
      );

      setModalTagihan(
        (prev) =>
          prev && {
            ...prev,
            sudahBayar: sudahBayarBaru,
            sisaTagihan: sisaTagihanBaru,
            status: statusBaru,
            pembayaranPending: prev.pembayaranPending.filter(
              (p) => p.id !== pembayaranId
            ),
          }
      );

      setPendingPembayaran((prev) => prev.filter((p) => p.id !== pembayaranId));

      toast.success(`Cicilan ${formatRupiah(nominal)} berhasil dikonfirmasi!`);
    } catch (err) {
      console.error(err);
      toast.error("Gagal mengonfirmasi cicilan");
    }
  };

  // 🔹 Batalkan konfirmasi pembayaran (hapus dari pending)
  const handleBatalkanKonfirmasi = async (tagihanId, pembayaranId) => {
    try {
      const pembayaranRef = doc(
        db,
        `tagihan/${tagihanId}/pendingPembayaran`,
        pembayaranId
      );

      await deleteDoc(pembayaranRef);

      // Update tampilan lokal
      setPendingPembayaran((prev) => prev.filter((p) => p.id !== pembayaranId));
      setModalTagihan((prev) =>
        prev
          ? {
              ...prev,
              pembayaranPending: prev.pembayaranPending.filter(
                (p) => p.id !== pembayaranId
              ),
            }
          : prev
      );

      toast.info("Konfirmasi pembayaran dibatalkan.");
    } catch (err) {
      console.error(err);
      toast.error("Gagal membatalkan konfirmasi pembayaran.");
    }
  };

  const handleCloseKelola = () => {
    navigate("/dashboard-bendahara", { state: { activeMenu: returnMenu } });
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {siswa && (
          <div style={styles.infoBox}>
            <div style={{ width: "100%" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  width: "100%",
                }}
              >
                <h2 style={styles.heading}>Kelola Tagihan </h2>
                <button style={styles.backBtn} onClick={handleCloseKelola}>
                  Tutup
                </button>
              </div>
              <div style={styles.siswaHeader}>
                <div style={styles.siswaKiri}>
                  <h3 style={styles.siswaNama}>
                    {siswa.nama} ({siswa.nis})
                  </h3>
                </div>
                <div style={styles.siswaKanan}>
                  <span style={styles.siswaId}>ID: {uid}</span>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* --- DAFTAR TAGIHAN --- */}
        <div style={styles.tableContainer}>
          {/* --- STATISTIK --- */}
          <div style={styles.statsContainer}>
            <div style={{ ...styles.statCard, background: "#2a2a2a" }}>
              <h4 style={styles.statTitle}>Total Tagihan</h4>

              <p style={styles.statValue}>
                {formatRupiah(
                  tagihanList.reduce((sum, t) => sum + (t.nominal || 0), 0)
                )}
              </p>
            </div>
            <div style={{ ...styles.statCard, background: "#2a2a2a" }}>
              <h4 style={styles.statTitle}>Sudah Dibayar</h4>
              <p style={styles.statValue}>
                {formatRupiah(
                  tagihanList.reduce((sum, t) => sum + (t.sudahBayar || 0), 0)
                )}
              </p>
            </div>
            <div style={{ ...styles.statCard, background: "#2a2a2a" }}>
              <h4 style={styles.statTitle}>Belum Lunas</h4>
              <p style={{ ...styles.statValue, color: "#ff453a" }}>
                {tagihanList.filter((t) => t.status !== "lunas").length} item
              </p>
            </div>
          </div>
          <div style={styles.tableHeader}>
            <h3 style={{ margin: 0 }}>Daftar Tagihan</h3>
            <button
              style={styles.addBtn}
              onClick={() => setShowTambahModal(true)}
            >
              + Tambah Tagihan
            </button>
          </div>

          {tagihanList.length === 0 ? (
            <p style={styles.emptyText}>Belum ada tagihan.</p>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr
                  style={{
                    textAlign: "left",
                    position: "relative",
                    left: 8,
                    fontSize: 18,
                    color: "#a5a5a5ff",
                  }}
                >
                  <th>Jenis</th>
                  <th>Total</th>
                  <th>Sudah Bayar</th>
                  <th>Sisa</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {tagihanList.map((item, index) => (
                  <tr
                    key={item.id}
                    style={{
                      ...styles.row,
                      borderBottom:
                        index === tagihanList.length - 1
                          ? "none"
                          : "1px solid #3a3a3c", // garis antar item
                    }}
                    onClick={() => handleBukaModal(item)}
                  >
                    <td style={{ padding: "12px 10px" }}>
                      {item.jenisTagihan}
                    </td>
                    <td style={{ padding: "12px 10px" }}>
                      {formatRupiah(item.nominal)}
                    </td>
                    <td style={{ padding: "12px 10px" }}>
                      {formatRupiah(item.sudahBayar)}
                    </td>
                    <td style={{ padding: "12px 10px" }}>
                      {formatRupiah(item.sisaTagihan)}
                    </td>
                    <td style={{ padding: "12px 10px" }}>
                      <span
                        style={
                          item.status === "lunas"
                            ? styles.statusLunas
                            : styles.statusBelum
                        }
                      >
                        {item.status.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <button
                        style={styles.payBtn}
                        onClick={(e) => {
                          e.stopPropagation(); // ✅ hentikan event agar tidak buka modalTagihan
                          setModalBayar(item); // langsung buka modal bayar
                        }}
                      >
                        Bayar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      {showTambahModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalBox}>
            <h2>Tambah Tagihan</h2>

            {/* Jenis Tagihan */}

            <input
              type="text"
              placeholder="Jenis Tagihan"
              value={form.jenis}
              onChange={(e) => setForm({ ...form, jenis: e.target.value })}
              style={styles.inputTambah}
            />

            {/* Nominal */}

            <input
              type="number"
              placeholder="Nominal"
              value={form.nominal}
              onChange={(e) => setForm({ ...form, nominal: e.target.value })}
              style={styles.inputTambah}
            />
            <br />

            {/* Dropdown Tahun Ajaran */}

            <select
              value={form.tahunAjaran}
              onChange={(e) =>
                setForm({ ...form, tahunAjaran: e.target.value })
              }
              style={styles.inputTambah}
            >
              <option value="" style={{ color: "#fff" }}>
                Pilih Tahun Ajaran
              </option>
              {tahunAjaranList.map((ta, i) => (
                <option key={i} value={ta}>
                  {ta}
                </option>
              ))}
            </select>

            {/* Tombol */}
            <div
              style={{
                display: "flex",
                gap: "10px",
                marginTop: "16px",
                alignItems: "center",
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={() => setShowTambahModal(false)}
                style={styles.cancelBtn}
              >
                Batal
              </button>
              <button onClick={handleTambahTagihan} style={styles.saveBtn}>
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {modalBayar && (
        <div style={styles.modalOverlay} onClick={() => setModalBayar(null)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>
              Tambah Pembayaran
              <span style={{ color: "#0a84ff", fontWeight: "bold" }}>
                {" "}
                - {modalBayar.jenisTagihan}
              </span>
            </h3>

            <div style={styles.modalBody}>
              <p style={{ fontSize: "14px", marginBottom: 8 }}>
                <strong>Tagihan:</strong>{" "}
                <span style={{ color: "#ffcc00", fontWeight: "bold" }}>
                  Rp {formatRupiah(modalBayar.sisaTagihan)}
                </span>
              </p>

              <input
                type="number"
                placeholder="Nominal pembayaran"
                value={formPembayaran.nominal}
                onChange={(e) =>
                  setFormPembayaran({
                    ...formPembayaran,
                    nominal: e.target.value,
                  })
                }
                style={styles.input}
              />

              <select
                value={formPembayaran.metode}
                onChange={(e) =>
                  setFormPembayaran({
                    ...formPembayaran,
                    metode: e.target.value,
                  })
                }
                style={styles.input}
              >
                <option value="cash">Cash</option>
                <option value="transfer">Transfer</option>
              </select>

              <input
                type="datetime-local"
                value={formPembayaran.tanggal}
                onChange={(e) =>
                  setFormPembayaran({
                    ...formPembayaran,
                    tanggal: e.target.value,
                  })
                }
                style={styles.input}
              />

              <div style={styles.modalFooter}>
                <button
                  style={styles.cancelBtn}
                  onClick={() => setModalBayar(null)}
                >
                  Batal
                </button>
                <button
                  style={styles.saveBtn}
                  onClick={() => handleTambahPembayaran(modalBayar.id)}
                >
                  Simpan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal pembayaran */}
      {modalTagihan && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999,
          }}
          onClick={() => setModalTagihan(null)}
        >
          <div
            style={{
              background: "#1b1b1b",
              padding: 24,
              borderRadius: 12,
              minWidth: 350,
              color: "#eee",
              maxHeight: "80vh",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Konfirmasi Pembayaran: {modalTagihan.jenisTagihan}</h3>
            <p>
              Total Tagihan: {formatRupiah(modalTagihan.nominal)} <br />
              Sudah Bayar: {formatRupiah(modalTagihan.sudahBayar)} <br />
              Sisa Tagihan: {formatRupiah(modalTagihan.sisaTagihan)}
            </p>

            <h4 style={{ marginTop: 20 }}>Pembayaran Pending:</h4>
            <ul style={{ listStyle: "none", paddingLeft: 0 }}>
              {pendingPembayaran.length > 0 ? (
                pendingPembayaran.map((p) => (
                  <li
                    key={p.id}
                    style={{
                      backgroundColor: "#2c2c2e",
                      padding: "10px 15px",
                      borderRadius: 6,
                      marginBottom: 10,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      {formatRupiah(p.nominal)} - {p.metode} <br />
                      <small>
                        {formatTanggal(p.tanggal)} | Status: {p.status}
                      </small>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        style={{
                          padding: "6px 10px",
                          borderRadius: 5,
                          border: "none",
                          backgroundColor:
                            hovered === "konfirmasi"
                              ? "rgba(3, 16, 56, 1)"
                              : "rgba(0, 59, 143, 0.85)",
                          color: "#ffffffff",
                          cursor: "pointer",
                          transition: "0.3s",
                        }}
                        onMouseEnter={() => setHovered("konfirmasi")}
                        onMouseLeave={() => setHovered(null)}
                        onClick={() =>
                          handleKonfirmasiCicilan(
                            modalTagihan.id,
                            p.id,
                            p.nominal
                          )
                        }
                      >
                        <FaCheck size={16} style={{ marginTop: 3 }} />
                      </button>
                      <button
                        style={{
                          padding: "6px 10px",
                          borderRadius: 5,
                          border: "none",
                          backgroundColor:
                            hovered === "batalkan" ? "#570505ff" : "#d32f2f",
                          color: "#fff",
                          cursor: "pointer",
                          transition: "0.3s",
                        }}
                        onMouseEnter={() => setHovered("batalkan")}
                        onMouseLeave={() => setHovered(null)}
                        onClick={() =>
                          handleBatalkanKonfirmasi(modalTagihan.id, p.id)
                        }
                      >
                        <FaTimes size={16} style={{ marginTop: 3 }} />
                      </button>
                    </div>
                  </li>
                ))
              ) : (
                <li style={{ color: "#aaa", fontStyle: "italic" }}>
                  Tidak ada pembayaran pending
                </li>
              )}
            </ul>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginTop: 10,
              }}
            >
              <button
                style={{
                  padding: "8px 14px",
                  borderRadius: 6,
                  border: "none",
                  background:
                    hovered === "kembali"
                      ? "rgba(57, 57, 57, 1)"
                      : "rgba(118, 118, 118, 0.85)",
                  color: "#eee",
                  transition: "0.3s",
                  cursor: "pointer",
                }}
                onMouseEnter={() => setHovered("kembali")}
                onMouseLeave={() => setHovered(null)}
                onClick={() => setModalTagihan(null)}
              >
                Kembali
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Styles
const styles = {
  page: {
    backgroundColor: "#0e0e0eff",
    minHeight: "100vh",
    padding: "10px 10px",
    color: "#f1f1f1",
    fontFamily: "Segoe UI, sans-serif",
  },
  container: {
    maxWidth: "1000px",
    margin: "auto",
  },
  heading: {
    fontSize: 22,
    fontWeight: 600,
    // marginBottom: 25,
    color: "#ffffff",
    // textAlign: "center",
  },
  infoBox: {
    background: "#0e0e0eff",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "5px 15px",
    borderRadius: 10,
    marginBottom: 10,
  },
  row: {
    cursor: "pointer",
    transition: "background 0.2s",
    position: "relative",
    top: 7,
  },
  backBtn: {
    // marginTop: "15px",
    padding: "8px 12px",
    backgroundColor: "#e11a1aff",
    color: "#ffffffff",
    border: "none",
    borderRadius: "5px",
    // marginBottom: 80,
    cursor: "pointer",
  },
  form: { display: "flex", flexDirection: "column", marginBottom: "30px" },
  addBox: {
    display: "flex",
    gap: 10,
    background: "#1e1e1e",
    padding: 15,
    borderRadius: 8,
    marginBottom: 25,
  },
  inputTambah: {
    width: "93%",
    padding: "8px",
    backgroundColor: "#1c1c1e",
    marginTop: "6px",
    marginBottom: "12px",
    color: "#fff",
    borderRadius: "6px",
    border: "1px solid #ccc",
  },
  input: {
    marginBottom: "10px",
    padding: "10px",
    borderRadius: "6px",
    border: "1px solid #555",
    backgroundColor: "#1c1c1e",
    color: "#fff",
    fontSize: "16px",
  },
  addBtn: {
    padding: "10px 14px",
    backgroundColor: "#0a84ff",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    position: "relative",
    left: "650px",
    fontWeight: "bold",
    cursor: "pointer",
    transition: "0.3s",
  },
  actionBox: {
    display: "flex",
    justifyContent: "flex-end",
    marginBottom: "20px",
  },
  listBox: { marginTop: "20px" },
  subheading: { fontSize: "20px", marginBottom: "10px" },
  emptyText: {
    color: "#aaa",
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 20,
  },
  list: { listStyle: "none", paddingLeft: 0 },
  listItem: {
    backgroundColor: "#3a3a3c",
    padding: "15px 20px",
    borderRadius: "6px",
    marginBottom: "10px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    cursor: "pointer",
  },
  lunas: { color: "#32d74b", fontWeight: "bold" },
  belum: { color: "#ff453a", fontWeight: "bold" },
  payBtn: {
    padding: "6px 10px",
    backgroundColor: "#0a84ff",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    marginLeft: 10,
  },
  th: {
    padding: "12px 10px",
    textAlign: "left",
    borderBottom: "2px solid #7c7c7cff",
    color: "#aaa",
  },
  td: {
    padding: "12px 10px",
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    background: "rgba(0, 0, 0, 0.7)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
    animation: "fadeIn 0.2s ease-in-out",
  },
  modalContent: {
    background: "#1e1e1e",
    padding: "24px 28px",
    borderRadius: 12,
    minWidth: 340,
    maxWidth: "90%",
    color: "#fff",
    boxShadow: "0 10px 25px rgba(0,0,0,0.4)",
    animation: "scaleIn 0.25s ease-in-out",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 600,
    marginBottom: 16,
    borderBottom: "1px solid #333",
    paddingBottom: 10,
    textAlign: "center",
  },
  modalBox: {
    backgroundColor: "#1c1c1e",
    padding: "24px",
    borderRadius: "12px",
    width: "320px",
    boxShadow: "0 0 12px rgba(0,0,0,0.2)",
  },
  modalBody: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  input: {
    padding: "10px 12px",
    borderRadius: 6,
    border: "1px solid #444",
    background: "#1c1c1e",
    color: "#fff",
    fontSize: 15,
    outline: "none",
    transition: "border 0.2s ease",
  },
  modalFooter: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 20,
  },
  cancelBtn: {
    padding: "10px 14px",
    backgroundColor: "#444",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
    transition: "background 0.2s",
  },
  saveBtn: {
    padding: "10px 14px",
    backgroundColor: "#0a84ff",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    fontWeight: "bold",
    cursor: "pointer",
    transition: "background 0.2s, transform 0.1s",
  },
  siswaNama: {
    fontSize: 20,
    fontWeight: 600,
  },
  siswaInfo: {
    color: "#aaa",
  },
  statsContainer: {
    display: "flex",
    gap: 10,

    marginBottom: 10,
    flexWrap: "wrap",
  },
  statCard: {
    flex: 1,
    height: "70px",
    borderRadius: 10,
    padding: "10px 15px",
    background: "#1c1c1c",
    textAlign: "center",
    boxShadow: "0 0 10px rgba(0,0,0,0.5)",
  },
  statTitle: {
    fontSize: 12,
    position: "relative",
    bottom: "12px",
    color: "#bbb",
  },
  statValue: {
    position: "relative",
    bottom: "17px",
    fontSize: 17,
    fontWeight: 700,
    color: "#0a84ff",
  },
  tableContainer: {
    background: "#0e0e0eff",
    borderRadius: 10,
    padding: "20px 25px",
    boxShadow: "0 0 10px rgba(0,0,0,0.5)",
  },
  tableHeader: {
    borderBottom: "1px solid #333",
    marginBottom: 15,
    display: "flex",
    paddingBottom: 10,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  statusBelum: {
    color: "#ff453a",
    fontWeight: "bold",
  },
  statusLunas: {
    color: "#32d74b",
    fontWeight: "bold",
  },
  siswaHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
  },
  siswaKiri: {
    // display: "flex",
    // flexDirection: "column",
  },
  siswaKanan: {
    marginLeft: "20px",
  },
  siswaId: {
    color: "#9a9a9a",
    fontSize: "13px",
    fontWeight: "500",
  },
};
