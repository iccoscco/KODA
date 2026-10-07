export interface Color {
    id: number;
    name: string;
    hexCode: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface CreateColor {
    name: string;
    hexCode: string;
}

export interface UpdateColor {
    name: string;
    hexCode: string;
}