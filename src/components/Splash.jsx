import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Splash() {
  const navigate = useNavigate();

  useEffect(() => {
    // Timer 3 detik sebelum pindah ke halaman login
    const timer = setTimeout(() => {
      navigate("/login");
    }, 2200);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div style={styles.container}>
      <style>
        {`
          @keyframes fadeInOut {
            0% { opacity: 0; transform: scale(0.9); }
            30% { opacity: 1; transform: scale(1); }
            70% { opacity: 1; transform: scale(1); }
            100% { opacity: 0; transform: scale(1.05); }
          }
          @media (max-width: 600px) {
            video.splash-video {
              width: 80vw !important;
            }
          }
        `}
      </style>

      <video
        className="splash-video"
        src="/splash-simpan.mp4"
        autoPlay
        muted
        playsInline
        style={styles.video}
      />
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "100vh",
    backgroundColor: "#000",
    overflow: "hidden",
  },
  video: {
    width: "400px",
    height: "auto",
    // borderRadius: "12px",
    // opacity: 0,
    // transform: "scale(0.9)",
    // animation: "fadeInOut 3s",
    // objectFit: "cover",
  },
};
