import { MetricsManager } from './metricsManager';
import { MANAGER_CATEGORY_enum } from '../../types/common/enumTypes';
import type { IBaseManager } from '../../types/common/baseManagerTypes';

export abstract class CoreManager implements IBaseManager<unknown> {
    public abstract readonly category: MANAGER_CATEGORY_enum;
    protected readonly metricsManager: MetricsManager;
    protected readonly domainManagers: Map<string, IBaseManager<unknown>>;

    protected constructor() {
        this.metricsManager = MetricsManager.getInstance();
        this.domainManagers = new Map();
        this.registerDomainManager('MetricsManager', this.metricsManager);
    }

    public async initialize(): Promise<void> {
        // Base initialization logic
    }

    public async validate(): Promise<boolean> {
        // Basic validation - can be overridden by derived classes
        return true;
    }

    public getMetadata(): Record<string, unknown> {
        return {
            category: this.category,
            registeredManagers: Array.from(this.domainManagers.keys())
        };
    }

    protected registerDomainManager<T>(name: string, manager: IBaseManager<T>): void {
        if (this.domainManagers.has(name)) {
            throw new Error(`Manager already registered: ${name}`);
        }
        this.domainManagers.set(name, manager);
    }

    protected getDomainManager<T>(name: string): IBaseManager<T> {
        const manager = this.domainManagers.get(name);
        if (!manager) {
            throw new Error(`Manager not found: ${name}`);
        }
        return manager as IBaseManager<T>;
    }
}
