/**
 * Textos en español para permisos. Los códigos (`name`) vienen del API y no cambian;
 * solo se traduce lo que ve el usuario.
 */
export const MODULE_LABELS_ES: Record<string, string> = {
    users: "Usuarios",
    roles: "Roles y permisos",
    categories: "Categorías",
    products: "Productos",
    orders: "Ventas",
    cash: "Caja",
    settings: "Configuración",
    dashboard: "Panel",
    notifications: "Notificaciones",
};

type PermEntry = { label: string; description: string };

const PERMISSION_LABELS_ES: Record<string, PermEntry> = {
    "users.create": {
        label: "Crear usuarios",
        description: "Permite registrar nuevos usuarios en el sistema.",
    },
    "users.read": {
        label: "Ver usuarios",
        description: "Permite listar y consultar datos de usuarios.",
    },
    "users.update": {
        label: "Editar usuarios",
        description: "Permite modificar datos de usuarios existentes.",
    },
    "users.delete": {
        label: "Eliminar usuarios",
        description: "Permite eliminar usuarios del sistema.",
    },
    "users.change_password": {
        label: "Cambiar contraseña",
        description: "Permite restablecer la contraseña de cualquier usuario desde el panel de administración.",
    },
    "roles.create": {
        label: "Crear roles",
        description: "Permite crear nuevos roles.",
    },
    "roles.read": {
        label: "Ver roles",
        description: "Permite listar y consultar roles y sus permisos.",
    },
    "roles.update": {
        label: "Editar roles",
        description: "Permite modificar roles y asignar permisos.",
    },
    "roles.delete": {
        label: "Eliminar roles",
        description: "Permite eliminar roles.",
    },
    "categories.create": {
        label: "Crear categorías",
        description: "Permite crear categorías de productos.",
    },
    "categories.read": {
        label: "Ver categorías",
        description: "Permite listar y consultar categorías.",
    },
    "categories.update": {
        label: "Editar categorías",
        description: "Permite modificar categorías.",
    },
    "categories.delete": {
        label: "Eliminar categorías",
        description: "Permite eliminar categorías.",
    },
    "products.create": {
        label: "Crear productos",
        description: "Permite crear productos y variantes.",
    },
    "products.read": {
        label: "Ver productos",
        description: "Permite listar y consultar el catálogo.",
    },
    "products.update": {
        label: "Editar productos",
        description: "Permite modificar productos, precios e inventario.",
    },
    "products.delete": {
        label: "Eliminar productos",
        description: "Permite eliminar productos del catálogo.",
    },
    "orders.create": {
        label: "Crear ventas",
        description: "Permite registrar nuevas ventas en el punto de venta.",
    },
    "orders.read": {
        label: "Ver ventas",
        description: "Permite listar y consultar ventas registradas.",
    },
    "orders.update": {
        label: "Editar ventas",
        description: "Permite modificar estado o datos de las ventas.",
    },
    "orders.delete": {
        label: "Anular ventas",
        description: "Permite anular o eliminar ventas según reglas del negocio.",
    },
    "orders.modify_price_below_sale": {
        label: "Precio bajo precio de venta",
        description: "Permite vender por debajo del precio de venta configurado (descuentos fuertes).",
    },
    "orders.modify_price_below_purchase": {
        label: "Precio bajo costo",
        description: "Permite vender por debajo del costo de compra (venta con pérdida).",
    },
    "cash.create": {
        label: "Gestionar caja (alta)",
        description: "Permite crear operaciones o registros de caja según el flujo definido.",
    },
    "cash.read": {
        label: "Ver caja",
        description: "Permite consultar sesiones de caja, ventas y movimientos.",
    },
    "cash.update": {
        label: "Editar caja",
        description: "Permite modificar datos de sesiones o movimientos de caja.",
    },
    "cash.delete": {
        label: "Eliminar en caja",
        description: "Permite eliminar o revertir operaciones de caja cuando aplique.",
    },
    "cash.create_register": {
        label: "Crear caja registradora",
        description: "Permite registrar nuevas cajas o puntos de venta.",
    },
    "settings.read": {
        label: "Ver configuración",
        description: "Permite ver la configuración de la tienda.",
    },
    "settings.update": {
        label: "Editar configuración",
        description: "Permite modificar nombre, logo y ajustes generales de la tienda.",
    },
    "dashboard.read": {
        label: "Ver panel",
        description: "Permite acceder al resumen, gráficas y alertas del panel principal.",
    },
    "notifications.read": {
        label: "Ver notificaciones",
        description: "Permite ver el centro de notificaciones y avisos en tiempo real.",
    },
};

export function getModuleLabelEs(module: string): string {
    return MODULE_LABELS_ES[module] ?? module.charAt(0).toUpperCase() + module.slice(1);
}

export function getPermissionLabelEs(permissionName: string): string {
    return PERMISSION_LABELS_ES[permissionName]?.label ?? permissionName;
}

export function getPermissionDescriptionEs(permissionName: string, fallbackDescription?: string): string {
    const mapped = PERMISSION_LABELS_ES[permissionName]?.description;
    if (mapped) return mapped;
    if (fallbackDescription?.trim()) return fallbackDescription;
    return "";
}

