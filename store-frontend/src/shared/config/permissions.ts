export const PERMISSIONS = {
    USERS: {
        CREATE:          "users.create",
        READ:            "users.read",
        UPDATE:          "users.update",
        DELETE:          "users.delete",
        CHANGE_PASSWORD: "users.change_password",
    },
    ROLES: {
        CREATE: "roles.create",
        READ:   "roles.read",
        UPDATE: "roles.update",
        DELETE: "roles.delete",
    },
    PRODUCTS: {
        CREATE: "products.create",
        READ:   "products.read",
        UPDATE: "products.update",
        DELETE: "products.delete",
    },
    CATEGORIES: {
        CREATE: "categories.create",
        READ:   "categories.read",
        UPDATE: "categories.update",
        DELETE: "categories.delete",
    },
    ORDERS: {
        CREATE: "orders.create",
        READ:   "orders.read",
        UPDATE: "orders.update",
        DELETE: "orders.delete",
        /** Precio personalizado / descuento que deja el unitario por debajo del precio de venta efectivo. */
        MODIFY_PRICE_BELOW_SALE: "orders.modify_price_below_sale",
        /** Precio por debajo del costo de compra (venta con pérdida); debe coincidir con el backend. */
        MODIFY_PRICE_BELOW_PURCHASE: "orders.modify_price_below_purchase",
    },
    SETTINGS: {
        READ: "settings.read",
        UPDATE: "settings.update",
    },
    CASH: {
        CREATE:          "cash.create",
        READ:            "cash.read",
        UPDATE:          "cash.update",
        DELETE:          "cash.delete",
        CREATE_REGISTER: "cash.create_register",
    },
    /** Panel principal (resumen, gráficas, alertas de stock del dashboard). */
    DASHBOARD: {
        READ: "dashboard.read",
    },
    /** Centro de notificaciones (lista, SSE, marcar leídas). Las notificaciones las genera el sistema automáticamente. */
    NOTIFICATIONS: {
        READ: "notifications.read",
    },
} as const;

/** All permission strings (mapped over modules so SETTINGS lacking CREATE/DELETE does not narrow the union). */
export type Permission = {
    [K in keyof typeof PERMISSIONS]: (typeof PERMISSIONS)[K][keyof (typeof PERMISSIONS)[K]];
}[keyof typeof PERMISSIONS];
