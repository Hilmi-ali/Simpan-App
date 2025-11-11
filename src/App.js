import logo from "./logo.svg";
import "./App.css";
import React from "react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./components/Login";
import Register from "./components/Register";
import Dashboard from "./components/Dashboard";
import DashboardBendahara from "./components/Bendahara/DashboardBendahara";
import KelolaTagihan from "./components/Bendahara/KelolaTagihan";
import DashboardSiswa from "./components/Siswa/DashboardSiswa";
import HasilTransaksi from "./components/Siswa/Invoice";
import BuatTagihan from "./components/Bendahara/BuatTagihan";
import TahunAjaranManage from "./components/Bendahara/TahunAjaranManage";
import DataRiwayat from "./components/Siswa/DataRiwayat";
import NotFound from "./components/utils/NotFound";
import Splash from "./components/Splash";
import LostInternet from "./components/utils/LostInternet";
// import { ThemeProvider } from "./components/utils/ThemeContext";

function App() {
  return (
    <Router>
      <ToastContainer position="top-right" autoClose={3000} />
      <LostInternet />
      <Routes>
        <Route path="/" element={<Splash />} />
        <Route path="login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/dashboard-bendahara" element={<DashboardBendahara />} />
        <Route path="/buat-tagihan" element={<BuatTagihan />} />
        <Route path="/kelola-tagihan/:uid" element={<KelolaTagihan />} />
        <Route path="/dashboard-siswa" element={<DashboardSiswa />} />
        <Route path="/struk-pembayaran" element={<HasilTransaksi />} />
        <Route path="/set-tahun-ajaran" element={<TahunAjaranManage />} />
        <Route path="/tagihan/:tagihanId/riwayat" element={<DataRiwayat />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

export default App;
