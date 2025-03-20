/**
 * Gets the value at path of object. If the resolved value is undefined,
 * returns the defaultValue.
 */
export function oget(
  object: any,
  path: string | string[],
  defaultValue?: any
): any {
  if (!object) return defaultValue;

  const keys = Array.isArray(path) ? path : path.split('.');
  let result = object;

  for (const key of keys) {
    if (result === null || result === undefined) {
      return defaultValue;
    }
    result = result[key];
  }

  return result === undefined ? defaultValue : result;
}

/**
 * Sets the value at path of object. If a portion of path doesn't exist, it's created.
 * Arrays are created for missing index properties while objects are created for all
 * other missing properties.
 */
export function oset(object: any, path: string | string[], value: any): any {
  if (!object) return object;

  const keys = Array.isArray(path) ? path : path.split('.');
  let current = object;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];

    if (!(key in current)) {
      // Create array if next key is numeric, otherwise create object
      current[key] = /^\d+$/.test(keys[i + 1]) ? [] : {};
    }

    current = current[key];
  }

  const lastKey = keys[keys.length - 1];
  current[lastKey] = value;

  return object;
}

/**
 * Checks if path exists in object
 */
export function has(object: any, path: string | string[]): boolean {
  if (!object) return false;

  const keys = Array.isArray(path) ? path : path.split('.');
  let current = object;

  for (const key of keys) {
    if (!current || typeof current !== 'object') {
      return false;
    }
    if (!(key in current)) {
      return false;
    }
    current = current[key];
  }

  return true;
}

/**
 * Removes the property at path of object
 */
export function unset(object: any, path: string | string[]): boolean {
  if (!object) return false;

  const keys = Array.isArray(path) ? path : path.split('.');
  let current = object;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!current[key]) {
      return false;
    }
    current = current[key];
  }

  const lastKey = keys[keys.length - 1];
  if (!(lastKey in current)) {
    return false;
  }

  delete current[lastKey];
  return true;
}
