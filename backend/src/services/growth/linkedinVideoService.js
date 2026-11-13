import fs from 'fs';
import fetch from 'node-fetch';

const VERSION = '202601';
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

/** Upload MP4 bytes, finalize parts, then wait for an AVAILABLE native video asset. */
export async function uploadLinkedInVideo({ accessToken, authorUrn, filePath, fetchFn = fetch, sleep = pause }) {
  const size = fs.statSync(filePath).size;
  if (size < 75 * 1024 || size > 500 * 1024 * 1024) throw new Error('LinkedIn MP4 must be 75 KB–500 MB');
  const headers = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json', 'Linkedin-Version': VERSION, 'X-Restli-Protocol-Version': '2.0.0' };
  const request = async (url, options, stage) => {
    try {
      const response = await fetchFn(url, {...options, signal: AbortSignal.timeout(20000)});
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response;
    } catch (error) {
      // Signed upload URLs and bearer tokens must not appear in error logs.
      throw new Error(`LinkedIn video ${stage} failed${/^HTTP \d+$/.test(error.message) ? ': '+error.message : ''}`);
    }
  };
  const init = await request('https://api.linkedin.com/rest/videos?action=initializeUpload', {
    method:'POST', headers,
    body:JSON.stringify({initializeUploadRequest:{owner:authorUrn,fileSizeBytes:size,uploadCaptions:false,uploadThumbnail:false}})
  }, 'initialization');
  const {value} = await init.json();
  if (!/^urn:li:video:/.test(value?.video) || !Array.isArray(value.uploadInstructions) || !value.uploadInstructions.length) throw new Error('Invalid LinkedIn video upload instructions');
  const partIds = []; let expectedByte = 0;
  for (const part of value.uploadInstructions) {
    if (!Number.isSafeInteger(part.firstByte) || !Number.isSafeInteger(part.lastByte) || part.firstByte !== expectedByte || part.lastByte < part.firstByte || part.lastByte >= size || !/^https:\/\//.test(part.uploadUrl)) throw new Error('Invalid LinkedIn video byte range');
    const response = await request(part.uploadUrl, {
      method:'PUT', headers:{'Content-Type':'application/octet-stream','Content-Length':String(part.lastByte-part.firstByte+1)},
      body:fs.createReadStream(filePath,{start:part.firstByte,end:part.lastByte})
    }, 'part upload');
    const etag=response.headers.get('etag');
    if (!etag) throw new Error('LinkedIn video upload returned no part identifier');
    partIds.push(etag.replace(/^"|"$/g,'')); expectedByte=part.lastByte+1;
  }
  if (expectedByte !== size) throw new Error('Incomplete LinkedIn video byte coverage');
  await request('https://api.linkedin.com/rest/videos?action=finalizeUpload', {
    method:'POST',headers,
    body:JSON.stringify({finalizeUploadRequest:{video:value.video,uploadToken:value.uploadToken || '',uploadedPartIds:partIds}})
  }, 'finalization');
  for (let attempt=0; attempt<30; attempt++) {
    const response=await request(`https://api.linkedin.com/rest/videos/${encodeURIComponent(value.video)}`,{headers},'processing check');
    const asset=await response.json();
    if (asset.status==='AVAILABLE') return value.video;
    if (asset.status==='PROCESSING_FAILED') throw new Error('LinkedIn video processing failed');
    if (attempt<29) await sleep(2000);
  }
  throw new Error('LinkedIn video is still processing; no feed post was created');
}
