exports.parseBody = (event) => {
    try {
        return JSON.parse(event.body || '{}');
    } catch (error) {
        console.error('Error parsing request body:', error);
        return {};
    }
}

exports.validateRequiredFields = ( {fileName, fileType} ) => {
    if (!fileName || !fileType) {
        throw new Error('Missing required fields: fileName and fileType are required.');
    }
}

exports.validateFileType = (fileType) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!allowedTypes.includes(fileType)) {
        throw new Error(`Invalid file type: ${fileType}. Allowed types are: ${allowedTypes.join(', ')}`);
    }
}