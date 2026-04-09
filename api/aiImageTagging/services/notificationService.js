const { SNSClient, PublishCommand } = require("@aws-sdk/client-sns");

const snsClient = new SNSClient({ region: process.env.REGION });

exports.notifyErrorSNS = async (errorMessage) => {
    try {
        await snsClient.send(new PublishCommand({
            TopicArn: process.env.SNS_TOPIC_ARN,
            Subject: "Image processing failed",
            Message: JSON.stringify({
                fileName,
                error: message,
                timeStamp: new Date().toISOString()
            }, null, 2)
        }));
        
        console.log('Error notification sent to SNS');
    } catch (error) {
        console.error('Failed to send error notification to SNS', error);
    }
}