package com.yisus.store_backend.role.i18n;

import com.yisus.store_backend.role.model.Permission;

import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

/**
 * Etiquetas ES y reglas de búsqueda alineadas con el frontend (permissionLabels.es.ts).
 * Permite paginar en servidor y filtrar por texto en español o códigos técnicos.
 */
public final class PermissionI18nEs {

    private static final Map<String, String> MODULE_LABELS = new HashMap<>();

    private static final Map<String, Entry> LABELS = new HashMap<>();

    static {
        MODULE_LABELS.put("users", "Usuarios");
        MODULE_LABELS.put("roles", "Roles y permisos");
        MODULE_LABELS.put("categories", "Categorías");
        MODULE_LABELS.put("products", "Productos");
        MODULE_LABELS.put("orders", "Ventas");
        MODULE_LABELS.put("cash", "Caja");
        MODULE_LABELS.put("settings", "Configuración");
        MODULE_LABELS.put("dashboard", "Panel");
        MODULE_LABELS.put("notifications", "Notificaciones");

        put("users.create", "Crear usuarios", "Permite registrar nuevos usuarios en el sistema.");
        put("users.read", "Ver usuarios", "Permite listar y consultar datos de usuarios.");
        put("users.update", "Editar usuarios", "Permite modificar datos de usuarios existentes.");
        put("users.delete", "Eliminar usuarios", "Permite eliminar usuarios del sistema.");
        put("users.change_password", "Cambiar contraseña", "Permite restablecer la contraseña de cualquier usuario desde el panel de administración.");
        put("roles.create", "Crear roles", "Permite crear nuevos roles.");
        put("roles.read", "Ver roles", "Permite listar y consultar roles y sus permisos.");
        put("roles.update", "Editar roles", "Permite modificar roles y asignar permisos.");
        put("roles.delete", "Eliminar roles", "Permite eliminar roles.");
        put("categories.create", "Crear categorías", "Permite crear categorías de productos.");
        put("categories.read", "Ver categorías", "Permite listar y consultar categorías.");
        put("categories.update", "Editar categorías", "Permite modificar categorías.");
        put("categories.delete", "Eliminar categorías", "Permite eliminar categorías.");
        put("products.create", "Crear productos", "Permite crear productos y variantes.");
        put("products.read", "Ver productos", "Permite listar y consultar el catálogo.");
        put("products.update", "Editar productos", "Permite modificar productos, precios e inventario.");
        put("products.delete", "Eliminar productos", "Permite eliminar productos del catálogo.");
        put("orders.create", "Crear ventas", "Permite registrar nuevas ventas en el punto de venta.");
        put("orders.read", "Ver ventas", "Permite listar y consultar ventas registradas.");
        put("orders.update", "Editar ventas", "Permite modificar estado o datos de las ventas.");
        put("orders.delete", "Anular ventas", "Permite anular o eliminar ventas según reglas del negocio.");
        put("orders.modify_price_below_sale", "Precio bajo precio de venta",
                "Permite vender por debajo del precio de venta configurado (descuentos fuertes).");
        put("orders.modify_price_below_purchase", "Precio bajo costo",
                "Permite vender por debajo del costo de compra (venta con pérdida).");
        put("cash.create", "Gestionar caja (alta)", "Permite crear operaciones o registros de caja según el flujo definido.");
        put("cash.read", "Ver caja", "Permite consultar sesiones de caja, ventas y movimientos.");
        put("cash.update", "Editar caja", "Permite modificar datos de sesiones o movimientos de caja.");
        put("cash.delete", "Eliminar en caja", "Permite eliminar o revertir operaciones de caja cuando aplique.");
        put("cash.create_register", "Crear caja registradora", "Permite registrar nuevas cajas o puntos de venta.");
        put("settings.read", "Ver configuración", "Permite ver la configuración de la tienda.");
        put("settings.update", "Editar configuración", "Permite modificar nombre, logo y ajustes generales de la tienda.");
        put("dashboard.read", "Ver panel", "Permite acceder al resumen, gráficas y alertas del panel principal.");
        put("notifications.read", "Ver notificaciones", "Permite ver el centro de notificaciones y avisos en tiempo real.");
    }

    private record Entry(String label, String description) {}

    private static void put(String name, String label, String description) {
        LABELS.put(name, new Entry(label, description));
    }

    public static String getModuleLabelEs(String module) {
        return MODULE_LABELS.getOrDefault(module,
                module.isEmpty() ? module : module.substring(0, 1).toUpperCase(Locale.ROOT) + module.substring(1));
    }

    public static String getLabelEs(String permissionName) {
        Entry e = LABELS.get(permissionName);
        return e != null ? e.label : permissionName;
    }

    public static String getDescriptionEs(String permissionName, String fallbackDescription) {
        Entry e = LABELS.get(permissionName);
        if (e != null) {
            return e.description;
        }
        if (fallbackDescription != null && !fallbackDescription.isBlank()) {
            return fallbackDescription;
        }
        return "";
    }

    private static boolean proseMatchesQuery(String text, String query) {
        String q = query.trim().toLowerCase(Locale.ROOT);
        if (q.isEmpty()) {
            return true;
        }
        String t = text.toLowerCase(Locale.ROOT);
        for (String w : t.split("[^\\p{L}\\p{N}]+")) {
            if (w.isEmpty()) {
                continue;
            }
            if (w.equals(q) || w.startsWith(q)) {
                return true;
            }
        }
        return false;
    }

    private static boolean codeMatchesQuery(String text, String query) {
        String q = query.trim().toLowerCase(Locale.ROOT);
        if (q.isEmpty()) {
            return true;
        }
        return text.toLowerCase(Locale.ROOT).contains(q);
    }

    /**
     * Misma semántica que permissionMatchesSearch en el frontend.
     */
    public static boolean matchesSearch(Permission p, String query) {
        if (query == null || query.trim().isEmpty()) {
            return true;
        }
        String q = query.trim();
        if (codeMatchesQuery(p.getName(), q) || codeMatchesQuery(p.getModule(), q)) {
            return true;
        }
        String desc = p.getDescription() != null ? p.getDescription() : "";
        // No usar getModuleLabelEs aquí: el nombre del módulo haría coincidir todo orders.* sin que el texto del permiso lo mencione.
        return proseMatchesQuery(getLabelEs(p.getName()), q)
                || proseMatchesQuery(getDescriptionEs(p.getName(), desc), q)
                || proseMatchesQuery(desc, q);
    }

    private PermissionI18nEs() {}
}
