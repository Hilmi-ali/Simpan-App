// Login.jsx
import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { color, hover } from "framer-motion";
import { FaUserCircle, FaEye, FaEyeSlash } from "react-icons/fa";

export default function Login() {
  const [nis, setNis] = useState("");
  const [error, setError] = useState("");

  const [hoverAdmin, setHoverAdmin] = useState(false);
  const [isHoverButton, setIsHoverButton] = useState(false);

  // State modal admin
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminCode, setAdminCode] = useState("");
  const [adminError, setAdminError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  //  State untuk cek layar
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);

  // Update state saat layar di-resize
  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const q = query(collection(db, "students"), where("nis", "==", nis));
      const snap = await getDocs(q);

      if (snap.empty) {
        setError("NIS tidak ditemukan");
        return;
      }

      const userDoc = snap.docs[0];
      const userData = { ...userDoc.data(), id: userDoc.id };

      sessionStorage.setItem("studentSession", JSON.stringify(userData));
      navigate("/dashboard-siswa");
    } catch (err) {
      console.error(err);
      setError("Terjadi kesalahan saat login.");
    }
  };

  //  Login admin
  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (adminCode === "RIZKI00") {
      setAdminError("");
      setShowAdminModal(false);
      navigate("/dashboard-bendahara");
    } else {
      setAdminError("Kode admin salah");
    }
  };

  useEffect(() => {
    //  Nonaktifkan scroll body
    document.body.style.overflow = "hidden";
    return () => {
      // scroll normal ketika pindah halaman
      document.body.style.overflow = "auto";
    };
  }, []);
  return (
    <div style={styles.pageContainer}>
      {/* Form siswa */}
      <form onSubmit={handleLogin} style={styles.formContainer}>
        <h2 style={styles.title}>LOGIN</h2>
        <input
          type="text"
          placeholder="Masukkan NIS"
          value={nis}
          onChange={(e) => setNis(e.target.value)}
          required
          style={{ ...styles.input, background: "#000" }}
        />
        <button
          type="submit"
          style={{
            ...styles.button,
            ...(isHoverButton ? styles.buttonHover : {}),
          }}
          onMouseEnter={() => setIsHoverButton(true)}
          onMouseLeave={() => setIsHoverButton(false)}
        >
          MASUK
        </button>
        {error && <p style={styles.message}>{error}</p>}
      </form>

      {isDesktop && (
        <div
          style={styles.adminTooltipContainer}
          onMouseEnter={() => setHoverAdmin(true)}
          onMouseLeave={() => setHoverAdmin(false)}
        >
          <div style={styles.adminIcon} onClick={() => setShowAdminModal(true)}>
            <FaUserCircle size={40} color="#e6e6e6ff" />
          </div>

          <span
            style={{
              ...styles.tooltipAdmin,
              ...(hoverAdmin ? styles.tooltipAdminVisible : {}),
            }}
            aria-hidden={!hoverAdmin}
          >
            Login Admin
          </span>
        </div>
      )}

      {/*  Modal login admin */}
      {showAdminModal && (
        <div
          style={styles.modalOverlay}
          onClick={() => setShowAdminModal(false)}
        >
          <div style={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <h3
              style={{
                color: "#fff",
                marginBottom: "15px",
                textAlign: "center",
                fontSize: "18px",
              }}
            >
              LOGIN ADMIN
            </h3>
            <form onSubmit={handleAdminLogin}>
              <input
                type="password"
                placeholder="Masukkan kode admin"
                value={adminCode}
                onChange={(e) => setAdminCode(e.target.value)}
                style={styles.input}
              />
              <button
                type="submit"
                style={{
                  ...styles.button,
                  ...(isHoverButton ? styles.buttonHover : {}),
                }}
                onMouseEnter={() => setIsHoverButton(true)}
                onMouseLeave={() => setIsHoverButton(false)}
              >
                MASUK
              </button>
            </form>
            {adminError && <p style={styles.message}>{adminError}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  adminTooltipContainer: {
    position: "absolute",
    display: "inline-block",
    bottom: "10px",
    left: "20px",
    cursor: "pointer",
    zIndex: 10000,
  },
  adminIcon: {
    padding: 4,
    borderRadius: 6,
  },

  tooltipAdmin: {
    visibility: "hidden",
    opacity: 0,
    transform: "translateX(10%) translateY(0%)",
    transition:
      "opacity 180ms ease, transform 180ms ease, visibility 0ms linear 180ms",
    position: "absolute",
    bottom: "100%",
    left: "50%",
    transformOrigin: "left bottom",
    backgroundColor: "#333",
    color: "#fff",
    padding: "6px 8px",
    borderRadius: 6,
    whiteSpace: "nowrap",
    fontSize: 12,
    boxShadow: "0 6px 18px rgba(0,0,0,0.4)",
    pointerEvents: "none",
    marginBottom: "8px",
  },

  tooltipAdminVisible: {
    visibility: "visible",
    opacity: 1,
    transform: "translateX(90%) translateY(-300%)",
    transitionDelay: "0ms",
  },
  pageContainer: {
    height: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
    padding: "20px",

    position: "relative",
  },
  formContainer: {
    backgroundColor: "#000",
    padding: "30px 40px",
    borderRadius: "8px",
    boxShadow: "0 4px 12px rgba(50, 50, 50, 0.1)",
    width: "260px",
    bottom: 40,
    position: "relative",
    boxSizing: "border-box",
    border: "1px solid rgba(63, 63, 63, 0.6)",
  },
  title: {
    marginBottom: "24px",
    textAlign: "center",
    color: "#fff",
    fontSize: "17px",
  },
  input: {
    width: "100%",
    padding: "12px 15px",
    marginBottom: "15px",
    borderRadius: "6px",
    background: "linear-gradient(to right, #000, #000)",
    color: "#fff",
    height: "40px",
    border: "1px solid #ccc",
    fontSize: "16px",
    boxSizing: "border-box",
    outline: "none",
  },
  button: {
    width: "100%",
    padding: "12px",
    backgroundColor: "#CEFE06",
    border: "none",
    height: "40px",
    borderRadius: "6px",
    color: "#000000ff",
    fontSize: "13px",
    cursor: "pointer",
    fontWeight: "bold",
    transition: "0.2s",
  },
  buttonHover: {
    backgroundColor: "#2d311dff",
    color: "#deff58ff",
  },
  message: {
    marginTop: "15px",
    textAlign: "center",
    color: "#e74c3c",
  },
  adminIcon: {
    position: "absolute",
    bottom: "60px",
    left: "20px",
    cursor: "pointer",
  },
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
  },
  modalBox: {
    backgroundColor: "#151515ff",
    padding: "25px",
    borderRadius: "8px",
    width: "280px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
    border: "1px solid rgba(63,63,63,0.6)",
  },
};
