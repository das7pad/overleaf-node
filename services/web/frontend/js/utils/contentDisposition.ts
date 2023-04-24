export function contentDisposition(filename: string) {
  // Use RFC 5987 encoding for the filename.
  return `attachment; filename*=UTF-8''${
    // encodeURIComponent escapes all characters except for: - _ . ! ~ * ' ( )
    encodeURIComponent(filename).replace(
      /[-_.!~*'()]/g,
      c => '%' + c.charCodeAt(0).toString(16).toUpperCase()
    )
  }`
}
