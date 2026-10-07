/** Misma forma que en el backend (`PaginatedResponse`). */
export interface PaginatedResponse<T> {
    count: number;
    next: string | null;
    previous: string | null;
    results: T[];
}

export interface CashRegisterRow {
    id: number;
    name: string;
    balance: number;
    updatedAt: string;
}

export interface CashStatus {
    cashRegisterId: number;
    cashRegisterName: string;
    id: number;
    initialAmount: number;
    openedAt: string;
    totalSales: number;
    totalOutflows: number;
    systemBalance: number;
}

export interface CashCloseResult {
    id: number;
    initialAmount: number;
    openedAt: string;
    closedAt: string;
    totalSales: number;
    totalOutflows: number;
    systemBalance: number;
    closingAmount: number;
    difference: number;
}

export interface CashOpenRequest {
    cashRegisterId: number;
    initialAmount: number;
}

export interface CashCloseRequest {
    cashRegisterId: number;
    closingAmount: number;
}

export interface OutflowReason {
    id: number;
    name: string;
    description: string | null;
    isActive: boolean;
}

export interface CashOutflowRequest {
    cashRegisterId: number;
    reasonId: number;
    amount: number;
    description: string;
}

/** Saldo acumulado en el registro global de caja (ventas/egresos históricos; se actualiza con cada movimiento y al cierre de sesión). */
export interface CashRegisterBalance {
    id: number;
    name: string;
    balance: number;
    updatedAt: string;
}

export interface CashGlobalSummary {
    startDate: string;
    endDate: string;
    totalInflows: number;
    totalOutflows: number;
    netFlow: number;
}

export interface CashOutflow {
    id: number;
    orderId: number | null;
    reasonId: number;
    reasonName: string;
    amount: number;
    description: string | null;
    createdAt: string;
}

export interface CashSessionHistory {
    cashRegisterId: number | null;
    cashRegisterName: string | null;
    id: number;
    initialAmount: number;
    systemBalance: number | null;
    closingAmount: number | null;
    difference: number | null;
    openedAt: string;
    closedAt: string | null;
    isActive: boolean;
}
