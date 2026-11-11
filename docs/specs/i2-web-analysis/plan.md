# Plan técnico · incremento 1

1. Separar período/ventanas, validación de solicitud, motor de análisis y transporte HTTP.
2. Reutilizar STAC, NDWI y hash existentes mediante funciones; no invocar shell desde el servidor.
3. Catálogo inicial explícitamente parcial, con Hombre Muerto compartido Salta/Catamarca y tres AOI experimentales; no inventar límites para simular exhaustividad.
4. Crear registro persistente de IDs para áreas dibujadas, sin reutilizar IDs de catálogo ni habilitar umbrales por defecto.
5. Persistir estado/resultado por UUID en un directorio configurable; límite de cola/concurrencia y recuperación explícita tras reinicio.
6. Producir imágenes PNG georreferenciadas por área aceptada, aptas para la secuencia temporal del cliente.
7. Probar HTTP y persistencia con un motor inyectable; probar cálculo real por separado y realizar una solicitud acotada con Sentinel-2 real.

No modificar `shared/`, `frontend/`, `relayer/` ni el contrato desplegado. La publicación de este servicio es trabajo coordinado con Gaby.
