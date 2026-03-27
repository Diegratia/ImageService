require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const uploadLocal = require("./routes/uploadLocal");
const uploadSupabase = require("./routes/uploadSupabase");
const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/api", uploadLocal);
app.use("/api", uploadSupabase);

app.listen(process.env.PORT, () => {
  console.log(`🚀 Upload service running on ${process.env.PORT}`);
});

