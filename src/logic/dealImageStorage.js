import {
  deleteObject,
  getDownloadURL,
  listAll,
  ref,
  uploadBytes,
} from "firebase/storage";
import { storage } from "../firebase.js";

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_IMAGES_PER_DEAL = 20;

function requireStorage() {
  if (!storage) throw new Error("Firebase Storage is not configured.");
}

function sanitizeFileName(name) {
  return String(name || "image")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .slice(0, 80) || "image";
}

function getDealImagesFolderPath(ownerUid, dealId) {
  if (!ownerUid) throw new Error("ownerUid is required.");
  if (!dealId) throw new Error("dealId is required.");
  return `deal-images/${ownerUid}/${dealId}`;
}

function getFileNameFromFullPath(fullPath) {
  const idx = fullPath.lastIndexOf("/");
  return idx >= 0 ? fullPath.slice(idx + 1) : fullPath;
}

function buildListItem(itemRef, downloadURL, index) {
  const fileName = getFileNameFromFullPath(itemRef.fullPath);
  return {
    id: itemRef.fullPath,
    name: fileName,
    downloadURL,
    fullPath: itemRef.fullPath,
    createdAt: `img-${index}`,
  };
}

async function listDealImageRefs(ownerUid, dealId) {
  requireStorage();
  const folderRef = ref(storage, getDealImagesFolderPath(ownerUid, dealId));
  const listed = await listAll(folderRef);
  return listed.items;
}

async function buildImageListFromRefs(refs) {
  const urls = await Promise.all(refs.map((itemRef) => getDownloadURL(itemRef)));
  return refs.map((itemRef, index) => buildListItem(itemRef, urls[index], index));
}

export async function listDealImages(ownerUid, dealId, opts = {}) {
  const { fallbackOwnerUid = null } = opts;
  try {
    const refs = await listDealImageRefs(ownerUid, dealId);
    return await buildImageListFromRefs(refs);
  } catch (err) {
    const code = String(err?.code || "");
    const shouldTryFallback =
      code.includes("storage/unauthorized") &&
      fallbackOwnerUid &&
      fallbackOwnerUid !== ownerUid;
    if (!shouldTryFallback) throw err;
    const refs = await listDealImageRefs(fallbackOwnerUid, dealId);
    return await buildImageListFromRefs(refs);
  }
}

export async function uploadDealImage(file, ownerUid, dealId) {
  requireStorage();
  if (!file) throw new Error("No image selected.");
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    throw new Error("Only JPG, PNG, and WEBP images are allowed.");
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new Error("Image exceeds 10MB size limit.");
  }

  const existing = await listDealImageRefs(ownerUid, dealId);
  if (existing.length >= MAX_IMAGES_PER_DEAL) {
    throw new Error("Maximum of 20 images per deal.");
  }

  const imageId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const safeName = sanitizeFileName(file.name);
  const fullPath = `${getDealImagesFolderPath(ownerUid, dealId)}/${imageId}-${safeName}`;
  const fileRef = ref(storage, fullPath);
  await uploadBytes(fileRef, file, { contentType: file.type });
  const downloadURL = await getDownloadURL(fileRef);
  return buildListItem(fileRef, downloadURL, existing.length);
}

export async function deleteDealImage(image) {
  requireStorage();
  const fullPath = image?.fullPath;
  if (!fullPath) throw new Error("Image path is required.");
  const fileRef = ref(storage, fullPath);
  await deleteObject(fileRef);
}

