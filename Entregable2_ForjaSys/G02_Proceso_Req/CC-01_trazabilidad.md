# CC-01 · Alerta de stock mínimo en caja

- **Solicitud:** [issue #6](https://github.com/iccoscco/KODA/issues/6)
- **Requisitos relacionados:** RF-05 y RF-07
- **Línea de base:** rama `laguero`, commit `0560016`
**Estado de esta evidencia:** código y pruebas unitarias en una rama de integración; la verificación de interfaz, el reflejo en ERS/SDD y la revisión SVN siguen pendientes.

## Regla verificable

Dado un producto cuya variante tiene 10 unidades y un mínimo de 5, cuando el cajero registra y paga una venta de 5 unidades, entonces la venta se confirma, quedan 5 unidades y la respuesta contiene una alerta que se muestra en la pantalla de caja. Con una venta de 4 unidades, quedan 6 y no aparece la alerta. El aviso de caja complementa la notificación ya existente para los usuarios con permiso de lectura de notificaciones.

## Cambio trazable

| Elemento | Ubicación | Resultado esperado |
|---|---|---|
| Regla de stock | `store-backend/src/main/java/com/yisus/store_backend/order/service/Impl/OrderServiceImpl.java` | Calcula `newStock <= minStock` y añade la variante a las alertas de la venta. |
| Contrato de salida | `store-backend/src/main/java/com/yisus/store_backend/order/dto/OrderDTO.java` | `POST /orders` devuelve `stockAlerts`; no altera el esquema de base de datos. |
| Tipos y presentación | `store-frontend/src/features/cash/types/salesTypes.ts`, `components/sales/CreateSale.tsx`, `index.tsx` | Tras el éxito, el cajero ve el aviso `alerta-stock-minimo` con producto, variante, stock y mínimo. |
| Prueba de límite | `store-backend/src/test/java/com/yisus/store_backend/order/service/OrderServiceStockAlertTest.java` | Comprueba el caso `stock = mínimo` y el caso `stock > mínimo`. |

Ejemplo del campo añadido a la respuesta de creación, con los demás campos del pedido omitidos aquí:

```json
{
  "stockAlerts": [
    {
      "variantId": 42,
      "productName": "Perno",
      "variantDescription": "(SKU: PER-01)",
      "stock": 5,
      "minStock": 5,
      "sku": "PER-01"
    }
  ]
}
```

## Comprobación y cierre

**Resultados obtenidos el 24-11-2026:** con Java 21, `mvnw.cmd -Dtest=OrderServiceStockAlertTest test` finalizó con 2 pruebas aprobadas y 0 fallos. `npm run build` finalizó correctamente. ESLint sobre los tres archivos del frontend modificados terminó sin errores; el lint de todo el frontend aún falla por 37 errores y 41 advertencias en distintas partes de la base existente.

1. Con la API y la interfaz iniciadas, registrar dos ventas de prueba con stocks 10/5, cantidades 4 y 5. Verificar que la alerta aparece solo en la segunda y que el mensaje sigue visible después de cerrarse el formulario. Registrar captura y versión probada.
2. Actualizar el criterio RF-07 de la ERS y la secuencia de venta del SDD en los documentos del equipo. Registrar la revisión SVN correspondiente cuando G05 esté configurado.
3. Recién con la evidencia de los pasos anteriores, mover CC-01 a `verificado` y cerrar el issue. Mientras tanto, mantenerlo abierto.

**Límite de alcance:** esta alerta no demuestra la emisión electrónica a SUNAT, la nota de crédito ni el resto de los requisitos de ForjaSys.
