import React, { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../firebase";
import { PieChart, Pie, Tooltip, Cell, ResponsiveContainer } from "recharts";

export default function PieChartRAB({ selectedTahun }) {
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);

  const COLORS = ["#7C4DFF", "#00E676", "#FFBB28", "#FF5722", "#03A9F4"];
  const jenisList = [
    "SPP",
    "Uang Gedung",
    "Uang Praktik TJKT",
    "Uang Praktik AKL",
    "Osis & Pramuka",
  ];

  // 🔄 Ambil data tagihan sesuai tahun ajaran yang dikirim dari parent
  useEffect(() => {
    if (!selectedTahun) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const tempData = {};
        jenisList.forEach((j) => (tempData[j] = 0));

        const q = query(
          collection(db, "tagihan"),
          where("tahunAjaran", "==", selectedTahun)
        );
        const snapshot = await getDocs(q);

        console.log(`📊 Tagihan ditemukan (${selectedTahun}):`, snapshot.size);

        snapshot.forEach((doc) => {
          const d = doc.data();
          const jenis = d.jenisTagihan || "Praktik";
          let nominal = parseFloat(d.nominal);

          if (isNaN(nominal)) nominal = 0;
          let key = "";
          if (jenis.includes("spp")) key = "SPP";
          else if (jenis.includes("gedung")) key = "Uang Gedung";
          else if (
            jenis.includes("praktek") &&
            d.jurusan?.toUpperCase().includes("TJKT")
          )
            key = "Uang Praktik TJKT";
          else if (
            jenis.includes("praktek") &&
            d.jurusan?.toUpperCase().includes("AKL")
          )
            key = "Uang Praktik AKL";
          else if (jenis.includes("osis") || jenis.includes("pramuka"))
            key = "OSIS & Pramuka";
          else key = jenis;

          if (!tempData[key]) tempData[key] = 0;
          tempData[key] += nominal;
        });

        const arr = Object.keys(tempData)
          .map((k) => ({
            name: k,
            value: tempData[k],
          }))
          .filter((d) => d.value > 0); // hanya tampilkan yang punya nilai

        setChartData(arr);
      } catch (err) {
        console.error("❌ Gagal mengambil data RAB:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedTahun]);

  return (
    <div
      style={{
        background: "linear-gradient(160deg, #0C0C0C, #181818)",
        padding: 20,
        borderRadius: 12,
        border: "1px solid #333",
        marginTop: 20,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          marginBottom: 16,
          justifyContent: "space-between",
        }}
      >
        <h3 style={{ color: "#fff", fontSize: "14px", fontWeight: "bold" }}>
          Distribusi RAB per Jenis Tagihan ({selectedTahun})
        </h3>
      </div>

      {/* Konten Chart */}
      {loading ? (
        <p style={{ color: "#bbb" }}>Memuat data...</p>
      ) : chartData.length === 0 ? (
        <p style={{ color: "#bbb" }}>
          Tidak ada data tagihan untuk tahun ajaran {selectedTahun}
        </p>
      ) : (
        <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
          {/* Pie Chart */}
          <ResponsiveContainer width="50%" height={200}>
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={75}
                paddingAngle={4}
              >
                {chartData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>

              {/* Tooltip kustom */}
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const { name, value } = payload[0];
                    const total = chartData.reduce((a, b) => a + b.value, 0);
                    const percent = ((value / total) * 100).toFixed(1) + "%";
                    return (
                      <div
                        style={{
                          background: "#222",
                          padding: "6px 10px",
                          borderRadius: 6,
                          color: "#fff",
                        }}
                      >
                        {name}: Rp {value.toLocaleString("id-ID")} ({percent})
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </PieChart>
          </ResponsiveContainer>

          {/* Legend */}
          <div style={{ flex: 1 }}>
            {chartData.map((item, i) => {
              const total = chartData.reduce((a, b) => a + b.value, 0);
              const percent = ((item.value / total) * 100).toFixed(1) + "%";
              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    marginBottom: 8,
                    fontSize: 14,
                    color: "#fff",
                    position: "relative",
                    right: 35,
                  }}
                >
                  <div
                    style={{
                      width: 14,
                      height: 14,
                      background: COLORS[i % COLORS.length],
                      marginRight: 8,
                      marginLeft: 35,

                      borderRadius: 3,
                    }}
                  />
                  <span style={{ width: 60, fontSize: 12 }}>{item.name}</span>
                  <span
                    style={{
                      marginLeft: "auto",
                      marginLeft: 10,
                      fontWeight: "bold",
                    }}
                  >
                    Rp {item.value.toLocaleString("id-ID")}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
