export interface User {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
    role: string;
    permissions: string[];
    permissionsCount: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface PaginatedResponse<T> {
    count: number;
    next: string | null;
    previous: string | null;
    results: T[];
}

export interface Params {
    limit?: number;
    offset?: number;
    search?: string;
}

export interface UserCreate {
    name: string;
    email: string;
    password: string;
    roleId: number;
}

export interface UserUpdate {
    name?: string;
    email?: string;
    roleId?: number;
}