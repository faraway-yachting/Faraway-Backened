import { type Request, type Response, type NextFunction } from 'express';
import BlogService from './blog.service.js';
import { successHandler } from '../../../core/utils/helpers/success-handler.js';
import { ApiError } from '../../../core/utils/helpers/api-error.js';

class BlogController {
    async createBlog(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const blogData = req.body;
            const result = await BlogService.createBlog(blogData);
            successHandler(res, result, 'Blog created successfully');
        } catch (error) {
            next(error);
        }
    }

    async getAllBlogs(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { page = 1, limit = 10, ...filters } = req.query;
            const result = await BlogService.getAllBlogs({ 
                page: Number(page), 
                limit: Number(limit), 
                filters 
            });
            successHandler(res, result, 'Blogs retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    async getBlogById(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            
            if (!id) {
                throw new ApiError(400, 'Blog ID is required');
            }
            
            const result = await BlogService.getBlogById(id);
            successHandler(res, result, 'Blog retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    async updateBlog(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const updateData = req.body;
            
            if (!id) {
                throw new ApiError(400, 'Blog ID is required');
            }
            
            const result = await BlogService.updateBlog(id, updateData);
            successHandler(res, result, 'Blog updated successfully');
        } catch (error) {
            next(error);
        }
    }

    async deleteBlog(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            
            if (!id) {
                throw new ApiError(400, 'Blog ID is required');
            }
            
            const result = await BlogService.deleteBlog(id);
            successHandler(res, result, 'Blog deleted successfully');
        } catch (error) {
            next(error);
        }
    }

    async uploadBlogImage(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const file = req.file as Express.Multer.File;
            
            if (!id) {
                throw new ApiError(400, 'Blog ID is required');
            }
            
            const result = await BlogService.uploadBlogImage(id, file);
            successHandler(res, result, 'Image uploaded successfully');
        } catch (error) {
            next(error);
        }
    }
}

const blogController = new BlogController();

export const createBlog = blogController.createBlog.bind(blogController);
export const getAllBlogs = blogController.getAllBlogs.bind(blogController);
export const getBlogById = blogController.getBlogById.bind(blogController);
export const updateBlog = blogController.updateBlog.bind(blogController);
export const deleteBlog = blogController.deleteBlog.bind(blogController);
export const uploadBlogImage = blogController.uploadBlogImage.bind(blogController);

export default blogController;
