/**
 * NDWI = (B03 − B08) / (B03 + B08), promedio sobre los píxeles válidos del polígono.
 * Responsable: Integrante 2 (Datos).
 */
import type { StacItem } from "./stac.js";
import type { WetlandFeature } from "./wetlands.js";

export interface NdwiResult {
  ndwi: number; // float, -1..1 (se escala ×10_000 al armar el registro)
  validPixels: number;
}

export async function computeNdwi(_item: StacItem, _wetland: WetlandFeature): Promise<NdwiResult> {
  // TODO(Datos):
  // 1. geotiff.fromUrl(item.assets.green.href) y item.assets.nir.href (COG, lectura por ventana)
  // 2. reproyectar el polígono (EPSG:4326) al CRS de la escena (UTM, proj:epsg) y calcular la ventana
  // 3. leer B03/B08 (10 m) y SCL (20 m) en esa ventana; enmascarar nubes/sombras (SCL 3, 8, 9, 10)
  // 4. quedarse con los píxeles dentro del polígono y promediar el NDWI
  throw new Error("computeNdwi no implementado todavía");
}
