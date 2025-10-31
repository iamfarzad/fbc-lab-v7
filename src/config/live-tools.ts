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

export const ADMIN_LIVE_FUNCTION_DECLARATIONS = [
  {
    name: 'get_dashboard_stats',
    description: 'Get the latest dashboard statistics including total leads, conversion rate, average lead score, engagement rate, and other key metrics. Use this when asked about dashboard stats, latest numbers, or current metrics.',
    parameters: {
      type: 'object',
      properties: {
        period: {
          type: 'string',
          description: 'Time period for stats: "1d", "7d", "30d", or "90d". Defaults to "7d".',
          enum: ['1d', '7d', '30d', '90d'],
        },
      },
    },
  },
] as const;

export type LiveFunctionDeclaration = (typeof LIVE_FUNCTION_DECLARATIONS)[number];
export type AdminLiveFunctionDeclaration = (typeof ADMIN_LIVE_FUNCTION_DECLARATIONS)[number];
