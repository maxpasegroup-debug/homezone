import { auth } from "@/auth";
import { handleApiError, ok, unauthorized } from "@/lib/api/response";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { getBuilderEnterpriseData } from "@/lib/builder/queries";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return unauthorized();
    const profile = await getOrCreateProfile(session.user);
    const data = await getBuilderEnterpriseData(profile.id);
    return ok({
      reports: {
        inventory: {
          available: data.analytics.availableUnits,
          reserved: data.analytics.reservedUnits,
          sold: data.analytics.soldUnits,
          total: data.analytics.totalUnits
        },
        leadConversion: {
          leads: data.leads.length,
          soldBookings: data.bookings.filter((booking) => booking.status === "SOLD").length
        },
        revenue: {
          pipeline: data.analytics.revenuePipeline,
          sold: data.analytics.soldRevenue
        },
        team: data.team.map((member) => ({
          active: member.active,
          name: member.name,
          role: member.role
        }))
      }
    });
  } catch (error) {
    return handleApiError(error, { route: "GET /api/builder/reports" });
  }
}
