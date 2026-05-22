const express = require("express");
const path = require("path");
const dotEnvPath = process.pkg
  ? path.join(path.dirname(process.execPath), ".env")
  : path.join(__dirname, ".env");
require("dotenv").config({ path: dotEnvPath });
const {
  uploadLocal,
  handleLocalPostUpload,
} = require("../services/uploadService");

const router = express.Router();

router.post("/upload-local", uploadLocal.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        msg: "File is required",
        code: 400,
      });
    }

    const fileType = await handleLocalPostUpload(req.file);
    const folder = path.basename(path.dirname(req.file.path));

    res.json({
      success: true,
      msg: "Uploaded to local CDN",
      collection: {
        data: [
          {
            fileUrl: `${process.env.CDN_URL}/uploads/${folder}/${req.file.filename}`,
            fileType,
          },
        ],
      },
      code: 200,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      msg: err.message || "Upload failed",
      code: 500,
    });
  }
});

module.exports = router;
