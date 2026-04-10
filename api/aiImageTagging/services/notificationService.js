const { SNSClient, PublishCommand } = require("@aws-sdk/client-sns");

const snsClient = new SNSClient({ region: process.env.REGION });

exports.notifyErrorSNS = async ({ fileName, message }) => {
    try {
        const topicArn = process.env.SNS_TOPIC_ARN;

        if (!topicArn) {
            console.warn('SNS_TOPIC_ARN not configured; skipping error notification');
            return;
        }

        await snsClient.send(new PublishCommand({
            TopicArn: topicArn,
            Subject: 'Image processing failed',
            Message: JSON.stringify({
                fileName: fileName || null,
                error: message || null,
                timeStamp: new Date().toISOString()
            }, null, 2)
        }));

        console.log('Error notification sent to SNS');
    } catch (error) {
        console.error('Failed to send error notification to SNS', error);
    }
};

exports.notifyProcessed = async ({ fileName, labels = [], description = '', tags = [] }) => {
    try {
        const topicArn = process.env.SNS_TOPIC_ARN;

        if (!topicArn) {
            console.warn('SNS_TOPIC_ARN not configured; skipping processed notification');
            return;
        }

        await snsClient.send(new PublishCommand({
            TopicArn: topicArn,
            Subject: 'Image processed',
            Message: JSON.stringify({
                fileName: fileName || null,
                description: description || null,
                tags: tags || [],
                labels: labels || [],
                timeStamp: new Date().toISOString()
            }, null, 2)
        }));

        console.log('Processed notification sent to SNS');
    } catch (error) {
        console.error('Failed to send processed notification to SNS', error);
    }
};