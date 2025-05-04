function errorHandler(err, req, res) {
    const code = err.statusCode || 500;
    const message = err.message || 'An unexpected error occurred';

    res.status(code).json({
        code: code,
        message: message
    });
}

module.exports = errorHandler;