import React, { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../firebase";
import { PieChart, Pie, Tooltip, Cell, ResponsiveContainer } from "recharts";

export default function PieChartSiswa() {
  const [siswaList, setSiswaList] = useState([]);
  const [tahunList, setTahunList] = useState([]);
  const [selectedTahun, setSelectedTahun] = useState("");
  const [chartData, setChartData] = useState([]);

  const COLORS = [
    "#00C49F",
    "#FF8042",
    "#ffc658",
    "#FF8042",
    "#00C49F",
    "#FFBB28",
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const q = query(
          collection(db, "students"),
          where("role", "==", "siswa")
        );
        const snap = await getDocs(q);

        // Ambil hanya siswa yang tidak "LULUS"
        const data = snap.docs
          .map((d) => ({ uid: d.id, ...d.data() }))
          .filter(
            (s) =>
              s.kelas &&
              s.kelas.trim().toUpperCase() !== "LULUS" &&
              s.tahunAjaran
          );

        setSiswaList(data);

        // Buat list tahun ajaran unik
        const tahunSet = [...new Set(data.map((s) => s.tahunAjaran))];
        setTahunList(tahunSet);

        // Default pilih tahun terakhir
        if (tahunSet.length > 0) {
          setSelectedTahun(tahunSet[tahunSet.length - 1]);
        }
      } catch (err) {
        console.error("Gagal ambil data siswa:", err);
      }
    };

    fetchData();
  }, []);

  // 🔄 Update chart berdasarkan tahun ajaran
  useEffect(() => {
    if (!selectedTahun) return;
    const filtered = siswaList.filter(
      (s) =>
        (s.tahunAjaran || "").trim().toLowerCase() ===
        (selectedTahun || "").trim().toLowerCase()
    );

    const kelasCount = {};
    filtered.forEach((s) => {
      const kelas = (s.kelas || "").trim();
      if (kelas && kelas.toUpperCase() !== "LULUS") {
        kelasCount[kelas] = (kelasCount[kelas] || 0) + 1;
      }
    });

    const chartFormat = Object.keys(kelasCount).map((kelas) => ({
      name: kelas,
      value: kelasCount[kelas],
    }));

    setChartData(chartFormat);
  }, [selectedTahun, siswaList]);

  return (
    <div
      style={{
        background: "#0C0C0C",
        padding: 20,
        borderRadius: 12,
        marginTop: 20,
      }}
    >
      <div
        style={{
          display: "flex",
          // justifyContent: "space-between",
          // marginBottom: 16,
          position: "relative",
          bottom: "45px",
        }}
      >
        <h3 style={{ color: "#fff", fontSize: "14px" }}>Jumlah Siswa</h3>
        <select
          value={selectedTahun}
          onChange={(e) => setSelectedTahun(e.target.value)}
          style={{
            padding: 4,
            marginLeft: 10,
            borderRadius: 6,
            background: "#0C0C0C",
            color: "#fff",
            fontSize: 10,
            marginTop: 8,
            height: 35,
            width: 80,
            border: "1px solid #444",
          }}
        >
          {tahunList.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {chartData.length === 0 ? (
        <p style={{ color: "#aaa" }}>
          Belum ada data siswa untuk tahun ajaran {selectedTahun}
        </p>
      ) : (
        <div
          style={{ display: "flex", gap: 20, position: "relative", bottom: 20 }}
        >
          {/* Pie Chart */}
          <ResponsiveContainer width="50%" height={130}>
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={39}
                outerRadius={65}
                paddingAngle={5}
              >
                {chartData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const { name, value } = payload[0];
                    const total = chartData.reduce((a, b) => a + b.value, 0);
                    const percent = ((value / total) * 100).toFixed(2) + "%";
                    return (
                      <div
                        style={{
                          background: "#222",
                          padding: "6px 10px",
                          borderRadius: 6,
                          color: "#fff",
                        }}
                      >
                        Kelas {name} ({value} siswa) ({percent})
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </PieChart>
          </ResponsiveContainer>

          {/* Legend List */}
          <div style={{ flex: 1 }}>
            {chartData.map((item, i) => {
              const total = chartData.reduce((a, b) => a + b.value, 0);
              const percent = ((item.value / total) * 100).toFixed(2) + "%";
              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    marginBottom: 8,
                    color: "#fff",
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
                  <span style={{ display: "flex" }}>{item.name}</span>
                  <span style={{ marginLeft: "auto" }}>
                    {item.value} Siswa
                    {/* ({percent}) */}
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
