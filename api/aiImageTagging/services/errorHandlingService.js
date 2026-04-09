const { deleteObject } = require("./s3Service");
const { sendToAllConnections } = require("../utils/websocket.js");
const { notifyErrorSNS } = require('./notificationService');

exports.handleProcessingError = async ({ bucket, key, err }) => {
    console.error('Error processing image:', err?.message || err);
    console.error('Error stack:', err?.stack || 'No stack trace available');

    await notifyErrorSNS({ fileName: key, message: err?.message || 'Unknown error' });
    await deleteImageFromS3({ bucket, key });
    await notifyWebSocketClients({ key });
};

const deleteImageFromS3 = async ({ bucket, key }) => {
    try {
        if (bucket && key) {
            await deleteObject({ bucket, key });
            console.log(`Deleted image from bucket: ${bucket}, key: ${key} due to processing error.`);
        }
    } catch (error) {
        console.error('Failed to delete image from S3:', error?.message || error);
    }
};

const notifyWebSocketClients = async ({ key }) => {
    try {
        await sendToAllConnections({
            status: 'error',
            fileName: key,
            message: 'Error processing image',
        }, process.env.WS_ENDPOINT);

        console.log(`Sent error notification for file: ${key} to WebSocket clients.`);
    } catch (error) {
        console.error('Failed to send error notification:', error?.message || error);
    }
};