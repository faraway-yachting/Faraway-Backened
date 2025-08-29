import { IYacht } from '../../../core/models/yacht.js';
import Yacht from '../../../core/models/yacht.js';
import { uploadToCloudinary } from '../../../shared/services/cloudinary.service.js';
import { ApiError } from '../../../shared/helpers/api-error.js';
import { paginate } from '../../../shared/helpers/paginate.js';

interface YachtFilters {
    name?: string;
    type?: string;
    priceMin?: number;
    priceMax?: number;
}

interface YachtQueryOptions {
    page: number;
    limit: number;
    filters: YachtFilters;
}

class YachtService {
    async createYacht(yachtData: Partial<IYacht>): Promise<IYacht> {
        const yacht = new Yacht(yachtData);
        await yacht.save();
        return yacht;
    }

    async getAllYachts({ page, limit, filters }: YachtQueryOptions): Promise<any> {
        const query: any = {};
        
        // Apply filters
        if (filters.name) {
            query.name = { $regex: filters.name, $options: 'i' };
        }
        if (filters.type) {
            query.type = filters.type;
        }
        if (filters.priceMin || filters.priceMax) {
            query.price = {};
            if (filters.priceMin) query.price.$gte = filters.priceMin;
            if (filters.priceMax) query.price.$lte = filters.priceMax;
        }

        const result = await paginate(Yacht, query, { page, limit });
        return result;
    }

    async getYachtById(id: string): Promise<IYacht> {
        const yacht = await Yacht.findById(id);
        if (!yacht) {
            throw new ApiError(404, 'Yacht not found');
        }
        return yacht;
    }

    async updateYacht(id: string, updateData: Partial<IYacht>): Promise<IYacht> {
        const yacht = await Yacht.findByIdAndUpdate(id, updateData, { new: true });
        if (!yacht) {
            throw new ApiError(404, 'Yacht not found');
        }
        return yacht;
    }

    async deleteYacht(id: string): Promise<{ message: string }> {
        const yacht = await Yacht.findByIdAndDelete(id);
        if (!yacht) {
            throw new ApiError(404, 'Yacht not found');
        }
        return { message: 'Yacht deleted successfully' };
    }

    async uploadYachtImages(yachtId: string, files: Express.Multer.File[]): Promise<{ images: string[] }> {
        const yacht = await Yacht.findById(yachtId);
        if (!yacht) {
            throw new ApiError(404, 'Yacht not found');
        }

        const uploadedImages = [];
        for (const file of files) {
            const result = await uploadToCloudinary(file, 'yachts');
            uploadedImages.push(result.secure_url);
        }

        yacht.images = [...(yacht.images || []), ...uploadedImages];
        await yacht.save();

        return { images: yacht.images };
    }
}

export default new YachtService();
