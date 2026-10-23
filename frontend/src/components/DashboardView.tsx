import React from 'react';
import { 
  Sparkles, 
  CheckCircle2, 
  FlaskConical, 
  TrendingUp, 
  Play, 
  ArrowRight,
  ShieldCheck,
  FileCode,
  Layers,
  Activity
} from 'lucide-react';
import { Skill, HealthInfo, ModelVerifyInfo } from '../types';

interface DashboardViewProps {
  skills: Skill[];
  health: HealthInfo | null;
  verifyInfo: ModelVerifyInfo | null;
  onSelectSkill: (skill: Skill, initialSubTab?: string) => void;
  onNavigate: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  skills,
  health,
  verifyInfo,
  onSelectSkill,
  onNavigate,
}) => {
  const totalTests = skills.reduce((acc, s) => acc + s.test_cases.length, 0);
  const totalRuns = skills.reduce((acc, s) => acc + s.runs.length, 0);
  const totalImprovements = skills.reduce((acc, s) => acc + s.improvements.length, 0);
  
  // Calculate aggregate pass rate from latest runs
  let passedTestsCount = 0;
  let executedTestsCount = 0;
  skills.forEach(s => {
    const curVer = s.versions[s.current_version];
    if (curVer?.latest_run) {
      passedTestsCount += curVer.latest_run.passed_count;
      executedTestsCount += curVer.latest_run.total_tests;
    }
  });
  const avgPassRate = executedTestsCount > 0 
    ? Math.round((passedTestsCount / executedTestsCount) * 100) 
    : 0;

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '32px 24px' }}>
      {/* Hero Welcome */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 32,
        padding: '28px 32px',
        borderRadius: 16,
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(59, 130, 246, 0.05) 100%)',
        border: '1px solid rgba(99, 102, 241, 0.25)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span className="badge badge-indigo">Gemma-Powered Engine</span>
            <span className="badge badge-emerald">Safe AST Sandbox</span>
          </div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, marginBottom: 8, letterSpacing: '-0.02em' }}>
            Universal AI Skill Studio
          </h1>
          <p style={{ color: 'var(--text-secondary)', maxWidth: 680, fontSize: '0.95rem' }}>
            Transform natural language instructions into verifiable, self-improving AI skills. 
            SkillSmith executes real code in restricted sandboxes, runs adversarial assertions, and executes Feedback Descent to self-heal.
          </p>
        </div>
        <button 
          className="btn btn-primary"
          style={{ padding: '12px 24px', fontSize: '0.95rem' }}
          onClick={() => onNavigate('create')}
        >
          <Sparkles size={18} />
          Create New Skill
        </button>
      </div>

      {/* Metrics Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 16,
        marginBottom: 32
      }}>
        {[
          { label: 'Registered Skills', value: skills.length, icon: Layers, color: '#818cf8' },
          { label: 'Generated Test Cases', value: totalTests, icon: FlaskConical, color: '#38bdf8' },
          { label: 'Sandbox Executions', value: totalRuns, icon: Activity, color: '#34d399' },
          { label: 'Feedback Improvements', value: totalImprovements, icon: TrendingUp, color: '#fbbf24' },
          { label: 'Certified Pass Rate', value: `${avgPassRate}%`, icon: ShieldCheck, color: '#a78bfa' },
        ].map((m, idx) => {
          const Icon = m.icon;
          return (
            <div key={idx} className="glass-card" style={{ padding: '20px 24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                  {m.label}
                </span>
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  backgroundColor: 'var(--bg-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Icon size={16} color={m.color} />
                </div>
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800 }} className="mono">
                {m.value}
              </div>
            </div>
          );
        })}
      </div>

      {/* Active Skills Table */}
      <div className="glass-card" style={{ padding: 24, marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Live Certified Skills</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Skills active in the repository with execution histories and test verification
            </p>
          </div>
          <button 
            className="btn btn-secondary" 
            style={{ fontSize: '0.8rem' }}
            onClick={() => onNavigate('library')}
          >
            View All ({skills.length}) <ArrowRight size={14} />
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '12px 16px' }}>Skill Name</th>
                <th style={{ padding: '12px 16px' }}>Category</th>
                <th style={{ padding: '12px 16px' }}>Current Version</th>
                <th style={{ padding: '12px 16px' }}>Test Health</th>
                <th style={{ padding: '12px 16px' }}>Sandbox Runtime</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {skills.map(s => {
                const curVer = s.versions[s.current_version];
                const latestRun = curVer?.latest_run;
                const passRate = latestRun ? latestRun.pass_rate : 0;
                
                return (
                  <tr 
                    key={s.id} 
                    style={{ borderBottom: '1px solid rgba(35, 45, 69, 0.4)', transition: 'background 0.15s ease' }}
                  >
                    <td style={{ padding: '16px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
                        {s.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {curVer?.manifest?.description?.slice(0, 75)}...
                      </div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <span className="badge badge-indigo">
                        {s.category}
                      </span>
                    </td>
                    <td style={{ padding: '16px' }} className="mono">
                      <span style={{ 
                        padding: '2px 8px', 
                        borderRadius: 4, 
                        background: 'var(--bg-secondary)', 
                        border: '1px solid var(--border-color)',
                        fontSize: '0.8rem'
                      }}>
                        v{s.current_version}
                      </span>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          flex: 1,
                          height: 6,
                          width: 80,
                          backgroundColor: 'var(--bg-secondary)',
                          borderRadius: 3,
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            width: `${passRate}%`,
                            height: '100%',
                            backgroundColor: passRate === 100 ? '#10b981' : passRate >= 60 ? '#f59e0b' : '#f43f5e',
                            borderRadius: 3
                          }} />
                        </div>
                        <span className="mono" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                          {passRate}%
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <span className="badge badge-emerald" style={{ fontSize: '0.7rem' }}>
                        {curVer?.manifest?.execution_strategy || 'restricted_python'}
                      </span>
                    </td>
                    <td style={{ padding: '16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                          onClick={() => onSelectSkill(s, 'tests')}
                        >
                          <FlaskConical size={13} /> Tests
                        </button>
                        <button
                          className="btn btn-primary"
                          style={{ padding: '4px 12px', fontSize: '0.75rem' }}
                          onClick={() => onSelectSkill(s, 'detail')}
                        >
                          View Skill
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Architecture Highlights */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: 20
      }}>
        <div className="glass-card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <FileCode size={20} color="#818cf8" />
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Universal SKILL.md Standard</h3>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Every skill outputs a machine-readable manifest, standard frontmatter documentation, and a companion safe Python executor that plugs into any agent runtime.
          </p>
        </div>

        <div className="glass-card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <TrendingUp size={20} color="#34d399" />
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Feedback Descent Evolution</h3>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Inherited from EvoSkill's core mathematical optimization loop. Failures generate diagnostic traces which guide the Improvement Agent to repair boundary bugs without regressions.
          </p>
        </div>

        <div className="glass-card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <ShieldCheck size={20} color="#38bdf8" />
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Zero Fabrications Policy</h3>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Never fake a test score. Execution outcomes reflect real Python AST evaluations and genuine assertion verifications against measured outputs.
          </p>
        </div>
      </div>
    </div>
  );
};
