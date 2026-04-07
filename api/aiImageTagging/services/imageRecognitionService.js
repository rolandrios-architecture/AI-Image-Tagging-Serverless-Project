const { RekognitionClient, DetectLabelsCommand } = require("@aws-sdk/client-rekognition");
const { mapLabelsToDomain } = require('../domain/imageRecognition.js');

const client = new RekognitionClient({ region: process.env.REGION });

exports.processImageRecognition = async (imageBytes) => {
  if (!imageBytes) {
    throw new Error('imageBytes is required');
  }

  const command = new DetectLabelsCommand({
    Image: { Bytes: imageBytes },
    MaxLabels: 10,
    MinConfidence: 70,
  });

  const response = await client.send(command);

  return mapLabelsToDomain(response.Labels || []);
};

