import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  Cpu, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Key, 
  Server, 
  Lock,
  Loader2,
  Cloud,
  Sparkles,
  Save,
  Check
} from 'lucide-react';
import { HealthInfo, ModelVerifyInfo, AppSettings } from '../types';
import { verifyModel, fetchSettings, updateSettings } from '../api';

interface SettingsViewProps {
  health: HealthInfo | null;
  verifyInfo: ModelVerifyInfo | null;
  onRefreshHealth: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  health,
  verifyInfo: initialVerifyInfo,
  onRefreshHealth
}) => {
  const [testingConnection, setTestingConnection] = useState(false);
  const [verifyResult, setVerifyResult] = useState<ModelVerifyInfo | null>(initialVerifyInfo);
  
  // App Settings state
  const [settings, setSettings] = useState<AppSettings>({
    auto_evolve_on_failure: false,
    max_evolution_iterations: 2
  });
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoadingSettings(true);
    try {
      const data = await fetchSettings();
      setSettings(data);
    } catch (e: any) {
      console.error('Failed to load settings:', e);
    } finally {
      setLoadingSettings(false);
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    setSaveSuccess(false);
    try {
      const updated = await updateSettings(settings);
      setSettings(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e: any) {
      console.error('Failed to update settings:', e);
      alert('Failed to save settings: ' + e.message);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    try {
      const res = await verifyModel();
      setVerifyResult(res);
      onRefreshHealth();
    } catch (e: any) {
      console.error(e);
      alert('Verification test failed: ' + e.message);
    } finally {
      setTestingConnection(false);
    }
  };

  const isConnected = verifyResult?.status === 'connected';

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 24px' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: '1.65rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 6 }}>
          Platform & Autonomous Evolution Settings
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Inspect active Gemma LLM provider settings via Ollama Cloud, configure autonomous test-triggered evolution cycles, and audit safe execution policies.
        </p>
      </div>

      {/* Feature C: Autonomous Evolution Settings */}
      <div className="glass-card" style={{ padding: 24, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Sparkles size={22} color="#a855f7" />
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Autonomous Evolution Engine (Feature C)</h2>
          </div>
          <button
            className="btn btn-primary"
            onClick={handleSaveSettings}
            disabled={savingSettings || loadingSettings}
            style={{ padding: '6px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {savingSettings ? <Loader2 size={14} className="animate-spin" /> : saveSuccess ? <Check size={14} /> : <Save size={14} />}
            {saveSuccess ? 'Saved!' : 'Save Settings'}
          </button>
        </div>

        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.5 }}>
          When autonomous evolution is enabled, any test execution run that encounters failures will automatically diagnose root causes, generate candidate improvements with Gemma, and test them with strict regression protection.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '14px 16px',
            borderRadius: 8,
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)'
          }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 4 }}>
                Auto-Evolve on Test Failure
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Automatically trigger iterative Feedback Descent cycles when any test case fails.
              </div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: 8 }}>
              <input
                type="checkbox"
                checked={settings.auto_evolve_on_failure}
                onChange={(e) => setSettings({ ...settings, auto_evolve_on_failure: e.target.checked })}
                style={{ width: 18, height: 18, cursor: 'pointer', accentColor: '#818cf8' }}
              />
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: settings.auto_evolve_on_failure ? '#34d399' : 'var(--text-muted)' }}>
                {settings.auto_evolve_on_failure ? 'ENABLED' : 'DISABLED'}
              </span>
            </label>
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '14px 16px',
            borderRadius: 8,
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)'
          }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 4 }}>
                Max Autonomous Evolution Cycles
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Maximum diagnostic feedback cycles to attempt per test run (1 to 5).
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                type="number"
                min={1}
                max={5}
                value={settings.max_evolution_iterations}
                onChange={(e) => setSettings({ ...settings, max_evolution_iterations: Math.max(1, Math.min(5, parseInt(e.target.value) || 1)) })}
                style={{
                  width: 70,
                  padding: '6px 10px',
                  borderRadius: 6,
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontWeight: 600,
                  textAlign: 'center'
                }}
              />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>cycles</span>
            </div>
          </div>
        </div>
      </div>

      {/* Ollama Cloud Connection Card */}
      <div className="glass-card" style={{ padding: 24, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Cloud size={22} color="#818cf8" />
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Ollama Cloud — Gemma Model Provider</h2>
          </div>

          <button
            className="btn btn-secondary"
            onClick={handleTestConnection}
            disabled={testingConnection}
            style={{ padding: '6px 14px', fontSize: '0.8rem' }}
          >
            {testingConnection ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Test Live Connection
          </button>
        </div>

        {/* Live Status Banner */}
        <div style={{
          padding: 16,
          borderRadius: 8,
          backgroundColor: isConnected ? 'rgba(16, 185, 129, 0.08)' : 'rgba(245, 158, 11, 0.08)',
          border: `1px solid ${isConnected ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
          marginBottom: 20,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12
        }}>
          {isConnected ? (
            <CheckCircle2 size={20} color="#34d399" style={{ flexShrink: 0, marginTop: 2 }} />
          ) : (
            <AlertTriangle size={20} color="#fbbf24" style={{ flexShrink: 0, marginTop: 2 }} />
          )}
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: isConnected ? '#34d399' : '#fbbf24', marginBottom: 4 }}>
              {isConnected ? 'Ollama Cloud Connection Verified (PASS)' : 'Connection Verification Needed (FAIL)'}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {verifyResult?.message || 'Testing connection status...'}
            </div>
          </div>
        </div>

        {/* Config Table */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 6, backgroundColor: 'var(--bg-secondary)' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Server size={14} /> LLM Provider
            </span>
            <span className="mono" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#818cf8' }}>
              Ollama Cloud
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 6, backgroundColor: 'var(--bg-secondary)' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Cpu size={14} /> Verified Gemma Model
            </span>
            <span className="mono" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
              {health?.model || 'gemma4:31b'}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 6, backgroundColor: 'var(--bg-secondary)' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Server size={14} /> Official OpenAI-Compatible Endpoint
            </span>
            <span className="mono" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#38bdf8' }}>
              {health?.provider_endpoint || 'https://ollama.com/v1'}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 6, backgroundColor: 'var(--bg-secondary)' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Key size={14} /> Backend OLLAMA_API_KEY
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="mono" style={{ fontSize: '0.85rem' }}>
                {health?.key_masked || 'NOT_CONFIGURED'}
              </span>
              <span className={`badge ${health?.key_configured ? 'badge-emerald' : 'badge-rose'}`} style={{ fontSize: '0.65rem' }}>
                {health?.key_configured ? 'LOADED FROM .ENV' : 'MISSING'}
              </span>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border-color)', fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
          <strong>Configuring Ollama Cloud:</strong> In the root <code className="mono">.env</code> file, set:
          <pre className="code-block" style={{ marginTop: 8, padding: 10 }}>
{`OLLAMA_API_KEY=your_ollama_api_key_here
OLLAMA_BASE_URL=https://ollama.com/v1
OLLAMA_MODEL=gemma4:31b`}
          </pre>
          The backend automatically loads these variables securely without exposing secrets to client code.
        </div>
      </div>

      {/* Safety & Sandboxing Policies Card */}
      <div className="glass-card" style={{ padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <ShieldCheck size={22} color="#34d399" />
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Sandbox Safety & Execution Policies</h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, fontSize: '0.85rem' }}>
          <div style={{ padding: 16, borderRadius: 8, backgroundColor: 'var(--bg-secondary)' }}>
            <div style={{ fontWeight: 700, marginBottom: 6, color: '#34d399' }}>✓ Allowlisted Libraries</div>
            <p style={{ color: 'var(--text-secondary)' }}>
              Skills can execute pure algorithmic Python logic using <code className="mono">math</code>, <code className="mono">re</code>, <code className="mono">json</code>, <code className="mono">datetime</code>, and native data structures.
            </p>
          </div>

          <div style={{ padding: 16, borderRadius: 8, backgroundColor: 'var(--bg-secondary)' }}>
            <div style={{ fontWeight: 700, marginBottom: 6, color: '#fb7185' }}>✕ Prohibited Host Operations</div>
            <p style={{ color: 'var(--text-secondary)' }}>
              Calls to <code className="mono">os</code>, <code className="mono">sys</code>, <code className="mono">subprocess</code>, file writing, network sockets, and <code className="mono">open()</code> are strictly rejected by the AST analyzer.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
