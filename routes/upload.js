const express = require("express");
const multer = require("multer");
const { uploadToSupabase } = require("../services/uploadService");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/upload-cdn", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        msg: "File is required",
        code: 400,
      });
    }

    const result = await uploadToSupabase(req.file);

    res.json({
      success: true,
      msg: "File uploaded successfully",
      collection: {
        data: [result],
      },
      code: 200,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      msg: err.message,
      code: 400,
    });
  }
});

module.exports = router;
