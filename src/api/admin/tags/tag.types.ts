// Tag-related types for admin tag management

export interface TagResult {
    id: string;
    name: string;
    slug: string;
    description?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateTagRequest {
    name: string;
    slug: string;
    description?: string;
}

export interface UpdateTagRequest {
    name?: string;
    slug?: string;
    description?: string;
}

export interface TagQueryParams {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: 'name' | 'createdAt' | 'updatedAt';
    sortOrder?: 'asc' | 'desc';
}

export interface TagListResponse {
    tags: TagResult[];
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export interface TagDeleteRequest {
    id: string;
}
