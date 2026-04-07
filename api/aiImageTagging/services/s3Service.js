const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3")
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