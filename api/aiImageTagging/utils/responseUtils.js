exports.success = (data) => ({
   statusCode: 200,
   body: JSON.stringify({ success: true, data }),
});

exports.error = (message) => ({
   statusCode: 500,
   body: JSON.stringify({ success: false, message }),
});
