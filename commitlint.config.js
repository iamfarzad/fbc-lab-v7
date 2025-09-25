module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Customize rules for F.B/c Lab V7
    'type-enum': [
      2,
      'always',
      [
        'feat',     // New features
        'fix',      // Bug fixes
        'docs',     // Documentation changes
        'style',    // Code style changes (formatting, etc.)
        'refactor', // Code refactoring
        'perf',     // Performance improvements
        'test',     // Adding or updating tests
        'chore',    // Maintenance tasks
        'ci',       // CI/CD changes
        'build',    // Build system changes
        'revert',   // Reverting changes
        'gemini',   // Gemini API specific changes
        'vercel',   // Vercel deployment changes
        'admin',    // Admin dashboard changes
        'chat',     // Chat interface changes
        'ui',       // UI component changes
        'api',      // API changes
        'db',       // Database changes
        'auth',     // Authentication changes
        'security', // Security improvements
        'config',   // Configuration changes
      ],
    ],
    'type-case': [2, 'always', 'lower-case'],
    'type-empty': [2, 'never'],
    'scope-case': [2, 'always', 'lower-case'],
    'subject-case': [2, 'always', 'sentence-case'],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'header-max-length': [2, 'always', 100],
    'body-leading-blank': [1, 'always'],
    'footer-leading-blank': [1, 'always'],
  },
  prompt: {
    questions: {
      type: {
        description: "Select the type of change that you're committing:",
        enum: {
          feat: {
            description: 'A new feature',
            title: 'Features',
            emoji: '✨',
          },
          fix: {
            description: 'A bug fix',
            title: 'Bug Fixes',
            emoji: '🐛',
          },
          docs: {
            description: 'Documentation only changes',
            title: 'Documentation',
            emoji: '📚',
          },
          style: {
            description: 'Changes that do not affect the meaning of the code',
            title: 'Styles',
            emoji: '💎',
          },
          refactor: {
            description: 'A code change that neither fixes a bug nor adds a feature',
            title: 'Code Refactoring',
            emoji: '📦',
          },
          perf: {
            description: 'A code change that improves performance',
            title: 'Performance Improvements',
            emoji: '🚀',
          },
          test: {
            description: 'Adding missing tests or correcting existing tests',
            title: 'Tests',
            emoji: '🚨',
          },
          build: {
            description: 'Changes that affect the build system or external dependencies',
            title: 'Builds',
            emoji: '🛠',
          },
          ci: {
            description: 'Changes to our CI configuration files and scripts',
            title: 'Continuous Integrations',
            emoji: '⚙️',
          },
          chore: {
            description: 'Other changes that don\'t modify src or test files',
            title: 'Chores',
            emoji: '♻️',
          },
          revert: {
            description: 'Reverts a previous commit',
            title: 'Reverts',
            emoji: '🗑',
          },
          gemini: {
            description: 'Gemini API integration changes',
            title: 'Gemini API',
            emoji: '🤖',
          },
          vercel: {
            description: 'Vercel deployment changes',
            title: 'Vercel',
            emoji: '▲',
          },
          admin: {
            description: 'Admin dashboard changes',
            title: 'Admin',
            emoji: '👨‍💼',
          },
          chat: {
            description: 'Chat interface changes',
            title: 'Chat',
            emoji: '💬',
          },
          ui: {
            description: 'UI component changes',
            title: 'UI',
            emoji: '🎨',
          },
          api: {
            description: 'API changes',
            title: 'API',
            emoji: '🔌',
          },
          db: {
            description: 'Database changes',
            title: 'Database',
            emoji: '🗄️',
          },
          auth: {
            description: 'Authentication changes',
            title: 'Auth',
            emoji: '🔐',
          },
          security: {
            description: 'Security improvements',
            title: 'Security',
            emoji: '🛡️',
          },
          config: {
            description: 'Configuration changes',
            title: 'Config',
            emoji: '⚙️',
          },
        },
      },
      scope: {
        description: 'What is the scope of this change (e.g. component or file name)',
      },
      subject: {
        description: 'Write a short, imperative tense description of the change',
      },
      body: {
        description: 'Provide a longer description of the change',
      },
      isBreaking: {
        description: 'Are there any breaking changes?',
      },
      breakingBody: {
        description: 'A BREAKING CHANGE commit requires a body. Please enter a longer description of the commit itself',
      },
      breaking: {
        description: 'Describe the breaking changes',
      },
      isIssueAffected: {
        description: 'Does this change affect any open issues?',
      },
      issuesBody: {
        description: 'If issues are closed, the commit requires a body. Please enter a longer description of the commit itself',
      },
      issues: {
        description: 'Add issue references (e.g. "fix #123", "re #123".)',
      },
    },
  },
};
