import { 
  Skill, ExecutionRun, HealthInfo, ModelVerifyInfo,
  CustomExecutionRequest, CustomExecutionResponse, SaveTestCaseRequest,
  TestCase, AppSettings
} from './types';

const API_BASE = '/api';

export async function fetchHealth(): Promise<HealthInfo> {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error('Failed to fetch health');
  return res.json();
}

export async function verifyModel(): Promise<ModelVerifyInfo> {
  const res = await fetch(`${API_BASE}/model/verify`);
  if (!res.ok) throw new Error('Failed to verify model');
  return res.json();
}

export async function fetchSettings(): Promise<AppSettings> {
  const res = await fetch(`${API_BASE}/settings`);
  if (!res.ok) throw new Error('Failed to fetch settings');
  return res.json();
}

export async function updateSettings(settings: AppSettings): Promise<AppSettings> {
  const res = await fetch(`${API_BASE}/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  if (!res.ok) throw new Error('Failed to update settings');
  return res.json();
}

export async function fetchSkills(): Promise<Skill[]> {
  const res = await fetch(`${API_BASE}/skills`);
  if (!res.ok) throw new Error('Failed to fetch skills');
  return res.json();
}

export async function fetchSkill(id: string): Promise<Skill> {
  const res = await fetch(`${API_BASE}/skills/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch skill ${id}`);
  return res.json();
}

export async function generateSkill(payload: {
  user_requirement: string;
  category?: string;
  inputs_description?: string;
  expected_outputs?: string;
  constraints?: string;
}): Promise<Skill> {
  const res = await fetch(`${API_BASE}/skills/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Generation failed' }));
    throw new Error(err.detail || 'Skill generation failed');
  }
  return res.json();
}

export async function runSkillTests(skillId: string, version?: string, autoEvolve?: boolean): Promise<ExecutionRun> {
  const params = new URLSearchParams();
  if (version) params.append('version', version);
  if (autoEvolve !== undefined) params.append('auto_evolve', String(autoEvolve));

  const queryStr = params.toString() ? `?${params.toString()}` : '';
  const url = `${API_BASE}/skills/${skillId}/test${queryStr}`;
  const res = await fetch(url, { method: 'POST' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Test execution failed' }));
    throw new Error(err.detail || 'Test execution failed');
  }
  return res.json();
}

export async function executeSkillCustom(skillId: string, payload: CustomExecutionRequest): Promise<CustomExecutionResponse> {
  const res = await fetch(`${API_BASE}/skills/${skillId}/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Execution failed' }));
    throw new Error(err.detail || 'Execution failed');
  }
  return res.json();
}

export async function saveSkillTestCase(skillId: string, payload: SaveTestCaseRequest): Promise<TestCase> {
  const res = await fetch(`${API_BASE}/skills/${skillId}/test-cases`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to save test case' }));
    throw new Error(err.detail || 'Failed to save test case');
  }
  return res.json();
}

export async function improveSkill(skillId: string): Promise<Skill> {
  const res = await fetch(`${API_BASE}/skills/${skillId}/improve`, { method: 'POST' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Improvement failed' }));
    throw new Error(err.detail || 'Improvement failed');
  }
  return res.json();
}

export async function exportSkill(skillId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/skills/${skillId}/export`);
  if (!res.ok) throw new Error('Failed to export skill');
  return res.json();
}

export async function deleteSkill(skillId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/skills/${skillId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete skill');
}
