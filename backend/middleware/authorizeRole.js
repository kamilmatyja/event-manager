const config = require('../config');
const UnauthorizedError = require("../errors/UnauthorizedError");
const ForbiddenError = require("../errors/ForbiddenError");

function authorizeRole(allowedRoles) {

    if (!Array.isArray(allowedRoles)) {
        allowedRoles = [allowedRoles];
    }

    return (req, res, next) => {
        if (!req.user || !req.user.role) {
            throw new UnauthorizedError('Unauthorized: User data not found in request.');
        }

        const userRole = req.user.role;

        if (allowedRoles.includes(userRole)) {
            next();
        } else {
            throw new ForbiddenError('Forbidden: Insufficient permissions.');
        }
    };
}

module.exports = authorizeRole;