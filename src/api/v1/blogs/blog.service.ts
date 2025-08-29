import { IBlog } from '../../../core/models/blog.js';
import Blog from '../../../core/models/blog.js';
import { uploadToCloudinary } from '../../../shared/services/cloudinary.service.js';
import { ApiError } from '../../../shared/helpers/api-error.js';
import { paginate } from '../../../shared/helpers/paginate.js';

interface BlogFilters {
    title?: string;
    category?: string;
    author?: string;
}

interface BlogQueryOptions {
    page: number;
    limit: number;
    filters: BlogFilters;
}

class BlogService {
    async createBlog(blogData: Partial<IBlog>): Promise<IBlog> {
        const blog = new Blog(blogData);
        await blog.save();
        return blog;
    }

    async getAllBlogs({ page, limit, filters }: BlogQueryOptions): Promise<any> {
        const query: any = {};
        
        // Apply filters
        if (filters.title) {
            query.title = { $regex: filters.title, $options: 'i' };
        }
        if (filters.category) {
            query.category = filters.category;
        }
        if (filters.author) {
            query.author = filters.author;
        }

        const result = await paginate(Blog, query, { page, limit });
        return result;
    }

    async getBlogById(id: string): Promise<IBlog> {
        const blog = await Blog.findById(id);
        if (!blog) {
            throw new ApiError(404, 'Blog not found');
        }
        return blog;
    }

    async updateBlog(id: string, updateData: Partial<IBlog>): Promise<IBlog> {
        const blog = await Blog.findByIdAndUpdate(id, updateData, { new: true });
        if (!blog) {
            throw new ApiError(404, 'Blog not found');
        }
        return blog;
    }

    async deleteBlog(id: string): Promise<{ message: string }> {
        const blog = await Blog.findByIdAndDelete(id);
        if (!blog) {
            throw new ApiError(404, 'Blog not found');
        }
        return { message: 'Blog deleted successfully' };
    }

    async uploadBlogImage(blogId: string, file: Express.Multer.File): Promise<{ image: string }> {
        const blog = await Blog.findById(blogId);
        if (!blog) {
            throw new ApiError(404, 'Blog not found');
        }

        const result = await uploadToCloudinary(file, 'blogs');
        blog.image = result.secure_url;
        await blog.save();

        return { image: blog.image };
    }
}

export default new BlogService();
