export interface Role {
    id: number;
    name: string;
    description: string;
    isActive: boolean;
    permissions: Permission[];
    createdAt: string;
    updatedAt: string;
}

export interface Permission {
    id: number;
    name: string;
    module: string;
    action: string;
    description: string;
    /** Etiqueta ES (viene del API; fallback en permissionLabels.es) */
    labelEs?: string;
    /** Descripción ES (viene del API) */
    descriptionEs?: string;
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

export interface RoleCreate {
    name: string;
    description: string;
    permissionIds: number[];
}

export interface RoleUpdate {
    name?: string;
    description?: string;
    permissionIds?: number[];
}