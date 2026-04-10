const CORS_HEADERS = {
   "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Credentials": true,
   "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent,X-Amzn-Trace-Id",
};

exports.success = (data, statusCode = 200) => ({
   statusCode,
   headers: CORS_HEADERS,
   body: JSON.stringify({
      success: true,
      data,
   }),
});

// Accept (statusCode, message) for consistent usage across handlers
exports.error = (statusCode = 500, message = "Internal Server Error") => ({
   statusCode,
   headers: CORS_HEADERS,
   body: JSON.stringify({
      success: false,
      message,
   }),
});