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
const IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic", // iPhone
  "image/heif", // iPhone
  "image/gif", // optional (Android sering kirim GIF)
];

const VIDEO_TYPES = [
  "video/mp4", // Android + iPhone
  "video/webm", // Android
  "video/quicktime", // iPhone (.mov)
  "video/x-matroska", // .mkv (kadang Android)
  "video/3gpp", // Android lama (.3gp)
];

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
const compressImageFile = async (filePath, mimetype) => {
  const ext = path.extname(filePath).toLowerCase();
  let targetExt = ext;
  let sharpInstance = sharp(filePath);

  if (mimetype === "image/png") {
    // PNG Optimization: retain transparency & sharpness
    sharpInstance = sharpInstance.png({
      quality: 80,
      compressionLevel: 9,
      palette: true
    });
  } else if (mimetype === "image/webp") {
    // Compress as WebP
    sharpInstance = sharpInstance.webp({ quality: 70 });
  } else if (mimetype === "image/gif") {
    // Compress as GIF
    sharpInstance = sharpInstance.gif();
  } else {
    // For JPEG, HEIC, HEIF, etc., convert to standard JPEG
    sharpInstance = sharpInstance.jpeg({ quality: 70 });
    // If original extension is not .jpg/.jpeg (like .heic/.heif), change extension physically to .jpg
    if (ext !== ".jpg" && ext !== ".jpeg") {
      targetExt = ".jpg";
    }
  }

  const tmpPath = filePath + ".tmp";
  await sharpInstance.toFile(tmpPath);

  let newFilePath = filePath;
  if (targetExt !== ext) {
    newFilePath = filePath.replace(new RegExp(ext + "$", "i"), targetExt);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath); // delete original with old extension
    if (fs.existsSync(newFilePath)) fs.unlinkSync(newFilePath); // clear any existing target file
    fs.renameSync(tmpPath, newFilePath);
  } else {
    fs.renameSync(tmpPath, filePath);
  }

  return { newFilePath, changed: targetExt !== ext };
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
      .on("error", (err) => {
        if (fs.existsSync(out)) fs.unlinkSync(out);
        reject(err);
      });
  });

const handleLocalPostUpload = async (file) => {
  if (IMAGE_TYPES.includes(file.mimetype)) {
    const result = await compressImageFile(file.path, file.mimetype);
    if (result.changed) {
      // Dynamic update of Express/Multer file metadata so the API returns the correct .jpg path
      file.path = result.newFilePath;
      file.filename = path.basename(result.newFilePath);
    }
  }
  if (VIDEO_TYPES.includes(file.mimetype)) {
    await compressVideoFile(file.path);
  }
  return resolveFileType(file.mimetype);
};

/* ---------- SUPABASE ---------- */
// const compressImageBuffer = async (buffer) =>
//   sharp(buffer).jpeg({ quality: 70 }).toBuffer();

// const compressVideoBuffer = async (buffer) => {
//   // const inFile = `/tmp/${crypto.randomUUID()}.mp4`;
//   // const outFile = inFile.replace(".mp4", "_c.mp4");

//   fs.writeFileSync(inFile, buffer);

//   await new Promise((resolve, reject) => {
//     ffmpeg(inFile)
//       .videoCodec("libx264")
//       .size("?x720")
//       .outputOptions("-crf 28")
//       .save(outFile)
//       .on("end", resolve)
//       .on("error", reject);
//   });

//   const out = fs.readFileSync(outFile);
//   fs.unlinkSync(inFile);
//   fs.unlinkSync(outFile);
//   return out;
// };

// async function uploadToSupabase(file) {
//   let buffer = file.buffer;

//   if (IMAGE_TYPES.includes(file.mimetype)) {
//     buffer = await compressImageBuffer(buffer);
//   }
//   if (VIDEO_TYPES.includes(file.mimetype)) {
//     buffer = await compressVideoBuffer(buffer);
//   }

//   const filename = crypto.randomUUID() + path.extname(file.originalname);
//   const folder = resolveFolder(file.mimetype);
//   const objectPath = `${folder}/${filename}`;

//   const { error } = await supabase.storage
//     .from("attachments")
//     .upload(objectPath, buffer, {
//       contentType: file.mimetype,
//     });

//   if (error) throw error;

//   const { data } = supabase.storage
//     .from("attachments")
//     .getPublicUrl(objectPath);

//   return {
//     fileUrl: data.publicUrl.replace(/^https?:\/\//, ""),
//     fileType: resolveFileType(file.mimetype),
//   };
// }

module.exports = {
  uploadLocal,
  handleLocalPostUpload,
  // uploadToSupabase,
};
