const { getImageByFileName } = require('../services/dynamoService.js');

exports.getImage = async (event) => {
    try {

        const fileName = (() => {
            try { return decodeURIComponent(event?.pathParameters?.fileName); } catch (e) { return event?.pathParameters?.fileName; }
        })();

        if (!fileName) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message: "fileName is required"
                })
            };
        }

        console.log("Fetching image:", fileName);

        const item = await getImageByFileName(fileName);

        if (!item) {
            // Fallback: some records are stored with an "images/" prefix.
            const altFileName = fileName.startsWith('images/') ? null : `images/${fileName}`;
            if (altFileName) {
                console.log('Item not found, trying fallback key:', altFileName);
                const altItem = await getImageByFileName(altFileName);
                if (altItem) {
                    console.log('Found item using fallback key:', altFileName);
                    return {
                        statusCode: 200,
                        body: JSON.stringify(altItem)
                    };
                }
                console.log('Fallback lookup also returned no item');
            }
            return {
                statusCode: 404,
                body: JSON.stringify({
                    message: "Image not found"
                })
            };
        }
        console.log("PATH PARAM:", event.pathParameters.fileName);
        return {
            statusCode: 200,
            body: JSON.stringify(item)
        };


    } catch (err) {
        console.error("GET image error:", err);

        return {
            statusCode: 500,
            body: JSON.stringify({
                message: "Internal server error",
                error: err.message
            })
        };
    }
};