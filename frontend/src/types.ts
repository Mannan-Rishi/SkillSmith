export interface TestAssertion {
  assertion_type: string;
  expected: any;
  target_field?: string;
}

export interface TestCase {
  id: string;
  name: string;
  description: string;
  input_data: Record<string, any>;
  expected_behavior: string;
  assertions: TestAssertion[];
  is_edge_case: boolean;
}

export interface AssertionResult {
  assertion_type: string;
  expected: any;
  target_field?: string;
  passed: boolean;
  message: string;
  is_evaluator_error?: boolean;
}

export interface TestResult {
  test_id: string;
  test_name: string;
  passed: boolean;
  actual_output: any;
  error_message?: string;
  execution_time_ms: number;
  assertion_results: AssertionResult[];
}

export interface ExecutionRun {
  run_id: string;
  skill_id: string;
  version: string;
  timestamp: number;
  status: string;
  passed_count: number;
  failed_count: number;
  total_tests: number;
  pass_rate: number;
  test_results: TestResult[];
  logs: string[];
}

export interface ImprovementRecord {
  iteration: number;
  previous_version: string;
  new_version: string;
  failure_analysis: string;
  changes_made: string;
  before_pass_rate: number;
  after_pass_rate: number;
  improved: boolean;
  regression_detected: boolean;
  decision?: 'accepted' | 'rejected';
  decision_reason?: string;
  fixed_tests?: string[];
  regressed_tests?: string[];
  remaining_issues: string[];
  timestamp: number;
}

export interface CustomExecutionRequest {
  inputs: Record<string, any>;
  expected_output?: any;
  version?: string;
}

export interface CustomExecutionResponse {
  success: boolean;
  output: any;
  error?: string;
  logs: string;
  execution_time_ms: number;
  version: string;
  matches_expected?: boolean;
  comparison_details?: string;
}

export interface SaveTestCaseRequest {
  name: string;
  description?: string;
  input_data: Record<string, any>;
  expected_output?: any;
  expected_behavior?: string;
  is_edge_case?: boolean;
  assertion_type?: string;
  target_field?: string;
}

export interface AppSettings {
  auto_evolve_on_failure: boolean;
  max_evolution_iterations: number;
}

export interface SkillManifest {
  name: string;
  slug: string;
  description: string;
  category: string;
  version: string;
  parent_version?: string;
  author: string;
  inputs: Record<string, any>;
  outputs: Record<string, any>;
  dependencies: string[];
  execution_strategy: string;
  safety_requirements: string[];
  code?: string;
}

export interface SkillVersion {
  version: string;
  parent_version?: string;
  manifest: SkillManifest;
  skill_md: string;
  code?: string;
  created_at: number;
  latest_run?: ExecutionRun;
}

export interface Skill {
  id: string;
  name: string;
  category: string;
  current_version: string;
  versions: Record<string, SkillVersion>;
  test_cases: TestCase[];
  runs: ExecutionRun[];
  improvements: ImprovementRecord[];
  created_at: number;
  updated_at: number;
}

export interface HealthInfo {
  status: string;
  service: string;
  provider?: string;
  model: string;
  key_configured: boolean;
  key_masked: string;
  provider_endpoint: string;
}

export interface ModelVerifyInfo {
  status: 'connected' | 'auth_error' | 'unconfigured' | 'error' | 'connection_failed';
  provider?: string;
  model: string;
  base_url: string;
  key_masked: string;
  message: string;
  status_code?: number;
  response?: string;
}
