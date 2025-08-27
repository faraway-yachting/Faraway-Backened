export interface CreateBlogRequest {
  title: string;
  content: string;
  excerpt?: string;
  tags?: string[];
  image?: string;
  authorId: string;
}

export interface UpdateBlogRequest {
  title?: string;
  content?: string;
  excerpt?: string;
  tags?: string[];
  image?: string;
}

export interface BlogResponse {
  id: string;
  title: string;
  content: string;
  excerpt?: string;
  tags?: string[];
  image?: string;
  authorId: string;
  author: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface BlogFilters {
  search?: string;
  tags?: string[];
  authorId?: string;
  startDate?: Date;
  endDate?: Date;
}
