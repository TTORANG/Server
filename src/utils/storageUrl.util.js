function gsToHttpsUrl(url) {
  if (typeof url !== "string") return url;
  if (!url.startsWith("gs://")) return url;

  const rest = url.slice(5);
  const firstSlashIndex = rest.indexOf("/");
  if (firstSlashIndex <= 0) return url;

  const bucket = rest.slice(0, firstSlashIndex);
  const objectKey = rest.slice(firstSlashIndex + 1);
  if (!bucket || !objectKey) return url;

  return `https://storage.googleapis.com/${bucket}/${objectKey}`;
}

export function toPublicStorageUrl(url) {
  if (url == null) return url;
  return gsToHttpsUrl(url);
}
