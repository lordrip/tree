export function getComponentNameFromUri(uri: string | undefined): string | undefined {
  if (!uri) return undefined;

  const colonIndex = uri.indexOf(':');
  if (colonIndex === -1) return uri;

  return uri.substring(0, colonIndex);
}
