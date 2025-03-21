/**
 * Gets the value at path of object. If the resolved value is undefined,
 * returns the defaultValue.
 */
// export function oget(
//   object: unknown,
//   path: string | string[],
//   defaultValue?: unknown
// ): unknown {
//   if (!object) return defaultValue;

//   const keys = Array.isArray(path) ? path : path.split('.');
//   let result = object;

//   for (const key of keys) {
//     if (result === null || result === undefined) {
//       return defaultValue;
//     }
//     result = result[key] as unknown;
//   }

//   return result === undefined ? defaultValue : result;
// }

export function oget<T>(
  obj: Record<string, unknown>,
  path: string,
  defaultValue?: T
): T | undefined {
  const keys = path.split('.');
  let result: any = obj;

  for (const key of keys) {
    if (result && typeof result === 'object' && key in result) {
      result = result[key];
    } else {
      return defaultValue;
    }
  }
  return result as T;
}

/**
 * Sets the value at path of object. If a portion of path doesn't exist, it's created.
 * Arrays are created for missing index properties while objects are created for all
 * other missing properties.
 */
export function oset(
  obj: Record<string, unknown>,
  path: string,
  value: unknown
): void {
  const keys = path.split('.');
  let current: Record<string, unknown> = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];

    if (!(key in current) || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }
  current[keys[keys.length - 1]] = value;
}
