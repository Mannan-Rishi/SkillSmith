import React, { useState } from 'react';
import { 
  TrendingUp, 
  RotateCcw, 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2,
  GitCommit,
  ShieldCheck,
  Code
} from 'lucide-react';
import { Skill } from '../types';
import { improveSkill } from '../api';

interface ImprovementLabViewProps {
  skills: Skill[];
  onSkillUpdated: (skill: Skill) => void;
}

export const ImprovementLabView: React.FC<ImprovementLabViewProps> = ({
  skills,
  onSkillUpdated
}) => {
  const [selectedSkillId, setSelectedSkillId] = useState<string>(skills[0]?.id || '');
  const [isImproving, setIsImproving] = useState(false);

  const selectedSkill = skills.find(s => s.id === selectedSkillId) || skills[0];
  const curVer = selectedSkill?.versions[selectedSkill?.current_version];
  const improvements = selectedSkill?.improvements || [];

  const handleImprove = async () => {
    if (!selectedSkill) return;
    setIsImproving(true);
    try {
      const updated = await improveSkill(selectedSkill.id);
      onSkillUpdated(updated);
    } catch (e: any) {
      console.error(e);
      alert('Improvement iteration failed: ' + (e.message || e));
    } finally {
      setIsImproving(false);
    }
  };

  if (!selectedSkill) {
    return (
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 24px', textAlign: 'center' }}>
        No skills found. Please create a skill first!
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '32px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
              Improvement Laboratory
            </h1>
            <span className="badge badge-indigo">Feedback Descent Engine</span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Inspect self-improvement cycles, regression prevention gates, failure diagnoses, and version-to-version measured delta.
          </p>
        </div>

        {/* Skill Selector & Action */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <select
            value={selectedSkill.id}
            onChange={e => setSelectedSkillId(e.target.value)}
            style={{
              padding: '10px 16px',
              borderRadius: 8,
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              fontSize: '0.9rem',
              fontWeight: 600,
              outline: 'none'
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
            onClick={handleImprove}
            disabled={isImproving || improvements.length >= 3}
            style={{ padding: '10px 20px' }}
          >
            {isImproving ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Evolving with Gemma...
              </>
            ) : (
              <>
                <RotateCcw size={16} /> Evolve (Feedback Descent)
              </>
            )}
          </button>
        </div>
      </div>

      {/* Evolution Summary Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: 16,
        marginBottom: 28
      }}>
        <div className="glass-card" style={{ padding: 20 }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>CURRENT ACTIVE VERSION</div>
          <div className="mono" style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: 4 }}>
            v{selectedSkill.current_version}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>
            Total snapshots: {Object.keys(selectedSkill.versions).length}
          </div>
        </div>

        <div className="glass-card" style={{ padding: 20 }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>COMPLETED CYCLES</div>
          <div className="mono" style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: 4, color: '#fbbf24' }}>
            {improvements.length} / 3 max
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>
            Bounded retry limit to prevent oscillation
          </div>
        </div>

        <div className="glass-card" style={{ padding: 20 }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>REGRESSION GATE STATUS</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
            <ShieldCheck size={20} color="#34d399" />
            <span style={{ fontWeight: 700, color: '#34d399' }}>Active & Enforced</span>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>
            Regressive candidates are automatically discarded
          </div>
        </div>
      </div>

      {/* Iterations Timeline */}
      <div className="glass-card" style={{ padding: 24, marginBottom: 28 }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <GitCommit size={18} color="#818cf8" />
          Feedback Descent Progression Timeline
        </h2>

        {improvements.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
            No improvements have been run for this skill yet. Click "Evolve" above to test the Feedback Descent loop!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {improvements.map((imp, idx) => (
              <div 
                key={idx}
                style={{
                  padding: 20,
                  borderRadius: 10,
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className="badge badge-indigo">Iteration #{imp.iteration}</span>
                    <span className="mono" style={{ fontWeight: 700 }}>
                      v{imp.previous_version}
                    </span>
                    <ArrowRight size={14} color="#818cf8" />
                    <span className="mono" style={{ fontWeight: 700, color: '#34d399' }}>
                      v{imp.new_version}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="mono" style={{ fontSize: '0.85rem' }}>
                      Pass Rate: <span style={{ color: '#fb7185' }}>{imp.before_pass_rate}%</span> → <span style={{ color: (imp.decision === 'accepted' || (imp.decision === undefined && imp.improved)) ? '#34d399' : '#fbbf24', fontWeight: 700 }}>{imp.after_pass_rate}%</span>
                    </div>
                    <span className={`badge ${(imp.decision === 'accepted' || (imp.decision === undefined && imp.improved)) ? 'badge-emerald' : 'badge-rose'}`}>
                      {(imp.decision === 'accepted' || (imp.decision === undefined && imp.improved)) ? 'ACCEPTED' : 'REJECTED (BASELINE RETAINED)'}
                    </span>
                  </div>
                </div>

                {/* Explicit Decision Reason */}
                {imp.decision_reason && (
                  <div style={{
                    padding: '8px 12px',
                    borderRadius: 6,
                    backgroundColor: (imp.decision === 'accepted' || (imp.decision === undefined && imp.improved)) ? 'rgba(16, 185, 129, 0.08)' : 'rgba(244, 63, 94, 0.08)',
                    fontSize: '0.82rem',
                    color: (imp.decision === 'accepted' || (imp.decision === undefined && imp.improved)) ? '#34d399' : '#fb7185',
                    marginBottom: 10,
                    fontWeight: 600
                  }}>
                    {imp.decision_reason}
                  </div>
                )}

                {/* Fixed and Regressed Test Tags */}
                <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 10, fontSize: '0.75rem' }}>
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

                {/* Failure Analysis */}
                <div style={{
                  padding: '12px 16px',
                  borderRadius: 8,
                  backgroundColor: 'rgba(245, 158, 11, 0.08)',
                  border: '1px solid rgba(245, 158, 11, 0.25)',
                  marginBottom: 12
                }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', marginBottom: 4 }}>
                    Automated Failure Diagnosis
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                    {imp.failure_analysis}
                  </div>
                </div>

                {/* Changes Made */}
                <div style={{
                  padding: '12px 16px',
                  borderRadius: 8,
                  backgroundColor: 'rgba(59, 130, 246, 0.08)',
                  border: '1px solid rgba(59, 130, 246, 0.25)'
                }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', marginBottom: 4 }}>
                    Patches Applied by Improvement Agent
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                    {imp.changes_made}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Code Progression Comparison */}
      <div className="glass-card" style={{ padding: 24 }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Code size={18} color="#38bdf8" />
          Active Implementation Code (v{selectedSkill.current_version})
        </h2>
        <pre className="code-block" style={{ color: '#38bdf8' }}>
          {curVer?.code}
        </pre>
      </div>
    </div>
  );
};
