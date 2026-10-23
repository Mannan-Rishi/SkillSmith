import React, { useState } from 'react';
import { 
  FlaskConical, 
  Play, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle,
  Loader2,
  Layers,
  Zap,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { Skill, ExecutionRun, TestCase, TestResult } from '../types';
import { runSkillTests, fetchSkill } from '../api';

interface TestingLabViewProps {
  skills: Skill[];
  onSkillUpdated: (updatedSkill: Skill) => void;
}

export const TestingLabView: React.FC<TestingLabViewProps> = ({
  skills,
  onSkillUpdated
}) => {
  const [selectedSkillId, setSelectedSkillId] = useState<string>(skills[0]?.id || '');
  const [isRunning, setIsRunning] = useState(false);
  const [activeRun, setActiveRun] = useState<ExecutionRun | null>(null);
  const [autoEvolveOnFail, setAutoEvolveOnFail] = useState(false);
  const [evolutionNotice, setEvolutionNotice] = useState<string | null>(null);
  
  // Collapse & Expansion states per test case
  const [collapsedTests, setCollapsedTests] = useState<Record<string, boolean>>({});
  const [expandedOutputs, setExpandedOutputs] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const selectedSkill = skills.find(s => s.id === selectedSkillId) || skills[0];
  const curVer = selectedSkill?.versions[selectedSkill?.current_version];
  const currentRun = activeRun || curVer?.latest_run;

  const toggleCollapse = (id: string) => {
    setCollapsedTests(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleExpandOutput = (id: string) => {
    setExpandedOutputs(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRunSuite = async () => {
    if (!selectedSkill) return;
    setIsRunning(true);
    setEvolutionNotice(null);
    try {
      const prevImpCount = selectedSkill.improvements.length;

      const run = await runSkillTests(selectedSkill.id, selectedSkill.current_version, autoEvolveOnFail);
      setActiveRun(run);

      // Re-fetch the skill to capture potential autonomous evolution updates
      const updatedSkill = await fetchSkill(selectedSkill.id);
      onSkillUpdated(updatedSkill);

      if (updatedSkill.improvements.length > prevImpCount) {
        const latestImp = updatedSkill.improvements[updatedSkill.improvements.length - 1];
        if (latestImp.decision === 'accepted') {
          setEvolutionNotice(`⚡ Autonomous Evolution Triggered: Candidate v${latestImp.new_version} passed acceptance gates with 0 regressions! Pass rate: ${latestImp.before_pass_rate}% → ${latestImp.after_pass_rate}%`);
        } else {
          setEvolutionNotice(`⚡ Autonomous Evolution Triggered: Candidate v${latestImp.new_version} was rejected (${latestImp.decision_reason}). Baseline v${updatedSkill.current_version} was safely retained.`);
        }
      }
    } catch (e: any) {
      console.error(e);
      alert('Failed to execute test suite: ' + (e.message || e));
    } finally {
      setIsRunning(false);
    }
  };

  if (!selectedSkill) {
    return (
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 24px', textAlign: 'center' }}>
        No skills available. Please create a skill first!
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '32px 24px', minWidth: 0, width: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 6 }}>
            Testing Laboratory
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Inspect individual test outcomes, assertion verifications, execution timings, and error traces inside the safe AST sandbox.
          </p>
        </div>

        {/* Skill Selector and Auto-Evolve Controls */}
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: '#818cf8', cursor: 'pointer', userSelect: 'none' }}>
            <input
              type="checkbox"
              checked={autoEvolveOnFail}
              onChange={e => setAutoEvolveOnFail(e.target.checked)}
              style={{ width: 16, height: 16, accentColor: '#818cf8', cursor: 'pointer' }}
            />
            <Zap size={14} color="#818cf8" />
            Auto-Evolve on Failure
          </label>

          <select
            value={selectedSkill.id}
            onChange={e => {
              setSelectedSkillId(e.target.value);
              setActiveRun(null);
            }}
            style={{
              padding: '10px 16px',
              borderRadius: 8,
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              fontSize: '0.9rem',
              fontWeight: 600,
              outline: 'none',
              maxWidth: 320
            }}
          >
            {skills.map(s => (
              <option key={s.id} value={s.id}>
                {s.name} (v{s.current_version})
              </option>
            ))}
          </select>

          <button
            className="btn btn-primary"
            onClick={handleRunSuite}
            disabled={isRunning}
            style={{ padding: '10px 20px', whiteSpace: 'nowrap' }}
          >
            {isRunning ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Executing Suite...
              </>
            ) : (
              <>
                <Play size={16} /> Run Full Suite
              </>
            )}
          </button>
        </div>
      </div>

      {/* Autonomous Evolution Result Notification */}
      {evolutionNotice && (
        <div style={{
          padding: '12px 18px',
          borderRadius: 8,
          backgroundColor: evolutionNotice.includes('promoted') ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
          border: `1px solid ${evolutionNotice.includes('promoted') ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
          color: evolutionNotice.includes('promoted') ? '#34d399' : '#fbbf24',
          marginBottom: 20,
          fontSize: '0.85rem',
          display: 'flex',
          alignItems: 'center',
          gap: 10
        }}>
          <Sparkles size={18} style={{ flexShrink: 0 }} />
          <span>{evolutionNotice}</span>
        </div>
      )}

      {/* Metrics Banner */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 16,
        marginBottom: 24
      }}>
        <div className="glass-card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>SUITE PASS RATE</div>
          <div className="mono" style={{ fontSize: '1.75rem', fontWeight: 800, color: (currentRun?.pass_rate || 0) === 100 ? '#34d399' : '#fbbf24' }}>
            {currentRun?.pass_rate || 0}%
          </div>
        </div>
        <div className="glass-card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>PASSED TESTS</div>
          <div className="mono" style={{ fontSize: '1.75rem', fontWeight: 800, color: '#34d399' }}>
            {currentRun?.passed_count || 0} / {currentRun?.total_tests || selectedSkill.test_cases.length}
          </div>
        </div>
        <div className="glass-card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>FAILED TESTS</div>
          <div className="mono" style={{ fontSize: '1.75rem', fontWeight: 800, color: (currentRun?.failed_count || 0) > 0 ? '#fb7185' : '#94a3b8' }}>
            {currentRun?.failed_count || 0}
          </div>
        </div>
        <div className="glass-card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>EXECUTION ISOLATION</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#38bdf8', marginTop: 4 }}>
            Pure AST Sandbox
          </div>
        </div>
      </div>

      {/* Test Cases List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
        {selectedSkill.test_cases.map((tc, idx) => {
          const res = currentRun?.test_results?.find(r => r.test_id === tc.id);
          const passed = res?.passed;
          const isCollapsed = collapsedTests[tc.id];
          const isOutputExpanded = expandedOutputs[tc.id];
          const outputString = res?.actual_output ? JSON.stringify(res.actual_output, null, 2) : res?.error_message || 'Awaiting execution...';
          const inputString = JSON.stringify(tc.input_data, null, 2);

          return (
            <div 
              key={tc.id} 
              className="glass-card" 
              style={{ 
                padding: '18px 20px', 
                borderLeft: `4px solid ${res ? (passed ? '#10b981' : '#f43f5e') : '#6366f1'}`,
                minWidth: 0,
                overflow: 'hidden'
              }}
            >
              {/* Header row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isCollapsed ? 0 : 12, flexWrap: 'wrap', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', minWidth: 0 }} onClick={() => toggleCollapse(tc.id)}>
                  {res ? (
                    passed ? <CheckCircle2 size={20} color="#34d399" style={{ flexShrink: 0 }} /> : <XCircle size={20} color="#fb7185" style={{ flexShrink: 0 }} />
                  ) : (
                    <Clock size={20} color="#94a3b8" style={{ flexShrink: 0 }} />
                  )}
                  <div style={{ minWidth: 0 }}>
                    <span style={{ fontWeight: 700, fontSize: '0.95rem', wordBreak: 'break-word' }}>
                      #{idx + 1} {tc.name}
                    </span>
                    {tc.is_edge_case && (
                      <span className="badge badge-amber" style={{ marginLeft: 8, fontSize: '0.65rem' }}>
                        Adversarial Edge Case
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {res && (
                    <span className="mono" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Latency: {res.execution_time_ms.toFixed(2)}ms
                    </span>
                  )}
                  <span className={`badge ${res ? (passed ? 'badge-emerald' : 'badge-rose') : 'badge-indigo'}`}>
                    {res ? (passed ? 'PASSED' : 'FAILED') : 'PENDING'}
                  </span>
                  <button 
                    onClick={() => toggleCollapse(tc.id)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}
                    title={isCollapsed ? "Expand test details" : "Collapse test details"}
                  >
                    {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                  </button>
                </div>
              </div>

              {!isCollapsed && (
                <>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.4 }}>
                    {tc.description}
                  </p>

                  {/* Expected Behavior Banner */}
                  {tc.expected_behavior && (
                    <div style={{
                      padding: '8px 12px',
                      borderRadius: 6,
                      backgroundColor: 'rgba(99, 102, 241, 0.08)',
                      border: '1px solid rgba(99, 102, 241, 0.2)',
                      fontSize: '0.8rem',
                      color: '#a5b4fc',
                      marginBottom: 16,
                      display: 'flex',
                      gap: 8,
                      alignItems: 'center'
                    }}>
                      <strong>Expected Behavior:</strong>
                      <span>{tc.expected_behavior}</span>
                    </div>
                  )}

                  {/* Data Grid: Inputs & Outputs with Responsive Shrink & Max Heights */}
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', 
                    gap: 16, 
                    marginBottom: 16,
                    minWidth: 0 
                  }}>
                    {/* Input Payload */}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                          INPUT PAYLOAD
                        </span>
                        <button
                          onClick={() => copyToClipboard(inputString, `in_${tc.id}`)}
                          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4 }}
                        >
                          {copiedId === `in_${tc.id}` ? <Check size={12} color="#34d399" /> : <Copy size={12} />}
                          {copiedId === `in_${tc.id}` ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                      <pre 
                        className="code-block" 
                        style={{ 
                          margin: 0, 
                          maxHeight: 260, 
                          overflowY: 'auto', 
                          overflowX: 'auto',
                          wordBreak: 'break-word',
                          whiteSpace: 'pre-wrap',
                          fontSize: '0.8rem'
                        }}
                      >
                        {inputString}
                      </pre>
                    </div>

                    {/* Measured Actual Output */}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                          ACTUAL MEASURED OUTPUT
                        </span>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <button
                            onClick={() => toggleExpandOutput(tc.id)}
                            style={{ background: 'none', border: 'none', color: '#818cf8', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4 }}
                          >
                            {isOutputExpanded ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                            {isOutputExpanded ? 'Compact' : 'Expand'}
                          </button>
                          <button
                            onClick={() => copyToClipboard(outputString, `out_${tc.id}`)}
                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4 }}
                          >
                            {copiedId === `out_${tc.id}` ? <Check size={12} color="#34d399" /> : <Copy size={12} />}
                            {copiedId === `out_${tc.id}` ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                      </div>
                      <pre 
                        className="code-block" 
                        style={{ 
                          margin: 0, 
                          color: passed ? '#34d399' : (res ? '#fb7185' : 'var(--text-muted)'),
                          maxHeight: isOutputExpanded ? 600 : 260,
                          overflowY: 'auto',
                          overflowX: 'auto',
                          wordBreak: 'break-word',
                          whiteSpace: 'pre-wrap',
                          fontSize: '0.8rem'
                        }}
                      >
                        {outputString}
                      </pre>
                    </div>
                  </div>

                  {/* Assertions Table */}
                  {res?.assertion_results && res.assertion_results.length > 0 && (
                    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 14 }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>
                        ASSERTION VERIFICATIONS ({res.assertion_results.length})
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {res.assertion_results.map((ar, i) => (
                          <div 
                            key={i}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '8px 12px',
                              borderRadius: 6,
                              backgroundColor: 'var(--bg-secondary)',
                              border: `1px solid ${ar.passed ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)'}`,
                              fontSize: '0.8rem',
                              flexWrap: 'wrap',
                              gap: 8
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
                              {ar.passed ? (
                                <CheckCircle2 size={16} color="#34d399" style={{ flexShrink: 0 }} />
                              ) : (
                                <XCircle size={16} color="#fb7185" style={{ flexShrink: 0 }} />
                              )}
                              <span className="mono" style={{ color: ar.passed ? 'var(--text-secondary)' : '#fb7185', wordBreak: 'break-word' }}>
                                [{ar.assertion_type}] {ar.target_field ? `target: ${ar.target_field} → ` : ''}{ar.message}
                              </span>
                            </div>
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                              {ar.is_evaluator_error && (
                                <span className="badge badge-amber" style={{ fontSize: '0.65rem' }}>
                                  EVALUATOR EXCEPTION
                                </span>
                              )}
                              <span className={`badge ${ar.passed ? 'badge-emerald' : 'badge-rose'}`} style={{ fontSize: '0.65rem' }}>
                                {ar.passed ? 'PASS' : 'FAIL'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
