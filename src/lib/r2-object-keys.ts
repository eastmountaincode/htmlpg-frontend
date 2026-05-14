export function objectKeyToId(key: string) {
  return Buffer.from(key, "utf8").toString("base64url");
}

export function objectKeyFromId(id: string) {
  return Buffer.from(id, "base64url").toString("utf8");
}

export function objectKeyBelongsToBox(key: string, box: string) {
  return key.startsWith(`box${box}/`) && !key.endsWith("/") && !key.endsWith(".meta.json");
}

export function displayNameFromObjectKey(key: string, box: string) {
  return key.slice(`box${box}/`.length);
}

export function createStorageObjectKey(box: string, fileName: string) {
  const extension = getSafeExtension(fileName);
  return `box${box}/${crypto.randomUUID()}${extension}`;
}

function getSafeExtension(fileName: string) {
  const name = fileName.split(/[\\/]/).pop() || "";
  const dot = name.lastIndexOf(".");
  if (dot <= 0 || dot === name.length - 1) return "";

  const extension = name.slice(dot);
  return /^\.[A-Za-z0-9]{1,16}$/.test(extension) ? extension : "";
}
