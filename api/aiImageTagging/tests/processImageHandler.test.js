jest.mock('../services/imageRecognitionService.js', () => ({
  processImageRecognitionService: jest.fn(),
}));

jest.mock('../services/s3Service.js', () => ({
  getObject: jest.fn(),
  getObjectBytes: jest.fn(),
  deleteObject: jest.fn(),
}));

jest.mock('../services/dynamoService.js', () => ({
  saveImageTags: jest.fn(),
  saveImageResult: jest.fn(),
}));

jest.mock('../utils/responseUtils.js', () => ({
  success: jest.fn(),
  error: jest.fn(),
}));

jest.mock('../services/bedrockService.js', () => ({
  generateDescription: jest.fn(),
}));

jest.mock('../security/fileValidation.js', () => ({
  isValidImage: jest.fn(),
}));

jest.mock('../domain/labelFilter.js', () => ({
  filterLabelsWithConfidence: jest.fn(),
}));

jest.mock('../services/errorHandlingService.js', () => ({
  handleProcessingError: jest.fn(),
}));

jest.mock('../services/notificationService.js', () => ({
  notifyProcessed: jest.fn(),
}));

const { processImageRecognition } = require('../handlers/processImageHandler.js');
const { processImageRecognitionService } = require('../services/imageRecognitionService.js');
const { getObject, getObjectBytes } = require('../services/s3Service.js');
const { saveImageTags, saveImageResult } = require('../services/dynamoService.js');
const { success, error } = require('../utils/responseUtils.js');
const { generateDescription } = require('../services/bedrockService.js');
const { isValidImage } = require('../security/fileValidation.js');
const { filterLabelsWithConfidence } = require('../domain/labelFilter.js');
const { handleProcessingError } = require('../services/errorHandlingService.js');
const { notifyProcessed } = require('../services/notificationService.js');

describe('processImageRecognition handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns early when event has no Records', async () => {
    const result = await processImageRecognition({});

    expect(result).toBeUndefined();
    expect(getObject).not.toHaveBeenCalled();
  });

  it('returns early for ObjectRemoved events', async () => {
    const event = {
      Records: [{ eventName: 'ObjectRemoved:Delete' }],
    };

    const result = await processImageRecognition(event);

    expect(result).toBeUndefined();
    expect(getObject).not.toHaveBeenCalled();
  });

  it('processes a valid image event and persists/returns success', async () => {
    const event = {
      Records: [
        {
          eventName: 'ObjectCreated:Put',
          s3: {
            bucket: { name: 'my-bucket' },
            object: { key: 'my+photo.jpg' },
          },
        },
      ],
    };

    const rawLabels = [{ Name: 'Cat', Confidence: 99.1 }];
    const cleanLabels = [{ name: 'cat', confidence: 99.1 }];
    const successResponse = { statusCode: 200, body: '{"ok":true}' };

    getObject.mockResolvedValue({
      ContentType: 'image/jpeg',
      ContentLength: 1024,
    });
    isValidImage.mockReturnValue(true);
    getObjectBytes.mockResolvedValue(Buffer.from([1, 2, 3]));
    processImageRecognitionService.mockResolvedValue(rawLabels);
    filterLabelsWithConfidence.mockReturnValue(cleanLabels);
    generateDescription.mockResolvedValue({
      description: 'A cat on a couch',
      tags: ['cat', 'couch'],
    });
    saveImageTags.mockResolvedValue();
    saveImageResult.mockResolvedValue();
    notifyProcessed.mockResolvedValue();
    success.mockReturnValue(successResponse);

    const result = await processImageRecognition(event);

    expect(getObject).toHaveBeenCalledWith({ bucket: 'my-bucket', key: 'my photo.jpg' });
    expect(saveImageTags).toHaveBeenCalledWith({
      fileName: 'my photo.jpg',
      imageUrl: 'https://my-bucket.s3.amazonaws.com/my photo.jpg',
      labels: cleanLabels,
      description: 'A cat on a couch',
      tags: ['cat', 'couch'],
    });
    expect(saveImageResult).toHaveBeenCalledWith({
      fileName: 'my photo.jpg',
      imageUrl: 'https://my-bucket.s3.amazonaws.com/my photo.jpg',
      labels: cleanLabels,
      description: 'A cat on a couch',
      tags: ['cat', 'couch'],
    });
    expect(notifyProcessed).toHaveBeenCalledWith({
      fileName: 'my photo.jpg',
      labels: cleanLabels,
      description: 'A cat on a couch',
      tags: ['cat', 'couch'],
    });
    expect(success).toHaveBeenCalledWith(cleanLabels);
    expect(result).toEqual(successResponse);
  });

  it('handles processing errors via error handler and returns error response', async () => {
    const event = {
      Records: [
        {
          eventName: 'ObjectCreated:Put',
          s3: {
            bucket: { name: 'my-bucket' },
            object: { key: 'broken.jpg' },
          },
        },
      ],
    };

    const boom = new Error('boom');
    const errorResponse = { statusCode: 500, body: '{"success":false}' };

    getObject.mockRejectedValue(boom);
    error.mockReturnValue(errorResponse);

    const result = await processImageRecognition(event);

    expect(handleProcessingError).toHaveBeenCalledWith({
      bucket: 'my-bucket',
      key: 'broken.jpg',
      err: boom,
    });
    expect(error).toHaveBeenCalledWith('boom');
    expect(result).toEqual(errorResponse);
  });
});
