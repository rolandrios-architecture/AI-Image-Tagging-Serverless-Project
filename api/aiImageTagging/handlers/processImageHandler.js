
const { processImageRecognitionService } = require('../services/imageRecognitionService.js');
const { getObject, getObjectBytes, deleteObject } = require('../services/s3Service.js');
const { saveImageTags, saveImageResult } = require('../services/dynamoService.js');
const { success, error: errorResponse } = require('../utils/responseUtils.js');
const { generateDescription } = require("../services/bedrockService.js");
const { isValidImage } = require("../security/fileValidation.js");
const { filterLabelsWithConfidence } = require('../domain/labelFilter');
const { handleProcessingError } = require('../services/errorHandlingService.js');
const { notifyProcessed } = require('../services/notificationService.js');



const sanitizeForDynamo = (value) => {
    if (value === undefined) {
        return undefined;
    }

    if (Array.isArray(value)) {
        return value
            .map(sanitizeForDynamo)
            .filter((item) => item !== undefined);
    }

    if (value && typeof value === 'object') {
        return Object.fromEntries(
            Object.entries(value)
                .map(([key, val]) => [key, sanitizeForDynamo(val)])
                .filter(([, val]) => val !== undefined)
        );
    }

    return value;
};

const processImage = async ({ bucket, key }) => {
    console.log('Step 1: getObject');
    const response = await getObject({ bucket, key });

    const isValid = isValidImage({
        key,
        contentType: response.ContentType,
        size: response.ContentLength
    });

    if (!isValid) {
        await handleInvalidFile({ bucket, key });
        return null;
    }

    console.log('Step 2: getObjectBytes');
    const imageBytes = await getObjectBytes(response);

    console.log('Step 3: processImageRecognitionService');
    const labels = await processImageRecognitionService(imageBytes);

    console.log('Step 4: filterLabels (preserve confidence)');
    const cleanLabels = filterLabelsWithConfidence(labels);

    console.log('Step 5: fetchAiData');
    const aiData = await fetchAiData(cleanLabels);

    if (!aiData?.description) {
        throw new Error('Failed to generate AI description');
    }

    return { cleanLabels, aiData };
};

exports.processImageRecognition = async (event) => {
    let bucket;
    let key;

    try {
        const record = event?.Records?.[0];

        if (!record) {
            console.warn('⚠️ No Records in event');
            return;
        }

        const eventName = record?.eventName;

        if (eventName?.startsWith('ObjectRemoved')) {
            console.log('Skipping delete event:', eventName);
            return;
        }

        bucket = record?.s3?.bucket?.name;
        key = record?.s3?.object?.key
            ? decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '))
            : undefined;

        if (!bucket || !key) {
            console.warn('⚠️ Missing bucket or key');
            return;
        }

        console.log(`Processing image from bucket: ${bucket}, key: ${key}`);

        const result = await processImage({ bucket, key });

        if (!result) {
            return;
        }

        const { cleanLabels, aiData } = result;
        const imageUrl = `https://${bucket}.s3.amazonaws.com/${key}`;

        await persistImageTags({
            fileName: key,
            imageUrl,
            labels: cleanLabels,
            description: aiData.description,
            tags: aiData.tags
        });

        await persistImageResult({
            fileName: key,
            imageUrl,
            labels: cleanLabels,
            description: aiData.description,
            tags: aiData.tags,
        });

        await notifyProcessed({
            fileName: key,
            labels: cleanLabels,
            description: aiData.description,
            tags: aiData.tags,
        });

        return success(cleanLabels);
    } catch (err) {
        await handleProcessingError({ bucket, key, err });
        return errorResponse(err.message || 'Processing failed');
    }
};

// Persist helpers
const persistImageTags = async ({ fileName, imageUrl, labels, description = '', tags = [] }) => {
    const payload = sanitizeForDynamo({
        fileName,
        imageUrl,
        labels,
        description,
        tags
    });

    console.log('Dynamo payload for saveImageTags:', JSON.stringify(payload));

    return saveImageTags(payload);
};

const persistImageResult = async ({ fileName, imageUrl, labels, description, tags }) => {
    const payload = sanitizeForDynamo({
        fileName,
        imageUrl,
        labels,
        description,
        tags
    });

    console.log('Dynamo payload for saveImageResult:', JSON.stringify(payload));

    return saveImageResult(payload);
};

// Helper: get AI description + tags with safe fallback
const fetchAiData = async (labels) => {
    try {
        return await generateDescription(labels);
    } catch (err) {
        console.error('generateDescription failed, returning fallback:', err?.message || err);
        return { description: '', tags: [] };
    }
};

