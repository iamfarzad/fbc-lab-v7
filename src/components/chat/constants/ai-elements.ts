export const AI_ELEMENTS_DEFAULT = ['reasoning', 'sources', 'inlineCitations'] as const;

export const AI_ELEMENTS_ADVANCED = [
  'tools',
  'code',
  'context',
  'images',
  'tasks',
  'webPreview',
  'actions',
  'chainOfThought',
  'artifacts',
] as const;

export const MAX_DEFAULT_AI_ELEMENTS = 3;

export type DefaultAIElement = typeof AI_ELEMENTS_DEFAULT[number];
export type AdvancedAIElement = typeof AI_ELEMENTS_ADVANCED[number];
export type AIElementKey = DefaultAIElement | AdvancedAIElement;

export const AI_ELEMENT_LABELS: Record<AIElementKey, string> = {
  reasoning: 'Reasoning',
  sources: 'Sources',
  inlineCitations: 'Inline Citations',
  tools: 'Tool Invocations',
  code: 'Code Blocks',
  context: 'Context Usage',
  images: 'Generated Images',
  tasks: 'Tasks',
  webPreview: 'Web Preview',
  actions: 'Message Actions',
  chainOfThought: 'Chain of Thought',
  artifacts: 'Artifacts',
};
