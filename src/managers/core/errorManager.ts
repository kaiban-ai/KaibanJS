import { CoreManager } from './coreManager';
import { MANAGER_CATEGORY_enum } from '../../types/common/enumTypes';
import type { IMetricEvent } from '../../types/metrics/base/metricTypes';
import { METRIC_DOMAIN_enum, METRIC_TYPE_enum } from '../../types/metrics/base/metricEnums';

export class ErrorManager extends CoreManager {
    public readonly category = MANAGER_CATEGORY_enum.CORE;
    private readonly errors: Map<string, Error[]>;
    private readonly maxErrorsPerComponent = 1000;

    private constructor() {
        super();
        this.errors = new Map();
    }

    private static instance: ErrorManager | null = null;

    public static getInstance(): ErrorManager {
        if (!ErrorManager.instance) {
            ErrorManager.instance = new ErrorManager();
        }
        return ErrorManager.instance;
    }

    public async handleError(error: Error, component?: string): Promise<void> {
        const timestamp = Date.now();
        const errorComponent = component || 'system';

        // Store error
        let componentErrors = this.errors.get(errorComponent);
        if (!componentErrors) {
            componentErrors = [];
            this.errors.set(errorComponent, componentErrors);
        }

        componentErrors.push(error);
        if (componentErrors.length > this.maxErrorsPerComponent) {
            componentErrors.shift();
        }

        // Track error metric
        const metric: IMetricEvent = {
            timestamp,
            domain: METRIC_DOMAIN_enum.SYSTEM,
            type: METRIC_TYPE_enum.ERROR,
            value: 1,
            metadata: {
                component: errorComponent,
                error: error.message,
                stack: error.stack,
                name: error.name
            }
        };

        await this.metricsManager.trackMetric(metric);
    }

    public getErrors(component: string): Error[] {
        return this.errors.get(component) || [];
    }

    public clearErrors(component: string): void {
        this.errors.delete(component);
    }

    public clearAllErrors(): void {
        this.errors.clear();
    }
}

export default ErrorManager.getInstance();
