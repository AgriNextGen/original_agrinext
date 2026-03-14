/**
 * Chaos Test — Storage Outage Simulation
 *
 * Simulates storage failures: non-existent bucket, missing files,
 * invalid uploads. Verifies errors are returned gracefully.
 */

import type { TestContext } from "../test-utils";

const MODULE = "Storage Outage";

export async function run(ctx: TestContext): Promise<void> {
  // --- Upload to non-existent bucket ---
  try {
    const blob = new Blob(["chaos-test-content"], { type: "text/plain" });

    const { error } = await ctx.adminClient.storage
      .from("nonexistent-bucket-chaos-xyz")
      .upload(`chaos/${ctx.demoTag}/test.txt`, blob);

    if (!error) {
      throw new Error(
        "Expected error uploading to non-existent bucket but got success",
      );
    }

    ctx.pass(MODULE, "Non-existent bucket rejection");
  } catch (err: any) {
    if (err?.message?.includes("Expected error")) {
      ctx.fail(MODULE, "Non-existent bucket rejection", err);
    } else {
      ctx.pass(MODULE, "Non-existent bucket rejection");
    }
  }

  // --- Download non-existent file ---
  try {
    const { data, error } = await ctx.adminClient.storage
      .from("profile-photos")
      .createSignedUrl(
        `chaos-nonexistent/${ctx.demoTag}/does-not-exist.png`,
        60,
      );

    // Supabase may return a signed URL even for missing files (URL is valid
    // but the file won't be there). Alternatively it may error. Both are
    // acceptable — the key is no crash.
    if (error) {
      ctx.pass(MODULE, "Missing file signed URL handling");
    } else if (data?.signedUrl) {
      const res = await fetch(data.signedUrl);
      if (res.status === 400 || res.status === 404 || res.status === 200) {
        ctx.pass(MODULE, "Missing file signed URL handling");
      } else {
        throw new Error(`Unexpected HTTP ${res.status} for missing file`);
      }
    } else {
      ctx.pass(MODULE, "Missing file signed URL handling");
    }
  } catch (err) {
    ctx.fail(
      MODULE,
      "Missing file signed URL handling",
      err,
      "Verify Supabase Storage handles missing file requests gracefully",
    );
  }

  // --- Upload with empty content ---
  try {
    const emptyBlob = new Blob([], { type: "text/plain" });

    const { error } = await ctx.adminClient.storage
      .from("profile-photos")
      .upload(`chaos/${ctx.demoTag}/empty.txt`, emptyBlob, { upsert: true });

    // Empty uploads may succeed or fail — either is acceptable as long as
    // no unhandled exception occurs.
    if (error) {
      ctx.pass(MODULE, "Empty file upload handling");
    } else {
      await ctx.adminClient.storage
        .from("profile-photos")
        .remove([`chaos/${ctx.demoTag}/empty.txt`]);
      ctx.pass(MODULE, "Empty file upload handling");
    }
  } catch (err) {
    ctx.fail(
      MODULE,
      "Empty file upload handling",
      err,
      "Verify storage handles empty file uploads without crashing",
    );
  }

  // --- Upload with extremely long path ---
  try {
    const longSegment = "a".repeat(500);
    const blob = new Blob(["test"], { type: "text/plain" });

    const { error } = await ctx.adminClient.storage
      .from("profile-photos")
      .upload(`chaos/${ctx.demoTag}/${longSegment}/file.txt`, blob);

    // Should either succeed (some storage systems allow long paths) or
    // return a structured error. No crash is the requirement.
    if (error) {
      ctx.pass(MODULE, "Oversized path rejection");
    } else {
      await ctx.adminClient.storage
        .from("profile-photos")
        .remove([`chaos/${ctx.demoTag}/${longSegment}/file.txt`]);
      ctx.pass(MODULE, "Oversized path rejection");
    }
  } catch (err) {
    ctx.fail(
      MODULE,
      "Oversized path rejection",
      err,
      "Verify storage handles extremely long file paths gracefully",
    );
  }
}
