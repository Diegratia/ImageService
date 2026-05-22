const express = require("express");
const multer = require("multer");
const { uploadToSupabase } = require("../services/uploadService");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/upload-cdn", upload.single("file"), async (req, res) => {
  const result = await uploadToSupabase(req.file);

  res.json({
    success: true,
    msg: "Uploaded to Supabase CDN",
    collection: { data: [result] },
    code: 200,
  });
});

module.exports = router;
