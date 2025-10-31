import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

export default function Dashboard() {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const uid = localStorage.getItem("uid");
    if (!uid) {
      navigate("/"); // kalau belum login, arahkan ke login
      return;
    }

    const fetchUserData = async () => {
      const docRef = doc(db, "students", uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        setUserData(docSnap.data());
      } else {
        console.error("Data siswa tidak ditemukan.");
      }
      setLoading(false);
    };

    fetchUserData();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
  };

  const handleGoToTagihan = () => {
    navigate("/dashboard-siswa");
  };

  if (loading) return <p style={styles.loading}>Memuat data...</p>;

  return (
    <div style={styles.container}>
      <h2>Dashboard Siswa</h2>
      {userData ? (
        <>
          <p>
            <b>Nama:</b> {userData.nama}
          </p>
          <p>
            <b>NIS:</b> {userData.nis}
          </p>
          <p>
            <b>Nomor WA:</b> {userData.telp}
          </p>

          <button style={styles.button} onClick={handleGoToTagihan}>
            Lihat Tagihan
          </button>
          <br />
          <button style={styles.logoutButton} onClick={handleLogout}>
            Logout
          </button>
        </>
      ) : (
        <p>Data siswa tidak ditemukan.</p>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: 20,
    maxWidth: 400,
    margin: "40px auto",
    textAlign: "center",
    backgroundColor: "#fff",
    borderRadius: 8,
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
  },
  button: {
    marginTop: 20,
    padding: "10px 20px",
    backgroundColor: "#4caf50",
    border: "none",
    borderRadius: 6,
    color: "#fff",
    fontWeight: "bold",
    cursor: "pointer",
  },
  logoutButton: {
    marginTop: 10,
    padding: "10px 20px",
    backgroundColor: "#e74c3c",
    border: "none",
    borderRadius: 6,
    color: "#fff",
    fontWeight: "bold",
    cursor: "pointer",
  },
  loading: {
    textAlign: "center",
    marginTop: 50,
    fontSize: "18px",
  },
};
