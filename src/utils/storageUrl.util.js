function gsToHttpsUrl(url) {
  if (typeof url !== "string") return url;

  const trimmed = url.trim();
  const match = /^gs:\/\/([^/]+)\/(.+)$/i.exec(trimmed);
  if (!match) return url;

  const bucket = match[1];
  const objectKey = match[2].replace(/^\/+/, "");
  if (!bucket || !objectKey) return url;

  return `https://storage.googleapis.com/${bucket}/${objectKey}`;
}

export function toPublicStorageUrl(url) {
  if (url == null) return url;
  return gsToHttpsUrl(url);
}
