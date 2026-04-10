exports.parseBody = (event) => {
    try {
        return JSON.parse(event.body || '{}');
    } catch (error) {
        console.error('Error parsing request body:', error);
        // Throw a short code the handler expects so it can map to a 400 response
        throw new Error('INVALID_JSON');
    }
}

exports.validateRequiredFields = ({ fileName, fileType }) => {
    if (!fileName || !fileType) {
        throw new Error('MISSING_FIELDS');
    }
}

exports.validateFileType = (fileType) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!allowedTypes.includes(fileType)) {
        throw new Error('INVALID_FILE_TYPE');
    }
}