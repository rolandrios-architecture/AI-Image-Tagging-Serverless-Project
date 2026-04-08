const { DynamoDBClient, PutItemCommand } = require("@aws-sdk/client-dynamodb")

const client = new DynamoDBClient({ region: process.env.REGION })

exports.connectHandler = async (event) => {
    const connectionId = event.requestContext.connectionId;

    await client.send(new PutItemCommand({
        TableName: process.env.CONNECTIONS_TABLE_NAME,
        Item: {
            connectionId: { S: connectionId }
        }
    }));

    return { statusCode: 200, body: 'Connected' };
}