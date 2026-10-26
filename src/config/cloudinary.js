const {
  v2: cloudinary,
} = require("cloudinary");

// ======================================================
// CLOUDINARY CONFIG
//
// Credentials come from the Cloudinary dashboard:
//   Settings -> API Keys
//
// CLOUDINARY_URL is also supported by the SDK, but the
// three explicit vars are easier to set on Render/Vercel.
// ======================================================

const {
  CLOUDINARY_URL,
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
} = process.env;

// The dashboard hands out a single connection string:
//   cloudinary://<api_key>:<api_secret>@<cloud_name>
// Pasting that one line is less error-prone than copying
// three values by hand, so it wins when present.
const parseCloudinaryUrl = (
  value
) => {
  const match =
    /^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/.exec(
      (value || "").trim()
    );

  if (!match) return null;

  return {
    api_key: match[1],
    api_secret: match[2],
    cloud_name: match[3]
      .split("/")[0]
      .trim(),
  };
};

const credentials =
  parseCloudinaryUrl(
    CLOUDINARY_URL
  ) ||
  (CLOUDINARY_CLOUD_NAME &&
  CLOUDINARY_API_KEY &&
  CLOUDINARY_API_SECRET
    ? {
        cloud_name:
          CLOUDINARY_CLOUD_NAME.trim(),
        api_key:
          CLOUDINARY_API_KEY.trim(),
        api_secret:
          CLOUDINARY_API_SECRET.trim(),
      }
    : null);

// The .env.example placeholders ("your_api_key", ...) are
// not credentials: treating them as such made every upload
// fail with Cloudinary's 401 "Unknown API key".
const PLACEHOLDER = /^(your[_-]|xxx|changeme|<)/i;

const isCloudinaryConfigured =
  Boolean(credentials) &&
  !Object.values(credentials).some(
    (value) => PLACEHOLDER.test(value)
  );

if (isCloudinaryConfigured) {
  cloudinary.config({
    ...credentials,
    secure: true,
  });
} else {
  console.warn(
    "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, " +
      "CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET. " +
      "Uploaded images are stored inline in MongoDB until then."
  );
}

// Root folder so the media library stays tidy and a
// staging deploy never overwrites production assets.
const CLOUDINARY_ROOT_FOLDER =
  process.env
    .CLOUDINARY_FOLDER ||
  "stationery-store";

module.exports = {
  cloudinary,
  isCloudinaryConfigured,
  CLOUDINARY_ROOT_FOLDER,
};
