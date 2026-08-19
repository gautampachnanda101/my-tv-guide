import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { getMasterKey } from "./masterKey.js";

const ALGORITHM = "aes-256-gcm";

export function encryptSecret(plaintext) {
  const key = getMasterKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    ciphertext: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64")
  };
}

export function decryptSecret({ ciphertext, iv, authTag }) {
  const key = getMasterKey();
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(authTag, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(ciphertext, "base64")),
    decipher.final()
  ]);
  return decrypted.toString("utf8");
}
