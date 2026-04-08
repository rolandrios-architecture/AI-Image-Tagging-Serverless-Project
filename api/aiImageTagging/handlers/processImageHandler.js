const { processImageRecognitionService } = require('../services/imageRecognitionService.js');
const { getObject, getObjectBytes, deleteObject } = require('../services/s3Service.js');
const { saveImageTags } = require('../services/dynamoService.js');
const { success, error: errorResponse } = require('../utils/responseUtils.js');
const { generateDescription } = require("../services/bedrockService.js");
const { saveImageResult } = require("../services/dynamoService.js");
const { sendToAllConnections } = require("../utils/websocket.js");


// Helper: validate file extension
const isValidImageKey = (key) => {
    return /\.(jpg|jpeg|png)$/i.test(key);
};

// Helper: remove the S3 object and notify websocket clients
const handleInvalidFile = async ({ bucket, key }) => {
    await deleteObject({ bucket, key });

    await sendToAllConnections(
        {
            status: 'error',
            message: 'Invalid file type',
        },
        process.env.WS_ENDPOINT
    );
};


exports.processImageRecognition = async (event) => {
    try {
        const record = event.Records[0];

        const bucket = record.s3.bucket.name;
        const key = decodeURIComponent(record.s3.object.key);

        if (!isValidImageKey(key)) {
            await handleInvalidFile({ bucket, key });
            return;
        }

        console.log(`Processing image from bucket: ${bucket}, key: ${key}`);
        console.log('key: ', key);

        const response = await getObject({ bucket, key });

        const imageBytes = await getObjectBytes(response);

        const labels = await processImageRecognitionService(imageBytes);

        const labelNames = labels.map((l) => l.name);

        const aiData = await fetchAiData(labelNames);

        const imageUrl = `https://${bucket}.s3.amazonaws.com/${key}`;

        await persistImageTags({ fileName: key, imageUrl, labels, description: aiData.description, tags: aiData.tags });

        await persistImageResult({
            fileName: key,
            imageUrl,
            labels,
            description: aiData.description,
            tags: aiData.tags,
        });

        // Notify connected clients that processing finished
        await notifyProcessed({
            fileName: key,
            labels,
            description: aiData.description,
            tags: aiData.tags,
        });

        console.log('Rekognition result: ', labels);

        console.log('Saved to DynamoDB');

        return success(labels);
    } catch (err) {
        console.error(err);
        return errorResponse(err.message || 'Internal error');
    }
};

// Persist helpers
const persistImageTags = async ({ fileName, imageUrl, labels, description = '', tags = [] }) => {
    return saveImageTags({ fileName, imageUrl, labels, description, tags });
};

const persistImageResult = async ({ fileName, imageUrl, labels, description, tags }) => {
    return saveImageResult({ fileName, imageUrl, labels, description, tags });
};

// Helper: get AI description + tags with safe fallback
const fetchAiData = async (labels) => {
    try {
        return await generateDescription(labels);
    } catch (err) {
        console.error('generateDescription failed, returning fallback:', err && err.message ? err.message : err);
        return { description: '', tags: [] };
    }
};

// Helper: notify websocket clients a file was processed
const notifyProcessed = async ({ fileName, labels, description = '', tags = [] }) => {
    try {
        await sendToAllConnections(
            {
                status: 'processed',
                fileName,
                labels,
                description,
                tags,
            },
            process.env.WS_ENDPOINT
        );
    } catch (err) {
        console.error('Failed to notify clients:', err && err.message ? err.message : err);
    }
};