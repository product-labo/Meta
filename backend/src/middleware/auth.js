/**
 * JavaScript version of auth middleware for testing
 */

import jwt from 'jsonwebtoken';

export const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) return res.status(401).json({ message: 'Unauthorized' });

    jwt.verify(token, process.env.JWT_SECRET || 'secret', (err, user) => {
        if (err) return res.status(403).json({ message: 'Forbidden' });
        req.user = user;
        next();
    });
};

export const requireRole = (roles) => {
    return (req, res, next) => {
        const userRoles = req.user?.roles || [];
        const hasRole = roles.some(role => userRoles.includes(role));
        if (!hasRole) return res.status(403).json({ message: 'Insufficient permissions' });
        next();
    };
};