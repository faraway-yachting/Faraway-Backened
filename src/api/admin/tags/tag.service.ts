import Tag from '../../../core/models/tag.js';
import { ApiError } from '../../../shared/helpers/api-error.js';
import { errorConstants } from '@utils/error.codes.js';

import { 
    TagResult, 
    CreateTagRequest, 
    UpdateTagRequest, 
    TagQueryParams, 
    TagListResponse 
} from './tag.types.js';

class TagService {

    async createTag(tagData: CreateTagRequest): Promise<TagResult> {
        try {
            
            // Check if slug already exists
            const existingTag = await Tag.findOne({ slug: tagData.slug }).lean().exec();
            if (existingTag) {
                throw ApiError.conflict(errorConstants.TAG.SLUG_ALREADY_EXISTS);
            }

            const tag = new Tag({ ...tagData});

            const savedTag = await tag.save();
            
            return this.mapTagToResult(savedTag);
            
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to create tag';
            throw ApiError.badRequest(errorMessage);
        }
    }

    async getAllTags(queryParams: TagQueryParams): Promise<TagListResponse> {
        try {
            const { 
                page = 1, 
                limit = 10, 
                search, 
                sortBy = 'createdAt', 
                sortOrder = 'desc' 
            } = queryParams;

            const skip = (Number(page) - 1) * Number(limit);
            const parsedLimit = Number(limit);

            // Build search filter
            const searchFilter: Record<string, unknown> = {};
            if (search) {
                searchFilter.$or = [
                    { name: { $regex: search, $options: 'i' } },
                    { slug: { $regex: search, $options: 'i' } },
                    { description: { $regex: search, $options: 'i' } }
                ];
            }

            // Build sort object
            const sortObj: Record<string, 1 | -1> = {};
            sortObj[sortBy] = sortOrder === 'asc' ? 1 : -1;

            const [tags, total] = await Promise.all([
                Tag.find(searchFilter)
                    .sort(sortObj)
                    .skip(skip)
                    .limit(parsedLimit)
                    .lean()
                    .exec(),
                Tag.countDocuments(searchFilter).exec(),
            ]);

            const mappedTags = tags.map(tag => this.mapTagToResult(tag));

            return {
                tags: mappedTags,
                page: Number(page),
                limit: parsedLimit,
                total,
                totalPages: Math.ceil(total / parsedLimit),
            };
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to fetch tags';
            throw ApiError.badRequest(errorMessage);
        }
    }


    async updateTag(id: string, updateData: UpdateTagRequest): Promise<TagResult> {
        try {
            const { name, slug, description } = updateData;

            // Check if tag exists
            const existingTag = await Tag.findById(id);
            if (!existingTag) {
                throw ApiError.notFound(errorConstants.TAG.TAG_NOT_FOUND);
            }

            // Check slug uniqueness if changed
            if (slug && slug !== existingTag.slug) {
                const slugExists = await Tag.findOne({ 
                    slug, 
                    _id: { $ne: id } 
                }).lean().exec();
                if (slugExists) {
                    throw ApiError.conflict(errorConstants.TAG.SLUG_ALREADY_EXISTS);
                }
            }

            const updateFields: Record<string, unknown> = {};
            if (name !== undefined) updateFields.name = name;
            if (slug !== undefined) updateFields.slug = slug;
            if (description !== undefined) updateFields.description = description;

            const updatedTag = await Tag.findByIdAndUpdate(
                id,
                updateFields,
                { new: true, runValidators: true }
            ).lean().exec();

            if (!updatedTag) {
                throw ApiError.notFound(errorConstants.TAG.TAG_NOT_FOUND);
            }

            return this.mapTagToResult(updatedTag);
        } catch (error: unknown) {
            if (error && typeof error === 'object' && 'name' in error && error.name === 'CastError') {
                throw ApiError.badRequest('Invalid tag ID format');
            }
            throw error;
        }
    }

    async deleteTag(id: string): Promise<void> {
        try {
            
            const deletedTag = await Tag.findByIdAndDelete(id);
            if (!deletedTag) {
                throw ApiError.notFound(errorConstants.TAG.TAG_NOT_FOUND);
            }
        } catch (error: unknown) {
            if (error && typeof error === 'object' && 'name' in error && error.name === 'CastError') {
                throw ApiError.badRequest('Invalid tag ID format');
            }
            throw error;
        }
    }

    // 🔹 Private helper methods
    private mapTagToResult(tag: any): TagResult {
        return {
            id: tag._id.toString(),
            name: tag.name,
            slug: tag.slug,
            description: tag.description,
            createdAt: tag.createdAt,
            updatedAt: tag.updatedAt,
        };
    }
}

export default new TagService();
