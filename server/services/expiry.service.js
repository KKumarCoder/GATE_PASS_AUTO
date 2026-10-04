import { GatePass } from '../models/index.js';
import { transaction, event } from '../utils/core.js';
const pendingStatuses=['DRAFT','PARENT_VERIFICATION_PENDING','ADMIN_APPROVAL_PENDING','READY_FOR_EXIT'];
export async function expirePasses(now=new Date()) {
  const filter={status:{$in:pendingStatuses},expiresAt:{$lte:now}};
  const candidates=await GatePass.find(filter).select('_id').limit(100);
  let count=0;
  for(const candidate of candidates){
    const expired=await transaction(async session=>{
      const pass=await GatePass.findOneAndUpdate({_id:candidate._id,...filter},{status:'EXPIRED'},{new:true,session});
      if(!pass)return false;
      await event({get:()=>'',body:{}},pass,'PASS_EXPIRED',session);
      return true;
    });
    if(expired)count+=1;
  }
  return count;
}
