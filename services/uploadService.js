const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
const fs = require("fs");
const sharp = require("sharp");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");
const supabase = require("../config/supabase");

ffmpeg.setFfmpegPath(ffmpegPath);

const UPLOAD_ROOT = "uploads";

const getFolderByMime = (mimetype) => {
  if (mimetype.startsWith("image/")) return "images";
  if (mimetype.startsWith("video/")) return "videos";
  return "documents";
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const folder = getFolderByMime(file.mimetype);
    const dest = path.join(UPLOAD_ROOT, folder);

    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    cb(null, crypto.randomUUID() + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

/* ---------- PROCESSING ---------- */

const compressImage = async (filePath) => {
  await sharp(filePath)
    .jpeg({ quality: 70 })
    .toFile(filePath + "_compressed.jpg");

  fs.unlinkSync(filePath);
  fs.renameSync(filePath + "_compressed.jpg", filePath);
};

const compressVideo = (filePath) =>
  new Promise((resolve, reject) => {
    const output = filePath.replace(path.extname(filePath), "_compressed.mp4");

    ffmpeg(filePath)
      .videoCodec("libx264")
      .size("?x720")
      .outputOptions("-crf 28")
      .save(output)
      .on("end", () => {
        fs.unlinkSync(filePath);
        fs.renameSync(output, filePath);
        resolve();
      })
      .on("error", reject);
  });

const handlePostUpload = async (file) => {
  if (file.mimetype.startsWith("image/")) {
    await compressImage(file.path);
    return "Image";
  }

  if (file.mimetype.startsWith("video/")) {
    await compressVideo(file.path);
    return "Video";
  }

  return "Document";
};

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const VIDEO_TYPES = ["video/mp4", "video/webm"];
const DOC_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

function resolveFolder(mimetype) {
  if (IMAGE_TYPES.includes(mimetype)) return "images";
  if (VIDEO_TYPES.includes(mimetype)) return "videos";
  if (DOC_TYPES.includes(mimetype)) return "documents";
  throw new Error("Unsupported file type");
}

function resolveFileType(mimetype) {
  if (IMAGE_TYPES.includes(mimetype)) return "Image";
  if (VIDEO_TYPES.includes(mimetype)) return "Video";
  return "Document";
}

async function uploadToSupabase(file) {
  const ext = path.extname(file.originalname);
  const filename = crypto.randomUUID() + ext;
  const folder = resolveFolder(file.mimetype);

  const filePath = `${folder}/${filename}`;

  const { error } = await supabase.storage
    .from("attachments")
    .upload(filePath, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
    });

  if (error) throw error;

  const { data } = supabase.storage.from("attachments").getPublicUrl(filePath);

  return {
    fileUrl: data.publicUrl.replace(/^https?:\/\//, ""), // ❌ tanpa protocol
    fileType: resolveFileType(file.mimetype),
  };
}

module.exports = {};

module.exports = {
  upload,
  handlePostUpload,
  uploadToSupabase,
};
