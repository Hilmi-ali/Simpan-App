import React from "react";
import { useLocation, useNavigate } from "react-router-dom";

export default function HasilTransaksi() {
  const location = useLocation();
  const navigate = useNavigate();
  const data = location.state || {};

  // Data default kalau state kosong
  const {
    nama = "Nama Siswa",
    nis = "000000",
    jenisTagihan = "SPP",
    jumlah = 0,
    tanggal = "01-01-2025",
    jam = "00:00",
    metode = "Transfer",
    paymentId = "INV-" + Math.random().toString(36).substr(2, 8).toUpperCase(),
  } = data;

  return (
    <div style={styles.container}>
      <div style={styles.iconWrapper}>
        <div style={styles.checkIcon}>✔</div>
      </div>
      <h2 style={styles.title}>Pembayaran Berhasil!</h2>

      {/* Nominal transaksi dan tujuan pembayaran */}
      <div style={styles.amountWrapper}>
        <div style={styles.amount}>Rp {Number(jumlah).toLocaleString()}</div>
        <div style={styles.paymentFor}>
          <strong>{jenisTagihan}</strong>
        </div>
      </div>

      {/* Card detail transaksi */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <span>ID Transaksi</span>
          <strong>{paymentId}</strong>
        </div>
        <div style={styles.detailItem}>
          <span>Nama Siswa</span>
          <strong>{nama}</strong>
        </div>
        <div style={styles.detailItem}>
          <span>NIS</span>
          <strong>{nis}</strong>
        </div>
        <div style={styles.detailItem}>
          <span>Tanggal Pembayaran</span>
          <strong>{tanggal}</strong>
        </div>
        <div style={styles.detailItem}>
          <span>Jam</span>
          <strong>{jam}</strong>
        </div>
        <div style={styles.detailItem}>
          <span>Metode</span>
          <strong>{metode}</strong>
        </div>
      </div>

      <button
        style={styles.button}
        onClick={() => navigate("/dashboard-siswa")}
      >
        Kembali ke Dashboard
      </button>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    backgroundColor: "#1c1c1e",
    color: "#fff",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    paddingTop: "30px",
    paddingBottom: "40px",
  },
  iconWrapper: {
    width: "80px",
    height: "80px",
    borderRadius: "50%",
    backgroundColor: "#2ecc71",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: "10px",
  },
  checkIcon: {
    fontSize: "36px",
    color: "#fff",
    fontWeight: "bold",
  },
  title: {
    fontSize: "22px",
    fontWeight: "bold",
    marginBottom: "25px",
  },
  amountWrapper: {
    marginBottom: "30px",
    textAlign: "center",
  },
  amount: {
    fontSize: "28px",
    fontWeight: "bold",
    color: "#2ecc71",
    marginBottom: "5px",
  },
  paymentFor: {
    fontSize: "16px",
    color: "#aaa",
  },
  card: {
    backgroundColor: "#2c2c2e",
    borderRadius: "10px",
    padding: "20px",
    width: "90%",
    maxWidth: "400px",
    boxShadow: "0 4px 10px rgba(0,0,0,0.5)",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    padding: "10px 0",
    borderBottom: "1px solid #3a3a3c",
    fontSize: "14px",
    marginBottom: "15px",
    fontWeight: "bold",
  },
  detailItem: {
    display: "flex",
    justifyContent: "space-between",
    padding: "12px 0",
    fontSize: "14px",
    borderBottom: "1px solid #3a3a3c",
  },
  button: {
    marginTop: "30px",
    backgroundColor: "#0a84ff",
    border: "none",
    padding: "12px 20px",
    borderRadius: "8px",
    color: "#fff",
    fontWeight: "bold",
    cursor: "pointer",
    width: "90%",
    maxWidth: "400px",
  },
};
