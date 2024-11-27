/**
 * @file workflowValidator.ts
 * @path src/managers/domain/workflow/workflowValidator.ts
 * @description Workflow validation implementation
 *
 * @module @managers/domain/workflow
 */

import { CoreManager } from '../../core/coreManager';
import type { IStepConfig } from '../../../types/workflow/workflowTypes';

// ─── Validator Implementation ──────────────────────────────────────────────────

export class WorkflowValidator extends CoreManager {
    public async validateWorkflowSteps(steps: IStepConfig[]): Promise<void> {
        const errors: string[] = [];

        for (const step of steps) {
            if (!step.name) errors.push('Step name is required');
            if (!step.description) errors.push('Step description is required');
            if (!step.id) errors.push('Step ID is required');
            
            if (step.priority !== undefined && (step.priority < 0 || step.priority > 100)) {
                errors.push('Step priority must be between 0 and 100');
            }

            if (!step.resources) {
                errors.push('Step resources are required');
            } else {
                if (step.resources.memory < 0) errors.push('Memory requirement cannot be negative');
                if (step.resources.cpu < 0) errors.push('CPU requirement cannot be negative');
                if (step.resources.agents < 0) errors.push('Agent requirement cannot be negative');
            }

            if (!step.timeout || step.timeout < 0) {
                errors.push('Valid timeout value is required');
            }

            if (!step.retry) {
                errors.push('Retry configuration is required');
            } else {
                if (step.retry.maxAttempts < 0) errors.push('Max attempts cannot be negative');
                if (step.retry.delay < 0) errors.push('Retry delay cannot be negative');
            }

            if (!Array.isArray(step.dependencies)) {
                errors.push('Dependencies must be an array');
            }
        }

        if (errors.length > 0) {
            throw new Error(`Invalid workflow steps: ${errors.join(', ')}`);
        }
    }

    public validateStepDependencies(steps: IStepConfig[]): void {
        const stepIds = new Set(steps.map(step => step.id));
        const errors: string[] = [];

        for (const step of steps) {
            for (const depId of step.dependencies) {
                if (!stepIds.has(depId)) {
                    errors.push(`Step ${step.id} has invalid dependency: ${depId}`);
                }
            }
        }

        if (errors.length > 0) {
            throw new Error(`Invalid step dependencies: ${errors.join(', ')}`);
        }
    }

    public validateStepCycles(steps: IStepConfig[]): void {
        const visited = new Set<string>();
        const recursionStack = new Set<string>();

        const hasCycle = (stepId: string): boolean => {
            if (!visited.has(stepId)) {
                visited.add(stepId);
                recursionStack.add(stepId);

                const step = steps.find(s => s.id === stepId);
                if (step) {
                    for (const depId of step.dependencies) {
                        if (!visited.has(depId) && hasCycle(depId)) {
                            return true;
                        } else if (recursionStack.has(depId)) {
                            return true;
                        }
                    }
                }
            }
            recursionStack.delete(stepId);
            return false;
        };

        for (const step of steps) {
            if (hasCycle(step.id)) {
                throw new Error(`Cyclic dependency detected in workflow steps`);
            }
        }
    }

    public validateStepResources(steps: IStepConfig[]): void {
        const errors: string[] = [];
        const totalResources = {
            memory: 0,
            cpu: 0,
            agents: 0
        };

        for (const step of steps) {
            totalResources.memory += step.resources.memory;
            totalResources.cpu += step.resources.cpu;
            totalResources.agents += step.resources.agents;

            if (totalResources.memory > Number.MAX_SAFE_INTEGER) {
                errors.push('Total memory requirement exceeds system limits');
            }
            if (totalResources.cpu > 100) {
                errors.push('Total CPU requirement exceeds 100%');
            }
            if (totalResources.agents > 100) {
                errors.push('Total agent requirement exceeds system limits');
            }
        }

        if (errors.length > 0) {
            throw new Error(`Invalid resource requirements: ${errors.join(', ')}`);
        }
    }
}
