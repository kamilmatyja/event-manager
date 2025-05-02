const ApiError = require('./ApiError');

class ConflictError extends ApiError {
    constructor(message = 'Conflict') {
        super(message, 409);
    }
}

module.exports = ConflictError;