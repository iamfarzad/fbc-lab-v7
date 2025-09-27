export interface TestConfig {
  baseUrl: string;
  testTimeout: number;
  retryAttempts: number;
  headless: boolean;
  viewport: {
    width: number;
    height: number;
  };
  scenarios: TestScenario[];
}

export interface TestScenario {
  name: string;
  description: string;
  type: 'websocket' | 'api' | 'performance' | 'react';
  enabled: boolean;
  config: WebSocketTestConfig | APITestConfig | PerformanceTestConfig | ReactTestConfig;
}

export interface WebSocketTestConfig {
  liveServerUrl: string;
  webrtcSignalingUrl: string;
  connectionTimeout: number;
  messageInterval: number;
  testMessages: TestMessage[];
}

export interface TestMessage {
  type: string;
  data: any;
}

export interface APITestConfig {
  endpoints: APIEndpoint[];
  rateLimitTest: boolean;
  authenticationTest: boolean;
}

export interface APIEndpoint {
  path: string;
  method: string;
  headers?: Record<string, string>;
  body?: any;
  expectedStatus: number;
  expectedResponse?: any;
}

export interface PerformanceTestConfig {
  metrics: string[];
  traceCategories: string[];
  networkConditions: NetworkCondition[];
  cpuThrottling: boolean;
  memoryAnalysis: boolean;
}

export interface NetworkCondition {
  name: string;
  downloadThroughput: number;
  uploadThroughput: number;
  latency: number;
}

export interface ReactTestConfig {
  maxRenders: number;
  renderTimeout: number;
  suspiciousPatterns: string[];
  monitoringInterval: number;
}

export interface TestResult {
  scenario: string;
  passed: boolean;
  duration: number;
  error?: string;
  details?: any;
  timestamp: Date;
}

export interface WebSocketTestResult extends TestResult {
  connectionTime?: number;
  messageLatency?: number;
  messagesSent: number;
  messagesReceived: number;
  connectionErrors: string[];
}

export interface APITestResult extends TestResult {
  endpoint: string;
  responseTime: number;
  statusCode: number;
  responseBody?: any;
  rateLimited?: boolean;
  authenticated?: boolean;
}

export interface PerformanceTestResult extends TestResult {
  metrics: Record<string, number>;
  memoryUsage: {
    used: number;
    total: number;
    percentage: number;
  };
  cpuUsage: number;
  networkMetrics: {
    requests: number;
    transferred: number;
    timing: Record<string, number>;
  };
}

export interface ReactTestResult extends TestResult {
  renderCount: number;
  componentUpdates: number;
  stateUpdates: number;
  effectRuns: number;
  infiniteLoopDetected: boolean;
  performanceMetrics: {
    renderTime: number;
    commitTime: number;
    totalTime: number;
  };
}

export interface ErrorScenario {
  name: string;
  description: string;
  setup: () => Promise<void>;
  teardown: () => Promise<void>;
  expectedBehavior: string;
}

export interface TestReport {
  id: string;
  timestamp: Date;
  duration: number;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  results: TestResult[];
  summary: {
    overallSuccess: boolean;
    criticalIssues: string[];
    recommendations: string[];
  };
}
