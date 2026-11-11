# Plan técnico · incremento 1

1. Separar período/ventanas, validación de solicitud, motor de análisis y transporte HTTP.
2. Reutilizar STAC, NDWI y hash existentes mediante funciones; no invocar shell desde el servidor.
3. Catálogo inicial explícitamente parcial, con Hombre Muerto compartido Salta/Catamarca y tres AOI experimentales; no inventar límites para simular exhaustividad.
4. Crear registro persistente de IDs para áreas dibujadas, sin reutilizar IDs de catálogo ni habilitar umbrales por defecto.
5. Persistir estado/resultado por UUID en un directorio configurable; límite de cola/concurrencia y recuperación explícita tras reinicio.
6. Producir imágenes PNG georreferenciadas por área aceptada, aptas para la secuencia temporal del cliente.
7. Probar HTTP y persistencia con un motor inyectable; probar cálculo real por separado y realizar una solicitud acotada con Sentinel-2 real.

No modificar `shared/`, `frontend/`, `relayer/` ni el contrato desplegado. La publicación de este servicio es trabajo coordinado con Gaby.

## Extensión ejecutada en el segundo incremento

Se amplió de forma compatible el campo `method` de `shared/` para identificar mosaicos v2 y comprometer la geometría canónica dentro del hash; se documentó previamente en la conversación y en `docs/INTERFACES.md`. No se cambiaron firmas ABI, frontend ni relayer. El catálogo se deriva de fuentes versionadas; los píxeles se muestrean sobre grilla única y la secuencia completa usa teselas de la misma adquisición. Pruebas cubren solapamientos, agujeros, varias partes y distintas zonas UTM.
