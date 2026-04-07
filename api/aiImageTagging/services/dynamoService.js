const { DynamoDBClient, PutItemCommand } = require("@aws-sdk/client-dynamodb")  

const client = new DynamoDBClient({ region: process.env.REGION })

exports.saveImageTags = async ({ 
    fileName,
    imageUrl,
    labels,
}) => {
    const tableName = process.env.DYNAMODB_NAME;

    if(!tableName) {
        throw new Error("DYNAMODB_NAME_NOT_CONFIGURED")
    }

    const item = {
        fileName: {S: fileName},
        imageUrl: {S: imageUrl},
        uploadedAt: {S: new Date().toISOString()},
        labels: {
            L: labels.map(label => ({
            M: {
                name: {S: label.name},
                confidence: {N: label.confidence.toString()}
            },
        })),
    },
};

    const command = new PutItemCommand({
        TableName: tableName,
        Item: item
    })

    await client.send(command)
}
