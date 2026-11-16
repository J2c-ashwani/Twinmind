import supabaseAdmin from '../../config/supabase.js';

export const STATE_BUCKET='growth-talking-state';
export const MEDIA_BUCKET='growth-talking-media';

async function parseErrorDetails(error) {
  if (!error) return { statusCode: null, message: '', code: null };
  let statusCode = String(error.statusCode || error.status || '');
  let message = String(error.message || '');
  let code = String(error.error || error.code || '');
  if (error.originalError && typeof error.originalError.clone === 'function') {
    try {
      const body = await error.originalError.clone().json();
      if (body) {
        if (body.statusCode) statusCode = String(body.statusCode);
        if (body.message) message = String(body.message);
        if (body.code) code = String(body.code);
        if (body.error && !code) code = String(body.error);
      }
    } catch {}
  }
  return { statusCode, message, code };
}

async function isMissing(error) {
  if (!error) return false;
  const { statusCode, message, code } = await parseErrorDetails(error);
  if (['404'].includes(statusCode)) return true;
  if (/not found|does not exist|nosuchkey/i.test(message) || /not found|nosuchkey/i.test(code)) return true;
  if (['400'].includes(statusCode) && (/not found|does not exist|nosuchkey/i.test(message) || /not_found|nosuchkey/i.test(code))) return true;
  return false;
}

async function getErrorMessage(error) {
  if (!error) return 'unknown error';
  const { statusCode, message, code } = await parseErrorDetails(error);
  if (message && message !== '{}') return message;
  if (code) return `${code}${statusCode ? ` (${statusCode})` : ''}`;
  return error.message && error.message !== '{}' ? error.message : JSON.stringify(error);
}

/** Private immutable job records and public finished media, independent of customer rows. */
export class TalkingReelStore {
  constructor(storage=supabaseAdmin.storage) {this.storage=storage;}
  async init() {
    if(!this.initializing)this.initializing=(async()=>{
      for(const [id,isPublic] of [[STATE_BUCKET,false],[MEDIA_BUCKET,true]]) {
        const {data,error}=await this.storage.getBucket(id);
        if(error) {
          if(!(await isMissing(error))) {
            const msg = await getErrorMessage(error);
            throw Error(`Talking storage unavailable: ${msg}`);
          }
          const {error:created}=await this.storage.createBucket(id,{public:isPublic,fileSizeLimit:50*1024*1024});
          if(created && !/already exists/i.test(created.message)) {
            const msg = await getErrorMessage(created);
            throw Error(`Talking storage setup failed: ${msg}`);
          }
        } else if(data.public!==isPublic)throw Error(`Unexpected visibility for ${id}`);
      }
    })().catch(e=>{this.initializing=null;throw e;});
    return this.initializing;
  }
  async read(key) {
    const {data,error}=await this.storage.from(STATE_BUCKET).download(key);
    if(error){
      if(await isMissing(error))return null;
      const msg = await getErrorMessage(error);
      throw Error(`Talking state read failed: ${msg}`);
    }
    return JSON.parse(await data.text());
  }
  async create(key,value) {
    const {error}=await this.storage.from(STATE_BUCKET).upload(key,Buffer.from(JSON.stringify(value)),{contentType:'application/json',upsert:false});
    if(error){
      const { statusCode, message } = await parseErrorDetails(error);
      if(['409','400'].includes(statusCode) && /already exists|duplicate/i.test(message))return false;
      const msg = await getErrorMessage(error);
      throw Error(`Talking state write failed: ${msg}`);
    }
    return true;
  }
  async write(key,value) {
    const {error}=await this.storage.from(STATE_BUCKET).upload(key,Buffer.from(JSON.stringify(value)),{contentType:'application/json',upsert:true});
    if(error) {
      const msg = await getErrorMessage(error);
      throw Error(`Talking state write failed: ${msg}`);
    }
  }
  async bytes(bucket,key) {
    const {data,error}=await this.storage.from(bucket).download(key);
    if(error) {
      const msg = await getErrorMessage(error);
      throw Error(`Talking asset unavailable: ${msg}`);
    }
    return Buffer.from(await data.arrayBuffer());
  }
  async putBytes(bucket,key,bytes,contentType) {
    const {error}=await this.storage.from(bucket).upload(key,bytes,{contentType,upsert:false,cacheControl:'31536000'});
    if(error && !/already exists|duplicate/i.test(error.message||'')) {
      const msg = await getErrorMessage(error);
      throw Error(`Talking asset save failed: ${msg}`);
    }
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
