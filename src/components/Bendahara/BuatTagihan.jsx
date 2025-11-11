import React, { useState, useEffect } from "react";
import {
  collection,
  query,
  getDocs,
  orderBy,
  limit,
  where,
  doc,
  getDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../../firebase";
import AddTagihanBox from "../Allert/AddTagihanBox";
import { toast } from "react-toastify";

export default function BuatTagihan() {
  const [showModal, setShowModal] = useState(false);
  const [tahunList, setTahunList] = useState([]);
  const [selectedTahun, setSelectedTahun] = useState("");
  const [tagihanList, setTagihanList] = useState([]);
  const [filteredTagihan, setFilteredTagihan] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [jenisList, setJenisList] = useState([]);
  const [selectedJenis, setSelectedJenis] = useState("Semua Tagihan");

  //  state hapus
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);

  const fetchTahunAjaran = async () => {
    const q = query(collection(db, "tagihan"));
    const snapshot = await getDocs(q);
    const tahunSet = new Set();
    const jenisSet = new Set();
    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      if (data.tahunAjaran) tahunSet.add(data.tahunAjaran);
      if (data.jenisTagihan) jenisSet.add(data.jenisTagihan);
    });
    const sortedTahun = Array.from(tahunSet).sort((a, b) => b.localeCompare(a));
    setTahunList(sortedTahun);
    setJenisList(["Semua Tagihan", ...Array.from(jenisSet)]);
    if (!selectedTahun && sortedTahun.length > 0)
      setSelectedTahun(sortedTahun[0]);
  };

  const fetchTagihanByTahun = async (tahun) => {
    if (!tahun) return setTagihanList([]);
    const q = query(
      collection(db, "tagihan"),
      where("tahunAjaran", "==", tahun),
      orderBy("tanggalBuat", "desc")
    );
    const snapshot = await getDocs(q);

    const listWithSiswa = await Promise.all(
      snapshot.docs.map(async (docSnap) => {
        const data = docSnap.data();
        let tanggalStr = "-";
        if (data.tanggalBuat?.seconds) {
          tanggalStr = new Date(
            data.tanggalBuat.seconds * 1000
          ).toLocaleDateString("id-ID", {
            year: "numeric",
            month: "long",
            day: "numeric",
          });
        }

        let kelas = "-";
        let jurusan = "-";
        let nama = "-";
        let nis = "-";
        if (data.studentUID) {
          const studentSnap = await getDoc(
            doc(db, "students", data.studentUID)
          );
          if (studentSnap.exists()) {
            const s = studentSnap.data();
            kelas = s.kelas || "-";
            jurusan = s.jurusan || "-";
            nama = s.nama || "-";
            nis = s.nis || "-";
          }
        }

        return {
          id: docSnap.id,
          ...data,
          tanggalBuat: tanggalStr,
          kelas,
          jurusan,
          nama,
          nis,
        };
      })
    );

    setTagihanList(listWithSiswa);
    setFilteredTagihan(listWithSiswa);
  };

  // Filter data berdasarkan search & jenis
  useEffect(() => {
    let filtered = tagihanList.filter((item) => {
      const keyword = searchTerm.toLowerCase();
      const cocokSearch =
        item.nama.toLowerCase().includes(keyword) ||
        item.nis.toLowerCase().includes(keyword) ||
        item.kelas.toLowerCase().includes(keyword);
      const cocokJenis =
        selectedJenis === "Semua Tagihan" ||
        item.jenisTagihan === selectedJenis;
      return cocokSearch && cocokJenis;
    });
    setFilteredTagihan(filtered);
  }, [searchTerm, selectedJenis, tagihanList]);

  useEffect(() => {
    fetchTahunAjaran();
  }, []);

  useEffect(() => {
    fetchTagihanByTahun(selectedTahun);
  }, [selectedTahun]);

  const toggleSelect = (id) => {
    if (selectedItems.includes(id)) {
      setSelectedItems(selectedItems.filter((x) => x !== id));
    } else {
      setSelectedItems([...selectedItems, id]);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedItems.length === 0)
      return toast.warn("Tidak ada tagihan yang dipilih.");
    if (!window.confirm("Yakin ingin menghapus tagihan terpilih?")) return;

    for (const id of selectedItems) {
      await deleteDoc(doc(db, "tagihan", id));
    }

    toast.success("Tagihan terpilih berhasil dihapus!");
    setSelectedItems([]);
    setDeleteMode(false);
    fetchTagihanByTahun(selectedTahun);
  };

  const handleDeleteAll = async () => {
    if (filteredTagihan.length === 0)
      return toast.warn("Tidak ada data untuk dihapus.");
    if (
      !window.confirm(
        `Yakin ingin menghapus semua (${filteredTagihan.length}) tagihan hasil filter ini?`
      )
    )
      return;

    for (const item of filteredTagihan) {
      await deleteDoc(doc(db, "tagihan", item.id));
    }

    toast.success("Semua tagihan hasil filter berhasil dihapus!");
    setSelectedItems([]);
    setDeleteMode(false);
    fetchTagihanByTahun(selectedTahun);
  };

  return (
    <div
      style={{
        padding: "0px 20px",
        backgroundColor: "#0C0C0C",
        minHeight: "100vh",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h2 style={{ color: "#fff", marginBottom: 15 }}>
          Buat Tagihan Kolektif
        </h2>

        <button
          style={{
            padding: "8px 15px",
            backgroundColor: deleteMode ? "#ff3b30" : "#555",
            border: "none",
            borderRadius: 5,
            color: "#fff",
            cursor: "pointer",
          }}
          onClick={() => {
            setDeleteMode(!deleteMode);
            setSelectedItems([]);
          }}
        >
          {deleteMode ? "Batal" : "Hapus Tagihan"}
        </button>
      </div>

      {!deleteMode && (
        <button
          style={{
            padding: "10px 15px",
            backgroundColor: "#0a84ff",
            border: "none",
            borderRadius: 5,
            color: "#fff",
            cursor: "pointer",
            marginBottom: 20,
          }}
          onClick={() => setShowModal(true)}
        >
          Buat Tagihan Baru
        </button>
      )}

      {showModal && (
        <AddTagihanBox
          onClose={() => setShowModal(false)}
          refreshData={() => fetchTagihanByTahun(selectedTahun)}
        />
      )}

      {/* Filter bar */}
      <div
        style={{
          display: "flex",
          gap: "10px",
          marginBottom: 20,
          alignItems: "center",
        }}
      >
        <select
          value={selectedTahun}
          onChange={(e) => setSelectedTahun(e.target.value)}
          style={{
            width: "150px",
            padding: 8,
            borderRadius: 5,
            border: "1px solid #555",

            backgroundColor: "#1a1a1a",
            color: "#eee",
          }}
        >
          <option value="">-- Tahun Ajaran --</option>
          {tahunList.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Cari nama / NIS / kelas..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: "270px",
            padding: 8,
            borderRadius: 5,
            border: "1px solid #555",
            backgroundColor: "#1a1a1a",
            color: "#eee",
          }}
        />

        <select
          value={selectedJenis}
          onChange={(e) => setSelectedJenis(e.target.value)}
          style={{
            width: "170px",
            padding: 8,
            borderRadius: 5,
            border: "1px solid #555",
            backgroundColor: "#1a1a1a",
            color: "#eee",
          }}
        >
          {jenisList.map((j) => (
            <option key={j} value={j}>
              {j}
            </option>
          ))}
        </select>

        {deleteMode && (
          <button
            style={{
              backgroundColor: "#ff3b30",
              border: "none",
              borderRadius: 5,
              color: "#fff",
              padding: "8px 15px",
              cursor: "pointer",
              marginLeft: "auto",
            }}
            onClick={handleDeleteAll}
          >
            Hapus Semua
          </button>
        )}
      </div>

      {/* Daftar Tagihan */}
      <div
        style={{
          backgroundColor: "#111",
          padding: deleteMode ? "20px" : "0px 20px",
          borderRadius: 10,
          border: "1px solid #333",
          maxHeight: deleteMode ? "75vh" : "65vh",
          overflowY: "auto",
          transition: "all 0.4s ease, transform 0.4s ease, opacity 0.4s ease",
          transform: deleteMode ? "translateY(-15px)" : "translateY(0)",
          opacity: deleteMode ? 0.95 : 1,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 15,
          }}
        >
          <h3 style={{ color: "#fff", marginBottom: 15 }}>Daftar Tagihan</h3>
          {deleteMode && selectedItems.length > 0 && (
            <div
              style={{
                marginTop: 15,
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={handleDeleteSelected}
                style={{
                  backgroundColor: "#ff3b30",
                  color: "#fff",
                  border: "none",
                  borderRadius: 5,
                  padding: "10px 20px",
                  cursor: "pointer",
                }}
              >
                Hapus Terpilih ({selectedItems.length})
              </button>
            </div>
          )}
        </div>
        {filteredTagihan.length === 0 ? (
          <p style={{ color: "#ccc", fontStyle: "italic" }}>
            Tidak ada tagihan pada tahun ajaran ini.
          </p>
        ) : (
          <ul style={{ listStyle: "none", paddingLeft: 0 }}>
            {filteredTagihan.map((item) => (
              <li
                key={item.id}
                style={{
                  backgroundColor: "#222",
                  padding: "12px 15px",
                  borderRadius: 6,
                  marginBottom: 10,
                  color: "#eee",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <strong style={{ color: "#dae630ff" }}>
                    {item.jenisTagihan} — Rp{" "}
                    {item.nominal?.toLocaleString("id-ID")}
                  </strong>{" "}
                  <br />
                  <span style={{ color: "#ffffffff", fontSize: 12 }}>
                    {item.nama}{" "}
                    <strong style={{ marginRight: "10px" }}>
                      ( {item.nis} )
                    </strong>{" "}
                    {item.kelas} {item.jurusan}
                  </span>
                </div>
                {deleteMode && (
                  <input
                    type="checkbox"
                    checked={selectedItems.includes(item.id)}
                    onChange={() => toggleSelect(item.id)}
                    style={{
                      transform: "scale(1.3)",
                      accentColor: "#ffe762ff",
                    }}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
