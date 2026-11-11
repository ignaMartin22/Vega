import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PNG } from "pngjs";
import { AreaRegistry, InputError, catalog, catalogWetlands, parseRequest, validateDrawnArea } from "../src/catalog.js";
import { resolvePeriod, monthlyWindows } from "../src/period.js";
import { analyze, type AnalysisRunner, type AnalysisResult } from "../src/analysis.js";
import { createAnalysisServer } from "../src/server.js";
import { JobStore, type Job } from "../src/jobs.js";
import { hashRecord } from "@vega/shared";
import type { StacItem } from "../src/stac.js";

const now=()=>new Date("2026-11-11T12:00:00.000Z");
const terminal=(job:Job)=>!["queued","running"].includes(job.status);
async function waitFor<T>(get:()=>Promise<T>,ready:(v:T)=>boolean):Promise<T> {
  for(let i=0;i<200;i++){const value=await get();if(ready(value))return value;await new Promise((r)=>setTimeout(r,10));}
  throw new Error("La prueba no terminó a tiempo");
}
function emptyResult(request:Parameters<AnalysisRunner>[0]):AnalysisResult {
  return {period:request.period,measurements:[],frames:[],issues:[],provenance:[],publication:{status:"not_requested",reviewRequired:true},areas:request.areas};
}

test("tres años móviles, año bisiesto y 36 ventanas sin deriva ni solapamiento",()=>{
  const period=resolvePeriod(undefined,undefined,now());
  assert.equal(period.from,"2023-11-11T12:00:00.000Z");
  const windows=monthlyWindows(period);
  assert.equal(windows.length,36);assert.equal(windows[0].from,period.from);assert.equal(windows.at(-1)!.to,period.to);
  windows.slice(1).forEach((w,i)=>assert.equal(w.from,windows[i].to));
  assert.equal(resolvePeriod(undefined,undefined,new Date("2024-02-29T01:00:00Z")).from,"2021-02-28T01:00:00.000Z");
  const ends=monthlyWindows(resolvePeriod(undefined,"2026-03-31T00:00:00Z",now()));
  assert.equal(ends.at(-1)!.from,"2026-02-28T00:00:00.000Z");
  assert.equal(ends.at(-2)!.from,"2026-01-31T00:00:00.000Z");
  assert.throws(()=>resolvePeriod("2024-02-30","2024-04-01",now()),/válidas/);
  assert.throws(()=>resolvePeriod("2020-01-01","2026-01-01",now()),/tres años/);
  assert.throws(()=>resolvePeriod(undefined,"2027-01-01",now()),/futura/);
});

test("catálogo compartido, dibujo validado e identidad persistente",()=>{
  const directory=mkdtempSync(join(tmpdir(),"vega-registry-"));
  try {
    assert.equal(catalog("salta").salars[0].id,catalog("catamarca").salars[0].id);
    assert.equal(catalog("jujuy").coverage.complete,false);assert.deepEqual(catalog("jujuy").salars,[]);
    const feature=catalogWetlands()[0];
    const input={salarId:"hombre-muerto",areas:[feature]};
    const a=parseRequest(input,new AreaRegistry(directory),now());
    const b=parseRequest(input,new AreaRegistry(directory),now());
    assert.equal(a.areas[0].feature.properties.wetlandId,b.areas[0].feature.properties.wetlandId);
    assert.equal(a.areas[0].identityStatus,"provisional");assert.ok(a.areas[0].feature.properties.wetlandId>=1_000_000_000);
    const outside={...feature,geometry:{type:"Polygon",coordinates:[[[-80,-25],[-79,-25],[-79,-24],[-80,-25]]]}};
    assert.throws(()=>validateDrawnArea(outside),InputError);
    const crossed={...feature,geometry:{type:"Polygon",coordinates:[[[-67.10,-25.40],[-67.09,-25.39],[-67.09,-25.40],[-67.10,-25.39],[-67.10,-25.40]]]}};
    assert.throws(()=>validateDrawnArea(crossed),/cruza/);
  }finally{rmSync(directory,{recursive:true,force:true});}
});

test("importa FeatureCollection GeoJSON para salares fuera del catálogo piloto",()=>{
  const directory=mkdtempSync(join(tmpdir(),"vega-custom-salar-"));
  try {
    const feature={
      type:"Feature",
      properties:{name:"Laguna de prueba"},
      geometry:{type:"Polygon",coordinates:[[[-68.10,-25.40],[-68.09,-25.40],[-68.09,-25.39],[-68.10,-25.39],[-68.10,-25.40]]]},
    };
    const geojson={type:"FeatureCollection",features:[feature]};
    const request={salarId:"salar-prueba-jujuy",salarName:"Salar de prueba",geojson};
    const first=parseRequest(request,new AreaRegistry(directory),now());
    const second=parseRequest(request,new AreaRegistry(directory),now());
    assert.equal(first.salarId,"salar-prueba-jujuy");
    assert.equal(first.salarName,"Salar de prueba");
    assert.equal(first.areas.length,1);
    assert.equal(first.areas[0].feature.properties.salar,"Salar de prueba");
    assert.equal(first.areas[0].identityStatus,"provisional");
    assert.ok(first.areas[0].feature.properties.wetlandId>=1_000_000_000);
    assert.equal(first.areas[0].feature.properties.wetlandId,second.areas[0].feature.properties.wetlandId);
    const other=parseRequest({...request,salarId:"otro-salar",salarName:"Otro salar"},new AreaRegistry(directory),now());
    assert.notEqual(first.areas[0].feature.properties.wetlandId,other.areas[0].feature.properties.wetlandId);
    assert.throws(()=>parseRequest({salarId:"salar-sin-nombre",geojson},new AreaRegistry(directory),now()),/salarName/);
    assert.throws(()=>parseRequest({salarId:"salar-con-id-ajeno",salarName:"Otro",wetlandIds:[1]},new AreaRegistry(directory),now()),/IDs de catálogo/);
    assert.throws(()=>parseRequest({salarId:"salar-invalido",salarName:"Inválido",geojson:{type:"Feature",features:[]}},new AreaRegistry(directory),now()),/FeatureCollection/);
  } finally {rmSync(directory,{recursive:true,force:true});}
});

test("motor parametrizado: medida canónica, PNG vinculado y errores técnicos explícitos",async()=>{
  const directory=mkdtempSync(join(tmpdir(),"vega-engine-"));
  try {
    const request=parseRequest({salarId:"hombre-muerto",wetlandIds:[1],from:"2024-04-01",to:"2024-05-01"},new AreaRegistry(directory),now());
    const scene:StacItem=JSON.parse(readFileSync(new URL("../../sample-data/stac/reference-scene.json",import.meta.url),"utf8"));
    const png=PNG.sync.write(new PNG({width:1,height:1}));
    const result=await analyze(request,{id:"test",directory,progress:()=>{}},{search:async()=>[scene],compute:async()=>({ndwi:0.25,validPixels:75,totalPixels:100}),render:async()=>({png,bbox:[-67.1,-25.5,-67,-25.4]})});
    assert.equal(result.measurements.length,1);assert.equal(hashRecord(result.measurements[0]),result.measurements[0].dataHash);
    assert.equal(result.frames[0].measurementHashes[0],result.measurements[0].dataHash);
    assert.equal(result.frames[0].capturedAt,scene.properties.datetime);assert.equal(result.frames[0].scope,"area");
    assert.equal(result.publication.status,"not_requested");assert.equal(PNG.sync.read(readFileSync(join(directory,"1-0.png"))).width,1);
    const failure=await analyze(request,{id:"failed",directory,progress:()=>{}},{search:async()=>{throw new Error("STAC fuera de servicio");},compute:async()=>{throw new Error("No debe ejecutarse");},render:async()=>{throw new Error("No debe ejecutarse");}});
    assert.equal(failure.measurements.length,0);assert.equal(failure.issues[0].code,"search_failed");
  }finally{rmSync(directory,{recursive:true,force:true});}
});

test("HTTP: validación, dos trabajos aislados, errores y recuperación tras reinicio",async()=>{
  const directory=mkdtempSync(join(tmpdir(),"vega-http-"));
  const runner:AnalysisRunner=async(request,ctx)=>{
    if(request.areas[0].feature.properties.wetlandId===2)throw new Error("fallo controlado");
    return emptyResult(request);
  };
  const {server,jobs}=createAnalysisServer({directory,runner,now});
  await new Promise<void>((resolve)=>server.listen(0,"127.0.0.1",resolve));
  const address=server.address();assert.ok(address&&typeof address!=="string");
  const base=`http://127.0.0.1:${address.port}`;
  const post=(value:unknown)=>fetch(`${base}/api/analyses`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(value)});
  try {
    const bad=await post({salarId:"desconocido",wetlandIds:[1]});assert.equal(bad.status,400);
    const a=await post({salarId:"hombre-muerto",wetlandIds:[1]});assert.equal(a.status,202);
    const first=await a.json() as {analysisId:string;period:{from:string}};
    assert.equal(first.period.from,"2023-11-11T12:00:00.000Z");
    const b=await post({salarId:"hombre-muerto",wetlandIds:[2]});const second=await b.json() as {analysisId:string};
    assert.notEqual(first.analysisId,second.analysisId);
    const state=await waitFor(async()=>await(await fetch(`${base}/api/analyses/${first.analysisId}`)).json() as Job,terminal);
    assert.equal(state.status,"no_data");assert.equal(state.publicationStatus,"not_requested");
    const failed=await waitFor(async()=>jobs.get(second.analysisId)!,terminal);assert.equal(failed.status,"failed");
    const data=await(await fetch(`${base}/api/analyses/${first.analysisId}/result`)).json() as AnalysisResult;
    assert.equal(data.areas[0].feature.properties.wetlandId,1);
    assert.equal((await fetch(`${base}/api/analyses/${second.analysisId}/result`)).status,409);
    assert.equal((await fetch(`${base}/api/analyses/${first.analysisId}/assets/secret.png`)).status,404);
    assert.equal((await fetch(`${base}/health`,{headers:{Origin:"https://otro.example"}})).status,403);
    const recovered=new JobStore(join(directory,"jobs"),runner);
    assert.equal(recovered.get(first.analysisId)?.status,"no_data");
    const file=join(jobs.path(second.analysisId),"state.json"),interrupted={...failed,status:"running"};
    writeFileSync(file,JSON.stringify(interrupted));
    const restarted=new JobStore(join(directory,"jobs"),runner);
    assert.match(restarted.get(second.analysisId)!.error!,/reinició/);
  }finally{await new Promise<void>((resolve,reject)=>server.close((error)=>error?reject(error):resolve()));rmSync(directory,{recursive:true,force:true});}
});
