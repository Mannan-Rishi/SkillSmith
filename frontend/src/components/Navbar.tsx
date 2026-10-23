import React from 'react';
import { 
  Sparkles, 
  LayoutDashboard, 
  PlusCircle, 
  FolderKanban, 
  FlaskConical, 
  TrendingUp, 
  Settings as SettingsIcon,
  Cpu,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { HealthInfo, ModelVerifyInfo } from '../types';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  health: HealthInfo | null;
  verifyInfo: ModelVerifyInfo | null;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  health,
  verifyInfo
}) => {
  const isConnected = verifyInfo?.status === 'connected';

  return (
    <header style={{
      borderBottom: '1px solid var(--border-color)',
      backgroundColor: 'rgba(16, 21, 34, 0.85)',
      backdropFilter: 'blur(12px)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      padding: '0 24px'
    }}>
      <div style={{
        maxWidth: 1400,
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 64
      }}>
        {/* Brand */}
        <div 
          onClick={() => setCurrentTab('dashboard')}
          style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
        >
          <div style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            background: 'linear-gradient(135deg, #6366f1 0%, #3b82f6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 16px rgba(99, 102, 241, 0.4)'
          }}>
            <Sparkles size={20} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 800, fontSize: '1.15rem', letterSpacing: '-0.02em' }}>
                SkillSmith <span style={{ color: '#818cf8' }}>AI</span>
              </span>
              <span className="badge badge-indigo" style={{ fontSize: '0.65rem' }}>MVP</span>
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              Universal Self-Improving Skill Platform
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav style={{ display: 'flex', gap: 4 }}>
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'create', label: 'Create Skill', icon: PlusCircle },
            { id: 'library', label: 'Skills Library', icon: FolderKanban },
            { id: 'testing', label: 'Testing Lab', icon: FlaskConical },
            { id: 'improvement', label: 'Improvement Lab', icon: TrendingUp },
            { id: 'settings', label: 'Settings', icon: SettingsIcon },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setCurrentTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 14px',
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
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Gemma Status Pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div 
            onClick={() => setCurrentTab('settings')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 12px',
              borderRadius: 20,
              backgroundColor: 'var(--bg-secondary)',
              border: `1px solid ${isConnected ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
              cursor: 'pointer',
              fontSize: '0.75rem'
            }}
          >
            <Cpu size={14} color="#818cf8" />
            <span style={{ fontWeight: 600 }} className="mono">
              Ollama Cloud: {health?.model || 'gemma4:31b'}
            </span>
            {isConnected ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#34d399' }}>
                <CheckCircle2 size={12} /> Connected
              </span>
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#fbbf24' }}>
                <AlertTriangle size={12} /> Verify Key
              </span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
