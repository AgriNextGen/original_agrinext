/**
 * Support Tickets Tests — list, seed, status update, assign, filter
 */

import type { TestContext } from "../test-utils";

const MODULE = "Support Tickets";

function throwPg(error: unknown): never {
  if (error && typeof error === "object" && "message" in error) {
    throw new Error((error as { message: string }).message);
  }
  throw error;
}

export async function run(ctx: TestContext): Promise<void> {
  const admin = ctx.userOf("admin");
  const farmer = ctx.userOf("farmer");
  const client = ctx.authedClient("admin");
  let ticketId: string | undefined;

  // --- Admin can list tickets via RPC ---
  try {
    const { data, error } = await client.rpc("admin.list_tickets_v1" as any, {
      p_filters: {},
      p_limit: 10,
      p_cursor: null,
    });

    if (error) throwPg(error);

    ctx.pass(MODULE, "List tickets RPC");
  } catch (err) {
    ctx.fail(MODULE, "List tickets RPC", err, "Check admin.list_tickets_v1 RPC exists and admin has EXECUTE permission");
  }

  // --- Seed a support ticket ---
  try {
    const { data, error } = await ctx.adminClient
      .from("support_tickets")
      .insert({
        created_by: farmer.userId,
        category: "crop_issue",
        message: `adminchk_${ctx.demoTag}_ticket`,
        status: "open",
        priority: "medium",
        role: "farmer",
      })
      .select("id")
      .single();

    if (error) throwPg(error);
    if (!data) throw new Error("Failed to seed ticket");
    ticketId = data.id;

    ctx.pass(MODULE, "Seed ticket");
  } catch (err) {
    ctx.fail(MODULE, "Seed ticket", err, "Check support_tickets table schema and admin insert access");
  }

  // --- Admin can update ticket status via RPC ---
  try {
    if (!ticketId) throw new Error("No ticket seeded — skipping status update");

    const { error } = await client.rpc("admin.update_ticket_status_v2" as any, {
      p_ticket_id: ticketId,
      p_status: "in_progress",
      p_note: "Admin test status update",
    });

    if (error) throwPg(error);

    ctx.pass(MODULE, "Update ticket status");
  } catch (err) {
    ctx.fail(MODULE, "Update ticket status", err, "Check admin.update_ticket_status_v2 RPC and admin execute permission");
  }

  // --- Admin can assign ticket ---
  try {
    if (!ticketId) throw new Error("No ticket seeded — skipping assign");

    const { data: adminUser } = await ctx.adminClient
      .from("admin_users")
      .select("id")
      .eq("user_id", admin.userId)
      .single();

    if (!adminUser) throw new Error("Admin user record not found in admin_users");

    const { error } = await client.rpc("admin.assign_ticket_v1" as any, {
      p_ticket_id: ticketId,
      p_admin_user_id: adminUser.id,
    });

    if (error) throwPg(error);

    ctx.pass(MODULE, "Assign ticket");
  } catch (err) {
    ctx.fail(MODULE, "Assign ticket", err, "Check admin.assign_ticket_v1 RPC and admin_users record exists");
  }

  // --- Filter tickets by status ---
  try {
    const { data, error } = await client.rpc("admin.list_tickets_v1" as any, {
      p_filters: { status: "in_progress" },
      p_limit: 10,
      p_cursor: null,
    });

    if (error) throwPg(error);

    ctx.pass(MODULE, "Filter tickets by status");
  } catch (err) {
    ctx.fail(MODULE, "Filter tickets by status", err, "Check admin.list_tickets_v1 supports status filter");
  }

  // --- Cleanup seeded ticket ---
  if (ticketId) {
    await ctx.adminClient
      .from("support_tickets")
      .delete()
      .eq("id", ticketId)
      .then(({ error }) => {
        if (error) console.log(`    warn: cleanup ticket: ${error.message}`);
      });
  }
}
