import React, { useEffect, useState } from "react";

export default function LostInternet() {
  const [isOnline, setIsOnline] = useState(window.navigator.onLine);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("resize", handleResize);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div data-lostinternet style={styles.overlay}>
      <div style={styles.container}>
        <div style={styles.icon}>📡</div>
        <h1 style={styles.title}>Koneksi Terputus</h1>
        <p style={styles.subtitle}>
          Sinyalmu hilang di tengah perjalanan data 💀
        </p>
        <button onClick={() => window.location.reload()} style={styles.button}>
          🔁 Muat Ulang
        </button>
        {/* tampilkan footer di dalam box jika desktop */}
        {!isMobile && (
          <p style={styles.footer}>#Sistem Bendahara SMK Diponegoro Cipari</p>
        )}
      </div>

      {/* tampilkan footer di bawah layar jika HP */}
      {isMobile && (
        <p style={styles.footerMobile}>
          #Sistem Bendahara SMK Diponegoro Cipari
        </p>
      )}

      <div style={styles.bgEffect}></div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    padding: "0px 40px",
    inset: 0,
    background: "radial-gradient(circle at 30% 20%, #050505 0%, #000 100%)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "column",
    zIndex: 9999,
    fontFamily: "'Fira Code', monospace",
    color: "#e0e0e0",
  },
  container: {
    textAlign: "center",
    padding: "2.5rem 2rem",
    background: "rgba(20, 20, 20, 0.9)",
    borderRadius: "20px",
    border: "1px solid #00ffaa33",
    boxShadow: "0 0 25px #00ffaa22",
    backdropFilter: "blur(6px)",
    zIndex: 2,
    animation: "fadeIn 0.8s ease",
    width: "90%",
    maxWidth: "420px",
  },
  icon: {
    fontSize: "4rem",
    color: "#00ffaa",
    marginBottom: "1rem",
    textShadow: "0 0 25px #00ffaa88",
    animation: "pulse 2s infinite ease-in-out",
  },
  title: {
    fontSize: "2rem",
    color: "#00ffaa",
    marginBottom: "0.5rem",
    letterSpacing: "1px",
  },
  subtitle: {
    fontSize: "1rem",
    color: "#bbb",
    marginBottom: "2rem",
  },
  button: {
    background: "linear-gradient(90deg, #00ffaa, #00ccff)",
    color: "#000",
    border: "none",
    padding: "12px 28px",
    borderRadius: "10px",
    fontWeight: "bold",
    cursor: "pointer",
    transition: "0.3s",
    boxShadow: "0 0 15px #00ffaa55",
  },
  buttonHover: {
    background: "linear-gradient(90deg, #00ccff, #00ffaa)",
  },
  footer: {
    marginTop: "2.5rem",
    fontSize: "0.75rem",
    color: "#666",
  },
  footerMobile: {
    position: "absolute",
    bottom: "15px",
    fontSize: "0.8rem",
    color: "#666",
    textAlign: "center",
  },
  bgEffect: {
    position: "absolute",
    width: "100%",
    height: "100%",
    background:
      "repeating-linear-gradient(45deg, rgba(0,255,170,0.05) 0, rgba(0,255,170,0.05) 2px, transparent 2px, transparent 6px)",
    animation: "moveNoise 5s linear infinite",
    zIndex: 1,
  },
};

const styleSheet = document.createElement("style");
styleSheet.innerHTML = `
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(15px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes pulse {
  0%, 100% { opacity: 0.9; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.1); }
}
@keyframes moveNoise {
  from { background-position: 0 0; }
  to { background-position: 100px 100px; }
}
@media (max-width: 768px) {
  div[data-lostinternet] h1 { font-size: 1.5rem ; }
  div[data-lostinternet] p { font-size: 0.9rem ; }
  div[data-lostinternet] button { padding: 10px 22px ; font-size: 0.9rem ; }
}
`;
document.head.appendChild(styleSheet);
