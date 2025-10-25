# Workflow Implementation Guide

## Overview

This document describes the implementation of the Vercel Workflow system for the F.B/c multimodal sales funnel. The workflow system replaces the existing multi-agent architecture with a more scalable, maintainable, and observable solution.

## Architecture

### Core Components

1. **Workflow Engine** (`lib/workflow/engine.ts`)
   - Central orchestration engine
   - Manages workflow execution and state
   - Handles agent routing and context management

2. **Workflow Functions** (`lib/workflow/functions.ts`)
   - Individual workflow steps as functions
   - Modular, testable components
   - Easy to extend and modify

3. **Workflow Types** (`lib/workflow/types.ts`)
   - TypeScript interfaces for workflow system
   - Ensures type safety across the system

4. **API Endpoints**
   - `/api/workflow/trigger` - Main workflow trigger
   - `/api/workflow/test` - Testing endpoint
   - `/api/workflow/health` - Health monitoring

### Workflow Definition

The workflow is defined in `workflows/fbc-sales-funnel.yaml`:

```yaml
name: fbc-sales-funnel
version: 1.0.0
description: F.B/c multimodal sales funnel workflow

triggers:
  - type: webhook
    path: /api/workflow/trigger
    method: POST

steps:
  - id: receive-input
    type: function
    function: receive-multimodal-input
    timeout: 30s
    
  - id: load-context
    type: function
    function: load-conversation-context
    depends_on: [receive-input]
    
  - id: determine-stage
    type: function
    function: determine-funnel-stage
    depends_on: [load-context]
    
  - id: route-agent
    type: switch
    condition: ${steps.determine-stage.output.stage}
    cases:
      - case: DISCOVERY
        step: discovery-agent
      - case: SCORING
        step: scoring-agent
      # ... more cases
```

## Implementation Details

### Workflow Execution Flow

1. **Input Reception**: Receive multimodal input from client
2. **Context Loading**: Load conversation context from storage
3. **Stage Determination**: Determine current funnel stage
4. **Agent Routing**: Route to appropriate specialized agent
5. **Context Update**: Update conversation context
6. **Response Sending**: Send response back to client

### Agent Implementation

Each agent is implemented as a workflow function:

- **Discovery Agent**: Lead qualification and needs discovery
- **Scoring Agent**: Lead scoring and fit assessment
- **Workshop Sales Agent**: Workshop pitch and booking
- **Consulting Sales Agent**: Consulting pitch and booking
- **Closer Agent**: Objection handling and closing
- **Summary Agent**: Post-conversation analysis

### Context Management

The workflow system integrates with the existing `MultimodalContextManager`:

```typescript
const conversationContext = await multimodalContextManager.getConversationContext(
  context.sessionId,
  context.multimodalContext.hasRecentImages,
  context.multimodalContext.hasRecentAudio
)
```

### Multimodal Support

The workflow system maintains full multimodal capabilities:

- **Voice**: Real-time voice processing via WebSocket
- **Screen Share**: Visual analysis and context
- **Document Upload**: File processing and analysis
- **Text**: Standard text conversation

## Configuration

### Environment Variables

```bash
# Workflow Configuration
ENABLE_WORKFLOW=true
WORKFLOW_TIMEOUT=300000
WORKFLOW_MAX_RETRIES=3

# Storage Configuration
WORKFLOW_STATE_STORAGE=redis
WORKFLOW_REDIS_URL=redis://localhost:6379

# Logging Configuration
WORKFLOW_LOG_LEVEL=info
WORKFLOW_LOG_FORMAT=json
```

### Feature Flags

The system supports gradual rollout via feature flags:

```typescript
const ENABLE_WORKFLOW = process.env.ENABLE_WORKFLOW === 'true'
const ENABLE_MULTI_AGENT = process.env.ENABLE_MULTI_AGENT === 'true'
```

## Testing

### Test Endpoint

Use the test endpoint to validate workflow functionality:

```bash
curl -X POST http://localhost:3000/api/workflow/test \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-session-123",
    "message": "Hello, I need help with AI implementation"
  }'
```

### Dashboard

Access the workflow dashboard at `/workflow-dashboard` to:

- Test workflow execution
- Monitor performance metrics
- View execution logs
- Configure settings

## Migration

### Migration Script

Use the migration script to transition from the multi-agent system:

```bash
npx tsx scripts/migrate-to-workflow.ts
```

### Migration Steps

1. **Backup Data**: Ensure all conversation data is backed up
2. **Run Migration**: Execute the migration script
3. **Validate**: Verify data integrity and functionality
4. **Switch Over**: Enable workflow system via feature flag
5. **Monitor**: Watch for issues and performance

## Monitoring

### Health Checks

Monitor system health via the health endpoint:

```bash
curl http://localhost:3000/api/workflow/health
```

### Metrics

The system tracks:

- Execution count and success rate
- Average execution duration
- Agent distribution
- Stage distribution
- Error rates and types

### Logging

All workflow executions are logged with:

- Request/response data
- Execution timing
- Error details
- Context information

## Benefits

### Scalability

- **Serverless**: Automatic scaling based on demand
- **Parallel Execution**: Multiple workflows can run simultaneously
- **Resource Optimization**: Efficient resource utilization

### Maintainability

- **Modular Design**: Easy to modify individual components
- **Type Safety**: Full TypeScript support
- **Clear Separation**: Distinct responsibilities for each component

### Observability

- **Comprehensive Logging**: Detailed execution logs
- **Health Monitoring**: Real-time system health
- **Performance Metrics**: Detailed performance tracking

### Reliability

- **Error Handling**: Robust error handling and recovery
- **Retry Logic**: Automatic retry for transient failures
- **State Management**: Reliable state persistence

## Future Enhancements

### Planned Features

1. **Workflow Versioning**: Support for multiple workflow versions
2. **A/B Testing**: Built-in A/B testing capabilities
3. **Advanced Analytics**: Enhanced analytics and reporting
4. **Workflow Templates**: Reusable workflow templates
5. **Visual Editor**: Drag-and-drop workflow editor

### Integration Opportunities

1. **Vercel Analytics**: Integration with Vercel's analytics
2. **External APIs**: Support for external API calls
3. **Database Triggers**: Database-driven workflow triggers
4. **Scheduled Workflows**: Time-based workflow execution

## Troubleshooting

### Common Issues

1. **Workflow Timeout**: Increase timeout values
2. **Context Loading Failures**: Check Redis/Supabase connectivity
3. **Agent Routing Errors**: Verify stage determination logic
4. **Response Format Issues**: Check agent output formatting

### Debug Mode

Enable debug mode for detailed logging:

```bash
WORKFLOW_LOG_LEVEL=debug
```

### Support

For issues and questions:

1. Check the health endpoint
2. Review execution logs
3. Test with the test endpoint
4. Consult the dashboard metrics

## Conclusion

The workflow system provides a robust, scalable, and maintainable solution for the F.B/c multimodal sales funnel. It maintains all existing functionality while providing significant improvements in scalability, observability, and maintainability.

The system is designed for gradual migration and can coexist with the existing multi-agent system during the transition period. This ensures minimal disruption while providing a clear path to the new architecture.