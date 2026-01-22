/**
 * Rate Limiting Middleware
 * 
 * Implements rate limiting for API endpoints to prevent abuse and ensure fair usage
 * Requirements: 8.5
 */

import rateLimit from 'express-rate-limit';

/**
 * General API rate limiter
 * 100 requests per 15 minutes per IP
 */
export const generalRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
        status: 'error',
        data: {
            error: 'Too many requests from this IP, please try again later.',
            retryAfter: '15 minutes'
        }
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    handler: (req, res) => {
        res.status(429).json({
            status: 'error',
            data: {
                error: 'Too many requests from this IP, please try again later.',
                retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
            }
        });
    }
});

/**
 * Strict rate limiter for authentication endpoints
 * 5 requests per 15 minutes per IP
 */
export const authRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 requests per windowMs
    message: {
        status: 'error',
        data: {
            error: 'Too many authentication attempts, please try again later.',
            retryAfter: '15 minutes'
        }
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Don't count successful requests
    handler: (req, res) => {
        res.status(429).json({
            status: 'error',
            data: {
                error: 'Too many authentication attempts, please try again later.',
                retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
            }
        });
    }
});

/**
 * Moderate rate limiter for wallet operations
 * 30 requests per 10 minutes per IP
 */
export const walletRateLimit = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 30, // Limit each IP to 30 requests per windowMs
    message: {
        status: 'error',
        data: {
            error: 'Too many wallet operations, please try again later.',
            retryAfter: '10 minutes'
        }
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).json({
            status: 'error',
            data: {
                error: 'Too many wallet operations, please try again later.',
                retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
            }
        });
    }
});

/**
 * Lenient rate limiter for read operations
 * 200 requests per 15 minutes per IP
 */
export const readRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // Limit each IP to 200 requests per windowMs
    message: {
        status: 'error',
        data: {
            error: 'Too many read requests, please try again later.',
            retryAfter: '15 minutes'
        }
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).json({
            status: 'error',
            data: {
                error: 'Too many read requests, please try again later.',
                retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
            }
        });
    }
});

/**
 * Very strict rate limiter for resource-intensive operations
 * 3 requests per 5 minutes per IP
 */
export const intensiveRateLimit = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 3, // Limit each IP to 3 requests per windowMs
    message: {
        status: 'error',
        data: {
            error: 'Too many intensive operations, please try again later.',
            retryAfter: '5 minutes'
        }
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).json({
            status: 'error',
            data: {
                error: 'Too many intensive operations, please try again later.',
                retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
            }
        });
    }
});

/**
 * Per-user rate limiter (requires authentication)
 * 1000 requests per hour per user
 */
export const createUserRateLimit = () => rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 1000, // Limit each user to 1000 requests per hour
    keyGenerator: (req) => {
        // Use user ID if authenticated, otherwise fall back to IP
        return req.user?.id || req.ip;
    },
    message: {
        status: 'error',
        data: {
            error: 'Too many requests for this user, please try again later.',
            retryAfter: '1 hour'
        }
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).json({
            status: 'error',
            data: {
                error: 'Too many requests for this user, please try again later.',
                retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
            }
        });
    }
});

/**
 * Dynamic rate limiter based on endpoint type
 */
export const createDynamicRateLimit = (config) => {
    const {
        windowMs = 15 * 60 * 1000,
        max = 100,
        message = 'Too many requests',
        skipSuccessfulRequests = false,
        keyGenerator = null
    } = config;

    return rateLimit({
        windowMs,
        max,
        skipSuccessfulRequests,
        keyGenerator,
        message: {
            status: 'error',
            data: {
                error: message,
                retryAfter: Math.ceil(windowMs / 1000)
            }
        },
        standardHeaders: true,
        legacyHeaders: false,
        handler: (req, res) => {
            res.status(429).json({
                status: 'error',
                data: {
                    error: message,
                    retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
                }
            });
        }
    });
};

/**
 * Rate limiter for WebSocket connections
 * 10 connections per minute per IP
 */
export const websocketRateLimit = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // Limit each IP to 10 WebSocket connections per minute
    message: {
        status: 'error',
        data: {
            error: 'Too many WebSocket connections, please try again later.',
            retryAfter: '1 minute'
        }
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).json({
            status: 'error',
            data: {
                error: 'Too many WebSocket connections, please try again later.',
                retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
            }
        });
    }
});

/**
 * Rate limiter for indexing operations
 * 5 requests per 10 minutes per user
 */
export const indexingRateLimit = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 5, // Limit each user to 5 indexing operations per 10 minutes
    keyGenerator: (req) => {
        return req.user?.id || req.ip;
    },
    message: {
        status: 'error',
        data: {
            error: 'Too many indexing operations, please try again later.',
            retryAfter: '10 minutes'
        }
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).json({
            status: 'error',
            data: {
                error: 'Too many indexing operations, please try again later.',
                retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
            }
        });
    }
});

/**
 * Middleware to add rate limiting headers to all responses
 */
export const rateLimitHeaders = (req, res, next) => {
    // Add custom headers for rate limiting info
    res.setHeader('X-RateLimit-Policy', 'MetaGauge API Rate Limiting');
    res.setHeader('X-RateLimit-Documentation', 'https://docs.metagauge.com/rate-limits');
    next();
};

/**
 * Rate limit bypass for internal services
 */
export const bypassRateLimit = (req, res, next) => {
    // Check for internal service token
    const internalToken = req.headers['x-internal-token'];
    if (internalToken === process.env.INTERNAL_SERVICE_TOKEN) {
        req.skipRateLimit = true;
    }
    next();
};

/**
 * Conditional rate limiter that can be bypassed
 */
export const conditionalRateLimit = (limiter) => {
    return (req, res, next) => {
        if (req.skipRateLimit) {
            return next();
        }
        return limiter(req, res, next);
    };
};

export default {
    generalRateLimit,
    authRateLimit,
    walletRateLimit,
    readRateLimit,
    intensiveRateLimit,
    createUserRateLimit,
    createDynamicRateLimit,
    websocketRateLimit,
    indexingRateLimit,
    rateLimitHeaders,
    bypassRateLimit,
    conditionalRateLimit
};