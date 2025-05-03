const ApiError = require('./ApiError');

class NotFoundError extends ApiError {
    constructor(message = 'Resource Not Found') {
        super(message, 404);
    }
}

module.exports = NotFoundError;