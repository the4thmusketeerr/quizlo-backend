import multer from "multer";

const storage = multer.memoryStorage(); // using memory storage, which means the file is held in your server's RAM as a Buffer object rather than written to disk.

export function upload() {
  return multer({
    storage,
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB max
    },
    fileFilter: (req, file, cb) => {
      const allowedMimes = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
      ];
      if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(
          new Error("Only image files (jpeg, png, gif, webp) are allowed"),
          false,
        );
      }
    },
  });
}


