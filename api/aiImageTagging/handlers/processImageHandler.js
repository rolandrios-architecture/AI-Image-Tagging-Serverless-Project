const { processImageRecognition } = require('../services/imageRecognitionService.js');
const { getObject, getObjectBytes } = require('../services/s3Service.js');
const { saveImageTags } = require('../services/dynamoService.js');
const { success, error: errorResponse } = require('../utils/responseUtils.js');

exports.processImageRecognition = async (event) => {
    try {
        const record = event.Records[0];

        const bucket = record.s3.bucket.name;
        const key = decodeURIComponent(record.s3.object.key);

        console.log(`Processing image from bucket: ${bucket}, key: ${key}`);
        console.log('key: ', key);

        const response = await getObject({ bucket, key });

        const imageBytes = await getObjectBytes(response);

        const labels = await processImageRecognition(imageBytes);

        const imageUrl = `https://${bucket}.s3.amazonaws.com/${key}`;

        await saveImageTags({ fileName: key, imageUrl, labels });

        console.log('Rekognition result: ', labels);

        console.log('Saved to DynamoDB');

        return success(labels);
    } catch (err) {
        console.error(err);
        return errorResponse(err.message || 'Internal error');
    }
};