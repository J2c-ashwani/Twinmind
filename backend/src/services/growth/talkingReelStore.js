import supabaseAdmin from '../../config/supabase.js';

export const STATE_BUCKET='growth-talking-state';
export const MEDIA_BUCKET='growth-talking-media';
const missing = e => ['404','400'].includes(String(e?.statusCode)) && /not found|does not exist/i.test(e.message||'');

/** Private immutable job records and public finished media, independent of customer rows. */
export class TalkingReelStore {
  constructor(storage=supabaseAdmin.storage) {this.storage=storage;}
  async init() {
    if(!this.initializing)this.initializing=(async()=>{
      for(const [id,isPublic] of [[STATE_BUCKET,false],[MEDIA_BUCKET,true]]) {
        const {data,error}=await this.storage.getBucket(id);
        if(error) {
          if(!missing(error))throw Error(`Talking storage unavailable: ${error.message}`);
          const {error:created}=await this.storage.createBucket(id,{public:isPublic,fileSizeLimit:50*1024*1024});
          if(created && !/already exists/i.test(created.message))throw Error(`Talking storage setup failed: ${created.message}`);
        } else if(data.public!==isPublic)throw Error(`Unexpected visibility for ${id}`);
      }
    })().catch(e=>{this.initializing=null;throw e;});
    return this.initializing;
  }
  async read(key) {
    const {data,error}=await this.storage.from(STATE_BUCKET).download(key);
    if(error){if(missing(error))return null;throw Error(`Talking state read failed: ${error.message}`);}
    return JSON.parse(await data.text());
  }
  async create(key,value) {
    const {error}=await this.storage.from(STATE_BUCKET).upload(key,Buffer.from(JSON.stringify(value)),{contentType:'application/json',upsert:false});
    if(error){if(['409','400'].includes(String(error.statusCode)) && /already exists|duplicate/i.test(error.message||''))return false;throw Error(`Talking state write failed: ${error.message}`);}
    return true;
  }
  async write(key,value) {
    const {error}=await this.storage.from(STATE_BUCKET).upload(key,Buffer.from(JSON.stringify(value)),{contentType:'application/json',upsert:true});
    if(error)throw Error(`Talking state write failed: ${error.message}`);
  }
  async bytes(bucket,key) {
    const {data,error}=await this.storage.from(bucket).download(key);
    if(error)throw Error(`Talking asset unavailable: ${error.message}`);
    return Buffer.from(await data.arrayBuffer());
  }
  async putBytes(bucket,key,bytes,contentType) {
    const {error}=await this.storage.from(bucket).upload(key,bytes,{contentType,upsert:false,cacheControl:'31536000'});
    if(error && !/already exists|duplicate/i.test(error.message||''))throw Error(`Talking asset save failed: ${error.message}`);
    return this.storage.from(bucket).getPublicUrl(key).data.publicUrl;
  }
  async recentTopics() {
    const {data,error}=await this.storage.from(STATE_BUCKET).list('topics',{limit:70,sortBy:{column:'name',order:'desc'}});
    if(error)throw Error('Talking topic history unavailable');
    const values=[];
    for(const item of (data||[]).slice(0,60)) {const v=await this.read('topics/'+item.name);if(v)values.push(v.topic);}
    return values;
  }
  async list(prefix) {
    const {data,error}=await this.storage.from(STATE_BUCKET).list(prefix,{limit:500});
    if(error)throw Error(`Talking state list failed: ${error.message}`);
    const values=[];
    for(const row of data||[])if(row.id) { const v=await this.read(`${prefix}/${row.name}`); if(v)values.push(v); }
    return values;
  }
  async cleanup(day) {
    // Native platforms retain uploaded posts. Keep 30 days of finished masters and 14 days of raw takes.
    for(const [bucket,prefix,keep] of [[MEDIA_BUCKET,'',30],[STATE_BUCKET,'source',14]]) {
      const {data,error}=await this.storage.from(bucket).list(prefix,{limit:500});
      if(error)continue;
      for(const entry of data||[]) {
        if(!/^\d{4}-\d{2}-\d{2}$/.test(entry.name)||Date.parse(day)-Date.parse(entry.name)<keep*86400000)continue;
        const folder=prefix?`${prefix}/${entry.name}`:entry.name;
        const {data:files,error:listErr}=await this.storage.from(bucket).list(folder,{limit:100});
        if(!listErr && files?.length)await this.storage.from(bucket).remove(files.map(f=>folder+'/'+f.name));
      }
    }
  }
}
export default new TalkingReelStore();
