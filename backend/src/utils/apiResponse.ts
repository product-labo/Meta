import { Response } from 'express';

interface ApiResponse {
    success: boolean;
    data?: any;
    error?: string;
    message?: string;
    pagination?: {
        limit: number;
        offset: number;
        total?: number;
        hasMore?: boolean;
    };
}

export const sendSuccess = (res: Response, data: any, pagination?: any): void => {
    const response: ApiResponse = {
        success: true,
        data
    };
    
    if (pagination) {
        response.pagination = pagination;
    }
    
    res.json(response);
};

export const sendError = (res: Response, status: number, error: string, message?: string): void => {
    const response: ApiResponse = {
        success: false,
        error,
        message: message || error
    };
    
    res.status(status).json(response);
};

export const sendNotFound = (res: Response, resource: string = 'Resource'): void => {
    sendError(res, 404, 'NOT_FOUND', `${resource} not found`);
};

export const sendUnauthorized = (res: Response, message: string = 'Unauthorized access'): void => {
    sendError(res, 403, 'UNAUTHORIZED', message);
};

export const sendValidationError = (res: Response, message: string): void => {
    sendError(res, 400, 'VALIDATION_ERROR', message);
};

export const sendServerError = (res: Response, message: string = 'Internal server error'): void => {
    sendError(res, 500, 'SERVER_ERROR', message);
};
