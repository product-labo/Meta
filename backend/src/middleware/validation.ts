import { Request, Response, NextFunction } from 'express';

export const validateUUID = (paramName: string) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const uuid = req.params[paramName];
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        
        if (!uuid || !uuidRegex.test(uuid)) {
            return res.status(400).json({
                success: false,
                error: 'INVALID_UUID',
                message: `Invalid ${paramName} format`
            });
        }
        
        next();
    };
};

export const validatePagination = (req: Request, res: Response, next: NextFunction) => {
    const { limit = '50', offset = '0' } = req.query;
    
    const limitNum = parseInt(limit as string);
    const offsetNum = parseInt(offset as string);
    
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 1000) {
        return res.status(400).json({
            success: false,
            error: 'INVALID_LIMIT',
            message: 'Limit must be between 1 and 1000'
        });
    }
    
    if (isNaN(offsetNum) || offsetNum < 0) {
        return res.status(400).json({
            success: false,
            error: 'INVALID_OFFSET',
            message: 'Offset must be 0 or greater'
        });
    }
    
    req.query.limit = limitNum.toString();
    req.query.offset = offsetNum.toString();
    
    next();
};
