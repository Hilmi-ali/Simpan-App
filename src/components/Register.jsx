import React, { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, setDoc } from "firebase/firestore";
import { useNavigate, Link } from "react-router-dom";

export default function Register() {
  const [nis, setNis] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const uid = userCredential.user.uid;

      // Simpan NIS dan email di Firestore
      await setDoc(doc(db, "students", uid), {
        nis,
        email,
      });

      setMessage("Registrasi berhasil! Silakan login.");
      navigate("/");
    } catch (error) {
      setMessage("Registrasi gagal: " + error.message);
    }
  };

  return (
    <div style={styles.pageContainer}>
      <form onSubmit={handleRegister} style={styles.formContainer}>
        <h2 style={styles.title}>Daftar</h2>

        <input
          type="text"
          placeholder="NIS"
          value={nis}
          onChange={(e) => setNis(e.target.value)}
          required
          style={styles.input}
        />

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={styles.input}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={styles.input}
        />

        <button type="submit" style={styles.button}>
          Daftar
        </button>

        {message && <p style={styles.message}>{message}</p>}

        <p style={styles.textBelow}>
          Sudah punya akun?{" "}
          <Link to="/" style={styles.link}>
            Masuk di sini
          </Link>
        </p>
      </form>
    </div>
  );
}

const styles = {
  pageContainer: {
    height: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f2f5",
    padding: "20px",
  },
  formContainer: {
    backgroundColor: "#fff",
    padding: "30px 40px",
    borderRadius: "8px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
    width: "320px",
    boxSizing: "border-box",
  },
  title: {
    marginBottom: "24px",
    textAlign: "center",
    color: "#333",
  },
  input: {
    width: "100%",
    padding: "12px 15px",
    marginBottom: "15px",
    borderRadius: "6px",
    border: "1px solid #ccc",
    fontSize: "16px",
    boxSizing: "border-box",
    outline: "none",
    transition: "border-color 0.3s",
  },
  button: {
    width: "100%",
    padding: "12px",
    backgroundColor: "#4a90e2",
    border: "none",
    borderRadius: "6px",
    color: "white",
    fontSize: "16px",
    cursor: "pointer",
    fontWeight: "bold",
  },
  message: {
    marginTop: "15px",
    textAlign: "center",
    color: "#e74c3c",
  },
  textBelow: {
    marginTop: "20px",
    textAlign: "center",
    fontSize: "14px",
    color: "#555",
  },
  link: {
    color: "#4a90e2",
    fontWeight: "bold",
    textDecoration: "none",
    cursor: "pointer",
  },
};
