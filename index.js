const express = require("express");
const path = require("path");
const env = require("./config/env");
const { upload, handlePostUpload } = require("./services/uploadService");

const app = express();

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const fileType = await handlePostUpload(req.file);

    const folder = path.basename(path.dirname(req.file.path));
    const fileUrl = `http://${env.BASE_URL}/uploads/${folder}/${req.file.filename}`;

    return res.status(200).json({
      success: true,
      msg: "File uploaded successfully",
      collection: {
        data: [
          {
            fileUrl,
            fileType,
          },
        ],
      },
      code: 200,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      msg: "Upload failed",
      collection: { data: [] },
      code: 500,
    });
  }
});

app.listen(env.PORT, () => {
  console.log(`🚀 Upload service running on ${env.BASE_URL}`);
});
