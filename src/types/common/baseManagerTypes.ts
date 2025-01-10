/**
 * @file baseManagerTypes.ts
 * @description Base types for all manager implementations
 */

export interface IBaseManager<T> {
    /**
     * The category of this manager
     */
    category: string;

    /**
     * Initialize the manager
     */
    initialize(): Promise<void>;

    /**
     * Validate the manager's state
     */
    validate(): Promise<boolean>;

    /**
     * Get metadata about the manager
     */
    getMetadata(): T;
}
