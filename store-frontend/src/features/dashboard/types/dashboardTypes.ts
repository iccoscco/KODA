export interface DashboardSummary {
    todaySales: number;
    monthSales: number;
    todayOrders: number;
    openSessions: number;
    lowStockCount: number;
}

export interface SellerSalesItem {
    sellerName: string;
    orderCount: number;
    totalAmount: number;
}

export interface RegisterSalesItem {
    registerName: string;
    orderCount: number;
    totalAmount: number;
}

export interface LowStockAlert {
    variantId: number;
    productName: string;
    variantDescription: string;
    stock: number;
    minStock: number;
    sku: string | null;
}

export interface StockInputItem {
    id: number;
    quantity: number;
    type: string;
    createdAt: string;
}
