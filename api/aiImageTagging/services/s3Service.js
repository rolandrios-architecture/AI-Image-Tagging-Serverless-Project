const { S3Client, 
    PutObjectCommand, 
    GetObjectCommand } = require("@aws-sdk/client-s3")
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner")

const s3Client = new S3Client({
    region: process.env.REGION || "us-east-1"
})

exports.generateUploadUrl = async ({ fileName, fileType }) => {
    const bucketName = process.env.BUCKET_NAME

    if (!bucketName) {
        throw new Error("BUCKET_NOT_CONFIGURED")
    }

    // avoid collisions + keep structure organized
    const key = `images/${Date.now()}-${fileName}`

    const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        ContentType: fileType
    })

    const uploadURL = await getSignedUrl(s3Client, command, {
        expiresIn: 3600 // keep short in real systems
    })

    return {
        uploadURL,
        key
    }
}

exports.getObject = async ({ bucket, key }) => {
    // Return the raw S3 GetObject response. Do not perform validation
    // or byte conversion here; callers should handle those concerns.
    const response = await s3Client.send(
        new GetObjectCommand({
            Bucket: bucket,
            Key: key,
        })
    );

    return response;
};

exports.getObjectBytes = async (response) => {
    // Accept either the full response or the Body directly
    const body = response && response.Body ? response.Body : response;
    // If the body exposes a helper to get bytes (some runtimes/webstreams), use it
    if (body && typeof body.transformToByteArray === 'function') {
        return transformToBuffer(body);
    }

    // If it's already a Buffer or Uint8Array or ArrayBuffer
    if (Buffer.isBuffer(body) || body instanceof Uint8Array || body instanceof ArrayBuffer) {
        return arrayLikeToBuffer(body);
    }

    // Otherwise treat it as an async iterable / Node Readable stream
    return streamToBuffer(body);
};

// Helpers: extracted for clarity, testability, and reuse.
const transformToBuffer = async (body) => {
    const arr = await body.transformToByteArray();
    return Buffer.from(arr);
};

const arrayLikeToBuffer = (value) => {
    if (Buffer.isBuffer(value)) return value;
    if (value instanceof Uint8Array) return Buffer.from(value);
    if (value instanceof ArrayBuffer) return Buffer.from(new Uint8Array(value));
    // Fallback: try to construct a Buffer
    return Buffer.from(value);
};

const streamToBuffer = async (stream) => {
    const chunks = [];
    for await (const chunk of stream) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
};