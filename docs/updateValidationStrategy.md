# Validation Strategy Update Plan

## Overview
This document outlines the step-by-step plan for streamlining the validation services in the KaibanJS project. The goal is to create a unified validation approach that reduces code duplication and provides clear separation of concerns.

## Affected Files
1. Core System:
   - src/managers/core/validationManager.ts (new)
   - src/managers/core/coreManager.ts
   - src/managers/core/statusValidator.ts
   - src/managers/core/metrics/utils/metricValidation.ts
   - src/managers/core/metrics/utils/resourceMetricsUtils.ts

2. Domain System:
   - src/managers/domain/agent/agentValidator.ts
   - src/managers/domain/agent/validation/validationRules.ts

3. Types:
   - src/types/common/validationTypes.ts (update)

## Implementation Steps

### Phase 1: Core Infrastructure (Sprint 1)

1. Create ValidationManager
   - Implement core validation service
   - Add rule management system
   - Add caching mechanism
   - Add metrics tracking integration

2. Update CoreManager
   - Add ValidationManager as core service
   - Update validate() method to use ValidationManager
   - Add validation utility methods

3. Update Common Types
   - Create IValidationRule interface
   - Update IValidationResult interface
   - Add validation context types

### Phase 2: Status Validation Integration (Sprint 1)

1. Update StatusValidator
   - Migrate to use ValidationManager
   - Convert status rules to ValidationManager rules
   - Update validation methods to use new infrastructure
   - Keep status-specific logic

2. Update TransitionRules
   - Convert to use ValidationManager rule format
   - Update rule registration process
   - Maintain backward compatibility

### Phase 3: Metrics Validation Integration (Sprint 2)

1. Update MetricValidation
   - Move validation logic to ValidationManager rules
   - Update metric-specific validation methods
   - Integrate with new validation system

2. Update ResourceMetricsUtils
   - Mark deprecated methods
   - Add migration path to new validation system
   - Plan removal timeline

### Phase 4: Domain Integration (Sprint 2)

1. Update AgentValidator
   - Integrate with ValidationManager
   - Convert agent rules to ValidationManager format
   - Keep agent-specific validation logic
   - Update validation methods

2. Update ValidationRules
   - Convert to use ValidationManager rule format
   - Update rule registration
   - Maintain domain-specific logic

## Deprecation Strategy

### Phase 1: Marking (Sprint 1)
1. Mark old validation methods with @deprecated tag
2. Add JSDoc comments with migration instructions
3. Update error messages to suggest new methods

Example:
```typescript
/** @deprecated Use ValidationManager.validate() instead. See docs/validation.md */
public async validateMetrics(): Promise<boolean> {
    console.warn('Deprecated: Use ValidationManager.validate() instead');
    // ...
}
```

### Phase 2: Soft Deprecation (Sprint 2)
1. Log warnings when deprecated methods are used
2. Maintain functionality but discourage use
3. Update documentation to highlight new methods

### Phase 3: Hard Deprecation (Sprint 3)
1. Make deprecated methods throw errors in development
2. Keep stub implementations in production
3. Plan complete removal timeline

### Phase 4: Removal (Sprint 4)
1. Remove deprecated methods
2. Clean up old validation code
3. Update all dependent code

## Migration Guide

### For Developers
1. Replace direct validation calls with ValidationManager
2. Convert custom validation rules to new format
3. Update validation context usage
4. Remove deprecated method calls

Example:
```typescript
// Old way
const isValid = await this.validateMetrics(metrics);

// New way
const result = await this.validationManager.validate(metrics, {
    operation: 'validateMetrics',
    component: this.constructor.name
});
```

### For Domain Managers
1. Inject ValidationManager in constructor
2. Register domain-specific rules
3. Use validation context for domain info
4. Update error handling

## Testing Strategy

1. Unit Tests
   - Test core validation functionality
   - Test rule management
   - Test caching mechanism
   - Test metrics integration

2. Integration Tests
   - Test status validation integration
   - Test metrics validation integration
   - Test domain validation integration

3. Migration Tests
   - Test deprecated method warnings
   - Test migration paths
   - Test backward compatibility

## Timeline

- Sprint 1 (2 weeks):
  - Core infrastructure
  - Status validation integration
  - Initial deprecation marking

- Sprint 2 (2 weeks):
  - Metrics validation integration
  - Domain integration
  - Soft deprecation implementation

- Sprint 3 (2 weeks):
  - Hard deprecation implementation
  - Testing and bug fixes
  - Documentation updates

- Sprint 4 (2 weeks):
  - Code cleanup
  - Final testing
  - Production deployment

## Success Criteria

1. All validation flows use ValidationManager
2. No code duplication in validation logic
3. Clear separation of concerns
4. Improved type safety
5. Comprehensive test coverage
6. Updated documentation
7. Clean deprecation process
8. Successful production deployment
