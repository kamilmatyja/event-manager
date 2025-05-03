const ApiError = require('./ApiError');

class UnauthorizedError extends ApiError {
    constructor(message = 'Unauthorized') {
        super(message, 401);
    }
}

module.exports = UnauthorizedError;