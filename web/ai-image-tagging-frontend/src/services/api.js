const API_URL = import.meta.env.VITE_API_URL;
const API_UPLOAD_ENDPOINT = import.meta.env.VITE_API_UPLOAD_ENDPOINT;

// Debug: expose env values when loaded
try {
  console.debug('api.js initialized with', { API_URL, API_UPLOAD_ENDPOINT });
} catch (e) {
  // ignore in environments without console
}
// 1. POST → obtener presigned URL
export const getUploadUrl = async (file) => {
  const requestUrl = `${API_URL}/upload-image`;
  console.debug('getUploadUrl -> POST', requestUrl, { fileName: file.name, fileType: file.type });

  const res = await fetch(requestUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fileName: file.name,
      fileType: file.type,
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    console.error('getUploadUrl failed', res.status, error);
    throw new Error(error);
  }

  // Normalize backend response shapes to a common { data: { uploadUrl, key } }
  const body = await res.json();
  console.debug('getUploadUrl response body:', body);

  // Common locations for upload URL and key
  const uploadUrl =
    body?.data?.uploadUrl || body?.data?.uploadURL || body?.uploadUrl || body?.uploadURL || body?.url || body?.upload_url;
  const key = body?.data?.key || body?.key || body?.data?.fileKey || body?.fileKey || body?.data?.keyName || body?.keyName;

  if (!uploadUrl) {
    // Provide helpful debugging information
    const preview = JSON.stringify(body).slice(0, 500);
    throw new Error(`No upload URL found in response: ${preview}`);
  }

  return { success: body.success ?? true, data: { uploadUrl, key }, raw: body };
};

// 2. PUT → subir a S3
export const uploadToS3 = async (uploadUrl, file) => {
  console.debug('uploadToS3 -> PUT', uploadUrl, { fileName: file.name, fileType: file.type });
  const res = await fetch(uploadUrl, {
    method: "PUT",
    body: file,
    headers: {
      "Content-Type": file.type,
    },
  });

  if (!res.ok) {
    // try to read response body for debugging
    let txt = '';
    try { txt = await res.text(); } catch (e) { txt = String(e); }
    console.error('uploadToS3 failed', res.status, txt);
    throw new Error("S3 upload failed: " + txt);
  }
};

// 3. GET → check processing result for an uploaded image
export const getImageResult = async (key) => {
  if (!key) throw new Error("getImageResult: missing key/fileName");

  // Construct the GET URL for the images resource. We use the origin of
  // `VITE_API_URL` and append the `/images/{fileName}` path which matches
  // the backend route you added: https://.../images/{fileName+}
  let base;
  try {
    base = new URL(API_URL).origin;
  } catch (e) {
    base = API_URL.replace(/\/upload-image.*$/, "");
  }

  // Some backends return the key prefixed with a path (e.g. "images/<fileName>").
  // Avoid duplicating the `images/` segment in the final URL by stripping
  // a leading `images/` if present.
  const fileName = String(key).replace(/^images\//, "");
  const url = `${base}/images/${encodeURIComponent(fileName)}`;
  console.debug('getImageResult -> GET', url);
  const res = await fetch(url, { method: "GET" });
  // If the backend hasn't created the image record yet, it may return 404.
  // Treat 404 as "pending" so the caller can retry instead of throwing.
  if (res.status === 404) {
    console.debug('getImageResult: 404 (not found), returning pending');
    return { status: "pending" };
  }

  if (!res.ok) {
    const errorText = await res.text();
    console.error('getImageResult failed', res.status, errorText);
    throw new Error(errorText || "Failed to fetch image result");
  }

  try {
    const json = await res.json();
    console.debug('getImageResult response:', json);
    return json;
  } catch (e) {
    console.error('getImageResult parse error', e);
    throw new Error("Failed to parse image result JSON");
  }
};