import React, { useState } from 'react';
import { 
  Search, 
  Layers, 
  FlaskConical, 
  TrendingUp, 
  Download, 
  Trash2, 
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { Skill } from '../types';

interface SkillLibraryViewProps {
  skills: Skill[];
  onSelectSkill: (skill: Skill, initialTab?: string) => void;
  onExportSkill: (skillId: string) => void;
  onDeleteSkill: (skillId: string) => void;
  onNavigate: (tab: string) => void;
}

export const SkillLibraryView: React.FC<SkillLibraryViewProps> = ({
  skills,
  onSelectSkill,
  onExportSkill,
  onDeleteSkill,
  onNavigate
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const categories = ['All', ...Array.from(new Set(skills.map(s => s.category)))];

  const filteredSkills = skills.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.versions[s.current_version]?.manifest?.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || s.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '32px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 6 }}>
            Skills Repository
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Browse and manage certified autonomous skills, execution history snapshots, and versioned artifacts.
          </p>
        </div>

        <button 
          className="btn btn-primary"
          onClick={() => onNavigate('create')}
          style={{ padding: '10px 18px' }}
        >
          <Sparkles size={16} /> Create Skill
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 28, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className="btn btn-secondary"
              style={{
                padding: '6px 14px',
                fontSize: '0.8rem',
                backgroundColor: selectedCategory === cat ? 'var(--accent-indigo)' : 'var(--bg-secondary)',
                color: selectedCategory === cat ? '#fff' : 'var(--text-secondary)',
                borderColor: selectedCategory === cat ? 'var(--accent-indigo)' : 'var(--border-color)',
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', width: 280 }}>
          <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: 12 }} />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search skills..."
            style={{
              width: '100%',
              padding: '10px 12px 10px 36px',
              borderRadius: 8,
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              fontSize: '0.85rem',
              outline: 'none'
            }}
          />
        </div>
      </div>

      {/* Grid of Skills */}
      {filteredSkills.length === 0 ? (
        <div className="glass-card" style={{ padding: '60px 24px', textAlign: 'center' }}>
          <div style={{ color: 'var(--text-muted)', marginBottom: 12 }}>No skills found matching your filter.</div>
          <button className="btn btn-primary" onClick={() => onNavigate('create')}>
            Create your first skill
          </button>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
          gap: 20
        }}>
          {filteredSkills.map(skill => {
            const curVer = skill.versions[skill.current_version];
            const latestRun = curVer?.latest_run;
            const passRate = latestRun ? latestRun.pass_rate : 0;

            return (
              <div 
                key={skill.id}
                className="glass-card"
                style={{ padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <span className="badge badge-indigo">{skill.category}</span>
                    <span className="mono" style={{
                      fontSize: '0.75rem',
                      padding: '2px 8px',
                      borderRadius: 4,
                      backgroundColor: 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)'
                    }}>
                      v{skill.current_version}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>
                    {skill.name}
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 20 }}>
                    {curVer?.manifest?.description || 'AI Skill'}
                  </p>
                </div>

                <div>
                  {/* Health Bar */}
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: 6 }}>
                      <span style={{ color: 'var(--text-muted)' }}>Verified Test Health:</span>
                      <span className="mono" style={{ fontWeight: 700 }}>
                        {passRate}% ({latestRun?.passed_count || 0}/{skill.test_cases.length})
                      </span>
                    </div>
                    <div style={{
                      height: 6,
                      width: '100%',
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
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: 14 }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                        title="Export Artifacts"
                        onClick={() => onExportSkill(skill.id)}
                      >
                        <Download size={14} />
                      </button>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '6px 10px', fontSize: '0.75rem', color: '#fb7185' }}
                        title="Delete Skill"
                        onClick={() => onDeleteSkill(skill.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <button
                      className="btn btn-primary"
                      style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                      onClick={() => onSelectSkill(skill, 'detail')}
                    >
                      View Details <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
