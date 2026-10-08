import { auth } from "@/auth";
import { auditLog } from "@/lib/audit";
import { checkRateLimit, rateLimitKey } from "@/lib/api/rate-limit";
import {
  forbidden,
  handleApiError,
  ok,
  parseJson,
  rateLimited,
  unauthorized
} from "@/lib/api/response";
import { paymentVerifySchema } from "@/lib/api/validation";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { db } from "@/lib/db";
import { verifyRazorpayPaymentSignature } from "@/lib/payments/razorpay";
import { markPaymentPaid } from "@/lib/payments/service";

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return unauthorized();
    }

    const limit = checkRateLimit({
      key: rateLimitKey(request, "payments:verify", session.user.id),
      limit: 30,
      windowMs: 60_000
    });

    if (!limit.allowed) {
      return rateLimited(limit.resetAt);
    }

    const parsed = await parseJson(request, paymentVerifySchema);

    if ("error" in parsed) {
      return parsed.error;
    }

    const profile = await getOrCreateProfile(session.user);
    const payment = await db.payment.findUnique({
      where: {
        razorpayOrderId: parsed.data.razorpay_order_id
      }
    });

    if (!payment || payment.payerId !== profile.id) {
      return forbidden("Payment does not belong to this account");
    }

    const valid = verifyRazorpayPaymentSignature({
      orderId: parsed.data.razorpay_order_id,
      paymentId: parsed.data.razorpay_payment_id,
      signature: parsed.data.razorpay_signature
    });

    if (!valid) {
      await db.payment.update({
        where: {
          id: payment.id
        },
        data: {
          failureReason: "Invalid Razorpay signature",
          status: "FAILED"
        }
      });
      await auditLog({
        action: "PAYMENT_FAILED",
        actorId: profile.id,
        entityId: payment.id,
        entityType: "payment",
        metadata: {
          reason: "Invalid Razorpay signature"
        }
      });
      return forbidden("Invalid payment signature");
    }

    const paid = await markPaymentPaid({
      orderId: parsed.data.razorpay_order_id,
      paymentId: parsed.data.razorpay_payment_id,
      signature: parsed.data.razorpay_signature
    });

    return ok({ payment: paid });
  } catch (error) {
    return handleApiError(error, {
      route: "POST /api/payments/verify"
    });
  }
}
