// netlify/edge-functions/rate-limit.js
const requestCounts = new Map();
const WINDOW_MS = 1000;
const MAX_REQUESTS = 10;
// Cleanup threshold: prevents unbounded memory growth across long-lived edge instances
const MAX_MAP_SIZE = 50000;

export default async (request, context) => {
    const ip = context.ip;
    const now = Date.now();

    // Periodic cleanup: evict entries older than 10 windows when map grows too large
    if (requestCounts.size > MAX_MAP_SIZE) {
        const cutoff = now - WINDOW_MS * 10;
        for (const [key, val] of requestCounts) {
            if (val.timestamp < cutoff) requestCounts.delete(key);
        }
    }

    const currentData = requestCounts.get(ip) || { count: 0, timestamp: now };

    if (now - currentData.timestamp < WINDOW_MS) {
        currentData.count++;
    } else {
        currentData.count = 1;
        currentData.timestamp = now;
    }

    requestCounts.set(ip, currentData);

    if (currentData.count > MAX_REQUESTS) {
        return new Response("Too Many Requests", {
            status: 429,
            headers: { "Content-Type": "text/plain; charset=utf-8" }
        });
    }

    return await context.next();
};
