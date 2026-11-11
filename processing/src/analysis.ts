import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { NDWI_METHOD, RECORD_SCHEMA, toScaled, withHash, type HashedMeasurement } from "@vega/shared";
import type { AnalysisRequest } from "./catalog.js";
import { computeNdwi, coversWetland } from "./ndwi.js";
import { searchScenes, type StacItem } from "./stac.js";
import { renderFrame } from "./frame.js";

export interface Progress { phase:string;completed:number;total:number }
export interface EvolutionFrame {
  frameId:string;wetlandId:number;scope:"area";capturedAt:string;sceneIds:string[];imageUrl:string;
  bbox:[number,number,number,number];crs:"EPSG:4326";measurementHashes:string[];coverageFraction:number;
  renderPolicy:string;attribution:string;
}
export interface AnalysisResult {
  period:AnalysisRequest["period"];measurements:HashedMeasurement[];frames:EvolutionFrame[];
  issues:{wetlandId:number;window:number;code:string;message:string}[];
  provenance:{dataHash:string;geometryHash:string;sceneId:string;validFraction:number;totalPixels:number}[];
  publication:{status:"not_requested";reviewRequired:boolean};
  areas:AnalysisRequest["areas"];
}
export interface AnalysisContext { id:string;directory:string;progress:(value:Progress)=>void }
export type AnalysisRunner=(request:AnalysisRequest,context:AnalysisContext)=>Promise<AnalysisResult>;
interface Dependencies {
  search:typeof searchScenes;compute:typeof computeNdwi;render:typeof renderFrame;
}
const defaults:Dependencies={search:searchScenes,compute:computeNdwi,render:renderFrame};

/** El motor no lee variables globales ni sobrescribe el histórico de otro trabajo. */
export async function analyze(request:AnalysisRequest,context:AnalysisContext,deps:Dependencies=defaults):Promise<AnalysisResult> {
  const result:AnalysisResult={period:request.period,measurements:[],frames:[],issues:[],provenance:[],
    publication:{status:"not_requested",reviewRequired:true},areas:request.areas};
  const total=request.areas.length*request.windows.length;
  let completed=0;
  for (const area of request.areas) {
    const wetland=area.feature;
    const id=wetland.properties.wetlandId;
    context.progress({phase:"searching",completed,total});
    let scenes:StacItem[];
    try {scenes=await deps.search(wetland,request.period.from,request.period.to,20);}
    catch (error) {
      result.issues.push({wetlandId:id,window:-1,code:"search_failed",message:String(error)});
      completed+=request.windows.length;continue;
    }
    const sorted=scenes.filter((scene)=>coversWetland(scene,wetland)).sort((a,b)=>
      a.properties["eo:cloud_cover"]-b.properties["eo:cloud_cover"]||a.properties.datetime.localeCompare(b.properties.datetime)||a.id.localeCompare(b.id));
    for (const window of request.windows) {
      context.progress({phase:"computing",completed,total});
      const candidates=sorted.filter((s)=>Date.parse(s.properties.datetime)>=Date.parse(window.from)&&Date.parse(s.properties.datetime)<Date.parse(window.to));
      let selected:{item:StacItem;record:HashedMeasurement;validFraction:number;totalPixels:number}|undefined;
      let technicalError:string|undefined;
      for (const item of candidates) {
        try {
          const stats=await retryNetwork(()=>deps.compute(item,wetland));
          const fraction=stats.validPixels/stats.totalPixels;
          if (!Number.isFinite(stats.ndwi)||Math.abs(stats.ndwi)>1||!Number.isFinite(fraction)||fraction<0.5||fraction>1) continue;
          selected={item,validFraction:fraction,totalPixels:stats.totalPixels,record:withHash({schema:RECORD_SCHEMA,
            wetlandId:id,ndwi:toScaled(stats.ndwi),sceneId:item.id,timestamp:Math.floor(Date.parse(item.properties.datetime)/1000),
            cloudCover:item.properties["eo:cloud_cover"],validPixels:stats.validPixels,method:NDWI_METHOD})};
          break;
        } catch(error) {technicalError=String(error);}
      }
      if (!selected) {
        const spanning=scenes.some((s)=>Date.parse(s.properties.datetime)>=Date.parse(window.from)&&Date.parse(s.properties.datetime)<Date.parse(window.to));
        const code=technicalError?"processing_failed":!sorted.length&&spanning?"unsupported_tile_coverage":"insufficient_data";
        result.issues.push({wetlandId:id,window:window.index,code,message:technicalError??(code==="unsupported_tile_coverage"?"El área necesita composición de teselas; todavía no soportada":"Sin escena con cobertura válida suficiente")});
      } else {
        const {item,record,validFraction,totalPixels}=selected;
        result.measurements.push(record);
        result.provenance.push({dataHash:record.dataHash,geometryHash:area.geometryHash,sceneId:item.id,validFraction,totalPixels});
        context.progress({phase:"rendering",completed,total});
        try {
          const frame=await retryNetwork(()=>deps.render(item,wetland));
          const frameId=`${id}-${window.index}`;
          writeFileSync(join(context.directory,`${frameId}.png`),frame.png);
          result.frames.push({frameId,wetlandId:id,scope:"area",capturedAt:item.properties.datetime,sceneIds:[item.id],
            imageUrl:`/api/analyses/${context.id}/assets/${frameId}.png`,bbox:frame.bbox,crs:"EPSG:4326",
            measurementHashes:[record.dataHash],coverageFraction:validFraction,renderPolicy:"Sentinel-2 TCI, sin ajuste adicional",
            attribution:`Contains modified Copernicus Sentinel data ${item.properties.datetime.slice(0,4)}, processed by Vega.`});
        } catch(error) {result.issues.push({wetlandId:id,window:window.index,code:"frame_failed",message:String(error)});}
      }
      completed++;
      context.progress({phase:"computing",completed,total});
    }
  }
  result.measurements.sort((a,b)=>a.wetlandId-b.wetlandId||a.timestamp-b.timestamp);
  result.frames.sort((a,b)=>a.capturedAt.localeCompare(b.capturedAt)||a.wetlandId-b.wetlandId);
  context.progress({phase:"complete",completed,total});
  return result;
}

async function retryNetwork<T>(operation:()=>Promise<T>):Promise<T> {
  try{return await operation();}catch(error){if(!/request|fetch|network|abort|timeout/i.test(String(error)))throw error;return operation();}
}
