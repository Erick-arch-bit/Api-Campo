import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export { cloudinary }

const CLOUD = process.env.CLOUDINARY_CLOUD_NAME

// Thumbnails para el dashboard — NO descargar imágenes de 4MB
export const thumbUrl  = (pid: string) =>
  `https://res.cloudinary.com/${CLOUD}/image/upload/c_fill,w_80,h_80,q_auto,f_auto/${pid}`
export const mediumUrl = (pid: string) =>
  `https://res.cloudinary.com/${CLOUD}/image/upload/c_scale,w_400,q_auto,f_auto/${pid}`
export const fullUrl   = (pid: string) =>
  `https://res.cloudinary.com/${CLOUD}/image/upload/c_limit,w_1200,q_auto,f_auto/${pid}`
export const firmaUrl  = (pid: string) =>
  `https://res.cloudinary.com/${CLOUD}/image/upload/c_scale,w_300,e_grayscale,q_auto/${pid}`
