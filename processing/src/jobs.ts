import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { AnalysisRequest } from "./catalog.js";
import { analyze, type AnalysisResult, type AnalysisRunner, type Progress } from "./analysis.js";

export type JobStatus="queued"|"running"|"succeeded"|"partial"|"no_data"|"failed";
export interface Job {
  id:string;status:JobStatus;createdAt:string;updatedAt:string;request:AnalysisRequest;
  progress:Progress;error?:string;resultUrl?:string;cacheHit:false;publicationStatus:"not_requested";
}
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
export function isJobId(id:string):boolean{return UUID.test(id);}
function persist(path:string,value:unknown):void {
  writeFileSync(`${path}.tmp`,JSON.stringify(value,null,2)+"\n");
  renameSync(`${path}.tmp`,path);
}

/** Una instancia por directorio; recuperación explícita, sin fingir reanudación. */
export class JobStore {
  private jobs=new Map<string,Job>();
  private queue:string[]=[];
  private active=0;
  constructor(readonly directory:string,private runner:AnalysisRunner=analyze,private concurrency=1,private maxQueue=16) {
    if (!Number.isInteger(concurrency)||concurrency<1||concurrency>4) throw new Error("Concurrencia inválida");
    mkdirSync(directory,{recursive:true});
    for (const name of readdirSync(directory)) {
      if(!isJobId(name))continue;
      const file=join(directory,name,"state.json");
      if(!existsSync(file))continue;
      const job:Job=JSON.parse(readFileSync(file,"utf8"));
      if(job.id!==name)throw new Error(`Estado incompatible: ${name}`);
      if(job.status==="running"||job.status==="queued") {
        job.status="failed";job.error="El servicio se reinició antes de terminar. Creá una nueva solicitud.";
        job.updatedAt=new Date().toISOString();persist(file,job);
      }
      this.jobs.set(name,job);
    }
  }
  canSubmit():boolean{return this.queue.length<this.maxQueue;}
  create(request:AnalysisRequest):Job {
    if(!this.canSubmit())throw new Error("QUEUE_FULL");
    const id=randomUUID(),now=new Date().toISOString();
    const job:Job={id,status:"queued",createdAt:now,updatedAt:now,request,progress:{phase:"queued",completed:0,total:request.areas.length*request.windows.length},cacheHit:false,publicationStatus:"not_requested"};
    mkdirSync(this.path(id),{recursive:true});
    this.jobs.set(id,job);this.save(job);this.queue.push(id);
    queueMicrotask(()=>this.drain());
    return structuredClone(job);
  }
  get(id:string):Job|undefined {const job=this.jobs.get(id);return job&&structuredClone(job);}
  result(id:string):AnalysisResult|undefined {
    const job=this.jobs.get(id);
    if(!job||!["succeeded","partial","no_data","failed"].includes(job.status)||!existsSync(join(this.path(id),"result.json")))return undefined;
    return JSON.parse(readFileSync(join(this.path(id),"result.json"),"utf8"));
  }
  path(id:string):string {
    if(!isJobId(id))throw new Error("ID de trabajo inválido");
    return join(this.directory,id);
  }
  private save(job:Job):void {job.updatedAt=new Date().toISOString();persist(join(this.path(job.id),"state.json"),job);}
  private drain():void {
    while(this.active<this.concurrency&&this.queue.length) {
      const id=this.queue.shift()!,job=this.jobs.get(id)!;
      this.active++;job.status="running";this.save(job);
      void Promise.resolve().then(()=>this.runner(job.request,{id,directory:this.path(id),progress:(progress)=>{job.progress=progress;this.save(job);}}))
        .then((result)=>{
          persist(join(this.path(id),"result.json"),result);
          persist(join(this.path(id),"measurements.json"),result.measurements);
          const technical=result.issues.some((issue)=>["search_failed","processing_failed","frame_failed","unsupported_tile_coverage"].includes(issue.code));
          job.status=result.measurements.length ? (result.issues.length?"partial":"succeeded") : technical?"failed":"no_data";
          if(job.status==="failed")job.error="No se pudo producir una medición: revisar incidencias del resultado técnico.";
          job.resultUrl=`/api/analyses/${id}/result`;
          this.save(job);
        }).catch((error)=>{job.status="failed";job.error=error instanceof Error?error.message:String(error);this.save(job);})
        .finally(()=>{this.active--;this.drain();});
    }
  }
}
