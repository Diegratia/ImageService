const path = require("path");
const dotEnvPath = process.pkg 
  ? path.join(path.dirname(process.execPath), ".env") 
  : path.join(__dirname, ".env");
console.log(`🔍 Loading .env from: ${dotEnvPath}`);
require("dotenv").config({ path: dotEnvPath });


const express = require("express");
const cors = require("cors");
const uploadLocal = require("./routes/uploadLocal");
const uploadSupabase = require("./routes/uploadSupabase");
const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const uploadsPath = process.pkg
  ? path.join(path.dirname(process.execPath), "uploads")
  : path.join(__dirname, "uploads");

app.use("/uploads", express.static(uploadsPath));
app.use("/api", uploadLocal);
app.use("/api", uploadSupabase);

app.listen(process.env.PORT, () => {
  console.log(`🚀 Upload service running on ${process.env.PORT}`);
}).on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`❌ Port ${process.env.PORT} is already in use.`);
  } else {
    console.error(`❌ Server error: ${err.message}`);
  }
  process.exit(1);
});

