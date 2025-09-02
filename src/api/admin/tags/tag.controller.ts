import { type Request, type Response, type NextFunction } from 'express';
import TagService from './tag.service.js';
import successHandler from '@helpers/success-handler.js';
import { errorConstants } from '@utils/error.codes.js';
import { 
    CreateTagRequest, 
    UpdateTagRequest, 
    TagQueryParams, 
} from './tag.types.js';

// Extend Express Request interface for typed body and query
interface TypedRequestBody<T> extends Request {
    body: T;
}

interface TypedRequestQuery<T extends Record<string, any>> extends Request {
    query: T;
}

class TagController {
    
    async createTag(req: TypedRequestBody<CreateTagRequest>, res: Response, next: NextFunction): Promise<void> {
        try {
            const tagData = req.body;
            const result = await TagService.createTag(tagData);   
            successHandler(res, result, errorConstants.TAG.TAG_CREATED, 201);
        } catch (error) {
            next(error); 
        }
    }

    async getAllTags(req: TypedRequestQuery<TagQueryParams>, res: Response, next: NextFunction): Promise<void> {
        try {
            const queryParams = req.query;
            const result = await TagService.getAllTags(queryParams);
            successHandler(res, result, errorConstants.TAG.TAGS_FETCHED);
        } catch (error) {
            next(error);
        }
    }



    async updateTag(req: TypedRequestBody<UpdateTagRequest & { id: string }>, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id, ...updateData } = req.body;
            const result = await TagService.updateTag(id, updateData);
            successHandler(res, result, errorConstants.TAG.TAG_UPDATED);
        } catch (error) {
            next(error);
        }
    }

    async deleteTag(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            await TagService.deleteTag(id);
            successHandler(res, null, errorConstants.TAG.TAG_DELETED);
        } catch (error) {
            next(error);
        }
    }
}

// Create single instance for performance (shared across requests)
const tagController = new TagController();

// Export bound methods with proper typing for optimal performance and type safety
export const createTag = (req: TypedRequestBody<CreateTagRequest>, res: Response, next: NextFunction): Promise<void> => 
    tagController.createTag.call(tagController, req, res, next);

export const getAllTags = (req: TypedRequestQuery<TagQueryParams>, res: Response, next: NextFunction): Promise<void> => 
    tagController.getAllTags.call(tagController, req, res, next);

export const updateTag = (req: TypedRequestBody<UpdateTagRequest & { id: string }>, res: Response, next: NextFunction): Promise<void> => 
    tagController.updateTag.call(tagController, req, res, next);

export const deleteTag = (req: Request, res: Response, next: NextFunction): Promise<void> => 
    tagController.deleteTag.call(tagController, req, res, next);
