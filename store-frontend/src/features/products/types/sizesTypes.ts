export interface Size {
    id: number;
    name: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface CreateSize {
    name: string;
}

export interface UpdateSize {
    name: string;
}