// netlify/edge-functions/rate-limit.js
const requestCounts = new Map();

export default async (request, context) => {
    const ip = context.ip;
    const now = Date.now();
    const windowMs = 1000; // 1 segundo
    const maxRequests = 10;

    const currentData = requestCounts.get(ip) || { count: 0, timestamp: now };
    
    if (now - currentData.timestamp < windowMs) {
        currentData.count++;
    } else {
        currentData.count = 1;
        currentData.timestamp = now;
    }

    requestCounts.set(ip, currentData);

    if (currentData.count > maxRequests) {
        return new Response("🚨 Too Many Requests - PNL Biobío Security", { 
            status: 429,
            headers: { "Content-Type": "text/plain; charset=utf-8" }
        });
    }

    return await context.next();
};
