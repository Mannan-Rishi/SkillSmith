import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { CreateSkillView } from './components/CreateSkillView';
import { SkillLibraryView } from './components/SkillLibraryView';
import { SkillDetailView } from './components/SkillDetailView';
import { TestingLabView } from './components/TestingLabView';
import { ImprovementLabView } from './components/ImprovementLabView';
import { SettingsView } from './components/SettingsView';
import { fetchHealth, verifyModel, fetchSkills, runSkillTests, improveSkill, exportSkill, deleteSkill } from './api';
import { Skill, HealthInfo, ModelVerifyInfo } from './types';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [skills, setSkills] = useState<Skill[]>([]);
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [detailInitialTab, setDetailInitialTab] = useState<string>('skill_md');
  const [health, setHealth] = useState<HealthInfo | null>(null);
  const [verifyInfo, setVerifyInfo] = useState<ModelVerifyInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Load initial health and skills
  const loadData = async () => {
    try {
      const [h, s] = await Promise.all([
        fetchHealth().catch(() => null),
        fetchSkills().catch(() => [])
      ]);
      setHealth(h);
      setSkills(s);
      if (s.length > 0 && !selectedSkill) {
        setSelectedSkill(s[0]);
      }
      
      // Async verify model without blocking UI
      verifyModel().then(v => setVerifyInfo(v)).catch(() => null);
    } catch (e) {
      console.error('Failed to load initial data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSelectSkill = (skill: Skill, initialTab: string = 'skill_md') => {
    setSelectedSkill(skill);
    setDetailInitialTab(initialTab);
    setCurrentTab('detail');
  };

  const handleSkillCreated = (newSkill: Skill) => {
    setSkills(prev => [newSkill, ...prev]);
    setSelectedSkill(newSkill);
    setDetailInitialTab('skill_md');
    setCurrentTab('detail');
  };

  const handleRunTests = async (skillId: string, version: string) => {
    try {
      const run = await runSkillTests(skillId, version);
      setSkills(prev => prev.map(s => {
        if (s.id === skillId) {
          const curVer = s.versions[version];
          return {
            ...s,
            runs: [...s.runs, run],
            versions: {
              ...s.versions,
              [version]: { ...curVer, latest_run: run }
            }
          };
        }
        return s;
      }));
      if (selectedSkill?.id === skillId) {
        setSelectedSkill(prev => {
          if (!prev) return null;
          const curVer = prev.versions[version];
          return {
            ...prev,
            runs: [...prev.runs, run],
            versions: {
              ...prev.versions,
              [version]: { ...curVer, latest_run: run }
            }
          };
        });
      }
    } catch (e) {
      alert('Error running tests: ' + e);
    }
  };

  const handleImproveSkill = async (skillId: string) => {
    try {
      const updated = await improveSkill(skillId);
      setSkills(prev => prev.map(s => s.id === skillId ? updated : s));
      if (selectedSkill?.id === skillId) {
        setSelectedSkill(updated);
      }
      setCurrentTab('improvement');
    } catch (e: any) {
      alert('Improvement failed: ' + (e.message || e));
    }
  };

  const handleExportSkill = async (skillId: string) => {
    try {
      const data = await exportSkill(skillId);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${data.id}_v${data.version}_artifact.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Failed to export skill: ' + e);
    }
  };

  const handleDeleteSkill = async (skillId: string) => {
    if (!confirm('Are you sure you want to delete this skill?')) return;
    try {
      await deleteSkill(skillId);
      setSkills(prev => prev.filter(s => s.id !== skillId));
      if (selectedSkill?.id === skillId) {
        setSelectedSkill(skills.find(s => s.id !== skillId) || null);
      }
    } catch (e) {
      alert('Failed to delete skill: ' + e);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)', display: 'flex', flexDirection: 'column' }}>
      <Navbar 
        currentTab={currentTab} 
        setCurrentTab={setCurrentTab} 
        health={health} 
        verifyInfo={verifyInfo} 
      />

      <main style={{ flex: 1 }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', color: 'var(--text-muted)' }}>
            Loading SkillSmith Studio...
          </div>
        ) : (
          <>
            {currentTab === 'dashboard' && (
              <DashboardView 
                skills={skills} 
                health={health} 
                verifyInfo={verifyInfo} 
                onSelectSkill={handleSelectSkill}
                onNavigate={setCurrentTab}
              />
            )}

            {currentTab === 'create' && (
              <CreateSkillView 
                health={health} 
                onSkillCreated={handleSkillCreated} 
                onNavigate={setCurrentTab}
              />
            )}

            {currentTab === 'library' && (
              <SkillLibraryView 
                skills={skills} 
                onSelectSkill={handleSelectSkill}
                onExportSkill={handleExportSkill}
                onDeleteSkill={handleDeleteSkill}
                onNavigate={setCurrentTab}
              />
            )}

            {currentTab === 'detail' && selectedSkill && (
              <SkillDetailView 
                skill={selectedSkill} 
                onBack={() => setCurrentTab('library')}
                onRunTests={handleRunTests}
                onImprove={handleImproveSkill}
                onExport={handleExportSkill}
                initialTab={detailInitialTab}
              />
            )}

            {currentTab === 'testing' && (
              <TestingLabView 
                skills={skills} 
                onSkillUpdated={updated => {
                  setSkills(prev => prev.map(s => s.id === updated.id ? updated : s));
                  if (selectedSkill?.id === updated.id) setSelectedSkill(updated);
                }} 
              />
            )}

            {currentTab === 'improvement' && (
              <ImprovementLabView 
                skills={skills} 
                onSkillUpdated={updated => {
                  setSkills(prev => prev.map(s => s.id === updated.id ? updated : s));
                  if (selectedSkill?.id === updated.id) setSelectedSkill(updated);
                }} 
              />
            )}

            {currentTab === 'settings' && (
              <SettingsView 
                health={health} 
                verifyInfo={verifyInfo} 
                onRefreshHealth={loadData}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
};
