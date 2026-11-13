import logger from '../../config/logger.js';
/** Acknowledgement is distinct from publication. Existing orchestrator leases own execution. */
export async function respondToGrowthJob(req,res,task,{platform}) {
  const background=req.query.async==='true' || req.body?.async===true;
  if(!background)return res.json({success:true,result:await task()});
  // Register the work before returning. Never invoke the task a second time in this handler.
  void Promise.resolve().then(task).then(result=>{
    if(result?.success===false)logger.error(`[GROWTH WEBHOOK] ${platform} background publication did not succeed.`);
    else logger.info(`[GROWTH WEBHOOK] ${platform} background task finished (${result?.action || 'completed'}).`);
  }).catch(error=>logger.error(`[GROWTH WEBHOOK] ${platform} background task failed: ${error.message}`));
  return res.status(202).json({success:true,status:'in_progress',platform,message:'Accepted for background processing; this acknowledgement does not confirm publication.'});
}
