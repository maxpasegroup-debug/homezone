import { auth } from "@/auth";
import { apiError, forbidden, handleApiError, notFound, ok, parseJson, unauthorized } from "@/lib/api/response";
import { serviceQuoteActionSchema } from "@/lib/api/validation";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { db } from "@/lib/db";
type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session=await auth(); if(!session?.user?.id)return unauthorized();
    const profile=await getOrCreateProfile(session.user);
    if(profile.verificationStatus==="SUSPENDED")return forbidden();
    const {id}=await context.params;
    const parsed=await parseJson(request,serviceQuoteActionSchema);if("error" in parsed)return parsed.error;
    const reference=await db.serviceQuote.findUnique({where:{id},select:{requestId:true}});
    if(!reference)return notFound("Quote not found");
    const result=await db.$transaction(async tx=>{
      // All quote mutations lock the parent first, including admission/revision.
      await tx.$queryRaw`SELECT id FROM "ServiceRequest" WHERE id = ${reference.requestId} FOR UPDATE`;
      const quote=await tx.serviceQuote.findUnique({where:{id},include:{provider:true,request:true}});
      if(!quote || quote.status!=="sent" || !["requested","quoted"].includes(quote.request.status) ||
        (quote.validUntil && quote.validUntil.getTime()<=Date.now()))return null;
      if(parsed.data.action==="REVISE"){
        if(!quote.provider || quote.provider.suspended || !quote.provider.verified || quote.provider.profileId!==profile.id)return null;
        const revised=await tx.serviceQuote.create({data:{amount:parsed.data.amount??quote.amount,
          currency:quote.currency,message:parsed.data.message??quote.message,providerId:quote.providerId,
          requestId:quote.requestId,revision:quote.revision+1,validUntil:quote.validUntil,status:"sent"}});
        await tx.serviceQuote.update({where:{id},data:{status:"revised"}});
        return {quote:revised};
      }
      if(quote.request.requesterId!==profile.id)return null;
      if(parsed.data.action==="REJECT")return {quote:await tx.serviceQuote.update({where:{id},data:{status:"rejected",rejectedAt:new Date()}})};
      const amount=Number(quote.amount);
      if(!quote.providerId || !quote.provider || quote.provider.suspended || !quote.provider.verified || !Number.isFinite(amount) || amount<=0 ||
        (parsed.data.scheduledAt && new Date(parsed.data.scheduledAt).getTime()<=Date.now()))return null;
      const commissionAmount=Math.round(amount*0.1);
      await tx.serviceRequest.update({where:{id:quote.requestId},data:{providerId:quote.providerId,status:"booked"}});
      await tx.serviceQuote.update({where:{id},data:{status:"accepted",acceptedAt:new Date()}});
      const booking=await tx.serviceBooking.create({data:{requestId:quote.requestId,quoteId:id,
        providerId:quote.providerId,customerId:profile.id,amount,currency:quote.currency,
        commissionAmount,providerPayout:amount-commissionAmount,depositAmount:Math.min(amount,999),
        scheduledAt:parsed.data.scheduledAt?new Date(parsed.data.scheduledAt):undefined,status:"UPCOMING"}});
      return {booking};
    });
    return result?ok(result):apiError("Quote is unavailable or changed. Refresh before continuing.",409);
  }catch(error){return handleApiError(error,{route:"PATCH /api/service-quotes/[id]"});}
}
