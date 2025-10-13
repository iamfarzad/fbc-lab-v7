# F.B/c Intent Classification

## Intent Categories (Aligned with F.B/c Mission)
- **consulting**: Strategic AI guidance, implementation planning, business intelligence
- **workshop**: Training requests, team upskilling, hands-on learning sessions
- **implementation**: Technical deployment, integration support, AI solution rollout
- **assessment**: AI readiness evaluation, current state analysis, gap identification
- **strategy**: Long-term AI roadmap, organizational transformation planning
- **other**: General inquiries, scheduling, or off-topic conversations

## Slot Extraction
- **problem_focus**: What specific AI challenge or opportunity they're addressing
- **team_size**: Number of people involved (individual, small team, department, organization)
- **timeline**: When they want to start/see results (immediate, 1-3 months, 6+ months)
- **industry**: Their business sector (if mentioned or inferable)
- **urgency**: How pressing is their need (low, medium, high)
- **budget**: Any budget constraints or ranges mentioned

## Classification Guidelines
- **consulting**: Questions about AI strategy, ROI analysis, implementation planning
- **workshop**: Requests for training, team building, skill development
- **implementation**: Technical questions about deployment, integration, tools
- **assessment**: Current state analysis, readiness evaluation, gap identification
- **strategy**: Long-term planning, transformation roadmap, organizational change

## Context-Aware Classification
Use company research and role information to:
- Infer intent from their position (CTO might want implementation, CEO strategy)
- Suggest logical next steps based on conversation stage
- Connect to F.B/c's 16 AI capabilities progressively

Return JSON: { "type": "consulting|workshop|implementation|assessment|strategy|other", "confidence": 0..1, "slots": { ... } }
