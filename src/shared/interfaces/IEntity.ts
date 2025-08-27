export interface IEntity {
    _id?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface IUser extends IEntity {
    name: string;
    email: string;
    password: string;
    phone: string;
    role?: string;
    isActive?: boolean;
}

export interface IYacht extends IEntity {
    name: string;
    description: string;
    type: 'motor' | 'sailing' | 'catamaran' | 'luxury';
    length: number;
    capacity: number;
    price: number;
    location: string;
    amenities?: string[];
    images?: string[];
}

export interface IBlog extends IEntity {
    title: string;
    content: string;
    category: 'travel' | 'lifestyle' | 'yachting' | 'destination';
    author: string;
    tags?: string[];
    image?: string;
}
