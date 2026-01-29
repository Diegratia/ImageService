const multer = require("multer");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const fs = require("fs");
const sharp = require("sharp");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");
const supabase = require("../config/supabase");

const tmpDir = os.tmpdir();
const inFile = path.join(tmpDir, `${crypto.randomUUID()}.mp4`);
const outFile = inFile.replace(".mp4", "_c.mp4");

ffmpeg.setFfmpegPath(ffmpegPath);

/* ---------- MIME ---------- */
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const VIDEO_TYPES = ["video/mp4", "video/webm"];
const DOC_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const resolveFolder = (mimetype) => {
  if (IMAGE_TYPES.includes(mimetype)) return "images";
  if (VIDEO_TYPES.includes(mimetype)) return "videos";
  return "documents";
};

const resolveFileType = (mimetype) => {
  if (IMAGE_TYPES.includes(mimetype)) return "Image";
  if (VIDEO_TYPES.includes(mimetype)) return "Video";
  return "Document";
};

/* ---------- LOCAL STORAGE ---------- */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const folder = resolveFolder(file.mimetype);
    const dest = path.join("uploads", folder);
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    cb(null, crypto.randomUUID() + path.extname(file.originalname));
  },
});

const uploadLocal = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
});

/* ---------- COMPRESS ---------- */
const compressImageFile = async (filePath) => {
  await sharp(filePath)
    .jpeg({ quality: 70 })
    .toFile(filePath + ".tmp");
  fs.renameSync(filePath + ".tmp", filePath);
};

const compressVideoFile = (filePath) =>
  new Promise((resolve, reject) => {
    const out = filePath.replace(path.extname(filePath), "_c.mp4");
    ffmpeg(filePath)
      .videoCodec("libx264")
      .size("?x720")
      .outputOptions("-crf 28")
      .save(out)
      .on("end", () => {
        fs.renameSync(out, filePath);
        resolve();
      })
      .on("error", reject);
  });

const handleLocalPostUpload = async (file) => {
  if (IMAGE_TYPES.includes(file.mimetype)) await compressImageFile(file.path);
  if (VIDEO_TYPES.includes(file.mimetype)) await compressVideoFile(file.path);
  return resolveFileType(file.mimetype);
};

/* ---------- SUPABASE ---------- */
const compressImageBuffer = async (buffer) =>
  sharp(buffer).jpeg({ quality: 70 }).toBuffer();

const compressVideoBuffer = async (buffer) => {
  // const inFile = `/tmp/${crypto.randomUUID()}.mp4`;
  // const outFile = inFile.replace(".mp4", "_c.mp4");

  fs.writeFileSync(inFile, buffer);

  await new Promise((resolve, reject) => {
    ffmpeg(inFile)
      .videoCodec("libx264")
      .size("?x720")
      .outputOptions("-crf 28")
      .save(outFile)
      .on("end", resolve)
      .on("error", reject);
  });

  const out = fs.readFileSync(outFile);
  fs.unlinkSync(inFile);
  fs.unlinkSync(outFile);
  return out;
};

async function uploadToSupabase(file) {
  let buffer = file.buffer;

  if (IMAGE_TYPES.includes(file.mimetype)) {
    buffer = await compressImageBuffer(buffer);
  }
  if (VIDEO_TYPES.includes(file.mimetype)) {
    buffer = await compressVideoBuffer(buffer);
  }

  const filename = crypto.randomUUID() + path.extname(file.originalname);
  const folder = resolveFolder(file.mimetype);
  const objectPath = `${folder}/${filename}`;

  const { error } = await supabase.storage
    .from("attachments")
    .upload(objectPath, buffer, {
      contentType: file.mimetype,
    });

  if (error) throw error;

  const { data } = supabase.storage
    .from("attachments")
    .getPublicUrl(objectPath);

  return {
    fileUrl: data.publicUrl.replace(/^https?:\/\//, ""),
    fileType: resolveFileType(file.mimetype),
  };
}

module.exports = {
  uploadLocal,
  handleLocalPostUpload,
  uploadToSupabase,
};

// const multer = require("multer");
// const path = require("path");
// const crypto = require("crypto");
// const fs = require("fs");
// const sharp = require("sharp");
// const ffmpeg = require("fluent-ffmpeg");
// const ffmpegPath = require("ffmpeg-static");
// const supabase = require("../config/supabase");

// ffmpeg.setFfmpegPath(ffmpegPath);

// const UPLOAD_ROOT = "uploads";

// const getFolderByMime = (mimetype) => {
//   if (mimetype.startsWith("image/")) return "images";
//   if (mimetype.startsWith("video/")) return "videos";
//   return "documents";
// };

// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     const folder = getFolderByMime(file.mimetype);
//     const dest = path.join(UPLOAD_ROOT, folder);

//     if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
//     cb(null, dest);
//   },
//   filename: (req, file, cb) => {
//     cb(null, crypto.randomUUID() + path.extname(file.originalname));
//   },
// });

// const upload = multer({
//   storage,
//   limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
// });

// /* ---------- PROCESSING ---------- */

// const compressImage = async (filePath) => {
//   await sharp(filePath)
//     .jpeg({ quality: 70 })
//     .toFile(filePath + "_compressed.jpg");

//   fs.unlinkSync(filePath);
//   fs.renameSync(filePath + "_compressed.jpg", filePath);
// };

// const compressVideo = (filePath) =>
//   new Promise((resolve, reject) => {
//     const output = filePath.replace(path.extname(filePath), "_compressed.mp4");

//     ffmpeg(filePath)
//       .videoCodec("libx264")
//       .size("?x720")
//       .outputOptions("-crf 28")
//       .save(output)
//       .on("end", () => {
//         fs.unlinkSync(filePath);
//         fs.renameSync(output, filePath);
//         resolve();
//       })
//       .on("error", reject);
//   });

// const handlePostUpload = async (file) => {
//   if (file.mimetype.startsWith("image/")) {
//     await compressImage(file.path);
//     return "Image";
//   }

//   if (file.mimetype.startsWith("video/")) {
//     await compressVideo(file.path);
//     return "Video";
//   }

//   return "Document";
// };

// const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
// const VIDEO_TYPES = ["video/mp4", "video/webm"];
// const DOC_TYPES = [
//   "application/pdf",
//   "application/msword",
//   "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
// ];

// function resolveFolder(mimetype) {
//   if (IMAGE_TYPES.includes(mimetype)) return "images";
//   if (VIDEO_TYPES.includes(mimetype)) return "videos";
//   if (DOC_TYPES.includes(mimetype)) return "documents";
//   throw new Error("Unsupported file type");
// }

// function resolveFileType(mimetype) {
//   if (IMAGE_TYPES.includes(mimetype)) return "Image";
//   if (VIDEO_TYPES.includes(mimetype)) return "Video";
//   return "Document";
// }

// async function uploadToSupabase(file) {
//   const ext = path.extname(file.originalname);
//   const filename = crypto.randomUUID() + ext;
//   const folder = resolveFolder(file.mimetype);

//   const filePath = `${folder}/${filename}`;

//   const { error } = await supabase.storage
//     .from("attachments")
//     .upload(filePath, file.buffer, {
//       contentType: file.mimetype,
//       upsert: false,
//     });

//   if (error) throw error;

//   const { data } = supabase.storage.from("attachments").getPublicUrl(filePath);

//   return {
//     fileUrl: data.publicUrl.replace(/^https?:\/\//, ""), // ❌ tanpa protocol
//     fileType: resolveFileType(file.mimetype),
//   };
// }

// module.exports = {};

// module.exports = {
//   upload,
//   handlePostUpload,
//   uploadToSupabase,
// };
