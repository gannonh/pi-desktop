export const splitPathSegments = (filePath: string): string[] => filePath.split(/[\\/]+/).filter(Boolean);
