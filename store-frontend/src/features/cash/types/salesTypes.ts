export type OrderStatus =
    | "PENDING"
    | "PAID"
    | "SHIPPED"
    | "DELIVERED"
    | "CANCELLED";

export type PaymentMethod = "YAPE" | "PLIN" | "CASH" | "TRANSFER" | "CARD";

export type PaymentStatus = "PENDING" | "COMPLETED" | "FAILED";

export interface OrderItem {
    id: number;
    orderId: number;
    productVariantId: number;
    productName: string;
    colorName: string | null;
    sizeName: string | null;
    /** Ruta relativa; combinar con base API para URL absoluta. */
    imageUrl?: string | null;
    quantity: number;
    unitPrice: number;
    purchasePrice?: number;
    /** true si el costo no es el congelado al vender (histórico/backfill). */
    profitEstimated?: boolean;
    totalPrice: number;
    createdAt: string;
    updatedAt: string;
}

export interface Payment {
    id: number;
    orderId: number;
    method: PaymentMethod;
    status: PaymentStatus;
    amount: number;
    paidAt: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface ShippingAddress {
    id: number;
    orderId: number;
    fullName: string;
    address?: string | null;
    city?: string | null;
    phone?: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface Sale {
    id: number;
    userId: number;
    userName: string;
    status: OrderStatus;
    total: number;
    orderItems: OrderItem[];
    payments: Payment[];
    shippingAddress: ShippingAddress | null;
    createdAt: string;
    updatedAt: string;
}

export interface OrderItemCreate {
    productVariantId: number;
    quantity: number;
    customUnitPrice?: number;
}

export interface ShippingAddressCreate {
    fullName: string;
    address?: string;
    city?: string;
    phone?: string;
}

export interface PaymentCreate {
    method: PaymentMethod;
    amount: number;
}

export interface CreateSale {
    userId: number;
    orderItems: OrderItemCreate[];
    shippingAddress: ShippingAddressCreate;
    payments: PaymentCreate[];
    /** Obligatorio si hay más de una sesión de caja abierta. */
    cashRegisterId?: number;
}

export interface OrderStatusUpdate {
    status: OrderStatus;
}
