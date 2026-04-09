const VALID_TYPES = new Set(['image/jpeg', 'image/png']);
const MAX_SIZE = 5 * 1024 * 1024; // 5MB


exports.isValidImageKey = (key) => {
      return /\.(jpg|jpeg|png)$/i.test(key);
};

exports.isValidImage = ({ key, contentType, size }) => {
    return (
        exports.isValidImageKey(key) &&
        VALID_TYPES.has(contentType) &&
        size <= MAX_SIZE
    );
};

