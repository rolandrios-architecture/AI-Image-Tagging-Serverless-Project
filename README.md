# AI-Image-Tagging-Serverless-Project

<img width="1179" height="623" alt="image" src="https://github.com/user-attachments/assets/3550c084-fda4-41bd-b376-c11c3cbf0742" />

## Architecture Overview

This project uses a modern, serverless architecture on AWS to provide scalable, automated AI image tagging and metadata generation. The main components and flow are:

- **Frontend (web/ai-image-tagging-frontend):**
  - Built with React, served via AWS CloudFront and S3.
  - Users upload images and view AI-generated tags and descriptions.

- **API Gateway & Lambda (api/aiImageTagging):**
  - API Gateway receives upload and query requests from the frontend.
  - Lambda functions handle image upload, processing, and metadata retrieval.

- **S3 Buckets:**
  - Store uploaded images and processed results.
  - Trigger Lambda functions on new uploads.

- **Image Processing Lambda:**
  - Invoked when a new image is uploaded to S3.
  - Calls AWS Rekognition for label detection.
  - Uses AWS Bedrock for AI-generated descriptions and tags.
  - Stores results in DynamoDB.
  - Publishes notifications via SNS.

- **DynamoDB:**
  - Stores image metadata, tags, and AI-generated descriptions.

- **SNS:**
  - Sends notifications on image processing events.

- **CloudWatch:**
  - Monitors and logs all Lambda/API activity.

- **CI/CD (GitHub Actions):**
  - Automates testing, linting, and deployment for both frontend and backend.

### Flow Summary
1. User uploads an image via the React frontend.
2. Image is stored in S3; S3 triggers a Lambda for processing.
3. Lambda uses Rekognition and Bedrock to analyze the image and generate tags/descriptions.
4. Results are saved in DynamoDB and optionally sent via SNS.
5. User can view results in the frontend.

See the `api/` and `web/` folders for implementation details of each component.

## Detailed Architecture Explanation

This project implements a full-stack, event-driven AI image tagging system using AWS serverless technologies. Below is a step-by-step breakdown of the architecture and how each component interacts:

### 1. User Interaction & Frontend (web/ai-image-tagging-frontend)
- The user accesses a React web application, which is hosted on AWS S3 and distributed globally via CloudFront for low-latency access.
- The frontend allows users to select and upload images, and displays the AI-generated tags and descriptions for each image.

### 2. Image Upload & API Gateway (api/aiImageTagging)
- When a user uploads an image, the frontend sends the file to a backend endpoint exposed via AWS API Gateway.
- API Gateway acts as a secure entry point, routing requests to AWS Lambda functions for processing.

### 3. Lambda: Upload Handling & S3 Storage
- The Lambda function receives the image and stores it in an S3 bucket dedicated to raw uploads.
- S3 is configured to trigger another Lambda function (the Image Processing Lambda) whenever a new image is uploaded.

### 4. Image Processing Lambda (api/aiImageTagging/handlers/processImageHandler.js)
- This Lambda is the core of the backend pipeline:
  - Downloads the new image from S3.
  - Validates the file type and size.
  - Calls AWS Rekognition to detect objects, scenes, and labels in the image.
  - Passes the detected labels to AWS Bedrock, which generates a human-readable description and a refined set of tags using generative AI.
  - Filters and normalizes the tags and description.
  - Saves the results (labels, tags, description, image URL, etc.) to DynamoDB for fast retrieval.
  - Publishes a notification to an SNS topic, which can trigger downstream actions (e.g., alerting, analytics, or further processing).
  - Optionally, stores processed images or error logs in a separate S3 bucket for auditing and debugging.

### 5. Data Storage & Retrieval
- **DynamoDB** stores all metadata, tags, and AI-generated descriptions for each image, keyed by filename or unique ID.
- The frontend can query the API to retrieve the latest results for a given image, which are fetched from DynamoDB and returned to the user.

### 6. Monitoring & Automation
- **CloudWatch** collects logs and metrics from all Lambda functions and API Gateway endpoints, enabling monitoring, alerting, and troubleshooting.
- **GitHub Actions** automates the CI/CD pipeline, running tests, linting, and deploying both the frontend and backend to AWS on every push.

---

**Folder Mapping:**
- `web/ai-image-tagging-frontend/`: React app, Vite config, UI components, API service calls.
- `api/aiImageTagging/`: Lambda handlers, domain logic, AWS service integrations, serverless config.

This architecture ensures scalability, cost-efficiency, and rapid iteration, leveraging AWS managed services and modern frontend tooling.


