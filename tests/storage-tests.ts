/**
 * Storage Tests — upload, retrieve, signed URL, cleanup
 */

import type { TestContext } from "./test-utils";

const MODULE = "Storage Tests";

export async function run(ctx: TestContext): Promise<void> {
  const bucket = "profile-photos";
  const filePath = `system-check/${ctx.demoTag}/test.txt`;
  const fileContent = new Blob(["system-check-content"], {
    type: "text/plain",
  });

  // --- Upload file ---
  try {
    const { error } = await ctx.adminClient.storage
      .from(bucket)
      .upload(filePath, fileContent, { upsert: true });

    if (error) {
      if (
        error.message?.includes("not found") ||
        error.message?.includes("Bucket")
      ) {
        throw new Error(
          `Bucket "${bucket}" does not exist. Run the storage buckets migration first.`,
        );
      }
      throw error;
    }
    ctx.pass(MODULE, "File upload");
  } catch (err) {
    ctx.fail(MODULE, "File upload", err, "Ensure storage buckets exist (run storage buckets migration)");
  }

  // --- List / verify file exists ---
  try {
    const { data, error } = await ctx.adminClient.storage
      .from(bucket)
      .list(`system-check/${ctx.demoTag}`);

    if (error) throw error;
    const found = data?.find((f) => f.name === "test.txt");
    if (!found) throw new Error("Uploaded file not found in bucket listing");
    ctx.pass(MODULE, "File retrieval");
  } catch (err) {
    ctx.fail(MODULE, "File retrieval", err, "Check storage bucket permissions and file path");
  }

  // --- Generate signed URL ---
  try {
    const { data, error } = await ctx.adminClient.storage
      .from(bucket)
      .createSignedUrl(filePath, 60);

    if (error) throw error;
    if (!data?.signedUrl) throw new Error("Signed URL is empty");
    ctx.pass(MODULE, "Signed URL generation");
  } catch (err) {
    ctx.fail(MODULE, "Signed URL generation", err, "Check storage signed URL permissions");
  }

  // --- Cleanup uploaded file ---
  try {
    const { error } = await ctx.adminClient.storage
      .from(bucket)
      .remove([filePath]);

    if (error) throw error;
    ctx.pass(MODULE, "File cleanup");
  } catch (err) {
    ctx.fail(MODULE, "File cleanup", err, "Check storage delete permissions");
  }
}
