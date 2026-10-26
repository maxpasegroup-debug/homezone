import {auth} from "@/auth";
import {db} from "@/lib/db";
import {getOrCreateProfile} from "@/lib/auth/profile";
import {apiError,forbidden,ok,parseJson,unauthorized,handleApiError} from "@/lib/api/response";
import {builderUnitSchema,builderTowerSchema,builderTeamMemberSchema,builderCampaignSchema} from "@/lib/api/validation";
import {z} from "zod";
const admission=z.object({module:z.enum(["units","towers","builderTeam","campaigns"]),parent:z.string().regex(/^[A-Za-z0-9_-]{8,128}$/)}).passthrough();
export async function PATCH(request:Request,context:{params:Promise<{id:string}>}){
  try{
    const session=await auth();if(!session?.user?.id)return unauthorized();
    const profile=await getOrCreateProfile(session.user);if(profile.role!=="BUILDER"||profile.verificationStatus==="SUSPENDED")return forbidden();
    const parsed=await parseJson(request,admission);if("error" in parsed)return parsed.error;
    const {module,parent,...payload}=parsed.data;const {id}=await context.params;
    if(!await db.builderProject.findFirst({where:{id:parent,builderId:profile.id},select:{id:true}}))return forbidden();
    let result;
    if(module==="units"){
      // Reservations and sale status may only change through the booking workflow.
      const values=builderUnitSchema.omit({status:true,towerId:true,imageUrls:true,floorPlanUrl:true}).partial().strict().safeParse(payload);
      if(!values.success)return apiError("Invalid unit changes",400);
      result=await db.builderUnit.updateMany({where:{id,projectId:parent,status:"AVAILABLE"},data:values.data});
    }else if(module==="towers"){
      const values=builderTowerSchema.partial().strict().safeParse(payload);if(!values.success)return apiError("Invalid tower changes",400);
      result=await db.builderTower.updateMany({where:{id,projectId:parent},data:values.data});
    }else if(module==="builderTeam"){
      const values=builderTeamMemberSchema.omit({profileId:true,projectId:true}).partial().strict().safeParse(payload);if(!values.success)return apiError("Invalid membership changes",400);
      result=await db.builderTeamMember.updateMany({where:{id,projectId:parent,builderId:profile.id},data:values.data});
    }else{
      const values=builderCampaignSchema.partial().strict().safeParse(payload);if(!values.success)return apiError("Invalid campaign changes",400);
      result=await db.builderCampaign.updateMany({where:{id,projectId:parent},data:values.data});
    }
    return result.count===1?ok({updated:true},{headers:{"Cache-Control":"no-store"}}):apiError("Record unavailable or changed. Refresh before continuing.",409);
  }catch(error){return handleApiError(error,{route:"PATCH /api/mobile/workspace/[id]"});}
}
