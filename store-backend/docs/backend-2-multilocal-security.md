# Backend 2 — aislamiento por local y contratos

Alcance: Sprint 1, Backend 2. Prefijo HTTP del backend: `/api` (context path de Spring).
El inventario se basa en los controladores existentes y separa la propiedad del código
de la responsabilidad por la política de acceso.

## Contexto efectivo

`LocalScope` es la interfaz compartida por controladores y servicios. Ningún `localId`
del body o query string selecciona el local:

- Un usuario ordinario opera en el local activo de su registro. Puede omitir
  `X-Local-Id` o repetir su propio ID; cualquier otro valor devuelve `403`.
- `SUPERADMIN` selecciona el local activo con `X-Local-Id`. Sin cabecera, con ID
  inexistente o con local inactivo, las rutas operativas devuelven `400`.
- La administración de roles y el selector de locales son globales; no tienen un
  local implícito. `GET /locals/current` sí es una ruta operativa y exige contexto.
- Un recurso que no pertenece al local efectivo se presenta como `404`.
- `POST /auth/register` permanece cerrado con `403`: su implementación anterior
  creaba cuentas sin local. Las altas ordinarias se hacen mediante `POST /users`
  (permiso `users.create`), que deriva el local del servidor.

## Matriz de rutas y política

| Ruta(s) | Permiso / autenticación | Datos y política de ámbito | Dueño | Caso de comprobación |
|---|---|---|---|---|
| `POST /auth/register` | Denegada explícitamente | No crea cuentas sin local | Backend 2 | Anónima y autenticada: `403`; no aparece usuario |
| `POST /auth/login`, `POST /auth/refresh-token`, `POST /auth/logout` | Públicas según flujo de autenticación | Identidad/token; no consultan datos operativos | Backend 2 | Credenciales/token válidos e inválidos |
| `GET /auth/me`, `GET /users/profile`, `PUT /users/profile`, `POST /users/profile/change-password` | Autenticado | Solo la identidad propia; `me` conserva campos actuales y añade `localId`, `localName`, `canSwitchLocal` | Backend 2 | Usuario A no puede consultar/modificar el perfil de B |
| `GET /locals/current` | Autenticado | Local efectivo; sin cabecera superadmin responde `400 LOCAL_REQUIRED` | Backend 2 | Ordinario obtiene A; admin obtiene local seleccionado |
| `GET /locals` | `SUPERADMIN` | Lista global de locales activos; no aplica local operativo | Backend 2 | Ordinario `403`; no listar inactivos |
| `GET /users`, `GET /users/{id}` | `users.read` | Lista, búsqueda, paginación y detalle de usuarios del local; detalle ajeno `404` | Backend 1 | A no lista ni obtiene usuario B por ID |
| `POST /users`, `PUT /users/{id}`, `DELETE /users/{id}`, `PATCH /users/{id}/status`, `PATCH /users/{id}/password` | `users.create/update/delete/change_password` | Alta asigna `LocalScope`; cambios y baja requieren usuario del mismo local | Backend 1 | Crear no puede imponer `localId`; editar ID B da `404` |
| `POST /users/profile/avatar`, `DELETE /users/profile/avatar` | Autenticado / `users.change_password` para borrar | Opera sobre el usuario autenticado; descarga protegida en `/uploads/**` | Backend 2 | Avatar de otra identidad/local no descargable |
| `GET /roles`, `GET /roles/{id}`, `GET /roles/permissions`, `GET /roles/permissions/module/{module}`, `GET /roles/permissions/group` | `roles.read` | Catálogo global de roles/permisos | Backend 2 | Acceso requiere permiso; no depende del local |
| `POST /roles`, `PUT /roles/{id}`, `DELETE /roles/{id}`, `PATCH /roles/{id}/status` | `SUPERADMIN` y permiso `roles.*` | Mutación global, reservada al administrador global | Backend 2 | Administrador local recibe `403` |
| `GET /categories`, `GET /categories/{id}`, `GET /categories/{id}/products` | `categories.read` | Catálogo y productos del local; detalle ajeno `404` | Backend 1 | Consultar categoría/productos de B desde A |
| `POST /categories`, `PUT /categories/{id}`, `DELETE /categories/{id}`, `PATCH /categories/{id}/status` | `categories.create/update/delete` | Crear en el local efectivo; mutaciones por ID dentro del local | Backend 1 | Body con `localId` B se ignora; ID B da `404` |
| `GET /products`, `GET /products/{id}`, `GET /products/{id}/stock-movements` | `products.read` | Productos y movimientos filtrados por local | Backend 1 | Listado y detalle B no visibles desde A |
| `POST /products`, `PUT /products/{id}`, `DELETE /products/{id}`, `PATCH /products/{id}/status` | `products.create/update/delete` | Escrituras por local; categoría y entidades asociadas deben pertenecer al mismo local | Backend 1 | Asociar categoría B desde A es rechazado |
| `GET /product-variants/product/{productId}`, `GET /product-variants/low-stock`, `GET /product-variants/{id}` | `products.read` | Variante y producto padre del local efectivo | Backend 1 | Producto/variante B da `404` |
| `POST /product-variants`, `PUT /product-variants/{id}`, `PUT /product-variants/{id}/stock`, `PUT /product-variants/{id}/stock/add`, `PUT /product-variants/{id}/stock/subtract`, `DELETE /product-variants/{id}` | `products.create/update/delete` | La variante y su producto se validan en el local efectivo | Backend 1 | Escritura sobre variante B falla sin modificar stock |
| `POST /product-variants/{id}/images`, `DELETE /product-variants/images/{imageId}`, `PATCH /product-variants/images/{imageId}/main` | `products.update` | Variante e imagen se validan por local; URL descargable también se valida | Backend 1 / Backend 2 para descarga | ID de imagen B no se elimina ni marca |
| `GET /colors`, `GET /colors/{id}`, `GET /sizes`, `GET /sizes/{id}` | `products.read` | Catálogos globales de referencia compartidos; no contienen registros operativos de un local | Backend 2 | Lectura permitida con permiso |
| `POST/PUT/DELETE /colors[/{id}]`, `POST/PUT/DELETE /sizes[/{id}]` | `SUPERADMIN` y permiso `products.create/update/delete` | Escrituras globales para evitar que un administrador local altere opciones de todos | Backend 2 | Administrador local recibe `403`; superadmin autorizado |
| `POST /orders`, `GET /orders`, `GET /orders/{id}`, `GET /orders/user/{userId}`, `GET /orders/status/{status}`, `GET /orders/by-session` | `orders.create/read` | Consulta y creación de ventas por local; usuario, variante, caja y sesión validados en el mismo local | Backend 1 | A no lista venta B ni puede combinar referencias B |
| `PUT /orders/{id}/status`, `PUT /orders/{id}/cancel` | `orders.update` | Actualización/anulación solo de venta del local | Backend 1 | ID de venta B da `404`; stock/caja no cambian |
| `GET /orders/{id}/receipt`, `POST /orders/{id}/print-direct` | `orders.read` | El recibo/impresión usa una venta localizada y configuración de su local | Backend 1 | Venta B no genera PDF/impresión desde A |
| `GET /cash/balance`, `GET /cash/inflows`, `GET /cash/inflows/range`, `GET /cash/outflows`, `GET /cash/outflows/range`, `GET /cash/outflows/by-session`, `GET /cash/reports/summary` | `cash.read` | Caja, apertura, ingresos, egresos y agregados filtrados por local | Backend 1 | A no ve saldos ni movimientos de B |
| `PUT /cash/balance`, `POST /cash/inflows/order/{orderId}`, `POST /cash/outflows`, `DELETE /cash/outflows/{id}` | `cash.update/create/delete` | Orden, apertura, egreso y referencias de caja deben corresponder al local efectivo | Backend 1 | Referencia B no produce escritura |
| `POST /cash/opening/open`, `GET /cash/opening/status`, `POST /cash/opening/close`, `GET /cash/opening/history` | `cash.create/read/update` | Todas las aperturas y sesiones se resuelven a cajas del local | Backend 1 | ID de caja/sesión ajeno responde `404` |
| `GET /cash/registers`, `POST /cash/registers`, `GET /cash/outflow-reasons`, `POST /cash/outflow-reasons`, `DELETE /cash/outflow-reasons/{id}` | `cash.read/create_register/create/delete` | Cajas y motivos pertenecen al local efectivo | Backend 1 | No listar ni borrar caja/motivo B desde A |
| `GET /dashboard/summary`, `GET /dashboard/sales-by-seller`, `GET /dashboard/sales-by-register`, `GET /dashboard/low-stock`, `GET /dashboard/stock-inputs` | `dashboard.read` | Consultas agregadas filtran órdenes, sesiones, variantes y movimientos por `LocalScope` | Backend 2 | Cifras A no incluyen fixtures B |
| `GET /reports/cash-sessions`, `GET /reports/cash-sessions/pdf` | `cash.read` | Lista y PDF usan sesiones y caja del local; filtros de fecha/rango/caja se aplican después del filtro local | Backend 2 | PDF/lista A no contiene una sesión B |
| `GET /reports/products`, `GET /reports/products/pdf` | `products.read` | Lista y PDF usan productos/variantes del local | Backend 2 | Producto B no aparece en JSON ni PDF A |
| `GET /notifications`, `GET /notifications/recent`, `GET /notifications/unread-count`, `PATCH /notifications/{id}/read`, `PATCH /notifications/read-all`, `DELETE /notifications/{id}` | `notifications.read` | Operaciones combinan usuario autenticado y local efectivo; ID ajeno se oculta como `404` | Backend 2 | Notificación B no aparece/no se modifica desde A |
| `POST /notifications/stream/ticket` | `notifications.read` | Ticket efímero vinculado a usuario y local efectivos | Backend 2 | Ticket de A no abre canal B |
| `GET /notifications/stream` | Ticket de un uso, TTL 30 s | Canal SSE indexado por usuario y local; ticket inválido/consumido devuelve `401` | Backend 2 | Evento dirigido a A no llega al stream B |
| `GET /store-config`, `GET /store-config/branding`, `PUT /store-config`, `POST /store-config/logo`, `DELETE /store-config/logo`, `POST /store-config/printer/test` | `settings.read/update` o autenticado para branding | Configuración, logo y prueba de impresora usan la configuración del local efectivo | Backend 2 | A no ve ni modifica configuración B |
| `GET /uploads/{*filePath}` | Autenticado | El URL debe existir en avatar/producto/logo del local efectivo y el archivo debe permanecer dentro del directorio de uploads | Backend 2 | Sin sesión `401`; URL de otro local `404`; traversal `404` |
| `GET /`, `GET /error`, `GET /favicon.ico` | Pública | Página/estado de aplicación sin datos operativos | Plataforma | Accesible sin sesión |
| `GET /swagger-ui/**`, `GET /v3/api-docs/**` | Pública | Documentación OpenAPI; no expone datos operativos | Plataforma | Accesible sin sesión |

Las operaciones de color/talla y roles son globales por diseño del modelo actual,
no por estar libres de autorización. Las escrituras de esos catálogos requieren
superadministrador. El bootstrap legado sigue retirando permisos obsoletos de
proveedores; este sprint no activa el módulo de proveedores.

Las imágenes de `/uploads/**` requieren autenticación. El cliente debe incluir
`X-Local-Id` al descargarlas como `SUPERADMIN` (por ejemplo, solicitándolas con
`fetch` y creando un object URL); una etiqueta `<img>` directa no puede enviar
esa cabecera. Los usuarios ordinarios usan su local asignado y no deben elegir
otro local en la URL ni en el cliente.

## Contratos para Frontend y QA

### Identidad y selector

`GET /api/auth/me` mantiene los campos existentes y añade:

```json
{
  "id": 17,
  "email": "caja-a@example.test",
  "role": "USER",
  "localId": 1,
  "localName": "Local inicial",
  "canSwitchLocal": false
}
```

Para `SUPERADMIN`, `localId` y `localName` de `/auth/me` son `null` porque su
identidad es global; `canSwitchLocal` es `true`. El local operativo seleccionado
se obtiene con `GET /api/locals/current`.

`GET /api/locals/current` devuelve el local resuelto:

```json
{"id":1,"code":"LOCAL-001","name":"Local inicial","canSwitch":false}
```

`GET /api/locals` (solo superadmin) devuelve una lista de locales activos con
la misma forma. Las operaciones de superadmin envían `X-Local-Id: 1` (ID
numérico) desde el cliente HTTP central; no se envía `localId` en payloads.

### Errores de autorización y ámbito

Las respuestas de error conservan `timestamp`, `status`, `error`, `message` y
`path`. Para el caso sin local, se añade el código estable:

```json
{"status":400,"error":"Bad Request","code":"LOCAL_REQUIRED","message":"LOCAL_REQUIRED","path":"/api/locals/current"}
```

Sin sesión se devuelve `401`; falta de permiso o cambio de local devuelve `403`;
un recurso de otro local se devuelve igual que inexistente (`404`); duplicados
detectados por `DuplicateResourceException` devuelven `409`.

### Búsqueda y paginación existente

- `GET /api/products`, `GET /api/users` y `GET /api/orders` aceptan `search`,
  `limit` y `offset`. `limit` y `offset` deben enviarse juntos; `limit` debe ser
  positivo y `offset` no negativo. Sin ambos parámetros se conserva la respuesta
  de lista no paginada.
- Productos/usuarios se ordenan por ID ascendente; ventas, por ID descendente.
  La búsqueda/lista se limita al local antes de paginar.
- `GET /api/reports/products` acepta `categoryId`, `status` (`ACTIVE` o
  `INACTIVE`), `stockFilter` (`WITH_STOCK` o `WITHOUT_STOCK`) y el par
  `limit`/`offset`.
- `GET /api/reports/cash-sessions` y su PDF aceptan `cashRegisterId`,
  `startDate`, `endDate` y `status` (`OPEN` o `CLOSED`). Los filtros de fecha
  son `[startDate, endDate)`; el `cashRegisterId` también debe pertenecer al
  local efectivo.

### Alta de usuario

No usar `POST /api/auth/register`: se conserva la ruta para compatibilidad pero
la seguridad la deniega. Una cuenta operativa se crea mediante `POST /api/users`
con permiso `users.create`; el cuerpo contiene datos de usuario y `roleId`, y
el backend asigna el local resuelto. `SUPERADMIN` no se crea por esta ruta.

## Matriz mínima de pruebas de aislamiento

| Actor/entrada | Resultado esperado |
|---|---|
| Usuario A autenticado, sin `X-Local-Id` | Local A, acceso solo a filas A |
| Usuario A con `X-Local-Id` de A | Mismo ámbito A |
| Usuario A con `X-Local-Id` de B, inválido o arbitrario | `403` |
| Superadmin sin `X-Local-Id` en operación local | `400`, `code=LOCAL_REQUIRED` |
| Superadmin con ID inexistente/inactivo | `400` |
| Superadmin con ID activo de B | Ámbito B para esa solicitud |
| Anónimo en ruta protegida | `401` JSON |
| Usuario sin permiso requerido | `403` JSON |
| ID de usuario/producto/venta/caja/archivo/notificación de B usado en A | `404` |
| Escritura con `localId` B en DTO o referencia B | Rechazo; ninguna escritura parcial |
| Registro público | `403`; no se crea cuenta |
| SSE de A con evento de B | No se emite al canal A |

## Contratos propuestos para Sprint 2 (diseño, no CRUD)

Todas las entidades son por local; `localId` de creación no es autoridad y se
deriva de `LocalScope`. Las rutas admiten paginación con `limit` y `offset`, y
responden con la envoltura paginada ya usada por productos.

| Recurso | Campos de entrada propuestos | Permisos | Invariantes |
|---|---|---|---|
| `MaterialCategory` | `name`, `description`, `isActive` | `material_categories.read/create/update/delete` | Nombre único por local; solo agrupa materia prima |
| `Material` | `sku`, `name`, `description`, `categoryId`, `unit`, `minimumStock`, `isActive` | `materials.read/create/update/delete` | Categoría del mismo local; cantidad decimal |
| `Warehouse` | `code`, `name`, `isActive` | `warehouses.read/create/update/delete` | Código único por local |
| `MaterialStock` | No se crea directamente desde el cliente | `materials.read` | Saldo derivado de movimientos; almacén y material del mismo local |
| `MaterialMovement` | `materialId`, `warehouseId`, `type`, `quantity`, `reason`; `destinationWarehouseId` para transferencia | `materials.read/create` | Cantidad positiva; transferencia conserva cantidad; política de saldo negativo y unidad por cerrar con líder |

Forma de respuesta de lectura propuesta: `id`, datos del recurso, `localId`,
`createdAt`/`updatedAt`. Una categoría, material o almacén de otro local se
trata como `404`; duplicado por local `409`; `localId` faltante para superadmin
`400 LOCAL_REQUIRED`; asociación cruzada y datos inválidos `400`. No habilitar
compras/proveedores, conversiones de unidad ni stock comercial por almacén sin
decisión de alcance.

## Evidencia automatizada

Pruebas de contexto: `LocalScopeTest`; rutas del selector: `LocalControllerTest`;
agregados: `DashboardLocalScopeTest`; consultas y SSE de notificaciones:
`NotificationLocalScopeTest`; reportes: `ReportLocalScopeTest`; descargas:
`UploadControllerLocalScopeTest`. Backend 1 conserva las pruebas de acceso por
ID para productos, caja y ventas.
