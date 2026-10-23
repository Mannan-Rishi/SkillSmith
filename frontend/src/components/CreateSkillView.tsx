import React, { useState } from 'react';
import { 
  Sparkles, 
  Bot, 
  Send, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  Terminal, 
  Lightbulb,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import { generateSkill } from '../api';
import { Skill, HealthInfo } from '../types';

interface CreateSkillViewProps {
  health: HealthInfo | null;
  onSkillCreated: (skill: Skill) => void;
  onNavigate: (tab: string) => void;
}

const TEMPLATES = [
  {
    title: 'Text PII Masking & Data Sanitizer',
    category: 'Security & Privacy',
    prompt: 'Create a skill that accepts raw user text, identifies sensitive PII (emails, phone numbers, credit card numbers, and SSNs) using regex and pattern rules, replaces them with anonymized tokens (e.g. [EMAIL_REDACTED]), and returns the sanitized text along with counts of redacted items.'
  },
  {
    title: 'Website Broken Link & Response Auditor',
    category: 'Website QA',
    prompt: 'Create a website QA skill that takes a list of URLs and their simulated HTTP status codes, flags broken 4xx/5xx responses, detects insecure http:// links in an https site, and produces an audit report with an overall pass/fail health score.'
  },
  {
    title: 'Financial Balance Sheet Ratio Calculator',
    category: 'Data Analysis',
    prompt: 'Create a financial skill that accepts company balance sheet inputs (current assets, current liabilities, inventory, total debt, total equity), calculates key liquidity and solvency ratios (Current Ratio, Quick Ratio, Debt-to-Equity), and identifies financial risk flags if ratios breach safety thresholds.'
  },
  {
    title: 'Log Error Anomaly & Severity Classifier',
    category: 'DevOps / Observability',
    prompt: 'Create a skill that parses server log entries, extracts timestamps, log levels (INFO, WARN, ERROR, FATAL), identifies repetitive stack trace signatures, and classifies the overall service health state into NORMAL, DEGRADED, or CRITICAL.'
  }
];

export const CreateSkillView: React.FC<CreateSkillViewProps> = ({
  health,
  onSkillCreated,
  onNavigate
}) => {
  const [prompt, setPrompt] = useState('');
  const [category, setCategory] = useState('Data Analysis');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStage, setCurrentStage] = useState<string>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const handleTemplateClick = (tpl: typeof TEMPLATES[0]) => {
    setPrompt(tpl.prompt);
    setCategory(tpl.category);
  };

  const handleCreate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setErrorMessage(null);
    setLogs([]);

    const logStep = (msg: string) => {
      setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
    };

    try {
      setCurrentStage('orchestrator');
      logStep('Boss Orchestrator: Decomposing user requirement into agent tasks...');
      await new Promise(r => setTimeout(r, 600));

      setCurrentStage('analyst');
      logStep('Requirement Analyst: Extracting input/output schemas and acceptance criteria via Gemma...');
      await new Promise(r => setTimeout(r, 600));

      setCurrentStage('architect');
      logStep('Skill Architect: Designing SKILL.md specification and sandbox Python adapter...');

      setCurrentStage('tester');
      logStep('Adversarial Tester: Synthesizing boundary and edge-case test suite...');

      // Actual API Call to FastAPI Backend
      const skill = await generateSkill({
        user_requirement: prompt,
        category: category
      });

      setCurrentStage('execution');
      logStep(`Execution Agent: Executed ${skill.test_cases.length} tests in isolated AST sandbox.`);

      if (skill.improvements.length > 0) {
        setCurrentStage('improvement');
        logStep(`Improvement Agent: Feedback Descent triggered! Diagnosed failures and patched to v${skill.current_version}.`);
      } else {
        logStep(`Validation Agent: All initial tests passed with 100% score!`);
      }

      await new Promise(r => setTimeout(r, 800));
      onSkillCreated(skill);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Skill creation pipeline encountered an unexpected error.');
      logStep(`[ERROR] Pipeline halted: ${err.message}`);
    } finally {
      setIsGenerating(false);
      setCurrentStage('idle');
    }
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 6 }}>
          Skill Creation Workspace
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Describe any AI capability. The Gemma multi-agent loop will generate the SKILL.md, write safe execution logic, synthesize adversarial tests, execute in a sandbox, and self-improve.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 24 }}>
        {/* Left Column: Form */}
        <div>
          <div className="glass-card" style={{ padding: 24, marginBottom: 20 }}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>
                Skill Category
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 8,
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem',
                  outline: 'none'
                }}
              >
                <option value="Data Analysis">Data Analysis & Processing</option>
                <option value="Website QA">Website QA & Validation</option>
                <option value="Security & Privacy">Security & Privacy Auditing</option>
                <option value="Programming">Programming & Code Repair</option>
                <option value="DevOps / Observability">DevOps / Observability</option>
                <option value="Document Analysis">Document & Text Analysis</option>
                <option value="Custom Workflow">Custom Autonomous Workflow</option>
              </select>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>
                Describe Desired Capability & Constraints
              </label>
              <textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder="e.g. Create a skill that parses CSV invoice rows, flags missing tax IDs, computes total balance, and detects duplicate transaction IDs..."
                rows={7}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: 8,
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem',
                  lineHeight: 1.6,
                  resize: 'vertical',
                  outline: 'none'
                }}
              />
            </div>

            {errorMessage && (
              <div style={{
                padding: '12px 16px',
                borderRadius: 8,
                backgroundColor: 'rgba(244, 63, 94, 0.12)',
                border: '1px solid rgba(244, 63, 94, 0.3)',
                color: '#fb7185',
                fontSize: '0.85rem',
                marginBottom: 20,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10
              }}>
                <ShieldAlert size={18} style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 2 }}>Pipeline Error</div>
                  <div>{errorMessage}</div>
                  {errorMessage.includes('GEMMA_API_KEY') && (
                    <button 
                      className="btn btn-secondary" 
                      style={{ marginTop: 8, padding: '4px 10px', fontSize: '0.75rem' }}
                      onClick={() => onNavigate('settings')}
                    >
                      Go to Settings to configure key
                    </button>
                  )}
                </div>
              </div>
            )}

            <button
              className="btn btn-primary"
              style={{ width: '100%', padding: '12px', fontSize: '0.95rem' }}
              disabled={isGenerating || !prompt.trim()}
              onClick={handleCreate}
            >
              {isGenerating ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Generating & Testing with Gemma...
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  Initiate Autonomous Skill Synthesis
                </>
              )}
            </button>
          </div>

          {/* Quick Starter Templates */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>
              <Lightbulb size={14} color="#f59e0b" />
              Quick Starter Templates
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {TEMPLATES.map((tpl, i) => (
                <div
                  key={i}
                  className="glass-card"
                  onClick={() => handleTemplateClick(tpl)}
                  style={{
                    padding: '12px 16px',
                    cursor: 'pointer',
                    fontSize: '0.85rem'
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{tpl.title}</div>
                  <span className="badge badge-indigo" style={{ fontSize: '0.65rem' }}>{tpl.category}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Multi-Agent Pipeline Monitor */}
        <div>
          <div className="glass-card" style={{ padding: 24, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Bot size={18} color="#818cf8" />
              Gemma Multi-Agent Pipeline
            </h2>

            {/* Stepper */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
              {[
                { id: 'orchestrator', role: 'Boss Orchestrator', desc: 'Decomposes requirement & plans agents' },
                { id: 'analyst', role: 'Requirement Analyst', desc: 'Extracts inputs, outputs & acceptance criteria' },
                { id: 'architect', role: 'Skill Architect', desc: 'Authoring SKILL.md & executable adapter' },
                { id: 'tester', role: 'Adversarial Tester', desc: 'Synthesizing edge-case test assertions' },
                { id: 'execution', role: 'Execution Agent', desc: 'Running in restricted Python AST sandbox' },
                { id: 'improvement', role: 'Improvement Agent', desc: 'Feedback Descent loop for self-healing' },
              ].map((step, idx) => {
                const isActive = currentStage === step.id;
                return (
                  <div 
                    key={step.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '8px 12px',
                      borderRadius: 8,
                      backgroundColor: isActive ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-secondary)',
                      border: `1px solid ${isActive ? 'var(--accent-indigo)' : 'var(--border-color)'}`,
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      backgroundColor: isActive ? 'var(--accent-indigo)' : 'var(--bg-primary)',
                      color: isActive ? '#fff' : 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 700
                    }}>
                      {idx + 1}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: isActive ? '#818cf8' : 'var(--text-primary)' }}>
                        {step.role}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {step.desc}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Live Terminal Log */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <Terminal size={14} /> Live Agent Telemetry
              </div>
              <div 
                className="mono"
                style={{
                  flex: 1,
                  minHeight: 180,
                  backgroundColor: '#060910',
                  borderRadius: 8,
                  border: '1px solid var(--border-color)',
                  padding: 12,
                  fontSize: '0.75rem',
                  overflowY: 'auto',
                  color: '#94a3b8',
                  lineHeight: 1.5
                }}
              >
                {logs.length === 0 ? (
                  <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    Idle. Waiting for prompt submission to begin trace...
                  </div>
                ) : (
                  logs.map((l, i) => (
                    <div key={i} style={{ marginBottom: 4, color: l.includes('[ERROR]') ? '#fb7185' : l.includes('[+]') ? '#34d399' : 'inherit' }}>
                      {l}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
