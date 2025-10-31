import { db } from "../../firebase";
import { collection, getDocs, query, where, limit } from "firebase/firestore";

export async function getActiveAcademicYear() {
  const q = query(
    collection(db, "tahunAjaran"),
    where("aktif", "==", true),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0].data();
  return d.nama; // "2025/2026"
}
