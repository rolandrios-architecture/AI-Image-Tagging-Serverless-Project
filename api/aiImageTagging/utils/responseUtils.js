exports.success = (data, statusCode = 200) => ({
   statusCode,
   body: JSON.stringify({
      success: true,
      data
   }),
});

exports.error = (message, statusCode = 500) => ({
   statusCode,
   body: JSON.stringify({
      success: false,
      message
   }),
});