const { DynamoDBClient, PutItemCommand } = require("@aws-sdk/client-dynamodb");

const client = new DynamoDBClient({ region: process.env.REGION });

const ttl = Math.floor(Date.now() / 1000) + 86400; // 1 día

const toTagAttribute = (tag) => {
    if (typeof tag !== "string" || !tag.trim()) {
        return null;
    }

    return { S: tag.trim() };
};

const toLabelAttribute = (label) => {
    if (typeof label === "string" && label.trim()) {
        return {
            M: {
                name: { S: label.trim() },
                confidence: { N: "0" }
            }
        };
    }

    if (label && typeof label === "object" && typeof label.name === "string" && label.name.trim()) {
        const confidence =
            typeof label.confidence === "number" && Number.isFinite(label.confidence)
                ? Math.round(label.confidence).toString()
                : "0";

        return {
            M: {
                name: { S: label.name.trim() },
                confidence: { N: confidence }
            }
        };
    }

    return null;
};

exports.saveImageTags = async ({
    fileName,
    imageUrl,
    labels,
    description = '',
    tags = []
}) => {
    const tableName = process.env.DYNAMODB_NAME;

    if (!tableName) {
        throw new Error("DYNAMODB_NAME_NOT_CONFIGURED");
    }

    if (!fileName || !imageUrl) {
        throw new Error("fileName and imageUrl are required");
    }

    const safeTags = (tags || [])
        .map(toTagAttribute)
        .filter(Boolean);

    const safeLabels = (labels || [])
        .map(toLabelAttribute)
        .filter(Boolean);

    const item = {
        fileName: { S: fileName },
        imageUrl: { S: imageUrl },
        uploadedAt: { S: new Date().toISOString() },
        description: { S: description || '' },
        tags: { L: safeTags },
            labels: {
                L: (labels || []).map((label) => {
                    const name = (label && (label.name || label.Name)) || '';
                    const rawConfidence = (label && (label.confidence || label.Confidence));
                    const numeric = Number(rawConfidence);
                    const confidence = Number.isFinite(numeric) ? Math.round(numeric) : 0;
                    return {
                        M: {
                            name: { S: String(name) },
                            confidence: { N: confidence.toString() },
                        },
                    };
                })
            }
    };

        // Log the item we are about to save for debugging purposes
        try {
            console.log('DynamoDB PutItem:', { TableName: tableName, ItemPreview: item });
        } catch (logErr) {
            console.warn('Failed to log DynamoDB item preview', logErr);
        }

    const command = new PutItemCommand({
        TableName: tableName,
        Item: item
    });

    await client.send(command);
};

exports.saveImageResult = async ({ fileName, imageUrl, labels, description = '', tags = [] }) => {
    return exports.saveImageTags({ fileName, imageUrl, labels, description, tags, expiresAt: ttl });
};