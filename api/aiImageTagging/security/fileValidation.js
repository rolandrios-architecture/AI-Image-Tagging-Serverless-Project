/*
  File validation helpers.
  - `isValidImageKey` and `isValidImage` remain unchanged and safe to call.
  - New helpers `detectImageType`, `sanitizeImage`, and `validateAndSanitizeImage`
    are provided as opt-in, and they perform magic-bytes detection and re-encoding.
  - Requires `image-type` and `sharp` when used; they are lazy-required so
    simply importing this module won't crash if those packages are not installed.
*/

const VALID_TYPES = new Set(['image/jpeg', 'image/png']);
const MAX_SIZE = 5 * 1024 * 1024; // 5MB


exports.isValidImageKey = (key) => {
    return /\.(jpg|jpeg|png)$/i.test(key);
};

exports.isValidImage = ({ key, contentType, size }) => {
    return (
        exports.isValidImageKey(key) &&
        VALID_TYPES.has(contentType) &&
        size <= MAX_SIZE
    );
};

// Detect MIME type from the actual buffer (magic-bytes). Returns mime string or null.
exports.detectImageType = (buffer) => {
    try {
        const imageType = require('image-type');
        const info = imageType(buffer);
        return info ? info.mime : null;
    } catch {
        // image-type not installed or other error; return null so callers may choose fallback
        return null;
    }
};

// Sanitize image buffer by re-encoding it (strips metadata and reduces risk of hidden payloads).
// Returns an object: { buffer, mime, size }
exports.sanitizeImage = async (buffer) => {
    let imageType;
    try {
        imageType = require('image-type');
    } catch (err) {
        throw new Error('Optional package "image-type" is not installed', { cause: err });
    }

    const info = imageType(buffer);
    if (!info) {
        throw new Error('Unsupported image type');
    }

    if (!VALID_TYPES.has(info.mime)) {
        throw new Error('Invalid image mime type');
    }

    let sharp;
    try {
        sharp = require('sharp');
    } catch (err) {
        throw new Error('Optional package "sharp" is not installed', { cause: err });
    }

    let outBuffer;
    if (info.ext === 'png') {
        outBuffer = await sharp(buffer).png({ compressionLevel: 9, progressive: false }).toBuffer();
    } else {
        outBuffer = await sharp(buffer).jpeg({ quality: 80, progressive: true }).toBuffer();
    }

    if (outBuffer.length > MAX_SIZE) {
        throw new Error('Image too large after sanitization');
    }

    const outMime = info.ext === 'png' ? 'image/png' : 'image/jpeg';
    return { buffer: outBuffer, mime: outMime, size: outBuffer.length };
};

// High-level validation that also accepts a buffer and returns a sanitized buffer.
// Input: { key, contentType, size, buffer }
// Output: { key, mime, size, buffer }
exports.validateAndSanitizeImage = async ({ key, contentType, size, buffer }) => {
    if (!exports.isValidImageKey(key)) throw new Error('Invalid file key/extension');

    // Quick checks against declared values
    if (!VALID_TYPES.has(contentType)) throw new Error('Invalid declared contentType');
    if (size > MAX_SIZE) throw new Error('Declared size exceeds limit');

    // Detect actual type from bytes; if detection not available, fail fast.
    const detected = exports.detectImageType(buffer);
    if (!detected) throw new Error('Could not detect image type (image-type missing or unreadable)');
    if (!VALID_TYPES.has(detected)) throw new Error('Detected image type not allowed');

    // Sanitize (re-encode) and return sanitized buffer + metadata
    const sanitized = await exports.sanitizeImage(buffer);
    return Object.assign({ key }, sanitized);
};

