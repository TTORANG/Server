export function extFromContentType(contentType) {
  switch (contentType) {
    case "image/png":
      return "png";
    case "image/jpeg":
      return "jpg";
    case "application/pdf":
      return "pdf";
    case "application/vnd.openxmlformats-officedocument.presentationml.presentation":
      return "pptx";
    default:
      return null;
  }
}
