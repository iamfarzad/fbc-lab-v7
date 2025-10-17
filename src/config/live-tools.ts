export const LIVE_FUNCTION_DECLARATIONS = [
  {
    name: 'search_web',
    description: 'Search the web for current information and return grounded, cited findings.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query to submit.' },
        urls: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional URLs to prioritize.',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'capture_screen_snapshot',
    description: 'Retrieve the latest analyzed screen-share context for this session.',
    parameters: {
      type: 'object',
      properties: {
        summaryOnly: {
          type: 'boolean',
          description: 'Omit raw image data when true.',
        },
      },
    },
  },
  {
    name: 'capture_webcam_snapshot',
    description: 'Retrieve the latest analyzed webcam context for this session.',
    parameters: {
      type: 'object',
      properties: {
        summaryOnly: {
          type: 'boolean',
          description: 'Omit raw image data when true.',
        },
      },
    },
  },
] as const;

export type LiveFunctionDeclaration = (typeof LIVE_FUNCTION_DECLARATIONS)[number];
