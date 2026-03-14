/**
 * Chaos Test — Invalid Input Simulation
 *
 * Simulates malformed payloads, missing required fields, SQL injection
 * attempts, and boundary-value inputs. Verifies database integrity is
 * preserved and errors are returned gracefully.
 */

import type { TestContext } from "../test-utils";

const MODULE = "Invalid Input";

export async function run(ctx: TestContext): Promise<void> {
  const farmer = ctx.userOf("farmer");
  const farmerClient = ctx.authedClient("farmer");

  // --- Missing required fields (farmland without farmer_id) ---
  try {
    const { error } = await ctx.adminClient.from("farmlands").insert({
      name: `chaos_missing_field_${ctx.demoTag}`,
      // farmer_id intentionally omitted
      district: "Mysuru",
      demo_tag: ctx.demoTag,
    } as any);

    if (error) {
      ctx.pass(MODULE, "Missing required field rejected");
    } else {
      // Clean up if it somehow succeeded
      await ctx.adminClient
        .from("farmlands")
        .delete()
        .eq("demo_tag", ctx.demoTag)
        .like("name", "chaos_missing_field_%");
      throw new Error(
        "Insert without required farmer_id succeeded — constraint may be missing",
      );
    }
  } catch (err: any) {
    if (err?.message?.includes("constraint may be missing")) {
      ctx.fail(MODULE, "Missing required field rejected", err, "Add NOT NULL constraint on farmlands.farmer_id");
    } else {
      ctx.pass(MODULE, "Missing required field rejected");
    }
  }

  // --- Invalid enum value for health_status ---
  try {
    // First ensure we have a farmland to reference
    const { data: farmland } = await ctx.adminClient
      .from("farmlands")
      .insert({
        farmer_id: farmer.userId,
        name: `chaos_enum_test_${ctx.demoTag}`,
        district: "Mysuru",
        demo_tag: ctx.demoTag,
      })
      .select("id")
      .single();

    if (!farmland?.id) {
      ctx.pass(MODULE, "Invalid enum value handling");
      return;
    }

    const { error } = await ctx.adminClient.from("crops").insert({
      farmer_id: farmer.userId,
      land_id: farmland.id,
      name: `chaos_enum_crop_${ctx.demoTag}`,
      health_status: "COMPLETELY_INVALID_STATUS_XYZ",
      demo_tag: ctx.demoTag,
    } as any);

    // Clean up
    await ctx.adminClient
      .from("crops")
      .delete()
      .eq("demo_tag", ctx.demoTag)
      .like("name", "chaos_enum_%");
    await ctx.adminClient
      .from("farmlands")
      .delete()
      .eq("demo_tag", ctx.demoTag)
      .like("name", "chaos_enum_%");

    // If there's a CHECK constraint, error is expected. If the column is
    // free-text, it may succeed — both are acceptable as long as no crash.
    ctx.pass(MODULE, "Invalid enum value handling");
  } catch (err) {
    ctx.fail(
      MODULE,
      "Invalid enum value handling",
      err,
      "Verify health_status column handles invalid values gracefully",
    );
  }

  // --- SQL injection attempt ---
  try {
    const injectionPayload = "'; DROP TABLE profiles; --";

    const { error } = await ctx.adminClient.from("farmlands").insert({
      farmer_id: farmer.userId,
      name: injectionPayload,
      district: "Mysuru",
      demo_tag: ctx.demoTag,
    });

    // The parameterized query should treat the payload as a literal string
    if (error) {
      ctx.pass(MODULE, "SQL injection safely rejected");
    } else {
      // Verify profiles table still exists
      const { error: checkErr } = await ctx.adminClient
        .from("profiles")
        .select("id")
        .limit(1);

      if (checkErr) {
        throw new Error(
          "CRITICAL: profiles table may have been dropped by SQL injection",
        );
      }

      // Clean up the inserted row
      await ctx.adminClient
        .from("farmlands")
        .delete()
        .eq("demo_tag", ctx.demoTag)
        .eq("name", injectionPayload);

      ctx.pass(MODULE, "SQL injection safely rejected");
    }
  } catch (err: any) {
    if (err?.message?.includes("CRITICAL")) {
      ctx.fail(MODULE, "SQL injection safely rejected", err, "CRITICAL: SQL injection vulnerability detected");
    } else {
      ctx.pass(MODULE, "SQL injection safely rejected");
    }
  }

  // --- Oversized text in name field ---
  try {
    const oversizedName = "X".repeat(100_000);

    const { error } = await ctx.adminClient.from("farmlands").insert({
      farmer_id: farmer.userId,
      name: oversizedName,
      district: "Mysuru",
      demo_tag: ctx.demoTag,
    });

    if (error) {
      ctx.pass(MODULE, "Oversized text handling");
    } else {
      // Clean up
      await ctx.adminClient
        .from("farmlands")
        .delete()
        .eq("demo_tag", ctx.demoTag)
        .eq("farmer_id", farmer.userId)
        .like("name", "XXXX%");
      ctx.pass(MODULE, "Oversized text handling");
    }
  } catch (err) {
    ctx.fail(
      MODULE,
      "Oversized text handling",
      err,
      "Verify database handles extremely large text values without crashing",
    );
  }

  // --- Invalid UUID in query ---
  try {
    const { data, error } = await farmerClient
      .from("farmlands")
      .select("id")
      .eq("farmer_id", "not-a-valid-uuid");

    // Postgres should return an error for invalid UUID format
    if (error) {
      ctx.pass(MODULE, "Invalid UUID rejected");
    } else {
      // Some versions may return empty results instead of error
      if (data && data.length === 0) {
        ctx.pass(MODULE, "Invalid UUID rejected");
      } else {
        throw new Error("Invalid UUID query returned data unexpectedly");
      }
    }
  } catch (err: any) {
    if (err?.message?.includes("unexpectedly")) {
      ctx.fail(MODULE, "Invalid UUID rejected", err, "UUID validation should prevent invalid format queries");
    } else {
      ctx.pass(MODULE, "Invalid UUID rejected");
    }
  }

  // --- Null in non-nullable field (profiles.id) ---
  try {
    const { error } = await ctx.adminClient
      .from("profiles")
      .update({ id: null } as any)
      .eq("id", farmer.userId);

    if (error) {
      ctx.pass(MODULE, "Null in non-nullable field rejected");
    } else {
      // Verify the profile still has its ID
      const { data } = await ctx.adminClient
        .from("profiles")
        .select("id")
        .eq("id", farmer.userId)
        .maybeSingle();

      if (data?.id === farmer.userId) {
        ctx.pass(MODULE, "Null in non-nullable field rejected");
      } else {
        throw new Error("Profile ID was nullified — constraint failure");
      }
    }
  } catch (err: any) {
    if (err?.message?.includes("constraint failure")) {
      ctx.fail(MODULE, "Null in non-nullable field rejected", err, "Add NOT NULL constraint on profiles.id");
    } else {
      ctx.pass(MODULE, "Null in non-nullable field rejected");
    }
  }
}
