const {
    DynamoDBClient,
    PutItemCommand,
    UpdateItemCommand,
    GetItemCommand
} = require("@aws-sdk/client-dynamodb");

const client = new DynamoDBClient({ region: process.env.REGION });

// ---------- Helpers ----------

const toTagAttribute = (tag) => {
    if (typeof tag !== "string" || !tag.trim()) {
        return null;
    }
    return { S: tag.trim() };
};

const formatLabels = (labels = []) => ({
    L: labels.map((label) => {
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
});

// ---------- CREATE (processing) ----------

exports.saveInitialImage = async ({ fileName, imageUrl }) => {
    const tableName = process.env.DYNAMODB_NAME;

    if (!tableName) throw new Error("DYNAMODB_NAME_NOT_CONFIGURED");

    const now = new Date().toISOString();

    const item = {
        fileName: { S: fileName },
        imageUrl: { S: imageUrl },

        status: { S: "processing" },

        description: { S: "" },
        tags: { L: [] },
        labels: { L: [] },

        createdAt: { S: now },
        updatedAt: { S: now }
    };

    await client.send(new PutItemCommand({
        TableName: tableName,
        Item: item
    }));
};

// ---------- UPDATE (done) ----------

exports.updateImageResult = async ({
    fileName,
    description = '',
    tags = [],
    labels = []
}) => {
    const tableName = process.env.DYNAMODB_NAME;

    if (!tableName) throw new Error("DYNAMODB_NAME_NOT_CONFIGURED");

    const safeTags = (tags || [])
        .map(toTagAttribute)
        .filter(Boolean);

    await client.send(new UpdateItemCommand({
        TableName: tableName,
        Key: {
            fileName: { S: fileName }
        },
        UpdateExpression: `
            SET #status = :status,
                description = :description,
                tags = :tags,
                labels = :labels,
                updatedAt = :updatedAt
        `,
        ExpressionAttributeNames: {
            "#status": "status"
        },
        ExpressionAttributeValues: {
            ":status": { S: "done" },
            ":description": { S: description || '' },
            ":tags": { L: safeTags },
            ":labels": formatLabels(labels),
            ":updatedAt": { S: new Date().toISOString() }
        }
    }));
};

// ---------- UPDATE (failed) ----------

exports.updateImageStatus = async ({ fileName, status }) => {
    const tableName = process.env.DYNAMODB_NAME;

    await client.send(new UpdateItemCommand({
        TableName: tableName,
        Key: {
            fileName: { S: fileName }
        },
        UpdateExpression: `
            SET #status = :status,
                updatedAt = :updatedAt
        `,
        ExpressionAttributeNames: {
            "#status": "status"
        },
        ExpressionAttributeValues: {
            ":status": { S: status },
            ":updatedAt": { S: new Date().toISOString() }
        }
    }));
};

// ---------- GET ----------

exports.getImageByFileName = async (fileName) => {
    const tableName = process.env.DYNAMODB_NAME;

    console.log('Dynamo getImageByFileName - table:', tableName, 'fileName:', fileName);

    const result = await client.send(new GetItemCommand({
        TableName: tableName,
        Key: {
            fileName: { S: fileName }
        }
    }));

    console.log('Dynamo getImageByFileName - item found:', !!result.Item);


    if (!result.Item) return null;

    const item = result.Item;

    // Log a summary of returned attributes for debugging (avoid logging full payloads)
    console.log('Dynamo getImageByFileName - returned attributes:', Object.keys(item));

    return {
        fileName: item.fileName?.S,
        imageUrl: item.imageUrl?.S,
        status: item.status?.S,
        description: item.description?.S,
        tags: item.tags?.L?.map(t => t.S) || [],
        labels: item.labels?.L?.map(l => ({
            name: l.M.name.S,
            confidence: Number(l.M.confidence.N)
        })) || []
    };
};

// Convenience wrappers expected by handlers
exports.saveImageTags = async ({ fileName, description = '', tags = [], labels = [] }) => {
    // Reuse updateImageResult to persist the final tags/result
    return exports.updateImageResult({ fileName, description, tags, labels });
};

exports.saveImageResult = async ({ fileName, description = '', tags = [], labels = [] }) => {
    return exports.updateImageResult({ fileName, description, tags, labels });
};