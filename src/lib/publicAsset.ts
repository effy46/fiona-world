/** Public assets follow the configured deployment subdirectory, including runtime loaders. */
export function publicAsset(path: string) {
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;
}
