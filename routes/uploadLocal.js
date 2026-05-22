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
});

module.exports = router;
