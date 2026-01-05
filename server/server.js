// server/server.js
import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

let latestData = {};
let lastReceivedAt = null;

app.post("/sensordata", (req, res) => {
  const data = req.body;
  if (!data || Object.keys(data).length === 0) {
    return res.status(400).json({ status: "error", message: "Empty payload" });
  }
  latestData = data;
  lastReceivedAt = Date.now();
  console.log("📦 Data received:", latestData);
  res.json({ status: "ok" });
});

app.get("/sensordata", (req, res) => {
  res.json({ data: latestData, receivedAt: lastReceivedAt });
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`🚀 Node server running at http://localhost:${PORT}`);
});
