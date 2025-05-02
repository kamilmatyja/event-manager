const tokenBlacklist = new Map();

const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;

function add(jti, exp) {
    if (!jti || !exp) return;
    const expirationTimestamp = Number(exp);
    const nowInSeconds = Math.floor(Date.now() / 1000);
    if (!isNaN(expirationTimestamp) && expirationTimestamp > nowInSeconds) {
        tokenBlacklist.set(jti, expirationTimestamp);
    }
}

function has(jti) {
    return tokenBlacklist.has(jti);
}

function cleanupBlacklist() {
    const nowInSeconds = Math.floor(Date.now() / 1000);
    let removedCount = 0;

    for (const [jti, exp] of tokenBlacklist.entries()) {
        if (exp <= nowInSeconds) {
            tokenBlacklist.delete(jti);
            removedCount++;
        }
    }
}

const intervalId = setInterval(cleanupBlacklist, CLEANUP_INTERVAL_MS);
cleanupBlacklist();

console.log("In-memory token blacklist initialized.");

module.exports = {
    add,
    has,
    intervalId
};