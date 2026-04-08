const { ApiGatewayManagementApiClient, PostToConnectionCommand } = require ("@aws-sdk/client-apigatewaymanagementapi");
const { DynamoDBClient, ScanCommand } = require("@aws-sdk/client-dynamodb");

const db = new DynamoDBClient({});

exports.sendToAllConnections = async (data, endpoint) => {
  const api = new ApiGatewayManagementApiClient({ endpoint });

  const connections = await db.send(new ScanCommand({
    TableName: "websocket-connections"
  }));

  for (const item of connections.Items) {
    const connectionId = item.connectionId.S;

    try {
      await api.send(new PostToConnectionCommand({
        ConnectionId: connectionId,
        Data: JSON.stringify(data)
      }));
    } catch (err) {
      console.log("Stale connection:", connectionId, err.message);
    }
  }
};