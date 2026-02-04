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

// const express = require("express");
// const path = require("path");
// const env = require("./config/env");
// const uploadRoute = require("./routes/upload");
// const { upload, handlePostUpload } = require("./services/uploadService");

// const app = express();

// app.use("/uploads", express.static(path.join(__dirname, "uploads")));
// app.use("/api", uploadRoute);

// app.post("/upload", upload.single("file"), async (req, res) => {
//   try {
//     const fileType = await handlePostUpload(req.file);

//     const folder = path.basename(path.dirname(req.file.path));
//     const fileUrl = `http://${env.BASE_URL}/uploads/${folder}/${req.file.filename}`;

//     return res.status(200).json({
//       success: true,
//       msg: "File uploaded successfully",
//       collection: {
//         data: [
//           {
//             fileUrl,
//             fileType,
//           },
//         ],
//       },
//       code: 200,
//     });
//   } catch (err) {
//     console.error(err);
//     return res.status(500).json({
//       success: false,
//       msg: "Upload failed",
//       collection: { data: [] },
//       code: 500,
//     });
//   }
// });

// app.listen(env.PORT, () => {
//   console.log(`🚀 Upload service running on ${env.BASE_URL}`);
// });
