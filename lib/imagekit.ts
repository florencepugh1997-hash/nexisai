// lib/imagekit.ts
import ImageKit from "imagekit"

export const imagekit = new ImageKit({
  publicKey: process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY || "dummy",
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY || "dummy",
  urlEndpoint: process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT || "https://ik.imagekit.io/dummy"
})
