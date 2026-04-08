const { DynamoDBClient, DeleteItemCommand } = require("@aws-sdk/client-dynamodb")

const client = new DynamoDBClient({ region: process.env.REGION })

exports.disconnectHandler = async (event) => {
    const connectionId = event.requestContext.connectionId;

    await client.send(new DeleteItemCommand({
        TableName: process.env.CONNECTIONS_TABLE_NAME,
        Key: {
            connectionId: { S: connectionId }
        }
    }));

    return { statusCode: 200, body: 'Disconnected' };
}