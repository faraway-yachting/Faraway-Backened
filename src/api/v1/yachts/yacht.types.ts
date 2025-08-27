export interface CreateYachtRequest {
  name: string;
  description: string;
  price: number;
  capacity: number;
  length: number;
  year: number;
  location: string;
  amenities: string[];
  primaryImage?: string;
  gallery?: string[];
}

export interface UpdateYachtRequest {
  name?: string;
  description?: string;
  price?: number;
  capacity?: number;
  length?: number;
  year?: number;
  location?: string;
  amenities?: string[];
  primaryImage?: string;
  gallery?: string[];
}

export interface YachtResponse {
  id: string;
  name: string;
  description: string;
  price: number;
  capacity: number;
  length: number;
  year: number;
  location: string;
  amenities: string[];
  primaryImage?: string;
  gallery?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface YachtFilters {
  minPrice?: number;
  maxPrice?: number;
  minCapacity?: number;
  maxCapacity?: number;
  location?: string;
  amenities?: string[];
}
