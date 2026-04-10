const { generateUploadUrl } = require('../services/s3Service.js');
const { success, error } = require('../utils/responseUtils.js');
const {
    parseBody,
    validateRequiredFields,
    validateFileType
} = require('../utils/validationUtils.js');

exports.uploadUrlHandler = async (event) => {
    // Handle preflight OPTIONS for HTTP API and REST API
    const method = (event.httpMethod || (event.requestContext && event.requestContext.http && event.requestContext.http.method) || '').toUpperCase();
    if (method === 'OPTIONS') {
        return success({});
    }

    try {
        const body = parseBody(event);

        validateRequiredFields(body);
        validateFileType(body.fileType);
        
        const data = await generateUploadUrl({ fileName: body.fileName, fileType: body.fileType });
        return success(data);
    } catch (err) {
        console.error("getUploadUrl error", err);

        const errorMap = {
            "INVALID_JSON": "Invalid JSON",
            "MISSING_FIELDS": "fileName and fileType are required",
            "INVALID_FILE_TYPE": "Invalid fileType",
            "BUCKET_NOT_CONFIGURED": "S3 bucket is not configured"
        };

        if (errorMap[err.message]) {
            return error(400, errorMap[err.message]);
        }

        return error(500, "Internal Server Error");
    }
};