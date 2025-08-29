import { type Request, type Response, type NextFunction } from 'express';
import BlogService from './blog.service.js';
import SuccessHandler from '../../../shared/helpers/success-handler.js';
import { ApiError } from '../../../shared/helpers/api-error.js';

class BlogController {
    async createBlog(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const blogData = req.body;
            const result = await BlogService.createBlog(blogData);
            SuccessHandler(result, 201, 'Blog created successfully', res);
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
            SuccessHandler(result, 200, 'Blogs retrieved successfully', res);
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
            SuccessHandler(result, 200, 'Blog retrieved successfully', res);
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
            SuccessHandler(result, 200, 'Blog updated successfully', res);
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
            SuccessHandler(result, 200, 'Blog deleted successfully', res);
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
            SuccessHandler(result, 200, 'Image uploaded successfully', res);
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
