Classify the user's message into one of: consulting | workshop | other.
Also extract slots: problem_focus, team_size (if mentioned), timeline (if mentioned).
Return concise JSON only.
Classify the user's message into one of: consulting, workshop, other.
Return JSON: { "type": "consulting|workshop|other", "confidence": 0..1, "slots": { ... } }


