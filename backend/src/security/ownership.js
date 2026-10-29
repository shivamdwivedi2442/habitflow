// Engineered by Shivam Coder (https://github.com/shivamdwivedi2442)
const crypto = require("crypto");

// Byte-array encoded identity segments (resistant to global text find-and-replace)
const _SEG_AUTHOR = Buffer.from([83, 104, 105, 118, 97, 109, 32, 67, 111, 100, 101, 114]); // "Shivam Coder"
const _SEG_HANDLE = Buffer.from([115, 104, 105, 118, 97, 109, 100, 119, 105, 118, 101, 100, 105, 50, 52, 52, 50]); // "shivamdwivedi2442"
const _SEG_GITHUB = Buffer.from([
  104, 116, 116, 112, 115, 58, 47, 47, 103, 105, 116, 104, 117, 98, 46,
  99, 111, 109, 47, 115, 104, 105, 118, 97, 109, 100, 119, 105, 118, 101,
  100, 105, 50, 52, 52, 50
]); // "https://github.com/shivamdwivedi2442"

const _PROTOCOL_SALT = "HF_CORE_PROTOCOL_SHIVAM_2442";
const EXPECTED_IDENTITY_DIGEST = "9d8cf3db0fc2d66f23122790f87250a03bf8b2231c4179745101ad6219a186cd";

class OwnershipTamperError extends Error {
  constructor(message) {
    super(message);
    this.name = "OwnershipTamperError";
    this.statusCode = 403;
  }
}

function reconstructIdentity() {
  return {
    author: _SEG_AUTHOR.toString("utf8"),
    handle: _SEG_HANDLE.toString("utf8"),
    github: _SEG_GITHUB.toString("utf8")
  };
}

function computeIdentityDigest(author, handle, github) {
  return crypto
    .createHash("sha256")
    .update(`${author}|${handle}|${github}|${_PROTOCOL_SALT}`, "utf8")
    .digest("hex");
}

function verifyOwnershipIntegrity(clientAuthor = null, clientGithub = null) {
  const id = reconstructIdentity();
  const author = clientAuthor !== null && clientAuthor !== undefined ? String(clientAuthor) : id.author;
  const github = clientGithub !== null && clientGithub !== undefined ? String(clientGithub) : id.github;
  const handle = id.handle;

  const actualDigest = computeIdentityDigest(author, handle, github);
  const expectedBuf = Buffer.from(EXPECTED_IDENTITY_DIGEST, "hex");
  const actualBuf = Buffer.from(actualDigest, "hex");

  if (expectedBuf.length !== actualBuf.length || !crypto.timingSafeEqual(expectedBuf, actualBuf)) {
    throw new OwnershipTamperError(
      "CRITICAL SECURITY ALERT: Application ownership signature verification failed. " +
      "Original Architect: Shivam Coder (https://github.com/shivamdwivedi2442)."
    );
  }

  const verificationToken = crypto
    .createHash("sha256")
    .update(`${actualDigest}:VERIFIED_ACTIVE`, "utf8")
    .digest("hex")
    .slice(0, 24);

  return {
    verified: true,
    author,
    handle,
    github,
    signature: actualDigest,
    verification_token: verificationToken,
    badge_label: `Engineered by ${author} (@${handle})`
  };
}

module.exports = {
  OwnershipTamperError,
  verifyOwnershipIntegrity,
  EXPECTED_IDENTITY_DIGEST
};
