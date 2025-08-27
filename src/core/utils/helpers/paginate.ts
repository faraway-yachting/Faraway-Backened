import { Model, FilterQuery } from 'mongoose';

interface PaginationOptions {
    page: number;
    limit: number;
}

interface PaginationResult<T> {
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
}

export const paginate = async <T>(
    model: Model<T>,
    query: FilterQuery<T>,
    options: PaginationOptions
): Promise<PaginationResult<T>> => {
    const { page, limit } = options;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
        model.find(query).skip(skip).limit(limit).exec(),
        model.countDocuments(query).exec()
    ]);

    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    return {
        data,
        pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNext,
            hasPrev
        }
    };
};
