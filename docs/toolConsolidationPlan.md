# Tool Consolidation Plan

## Current State

We currently have tool-related code in two locations:

1. Agent Domain (`managers/domain/agent/`):
```
├── toolManager.ts           (Tool lifecycle & coordination)
├── toolMetricsManager.ts    (Basic metrics collection)
├── toolExecutionManager.ts  (Tool execution)
└── toolRegistrationManager.ts (Tool registration)
```

2. Tool Domain (`managers/domain/tool/`):
```
├── toolManager.ts           (Standalone tool management)
└── toolMetricsManager.ts    (Advanced metrics & monitoring)
```

## Analysis

### Strengths in Agent Domain Implementation
- Proper service pattern integration with AgentManager
- Clean dependency management
- Proper initialization sequence
- Good error handling
- Integration with agent lifecycle

### Strengths in Tool Domain Implementation
- Advanced metrics monitoring
- Cost calculation features
- Comprehensive validation
- Detailed error tracking
- Performance monitoring

## Consolidation Plan

### 1. File Structure
Move all tool-related code to agent domain:
```
managers/domain/agent/
├── toolManager.ts           (Primary tool manager)
├── toolMetricsManager.ts    (Enhanced metrics service)
├── toolExecutionManager.ts  (Execution service)
└── toolRegistrationManager.ts (Registration service)
```

### 2. Feature Consolidation

#### 2.1 ToolManager
- Keep agent domain's service pattern
- Merge tool domain's validation system
- Keep agent domain's initialization sequence
- Add tool domain's dependency tracking
- Keep agent domain's error handling
- Add tool domain's cost calculation

#### 2.2 ToolMetricsManager
- Keep agent domain's service integration
- Add tool domain's advanced monitoring
- Add tool domain's trend analysis
- Add tool domain's cost metrics
- Keep agent domain's event emission
- Add tool domain's validation

#### 2.3 ToolExecutionManager
- Keep current implementation
- Add tool domain's performance tracking
- Add tool domain's error tracking
- Add tool domain's resource monitoring

#### 2.4 ToolRegistrationManager
- Keep current implementation
- Add tool domain's validation
- Add tool domain's dependency checks

### 3. Interface Updates

#### 3.1 IToolManager
- Add cost calculation methods
- Add dependency management
- Add performance monitoring
- Add resource tracking

#### 3.2 IToolMetricsManager
- Add trend analysis methods
- Add cost metrics
- Add monitoring thresholds
- Add validation methods

### 4. Implementation Steps

1. **Phase 1: Preparation**
   - Update interfaces with new methods
   - Create test cases for new functionality

2. **Phase 2: Core Updates**
   - Update ToolManager with merged functionality
   - Update service registration
   - Update error handling
   - Update initialization sequence

3. **Phase 3: Metrics Enhancement**
   - Update ToolMetricsManager with advanced features
   - Add cost calculation
   - Add trend analysis
   - Add performance monitoring

4. **Phase 4: Service Updates**
   - Update ToolExecutionManager
   - Update ToolRegistrationManager
   - Update service dependencies
   - Update validation

5. **Phase 5: Integration**
   - Update AgentManager integration
   - Update event handling
   - Update metrics collection
   - Update error propagation

6. **Phase 6: Cleanup**
   - Remove tool domain files
   - Update imports
   - Update documentation
   - Update tests

### 5. Testing Strategy

1. **Unit Tests**
   - Test each manager individually
   - Test new functionality
   - Test error cases
   - Test metrics collection

2. **Integration Tests**
   - Test manager interactions
   - Test agent integration
   - Test metrics flow
   - Test error handling

3. **Performance Tests**
   - Test metrics collection overhead
   - Test monitoring impact
   - Test resource usage
   - Test cost calculation

### 6. Validation Criteria

- All tests pass
- No functionality regression
- Proper error handling
- Correct metrics collection
- Proper cost calculation
- Efficient resource usage
- Clean code structure
- Updated documentation

### 7. Rollback Plan

1. Document all changes
2. Test in isolation
3. Deploy gradually
4. Monitor for issues

## Benefits

1. **Code Organization**
   - Single source of truth
   - Clear dependencies
   - Better maintainability
   - Easier testing

2. **Functionality**
   - Enhanced metrics
   - Better monitoring
   - Cost tracking
   - Performance analysis

3. **Integration**
   - Cleaner service pattern
   - Better error handling
   - Proper event flow
   - Efficient resource usage

4. **Maintenance**
   - Single update location
   - Consistent patterns
   - Clear ownership
   - Better documentation

## Timeline

1. Phase 1: 1 day
2. Phase 2: 2 days
3. Phase 3: 2 days
4. Phase 4: 1 day
5. Phase 5: 1 day
6. Phase 6: 1 day

Total: 8 working days

## Next Steps

1. Review and approve plan
2. Start with Phase 1
3. Regular progress reviews
4. Continuous testing
5. Documentation updates
