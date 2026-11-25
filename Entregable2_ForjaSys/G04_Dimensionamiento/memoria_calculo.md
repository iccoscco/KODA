# G04 · Memoria de cálculo (avance, 24-11-2026)

**Archivo editable:** `estimacion_ForjaSys.xlsx`. Todos los resultados de esta memoria son **estimaciones ilustrativas del alcance ForjaSys**, no mediciones del software KODA ni costos reales. La línea base provisional comprende los diez RF de prioridad Alta del primer entregable (RF-01 a RF-08, RF-10 y RF-12); RF-09 y RF-11 quedan fuera de este conteo por su prioridad Media. El equipo debe confirmar esta frontera antes de usar el resultado para comprometer presupuesto.

## 1. NESMA

Se aplicó un conteo funcional temprano, **sin ajuste**, descomponiendo funciones candidatas del alcance: 6 archivos lógicos internos (ILF), 9 entradas externas (EI), 2 salidas externas (EO) y 5 consultas externas (EQ). No se identificó archivo de interfaz externa (EIF) dentro de la frontera propuesta. Con pesos iniciales ILF=7, EI=4, EO=5 y EQ=4, el cálculo es `6×7 + 9×4 + 2×5 + 5×4 = 108 PF`. La hoja **NESMA** deja cada función y su RF a la vista. Es un inventario preliminar: faltan DET/FTR y revisión de duplicidades y complejidad por analista; por ello no se presenta como conteo certificado.

## 2. COSMIC

Se modelaron diez procesos funcionales tentativos, con movimientos `E` (entrada), `R` (lectura), `W` (escritura) y `X` (salida), detallados por fila en la hoja **COSMIC**. La suma arroja **53 CFP**. Las unidades CFP y PF no son equivalentes y nunca se suman. La descomposición se revisará cuando se cierre el SDD y se establezcan los contratos fiscales.

## 3. COCOMO II y costos

La hoja **COCOMO** usa, a modo de escenario, la variante Post Architecture, con constantes `A=2,94`, `B=0,91`, `C=3,67`, `D=0,28`, factores de escala nominales y producto de multiplicadores de esfuerzo igual a 1. El tamaño aproximado de entrada se obtiene como `108 PF × 53 SLOC Java/PF ÷ 1000 = 5,724 KSLOC`. Dado que el producto combina Java y TypeScript, esta conversión **no representa directamente el tamaño real**; solo habilita una simulación numérica transparente. El esfuerzo calculado ronda **20,03 personas-mes** y el calendario estadístico nominal **9,52 meses**. La hoja **Costos** separa personas, esfuerzo, piso por capacidad, duración y costo. Se supusieron 160 horas/persona-mes, S/25 por hora y 10 % de coordinación para tres personas. El costo estimado resultante ronda S/80 mil para una persona y S/88 mil para tres; **no son cotizaciones ni presupuesto aprobado**. La duración de tres personas no se calcula dividiendo automáticamente la duración de una entre tres: toma el mayor entre TDEV nominal y el piso de capacidad.

## 4. Sensibilidad y contraste

La hoja **Sensibilidad** cambia el factor SLOC/PF en −20 %, nominal y +20 %, y recalcula KSLOC, esfuerzo, duración y costo. Es una sensibilidad a **un solo parámetro**, no un intervalo de confianza. No se recibieron partes de horas ni fecha/hora de ejecución del equipo, por lo que el contraste con **horas reales** queda pendiente. No deben reportarse como horas reales los valores de COCOMO.

## 5. Trazabilidad y revisión pendiente

Fuentes de parámetros y del alcance se enumeran en **Fuentes**. Antes de cerrar G04: (a) confirmar si ForjaSys o KODA será el producto definitivo; (b) revisar frontera y conteos NESMA/COSMIC por un segundo integrante; (c) registrar horas reales y tarifas verificadas; (d) calibrar factores con el proyecto y justificar toda diferencia de resultado. El libro permite cambiar supuestos sin editar fórmulas.
