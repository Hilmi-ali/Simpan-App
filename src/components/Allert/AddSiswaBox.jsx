// src/components/Allert/AddSiswaModal.jsx
import React, { useState } from "react";
import { addDoc, collection } from "firebase/firestore";
import { db } from "../../firebase";
import { motion } from "framer-motion";
import { toast } from "react-toastify";

export default function AddSiswaModal({ open, onClose, onSuccess }) {
  const [form, setForm] = useState({
    nis: "",
    nama: "",
    kelas: "",
    jurusan: "",
    telp: "",
    angkatan: "",
    tahunAjaran: "",
  });
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { nis, nama, kelas, jurusan, telp, angkatan, tahunAjaran } = form;

    if (
      !nis ||
      !nama ||
      !kelas ||
      !jurusan ||
      !telp ||
      !angkatan ||
      !tahunAjaran
    ) {
      toast.warn("Semua field harus diisi!");
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, "students"), {
        ...form,
        role: "siswa",
      });
      toast.success(" Siswa berhasil ditambahkan!");
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(" Gagal menambahkan siswa: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <motion.div
        style={styles.container}
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.8, y: -30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h2 style={styles.title}>Tambah Siswa</h2>
        <form onSubmit={handleSubmit} style={styles.formGrid}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>NIS</label>
            <input
              name="nis"
              value={form.nis}
              onChange={handleChange}
              style={styles.input}
            />
          </div>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Nama</label>
            <input
              name="nama"
              value={form.nama}
              onChange={handleChange}
              style={styles.input}
            />
          </div>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Kelas</label>
            <input
              name="kelas"
              placeholder="10 / 11 / 12"
              value={form.kelas}
              onChange={handleChange}
              style={styles.input}
            />
          </div>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Jurusan</label>
            <input
              name="jurusan"
              value={form.jurusan}
              onChange={handleChange}
              style={styles.input}
            />
          </div>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Angkatan</label>
            <input
              name="angkatan"
              placeholder="2024"
              value={form.angkatan}
              onChange={handleChange}
              style={styles.input}
            />
          </div>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Tahun Ajaran</label>
            <input
              name="tahunAjaran"
              placeholder="2025/2026"
              value={form.tahunAjaran}
              onChange={handleChange}
              style={styles.input}
            />
          </div>
          <div style={styles.inputGroup}>
            <label style={styles.label}>No. Telepon</label>
            <input
              name="telp"
              value={form.telp}
              onChange={handleChange}
              style={styles.input}
            />
          </div>

          <div style={styles.actions}>
            <button
              type="button"
              onClick={onClose}
              style={{ ...styles.button, background: "rgba(255,255,255,0.1)" }}
              disabled={loading}
            >
              Batal
            </button>
            <button type="submit" style={styles.button} disabled={loading}>
              {loading ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0, 0, 0, 0.6)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
    backdropFilter: "blur(6px)",
  },
  container: {
    background:
      "linear-gradient(145deg, rgba(30,30,30,0.9), rgba(15,15,15,0.95))",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 20,
    color: "#fff",
    padding: "35px 40px",
    width: "600px",
    display: "flex",
    flexDirection: "column",
  },
  title: {
    fontSize: 24,
    fontWeight: 600,
    textAlign: "center",
    marginBottom: 25,
    letterSpacing: "1px",
    color: "#00aaff",
    textShadow: "0 0 10px rgba(0,150,255,0.7)",
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "15px 20px",
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
  },
  label: {
    fontSize: 13,
    color: "#bbb",
    marginBottom: 4,
  },
  input: {
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.15)",
    background: "rgba(255,255,255,0.08)",
    color: "#fff",
    fontSize: 14,
    outline: "none",
    transition: "0.2s",
  },
  actions: {
    gridColumn: "span 2",
    marginTop: 25,
    display: "flex",
    justifyContent: "flex-end",
    gap: 12,
  },
  button: {
    padding: "10px 22px",
    borderRadius: 8,
    border: "none",
    background: "linear-gradient(90deg, #007aff, #00aaff)",
    color: "#fff",
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 0.2s ease",
    boxShadow: "0 0 10px rgba(0,150,255,0.4)",
  },
};
