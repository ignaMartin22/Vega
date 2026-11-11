import { fromUrl } from "geotiff";
import { PNG } from "pngjs";
import proj4 from "proj4";
import { bbox, type WetlandFeature } from "./wetlands.js";
import type { StacItem } from "./stac.js";

/** Color real TCI reproyectado a una grilla EPSG:4326 fija para ImageOverlay. */
export async function renderFrame(item: StacItem, area: WetlandFeature): Promise<{png:Buffer;bbox:[number,number,number,number]}> {
  if (!item.assets.visual?.href) throw new Error("La escena no tiene imagen de color real");
  const extent=bbox(area), [west,south,east,north]=extent;
  const epsg=item.properties["proj:epsg"]!;
  const crs=`+proj=utm +zone=${epsg%100} ${epsg>=32700?"+south":""} +datum=WGS84 +units=m +no_defs`;
  const toUtm=proj4("EPSG:4326",crs);
  const edge:number[][]=[];
  for (let i=0;i<=16;i++) {
    const x=west+(east-west)*i/16, y=south+(north-south)*i/16;
    edge.push(toUtm.forward([x,south]),toUtm.forward([x,north]),toUtm.forward([west,y]),toUtm.forward([east,y]));
  }
  const xs=edge.map((p)=>p[0]),ys=edge.map((p)=>p[1]);
  const projected=[Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)];
  const ratio=(north-south)/((east-west)*Math.cos((north+south)/2*Math.PI/180));
  const width=ratio>1?Math.max(32,Math.round(512/ratio)):512;
  const height=ratio>1?512:Math.max(32,Math.round(512*ratio));
  const sourceWidth=width+8, sourceHeight=height+8;
  const signal=AbortSignal.timeout(120_000);
  const tiff=await fromUrl(item.assets.visual.href,{allowFullFile:false},signal);
  try {
    const rgb=await tiff.readRasters({bbox:projected,width:sourceWidth,height:sourceHeight,samples:[0,1,2],interleave:true,resampleMethod:"nearest",signal});
    const png=new PNG({width,height});
    for (let y=0;y<height;y++) for (let x=0;x<width;x++) {
      const [px,py]=toUtm.forward([west+(x+0.5)/width*(east-west),north-(y+0.5)/height*(north-south)]);
      const sx=Math.min(sourceWidth-1,Math.max(0,Math.floor((px-projected[0])/(projected[2]-projected[0])*sourceWidth)));
      const sy=Math.min(sourceHeight-1,Math.max(0,Math.floor((projected[3]-py)/(projected[3]-projected[1])*sourceHeight)));
      const src=(sy*sourceWidth+sx)*3,dst=(y*width+x)*4;
      png.data[dst]=Number(rgb[src]);png.data[dst+1]=Number(rgb[src+1]);png.data[dst+2]=Number(rgb[src+2]);png.data[dst+3]=255;
    }
    return {png:PNG.sync.write(png),bbox:extent};
  } finally {await tiff.close();}
}
