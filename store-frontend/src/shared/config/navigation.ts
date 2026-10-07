import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import InventoryRoundedIcon from "@mui/icons-material/InventoryRounded";
import PeopleRoundedIcon from "@mui/icons-material/PeopleRounded";
import SecurityRoundedIcon from "@mui/icons-material/SecurityRounded";
import CategoryRoundedIcon from "@mui/icons-material/CategoryRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import PointOfSaleRoundedIcon from "@mui/icons-material/PointOfSaleRounded";
import AssessmentRoundedIcon from "@mui/icons-material/AssessmentRounded";
import NotificationsRoundedIcon from "@mui/icons-material/NotificationsRounded";
import { ElementType } from "react";
import { Permission, PERMISSIONS } from "@/shared/config/permissions";

export interface NavItem {
    label: string;
    href: string;
    icon: ElementType;
    permission?: Permission;
}

export const navItems: NavItem[] = [
    { label: "Dashboard",        href: "/dashboard",     icon: DashboardRoundedIcon,    permission: PERMISSIONS.DASHBOARD.READ },
    { label: "Usuarios",         href: "/users",         icon: PeopleRoundedIcon,       permission: PERMISSIONS.USERS.READ },
    { label: "Roles y permisos", href: "/roles",         icon: SecurityRoundedIcon,     permission: PERMISSIONS.ROLES.READ },
    { label: "Categorías",       href: "/categories",    icon: CategoryRoundedIcon,     permission: PERMISSIONS.CATEGORIES.READ },
    { label: "Productos",        href: "/products",      icon: InventoryRoundedIcon,    permission: PERMISSIONS.PRODUCTS.READ },
    { label: "Caja",             href: "/cash",          icon: PointOfSaleRoundedIcon,  permission: PERMISSIONS.CASH.READ },
    { label: "Reportes",         href: "/reports",       icon: AssessmentRoundedIcon,        permission: PERMISSIONS.CASH.READ },
    { label: "Notificaciones",  href: "/notifications", icon: NotificationsRoundedIcon, permission: PERMISSIONS.NOTIFICATIONS.READ },
    { label: "Configuración",   href: "/settings",      icon: SettingsRoundedIcon,          permission: PERMISSIONS.SETTINGS.READ },
];
