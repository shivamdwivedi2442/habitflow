/* Engineered by Shivam Coder (https://github.com/shivamdwivedi2442 */

async function uploadProfilePictureToSupabase(userId, avatarInput) {
  const val = String(avatarInput || "").trim();
  if (!val || !val.startsWith("data:image/")) {
    return { url: val, storage: "preset_or_url" };
  }

  const supabaseUrl = (process.env.SUPABASE_URL || "").replace(/\/+$/, "");
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || "";

  if (
    !supabaseUrl ||
    !supabaseKey ||
    supabaseUrl.includes("[YOUR-PROJECT-REF]") ||
    supabaseKey.includes("your-supabase-")
  ) {
    // Fallback: store DataURL directly in users.avatar_url column in Database
    return { url: val, storage: "database_column" };
  }

  try {
    const match = val.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
    if (!match) {
      return { url: val, storage: "database_column" };
    }
    const mimeType = match[1];
    const base64Data = match[2];
    const ext = mimeType.split("/")[1] || "png";
    const buffer = Buffer.from(base64Data, "base64");
    const fileName = `user_${userId}_${Date.now()}.${ext}`;
    const bucket = process.env.SUPABASE_STORAGE_BUCKET || "avatars";

    // Ensure bucket exists (ignore if already exists)
    await fetch(`${supabaseUrl}/storage/v1/bucket`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${supabaseKey}`,
        apikey: supabaseKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ id: bucket, name: bucket, public: true })
    }).catch(() => {});

    // Upload image binary to Supabase Storage
    const uploadRes = await fetch(`${supabaseUrl}/storage/v1/object/${bucket}/${fileName}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${supabaseKey}`,
        apikey: supabaseKey,
        "Content-Type": mimeType,
        "x-upsert": "true"
      },
      body: buffer
    });

    if (uploadRes.ok) {
      const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${fileName}`;
      return { url: publicUrl, storage: "supabase_storage_bucket" };
    }
  } catch {
    // Fallback to storing DataURL in DB column if network/bucket fails
  }

  return { url: val, storage: "database_column" };
}

module.exports = { uploadProfilePictureToSupabase };
