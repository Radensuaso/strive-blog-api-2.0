import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";

// Avatars
export const saveAvatarCloudinary = new CloudinaryStorage({
  cloudinary,
  params: {
    format: "png",
    folder: "striveBlog/avatars",
  },
});

// Covers
export const saveCoverCloudinary = new CloudinaryStorage({
  cloudinary,
  params: {
    format: "png",
    folder: "striveBlog/covers",
  },
});
