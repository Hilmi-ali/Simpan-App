import React from "react";

export default function NotFound() {
  const [isMobile, setIsMobile] = React.useState(window.innerWidth < 600);

  React.useEffect(() => {
    // Animasi keyframes
    const style = document.createElement("style");
    style.innerHTML = `
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes noiseMove {
        0% { transform: translate(0, 0); }
        10% { transform: translate(-5%, -5%); }
        20% { transform: translate(-10%, 5%); }
        30% { transform: translate(5%, -10%); }
        40% { transform: translate(-5%, 15%); }
        50% { transform: translate(-10%, 5%); }
        60% { transform: translate(15%, 0); }
        70% { transform: translate(0, 10%); }
        80% { transform: translate(-15%, 0); }
        90% { transform: translate(10%, 5%); }
        100% { transform: translate(5%, 0); }
      }
    `;
    document.head.appendChild(style);

    // Responsif listener
    const handleResize = () => setIsMobile(window.innerWidth < 600);
    window.addEventListener("resize", handleResize);

    return () => {
      style.remove();
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const responsiveStyles = {
    box: {
      ...styles.box,
      padding: isMobile ? "28px 20px" : "40px 30px",
      maxWidth: isMobile ? "60%" : "600px",
      textAlign: isMobile ? "center" : "left",
    },
    h1: {
      ...styles.h1,
      fontSize: isMobile ? "2.2rem" : "3rem",
    },
    nf: {
      ...styles.nf,
      fontSize: isMobile ? "1rem" : "1.5rem",
      display: "block",
      marginTop: isMobile ? "8px" : 0,
    },
    output: {
      ...styles.output,
      fontSize: isMobile ? "0.9rem" : "1.1rem",
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.noise}></div>
      <div style={styles.overlay}></div>
      <div style={responsiveStyles.box}>
        <h1 style={responsiveStyles.h1}>
          Error <span style={styles.errorcode}>404</span>
          <span style={responsiveStyles.nf}> - Page Not Found -</span>
        </h1>
        <p style={responsiveStyles.output}>
          Halaman yang kamu cari mungkin telah dipindahkan, dihapus, atau tidak
          pernah ada 🕳️
        </p>
        <p style={responsiveStyles.output}>
          <a
            href="/"
            style={styles.link}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = styles.linkHover.backgroundColor;
              e.target.style.color = styles.linkHover.color;
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = styles.link.backgroundColor;
              e.target.style.color = styles.link.color;
            }}
          >
            LOGIN ULANG
          </a>
        </p>
        <p style={styles.outputs}>#Sistem Bendahara Sekolah</p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    background: "#0c0c0c",
    color: "#00ff99",
    fontFamily: "'Inconsolata', monospace",
    height: "100vh",
    overflow: "hidden",
    margin: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    flexDirection: "column",
    textAlign: "center",
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    background: "rgba(0,0,0,0.25)",
    zIndex: 1,
    pointerEvents: "none",
  },
  box: {
    position: "relative",
    zIndex: 2,
    background: "rgba(10, 10, 10, 0.85)",
    borderRadius: 14,
    border: "1px solid #00ff99",
    boxShadow: "0 0 20px rgba(0, 255, 100, 0.15)",
    animation: "fadeIn 0.6s ease-in",
  },
  h1: {
    marginBottom: "1rem",
    color: "#00ff99",
  },
  errorcode: {
    color: "#ff0066",
  },
  nf: {
    color: "#ffffff",
  },
  output: {
    margin: "20px 0",
    lineHeight: 1.5,
  },
  outputs: {
    fontSize: "1rem",
    margin: "20px 0",
    lineHeight: 1.5,
    position: "relative",
    top: "45px",
    textAlign: "center",
    color: "#00ff99",
  },
  link: {
    color: "#000",
    backgroundColor: "#00ff99",
    padding: "8px 16px",
    borderRadius: "8px",
    fontWeight: "bold",
    textDecoration: "none",
    transition: "0.3s",
    display: "inline-block",
  },
  linkHover: {
    color: "#00ff99",
    backgroundColor: "#000",
  },
  noise: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    background:
      "repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.05) 0, rgba(0, 0, 0, 0.05) 1px, transparent 1px, transparent 2px)",
    zIndex: 0,
    animation: "noiseMove 1s steps(8) infinite",
    pointerEvents: "none",
  },
};
