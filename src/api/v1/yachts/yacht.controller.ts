import { type Request, type Response, type NextFunction } from 'express';
import YachtService from './yacht.service.js';
import SuccessHandler from '../../../shared/helpers/success-handler.js';

class YachtController {
    async createYacht(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const yachtData = req.body;
            const result = await YachtService.createYacht(yachtData);
            SuccessHandler(result, 201, 'Yacht created successfully', res);
        } catch (error) {
            next(error);
        }
    }

    async getAllYachts(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { page = 1, limit = 10, ...filters } = req.query;
            const result = await YachtService.getAllYachts({ 
                page: Number(page), 
                limit: Number(limit), 
                filters 
            });
            SuccessHandler(result, 200, 'Yachts retrieved successfully', res);
        } catch (error) {
            next(error);
        }
    }

    async getYachtById(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            if (!id) {
                res.status(400).json({ success: false, message: 'Yacht ID is required' });
                return;
            }
            const result = await YachtService.getYachtById(id);
            SuccessHandler(result, 200, 'Yacht retrieved successfully', res);
        } catch (error) {
            next(error);
        }
    }

    async updateYacht(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            if (!id) {
                res.status(400).json({ success: false, message: 'Yacht ID is required' });
                return;
            }
            const updateData = req.body;
            const result = await YachtService.updateYacht(id, updateData);
            SuccessHandler(result, 200, 'Yacht updated successfully', res);
        } catch (error) {
            next(error);
        }
    }

    async deleteYacht(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            if (!id) {
                res.status(400).json({ success: false, message: 'Yacht ID is required' });
                return;
            }
            const result = await YachtService.deleteYacht(id);
            SuccessHandler(result, 200, 'Yacht deleted successfully', res);
        } catch (error) {
            next(error);
        }
    }

    async uploadYachtImages(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            if (!id) {
                res.status(400).json({ success: false, message: 'Yacht ID is required' });
                return;
            }
            const files = req.files as Express.Multer.File[];
            const result = await YachtService.uploadYachtImages(id, files);
            SuccessHandler(result, 200, 'Images uploaded successfully', res);
        } catch (error) {
            next(error);
        }
    }
}

const yachtController = new YachtController();

export const createYacht = yachtController.createYacht.bind(yachtController);
export const getAllYachts = yachtController.getAllYachts.bind(yachtController);
export const getYachtById = yachtController.getYachtById.bind(yachtController);
export const updateYacht = yachtController.updateYacht.bind(yachtController);
export const deleteYacht = yachtController.deleteYacht.bind(yachtController);
export const uploadYachtImages = yachtController.uploadYachtImages.bind(yachtController);

export default yachtController;
