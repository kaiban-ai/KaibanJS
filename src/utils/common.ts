/**
 * @file common.ts
 * @path src/utils/common.ts
 * @description Common utility functions
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * Generate a unique identifier
 */
export function generateId(): string {
    return uuidv4();
}

/**
 * Deep clone an object
 */
export function deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
}

/**
 * Safe JSON parse with error handling
 */
export function safeJsonParse<T>(value: string): T | null {
    try {
        return JSON.parse(value) as T;
    } catch {
        return null;
    }
}

/**
 * Check if a value is a plain object
 */
export function isPlainObject(value: unknown): boolean {
    return typeof value === 'object' 
        && value !== null 
        && !Array.isArray(value)
        && Object.getPrototypeOf(value) === Object.prototype;
}

/**
 * Safely get a nested object property
 */
export function getNestedValue<T>(obj: any, path: string, defaultValue: T): T {
    const value = path.split('.').reduce((acc, part) => acc && acc[part], obj);
    return value === undefined ? defaultValue : value;
}

/**
 * Wait for a specified duration
 */
export function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry an async operation with backoff
 */
export async function retryWithBackoff<T>(
    operation: () => Promise<T>,
    retries: number = 3,
    backoff: number = 300
): Promise<T> {
    try {
        return await operation();
    } catch (error) {
        if (retries === 0) throw error;
        await delay(backoff);
        return retryWithBackoff(operation, retries - 1, backoff * 2);
    }
}
