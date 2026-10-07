export interface UpdateProfileForm {
    name: string;
    email: string;
}

export interface ChangePasswordForm {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
}

export interface StoreConfig {
    storeName: string;
    storeRuc: string | null;
    storeAddress: string | null;
    logoUrl: string | null;
    printerName: string | null;
    printerIp: string | null;
    printerPort: number | null;
    printerType: string | null;
    updatedAt: string;
}

export interface StoreConfigUpdate {
    storeName: string;
    storeRuc?: string;
    storeAddress?: string;
    printerName?: string;
    printerIp?: string;
    printerPort?: number;
    printerType?: string;
}
