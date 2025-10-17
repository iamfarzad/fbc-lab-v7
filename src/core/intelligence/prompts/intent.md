# F.B/c Intent Classification

## Intent Categories (Aligned with F.B/c Mission)
- **consulting**: Strategic AI guidance, implementation planning, business intelligence
- **workshop**: Training requests, team upskilling, hands-on learning sessions
- **implementation**: Technical deployment, integration support, AI solution rollout
- **assessment**: AI readiness evaluation, current state analysis, gap identification
- **strategy**: Long-term AI roadmap, organizational transformation planning
- **scheduling**: Explicit requests to book calls, meetings, or workshops (HIGH PRIORITY)
- **wrapping_up**: User wants to conclude discovery and move to next steps (HIGH PRIORITY)
- **frustration**: User shows signs of impatience or annoyance (CRITICAL PRIORITY)
- **minimal_response**: Non-answers like "nothing", "I don't know", single words (MEDIUM PRIORITY)
- **other**: General inquiries or off-topic conversations

## Slot Extraction
- **problem_focus**: What specific AI challenge or opportunity they're addressing
- **team_size**: Number of people involved (individual, small team, department, organization)
- **timeline**: When they want to start/see results (immediate, 1-3 months, 6+ months)
- **industry**: Their business sector (if mentioned or inferable)
- **urgency**: How pressing is their need (low, medium, high)
- **budget**: Any budget constraints or ranges mentioned
- **exit_attempt_count**: Number of times user tried to exit (0-5)
- **frustration_level**: low | medium | high | critical
- **booking_readiness**: Confidence score 0-1 indicating readiness to schedule
- **conversation_velocity**: Response time analysis (fast = engaged, slow = losing interest)

## Classification Guidelines
- **consulting**: Questions about AI strategy, ROI analysis, implementation planning
- **workshop**: Requests for training, team building, skill development
- **implementation**: Technical questions about deployment, integration, tools
- **assessment**: Current state analysis, readiness evaluation, gap identification
- **strategy**: Long-term planning, transformation roadmap, organizational change
- **scheduling**: "Let's book", "schedule a call", "set up a meeting", "calendar", "when can we"
- **wrapping_up**: "Let's wrap up", "that's enough", "move on", "wrap it up", "move forward"
- **frustration**: "Stop asking", "I don't want to answer", profanity, "this is ridiculous", "enough already"
- **minimal_response**: "Nothing", "nope", "no", "not sure", "I don't know", single-word answers

## Context-Aware Classification
Use company research and role information to:
- Infer intent from their position (CTO might want implementation, CEO strategy)
- Suggest logical next steps based on conversation stage
- Connect to F.B/c's 16 AI capabilities progressively

Return JSON: { "type": "consulting|workshop|implementation|assessment|strategy|scheduling|wrapping_up|frustration|minimal_response|other", "confidence": 0..1, "slots": { ... } }

## Priority Actions
- **scheduling**: Bypass all discovery, trigger calendar widget immediately
- **wrapping_up**: Provide recap and offer booking
- **frustration**: Apologize immediately, skip to booking
- **minimal_response**: Stop drilling, offer to switch topics
