const express = require("express");
const midtransClient = require("midtrans-client");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// Konfigurasi Midtrans Sandbox
let snap = new midtransClient.Snap({
  isProduction: false,
  serverKey: "SB-Mid-server-VW239LGcxw5gLF20bcY2mIHg",
});

// Endpoint buat Snap Token
app.post("/create-transaction", async (req, res) => {
  try {
    const { orderId, amount, nama, email, telp } = req.body;
    console.log("Req.body:", req.body);

    if (!orderId || !amount) {
      return res.status(400).json({ error: "orderId dan amount wajib diisi" });
    }

    const parameter = {
      transaction_details: {
        order_id: orderId,
        gross_amount: amount,
      },
      customer_details: {
        first_name: nama || "Siswa",
        email: email || "siswa@example.com",
        phone: telp || "08123456789",
      },
    };

    console.log("Parameter Midtrans:", parameter); // <-- debug

    const transaction = await snap.createTransaction(parameter);

    console.log("Transaction Response:", transaction); // <-- debug
    res.json({ token: transaction.token });
  } catch (error) {
    console.error("Error Midtrans:", error); // <-- tampilkan error
    res.status(500).json({ error: error.message });
  }
});

app.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});
