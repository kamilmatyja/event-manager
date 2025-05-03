const ApiError = require('./ApiError');

class BadRequestError extends ApiError {
    constructor(message = 'Bad Request') {
        super(message, 400);
    }
}

module.exports = BadRequestError;