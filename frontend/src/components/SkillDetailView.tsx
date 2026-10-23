import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Code, 
  FileJson, 
  FlaskConical, 
  TrendingUp, 
  Download, 
  Copy, 
  Check, 
  ArrowLeft, 
  ShieldCheck, 
  Play, 
  RotateCcw, 
  PlayCircle, 
  Terminal, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  PlusCircle, 
  Clock, 
  Sparkles,
  Loader2
} from 'lucide-react';
import { Skill, SkillVersion, CustomExecutionResponse } from '../types';
import { executeSkillCustom, saveSkillTestCase } from '../api';

interface SkillDetailViewProps {
  skill: Skill;
  onBack: () => void;
  onRunTests: (skillId: string, version: string) => void;
  onImprove: (skillId: string) => void;
  onExport: (skillId: string) => void;
  onSkillUpdated?: (skill: Skill) => void;
  initialTab?: string;
}

export const SkillDetailView: React.FC<SkillDetailViewProps> = ({
  skill,
  onBack,
  onRunTests,
  onImprove,
  onExport,
  onSkillUpdated,
  initialTab = 'try_skill'
}) => {
  const [selectedVersion, setSelectedVersion] = useState<string>(skill.current_version);
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [copied, setCopied] = useState(false);

  // Feature A: Interactive Try Skill Runner States
  const [customInputJson, setCustomInputJson] = useState<string>('');
  const [expectedOutputJson, setExpectedOutputJson] = useState<string>('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [execResult, setExecResult] = useState<CustomExecutionResponse | null>(null);
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Save as test case form state
  const [showSaveTestModal, setShowSaveTestModal] = useState(false);
  const [testCaseName, setTestCaseName] = useState('');
  const [testCaseDesc, setTestCaseDesc] = useState('');
  const [testCaseEdge, setTestCaseEdge] = useState(false);
  const [testCaseAssertionType, setTestCaseAssertionType] = useState('equals');
  const [isSavingTest, setIsSavingTest] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  const curVer: SkillVersion = skill.versions[selectedVersion] || skill.versions[skill.current_version];
  const latestRun = curVer?.latest_run;
  const passRate = latestRun ? latestRun.pass_rate : 0;

  // Prepopulate sample input from existing test case or manifest
  useEffect(() => {
    if (!customInputJson) {
      if (skill.test_cases && skill.test_cases.length > 0) {
        setCustomInputJson(JSON.stringify(skill.test_cases[0].input_data, null, 2));
      } else if (curVer?.manifest?.inputs) {
        const sample: Record<string, any> = {};
        Object.keys(curVer.manifest.inputs).forEach(k => {
          sample[k] = "sample_value";
        });
        setCustomInputJson(JSON.stringify(sample, null, 2));
      } else {
        setCustomInputJson(JSON.stringify({ input_text: "" }, null, 2));
      }
    }
  }, [skill, curVer]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRunCustomSkill = async () => {
    setJsonError(null);
    let parsedInput: any = null;
    try {
      parsedInput = JSON.parse(customInputJson);
      if (typeof parsedInput !== 'object' || parsedInput === null || Array.isArray(parsedInput)) {
        throw new Error('Input must be a valid JSON dictionary object e.g. {"key": "value"}');
      }
    } catch (e: any) {
      setJsonError(`Invalid JSON syntax: ${e.message}`);
      return;
    }

    let parsedExpected: any = undefined;
    if (expectedOutputJson.trim()) {
      try {
        parsedExpected = JSON.parse(expectedOutputJson);
      } catch {
        // Fallback to literal string if not JSON
        parsedExpected = expectedOutputJson.trim();
      }
    }

    setIsExecuting(true);
    try {
      const res = await executeSkillCustom(skill.id, {
        inputs: parsedInput,
        expected_output: parsedExpected,
        version: selectedVersion
      });
      setExecResult(res);
      setSaveSuccessMsg(null);
    } catch (err: any) {
      setJsonError(`Execution API error: ${err.message}`);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleSaveAsTestCase = async () => {
    if (!testCaseName.trim()) {
      alert('Please provide a name for this test case.');
      return;
    }

    let parsedInput: any = {};
    try {
      parsedInput = JSON.parse(customInputJson);
    } catch {
      alert('Invalid input JSON. Please correct it before saving.');
      return;
    }

    let expectedVal: any = undefined;
    if (expectedOutputJson.trim()) {
      try {
        expectedVal = JSON.parse(expectedOutputJson);
      } catch {
        expectedVal = expectedOutputJson.trim();
      }
    } else if (execResult?.output !== undefined) {
      expectedVal = execResult.output;
    }

    setIsSavingTest(true);
    try {
      const newTestCase = await saveSkillTestCase(skill.id, {
        name: testCaseName,
        description: testCaseDesc || 'Interactive custom execution saved as test case',
        input_data: parsedInput,
        expected_output: expectedVal,
        expected_behavior: 'Returns valid structured output for custom input',
        is_edge_case: testCaseEdge,
        assertion_type: testCaseAssertionType
      });

      const updatedSkill: Skill = {
        ...skill,
        test_cases: [...skill.test_cases, newTestCase]
      };
      if (onSkillUpdated) {
        onSkillUpdated(updatedSkill);
      }

      setSaveSuccessMsg(`Test case "${newTestCase.name}" saved successfully to Test Suite!`);
      setShowSaveTestModal(false);
      setTestCaseName('');
      setTestCaseDesc('');
    } catch (err: any) {
      alert(`Failed to save test case: ${err.message}`);
    } finally {
      setIsSavingTest(false);
    }
  };

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '32px 24px' }}>
      {/* Back button */}
      <button 
        className="btn btn-secondary" 
        onClick={onBack}
        style={{ marginBottom: 20, padding: '6px 12px', fontSize: '0.8rem' }}
      >
        <ArrowLeft size={14} /> Back to Library
      </button>

      {/* Header Banner */}
      <div className="glass-card" style={{ padding: '24px 28px', marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span className="badge badge-indigo">{skill.category}</span>
              <span className="badge badge-emerald">
                {curVer?.manifest?.execution_strategy || 'restricted_python'}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Version:</span>
                <select
                  value={selectedVersion}
                  onChange={e => setSelectedVersion(e.target.value)}
                  className="mono"
                  style={{
                    padding: '2px 8px',
                    borderRadius: 4,
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    fontSize: '0.8rem',
                    outline: 'none'
                  }}
                >
                  {Object.keys(skill.versions).map(v => (
                    <option key={v} value={v}>v{v} {v === skill.current_version ? '(Active)' : ''}</option>
                  ))}
                </select>
              </div>
            </div>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 800, marginBottom: 8 }}>
              {skill.name}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: 800 }}>
              {curVer?.manifest?.description || 'Autonomous AI Skill'}
            </p>
          </div>

          {/* Right Action Buttons */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              className="btn btn-primary"
              onClick={() => setActiveTab('try_skill')}
              style={{ padding: '8px 16px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
            >
              <PlayCircle size={16} /> Try Skill
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => onRunTests(skill.id, selectedVersion)}
              style={{ padding: '8px 14px' }}
            >
              <Play size={15} color="#34d399" /> Run Tests
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => onImprove(skill.id)}
              style={{ padding: '8px 14px' }}
            >
              <RotateCcw size={15} color="#fbbf24" /> Evolve (Feedback Descent)
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => onExport(skill.id)}
              style={{ padding: '8px 14px' }}
            >
              <Download size={15} /> Export
            </button>
          </div>
        </div>

        {/* Health Bar */}
        <div style={{
          marginTop: 20,
          paddingTop: 16,
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          gap: 32,
          fontSize: '0.85rem'
        }}>
          <div>
            <span style={{ color: 'var(--text-muted)', marginRight: 6 }}>Active Version:</span>
            <span className="mono" style={{ fontWeight: 700, color: '#818cf8' }}>
              v{skill.current_version}
            </span>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)', marginRight: 6 }}>Test Pass Rate:</span>
            <span className="mono" style={{ fontWeight: 700, color: passRate === 100 ? '#34d399' : passRate >= 60 ? '#fbbf24' : '#fb7185' }}>
              {passRate}% ({latestRun?.passed_count || 0}/{latestRun?.total_tests || skill.test_cases.length} passed)
            </span>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)', marginRight: 6 }}>Evolution History:</span>
            <span className="mono" style={{ fontWeight: 700 }}>
              {skill.improvements.length} cycle(s) recorded
            </span>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)', marginRight: 6 }}>Sandbox:</span>
            <span style={{ color: '#38bdf8', fontWeight: 600 }}>Pure AST Isolation</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, borderBottom: '1px solid var(--border-color)', paddingBottom: 8 }}>
        {[
          { id: 'try_skill', label: 'Try Skill / Run', icon: PlayCircle },
          { id: 'skill_md', label: 'SKILL.md Documentation', icon: FileText },
          { id: 'code', label: 'Implementation Code', icon: Code },
          { id: 'manifest', label: 'Manifest & Safety Spec', icon: FileJson },
          { id: 'tests', label: `Test Suite (${skill.test_cases.length})`, icon: FlaskConical },
          { id: 'improvements', label: `Evolution Logs (${skill.improvements.length})`, icon: TrendingUp },
        ].map(t => {
          const Icon = t.icon;
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 16px',
                borderRadius: 8,
                fontSize: '0.875rem',
                fontWeight: 500,
                border: 'none',
                background: active ? 'var(--bg-hover)' : 'transparent',
                color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
                borderBottom: active ? '2px solid var(--accent-indigo)' : '2px solid transparent',
                transition: 'all 0.15s ease'
              }}
            >
              <Icon size={16} color={active ? '#818cf8' : 'currentColor'} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      <div className="glass-card" style={{ padding: 24 }}>
        {/* Feature A: Try Skill / Run Interactive Runner */}
        {activeTab === 'try_skill' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <PlayCircle size={20} color="#34d399" />
                  Interactive Skill Runner (Version {selectedVersion})
                </h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                  Provide custom input parameters to execute the skill directly in the AST sandbox. Compare output against expected values and save as a regression test case.
                </p>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn btn-secondary"
                  style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                  onClick={() => {
                    if (skill.test_cases && skill.test_cases.length > 0) {
                      setCustomInputJson(JSON.stringify(skill.test_cases[0].input_data, null, 2));
                    }
                  }}
                >
                  <Sparkles size={14} color="#818cf8" /> Load Test Case Input
                </button>
              </div>
            </div>

            {/* Input & Output Split Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
              {/* Left Column: Input Editor */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Input Payload (JSON)
                  </label>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }} className="mono">
                    execute(inputs: dict)
                  </span>
                </div>

                <textarea
                  value={customInputJson}
                  onChange={e => setCustomInputJson(e.target.value)}
                  rows={9}
                  className="mono"
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: 8,
                    backgroundColor: '#060910',
                    border: jsonError ? '1px solid #f43f5e' : '1px solid var(--border-color)',
                    color: '#f8fafc',
                    fontSize: '0.85rem',
                    lineHeight: 1.5,
                    resize: 'vertical',
                    outline: 'none',
                    marginBottom: 12
                  }}
                />

                {/* Optional Expected Output */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      Optional Expected Output (for Comparison & Testing)
                    </label>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      JSON or String
                    </span>
                  </div>
                  <textarea
                    value={expectedOutputJson}
                    onChange={e => setExpectedOutputJson(e.target.value)}
                    rows={4}
                    placeholder='e.g. {"email_count": 1} or expected text'
                    className="mono"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 8,
                      backgroundColor: '#060910',
                      border: '1px solid var(--border-color)',
                      color: '#94a3b8',
                      fontSize: '0.8rem',
                      lineHeight: 1.4,
                      resize: 'vertical',
                      outline: 'none'
                    }}
                  />
                </div>

                {jsonError && (
                  <div style={{
                    padding: '10px 14px',
                    borderRadius: 6,
                    backgroundColor: 'rgba(244, 63, 94, 0.1)',
                    border: '1px solid rgba(244, 63, 94, 0.3)',
                    color: '#fb7185',
                    fontSize: '0.8rem',
                    marginBottom: 12,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                  }}>
                    <AlertCircle size={16} /> {jsonError}
                  </div>
                )}

                <button
                  className="btn btn-primary"
                  onClick={handleRunCustomSkill}
                  disabled={isExecuting}
                  style={{ width: '100%', padding: '10px', fontSize: '0.9rem' }}
                >
                  {isExecuting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Executing in AST Sandbox...
                    </>
                  ) : (
                    <>
                      <Play size={16} /> Run Skill with Inputs
                    </>
                  )}
                </button>
              </div>

              {/* Right Column: Execution Output */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Actual Sandbox Output
                  </label>
                  {execResult && (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        <Clock size={12} style={{ display: 'inline', marginRight: 2 }} />
                        {execResult.execution_time_ms}ms
                      </span>
                      <span className={`badge ${execResult.success ? 'badge-emerald' : 'badge-rose'}`} style={{ fontSize: '0.65rem' }}>
                        {execResult.success ? 'SUCCESS' : 'EXECUTION FAILED'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Output Screen */}
                <div 
                  className="mono"
                  style={{
                    flex: 1,
                    minHeight: 240,
                    backgroundColor: '#060910',
                    borderRadius: 8,
                    border: '1px solid var(--border-color)',
                    padding: 14,
                    fontSize: '0.82rem',
                    overflowY: 'auto',
                    color: execResult ? (execResult.success ? '#34d399' : '#fb7185') : 'var(--text-muted)',
                    lineHeight: 1.5,
                    marginBottom: 12
                  }}
                >
                  {execResult ? (
                    execResult.success ? (
                      <pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#38bdf8' }}>
                        {JSON.stringify(execResult.output, null, 2)}
                      </pre>
                    ) : (
                      <div style={{ color: '#fb7185' }}>
                        <div><strong>Error:</strong></div>
                        <pre style={{ margin: '6px 0', whiteSpace: 'pre-wrap' }}>
                          {execResult.error || 'Execution encountered an unhandled error.'}
                        </pre>
                      </div>
                    )
                  ) : (
                    <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', paddingTop: 40, textAlign: 'center' }}>
                      Click "Run Skill with Inputs" to execute and inspect real results.
                    </div>
                  )}
                </div>

                {/* Comparison Card if Expected Output provided */}
                {execResult && execResult.matches_expected !== null && execResult.matches_expected !== undefined && (
                  <div style={{
                    padding: '12px 14px',
                    borderRadius: 8,
                    backgroundColor: execResult.matches_expected ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)',
                    border: `1px solid ${execResult.matches_expected ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
                    marginBottom: 12,
                    fontSize: '0.82rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, marginBottom: 4, color: execResult.matches_expected ? '#34d399' : '#fb7185' }}>
                      {execResult.matches_expected ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                      {execResult.matches_expected ? 'Matches Expected Output' : 'Output Mismatch Detected'}
                    </div>
                    <div style={{ color: 'var(--text-secondary)' }}>
                      {execResult.comparison_details}
                    </div>
                  </div>
                )}

                {/* Action: Save as Test Case */}
                {execResult && (
                  <div>
                    {!showSaveTestModal ? (
                      <button
                        className="btn btn-secondary"
                        onClick={() => {
                          setShowSaveTestModal(true);
                          setTestCaseName(`Custom Test (${new Date().toLocaleTimeString()})`);
                        }}
                        style={{ width: '100%', fontSize: '0.85rem', padding: '8px' }}
                      >
                        <PlusCircle size={15} /> Save this Run as Test Case
                      </button>
                    ) : (
                      <div style={{
                        padding: 16,
                        borderRadius: 8,
                        backgroundColor: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)'
                      }}>
                        <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: 10 }}>
                          Save as Persistent Test Case
                        </div>
                        <input
                          type="text"
                          value={testCaseName}
                          onChange={e => setTestCaseName(e.target.value)}
                          placeholder="Test Case Name"
                          style={{
                            width: '100%',
                            padding: '8px 10px',
                            borderRadius: 6,
                            backgroundColor: '#060910',
                            border: '1px solid var(--border-color)',
                            color: '#fff',
                            fontSize: '0.85rem',
                            marginBottom: 8,
                            outline: 'none'
                          }}
                        />
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12, fontSize: '0.8rem' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={testCaseEdge}
                              onChange={e => setTestCaseEdge(e.target.checked)}
                            />
                            Mark as Adversarial Edge Case
                          </label>
                          <select
                            value={testCaseAssertionType}
                            onChange={e => setTestCaseAssertionType(e.target.value)}
                            style={{
                              padding: '4px 8px',
                              borderRadius: 4,
                              backgroundColor: '#060910',
                              border: '1px solid var(--border-color)',
                              color: '#fff',
                              fontSize: '0.75rem',
                              outline: 'none'
                            }}
                          >
                            <option value="equals">Assert: Equals</option>
                            <option value="contains">Assert: Contains</option>
                            <option value="not_empty">Assert: Not Empty</option>
                          </select>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            className="btn btn-primary"
                            onClick={handleSaveAsTestCase}
                            disabled={isSavingTest}
                            style={{ flex: 1, padding: '6px 12px', fontSize: '0.8rem' }}
                          >
                            {isSavingTest ? 'Saving...' : 'Confirm & Add to Suite'}
                          </button>
                          <button
                            className="btn btn-secondary"
                            onClick={() => setShowSaveTestModal(false)}
                            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {saveSuccessMsg && (
                      <div style={{
                        marginTop: 10,
                        padding: '8px 12px',
                        borderRadius: 6,
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        color: '#34d399',
                        fontSize: '0.8rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                      }}>
                        <Check size={14} /> {saveSuccessMsg}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 1. SKILL.md */}
        {activeTab === 'skill_md' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Universal AI Skill Specification (Open Standard Compatible)
              </div>
              <button
                className="btn btn-secondary"
                style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                onClick={() => handleCopy(curVer?.skill_md || '')}
              >
                {copied ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
                {copied ? 'Copied' : 'Copy SKILL.md'}
              </button>
            </div>
            <pre className="code-block" style={{ whiteSpace: 'pre-wrap' }}>
              {curVer?.skill_md}
            </pre>
          </div>
        )}

        {/* 2. Implementation Code */}
        {activeTab === 'code' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {"Safe Python AST Sandbox Execution Function (`execute(inputs: dict) -> dict`)"}
              </div>
              <button
                className="btn btn-secondary"
                style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                onClick={() => handleCopy(curVer?.code || '')}
              >
                {copied ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
                {copied ? 'Copied' : 'Copy Code'}
              </button>
            </div>
            <pre className="code-block" style={{ whiteSpace: 'pre-wrap', color: '#38bdf8' }}>
              {curVer?.code || '# No executable code provided for this version.'}
            </pre>
          </div>
        )}

        {/* 3. Manifest */}
        {activeTab === 'manifest' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
              <div style={{ padding: 16, backgroundColor: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border-color)' }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 12 }}>Input Parameters</h3>
                <pre className="code-block" style={{ margin: 0 }}>
                  {JSON.stringify(curVer?.manifest?.inputs || {}, null, 2)}
                </pre>
              </div>
              <div style={{ padding: 16, backgroundColor: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border-color)' }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 12 }}>Output Fields</h3>
                <pre className="code-block" style={{ margin: 0 }}>
                  {JSON.stringify(curVer?.manifest?.outputs || {}, null, 2)}
                </pre>
              </div>
            </div>

            <div style={{ padding: 16, backgroundColor: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border-color)' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShieldCheck size={16} color="#34d399" /> Safety & Sandbox Isolation Controls
              </h3>
              <ul style={{ paddingLeft: 20, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                <li><strong>AST Whitelist:</strong> Restricts all dangerous imports (`os`, `sys`, `subprocess`, `open`).</li>
                <li><strong>Execution Timeout:</strong> Hard 3.0 second CPU cutoff to prevent infinite loops.</li>
                <li><strong>Memory Isolation:</strong> Operates strictly in an ephemeral local namespace without host contamination.</li>
              </ul>
            </div>
          </div>
        )}

        {/* 4. Test Suite */}
        {activeTab === 'tests' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>
                Synthesized Adversarial Test Cases ({skill.test_cases.length})
              </h3>
              <button 
                className="btn btn-primary"
                style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                onClick={() => onRunTests(skill.id, selectedVersion)}
              >
                <Play size={14} /> Re-run Suite
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {skill.test_cases.map((tc, idx) => {
                const tr = latestRun?.test_results?.find(r => r.test_id === tc.id);
                const passed = tr?.passed;

                return (
                  <div 
                    key={tc.id}
                    style={{
                      padding: 16,
                      borderRadius: 8,
                      backgroundColor: 'var(--bg-secondary)',
                      border: `1px solid ${tr ? (passed ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)') : 'var(--border-color)'}`
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                          #{idx + 1} {tc.name}
                        </span>
                        {tc.is_edge_case && (
                          <span className="badge badge-amber" style={{ fontSize: '0.65rem' }}>Edge Case</span>
                        )}
                      </div>
                      {tr && (
                        <span className={`badge ${passed ? 'badge-emerald' : 'badge-rose'}`}>
                          {passed ? 'Passed' : 'Failed'} ({tr.execution_time_ms.toFixed(1)}ms)
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 10 }}>
                      {tc.description}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: '0.75rem' }}>
                      <div>
                        <div style={{ color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600 }}>Input Payload:</div>
                        <pre className="code-block" style={{ padding: 8, margin: 0 }}>
                          {JSON.stringify(tc.input_data, null, 2)}
                        </pre>
                      </div>
                      <div>
                        <div style={{ color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600 }}>Actual Output:</div>
                        <pre className="code-block" style={{ padding: 8, margin: 0, color: passed ? '#34d399' : '#fb7185' }}>
                          {tr?.actual_output ? JSON.stringify(tr.actual_output, null, 2) : 'No execution output'}
                        </pre>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Feature B: Genuine Evolution Logs with Accept/Reject Gate */}
        {activeTab === 'improvements' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>
                  Feedback Descent Optimization & Evolution History
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  All candidates are evaluated against the baseline test suite. Candidates are rejected if regressions are detected or pass rate does not improve.
                </p>
              </div>

              <button
                className="btn btn-secondary"
                onClick={() => onImprove(skill.id)}
                style={{ padding: '6px 14px', fontSize: '0.8rem' }}
              >
                <RotateCcw size={14} color="#fbbf24" /> Evolve (Feedback Descent)
              </button>
            </div>

            {skill.improvements.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', padding: 24, textAlign: 'center' }}>
                No improvement cycles recorded yet. This version passed all baseline tests directly, or improvement has not yet been executed.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {skill.improvements.map((imp, idx) => {
                  const isAccepted = imp.decision === 'accepted' || (imp.decision === undefined && imp.improved);
                  
                  return (
                    <div 
                      key={idx}
                      style={{
                        padding: 18,
                        borderRadius: 8,
                        backgroundColor: 'var(--bg-secondary)',
                        border: `1px solid ${isAccepted ? 'rgba(16, 185, 129, 0.4)' : 'rgba(244, 63, 94, 0.4)'}`
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span className="badge badge-indigo">Cycle #{imp.iteration}</span>
                          <span className="mono" style={{ fontSize: '0.85rem' }}>
                            v{imp.previous_version} → <strong>v{imp.new_version}</strong>
                          </span>
                          <span className={`badge ${isAccepted ? 'badge-emerald' : 'badge-rose'}`} style={{ fontSize: '0.7rem' }}>
                            {isAccepted ? 'ACCEPTED' : 'REJECTED (BASELINE RETAINED)'}
                          </span>
                        </div>
                        <div className="mono" style={{ fontSize: '0.85rem' }}>
                          Pass Rate: <span style={{ color: '#fb7185' }}>{imp.before_pass_rate}%</span> → <span style={{ color: isAccepted ? '#34d399' : '#fbbf24', fontWeight: 700 }}>{imp.after_pass_rate}%</span>
                        </div>
                      </div>

                      {/* Decision Details Box */}
                      {imp.decision_reason && (
                        <div style={{
                          padding: '8px 12px',
                          borderRadius: 6,
                          backgroundColor: isAccepted ? 'rgba(16, 185, 129, 0.08)' : 'rgba(244, 63, 94, 0.08)',
                          fontSize: '0.8rem',
                          color: isAccepted ? '#34d399' : '#fb7185',
                          marginBottom: 10,
                          fontWeight: 500
                        }}>
                          {imp.decision_reason}
                        </div>
                      )}

                      {/* Fixed & Regressed Tags */}
                      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 10, fontSize: '0.75rem' }}>
                        {imp.fixed_tests && imp.fixed_tests.length > 0 && (
                          <div style={{ color: '#34d399' }}>
                            <strong>Fixed Tests ({imp.fixed_tests.length}):</strong> {imp.fixed_tests.join(', ')}
                          </div>
                        )}
                        {imp.regressed_tests && imp.regressed_tests.length > 0 && (
                          <div style={{ color: '#fb7185' }}>
                            <strong>Regressed Tests ({imp.regressed_tests.length}):</strong> {imp.regressed_tests.join(', ')}
                          </div>
                        )}
                      </div>

                      <div style={{ marginBottom: 8, fontSize: '0.85rem' }}>
                        <strong style={{ color: '#fbbf24' }}>Verified Failure Diagnosis:</strong> {imp.failure_analysis}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        <strong style={{ color: '#38bdf8' }}>Applied Code Changes:</strong> {imp.changes_made}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
