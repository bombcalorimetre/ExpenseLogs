import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { authAPI, categoriesAPI } from '../services/api';
import Header from '../components/Layout/Header';

export default function Settings({ toast }) {
  const { user, updateUser, logout } = useAuth();
  const [tab, setTab] = useState('general');
  const [form, setForm] = useState({ name: '', base_currency: 'USD', fiscal_year_start: 'January 1st' });
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm: '' });
  const [categories, setCategories] = useState([]);
  const [saving, setSaving] = useState(false);
  const [newCat, setNewCat] = useState({ name: '', icon: '📦', color: '#3b82f6', budget_limit: '', type: 'expense' });
  const [theme, setTheme] = useState(() => localStorage.getItem('fincorp_theme') || 'dark');

  const applyTheme = (t) => {
    const resolved = t === 'system'
      ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
      : t;
    document.documentElement.setAttribute('data-theme', resolved);
    localStorage.setItem('fincorp_theme', t);
    setTheme(t);
  };

  useEffect(() => {
    if (user) setForm({ name: user.name || '', base_currency: user.base_currency || 'USD', fiscal_year_start: user.fiscal_year_start || 'January 1st' });
    categoriesAPI.list().then(r => setCategories(r.data));
  }, [user]);

  const saveGeneral = async () => {
    setSaving(true);
    try {
      const res = await authAPI.updateSettings(form);
      updateUser(res.data);
      toast?.success('Settings saved!');
    } catch (e) {
      toast?.error(e.response?.data?.error || 'Failed to save');
    } finally { setSaving(false); }
  };

  const savePassword = async () => {
    if (pwForm.new_password !== pwForm.confirm) { toast?.error('Passwords do not match'); return; }
    setSaving(true);
    try {
      await authAPI.updatePassword({ current_password: pwForm.current_password, new_password: pwForm.new_password });
      setPwForm({ current_password: '', new_password: '', confirm: '' });
      toast?.success('Password updated!');
    } catch (e) {
      toast?.error(e.response?.data?.error || 'Failed to update password');
    } finally { setSaving(false); }
  };

  const addCategory = async () => {
    if (!newCat.name) { toast?.error('Category name required'); return; }
    try {
      const res = await categoriesAPI.create({ ...newCat, budget_limit: parseFloat(newCat.budget_limit) || 0 });
      setCategories(prev => [...prev, res.data]);
      setNewCat({ name: '', icon: '📦', color: '#3b82f6', budget_limit: '', type: 'expense' });
      toast?.success('Category added!');
    } catch (e) { toast?.error('Failed to add category'); }
  };

  const deleteCategory = async (id) => {
    if (!window.confirm('Delete this category?')) return;
    try {
      await categoriesAPI.delete(id);
      setCategories(prev => prev.filter(c => c.id !== id));
      toast?.success('Category deleted');
    } catch (e) { toast?.error('Failed to delete'); }
  };

  const TABS = ['general', 'security', 'categories', 'appearance'];

  return (
    <div style={styles.page}>
      <Header title="Settings" />
      <div style={styles.content}>
        <div style={styles.layout}>
          {/* Left: tab nav */}
          <div style={styles.tabNav}>
            <div style={styles.tabNavTitle}>Configuration &amp; Preferences</div>
            <div style={styles.tabNavSub}>Manage your executive wealth dashboard</div>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 24 }}>
              {TABS.map(t => (
                <button key={t} onClick={() => setTab(t)} style={{ ...styles.tabBtn, ...(tab === t ? styles.tabBtnActive : {}) }}>
                  {TAB_ICONS[t]}
                  <span style={{ textTransform: 'capitalize' }}>{t}</span>
                </button>
              ))}
            </nav>

          </div>

          {/* Right: panels */}
          <div style={styles.panels}>
            {tab === 'general' && (
              <div style={styles.panel}>
                {/* General Preferences */}
                <div style={styles.section}>
                  <div style={{ marginBottom: 16 }}>
                    <div style={styles.sectionTitle}>General Preferences</div>
                    <div style={styles.sectionSub}>Regional and display settings</div>
                  </div>
                  <div style={styles.formGrid}>
                    <div style={styles.field}>
                      <label style={styles.label}>Display Name</label>
                      <input style={styles.input} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                    </div>
                    <div style={styles.field}>
                      <label style={styles.label}>Email Address</label>
                      <input style={{ ...styles.input, opacity: 0.6 }} value={user?.email || ''} disabled />
                    </div>
                    <div style={styles.field}>
                      <label style={styles.label}>Base Currency</label>
                      <select style={styles.input} value={form.base_currency} onChange={e => setForm({ ...form, base_currency: e.target.value })}>
                        <option value="USD">USD - US Dollar ($)</option>
                        <option value="EUR">EUR - Euro (€)</option>
                        <option value="GBP">GBP - British Pound (£)</option>
                        <option value="INR">INR - Indian Rupee (₹)</option>
                        <option value="JPY">JPY - Japanese Yen (¥)</option>
                        <option value="AUD">AUD - Australian Dollar</option>
                        <option value="CAD">CAD - Canadian Dollar</option>
                        <option value="SGD">SGD - Singapore Dollar</option>
                        <option value="CHF">CHF - Swiss Franc</option>
                        <option value="AED">AED - UAE Dirham</option>
                      </select>
                    </div>
                    <div style={styles.field}>
                      <label style={styles.label}>Fiscal Year Start</label>
                      <select style={styles.input} value={form.fiscal_year_start} onChange={e => setForm({ ...form, fiscal_year_start: e.target.value })}>
                        {['January 1st', 'April 1st', 'July 1st', 'October 1st'].map(o => <option key={o}>{o}</option>)}
                      </select>
                    </div>
                  </div>
                  <button onClick={saveGeneral} disabled={saving} style={styles.saveBtn}>
                    {saving ? 'Saving...' : 'Save Configuration'}
                  </button>
                </div>
              </div>
            )}

            {tab === 'security' && (
              <div style={styles.panel}>
                <div style={styles.section}>
                  <div style={{ marginBottom: 18 }}>
                    <div style={styles.sectionTitle}>Update Passphrase</div>
                    <div style={styles.sectionSub}>Keep your account secure with a strong password</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 400 }}>
                    <div style={styles.field}>
                      <label style={styles.label}>Current Password</label>
                      <input style={styles.input} type="password" value={pwForm.current_password} onChange={e => setPwForm({ ...pwForm, current_password: e.target.value })} />
                    </div>
                    <div style={styles.field}>
                      <label style={styles.label}>New Password</label>
                      <input style={styles.input} type="password" placeholder="Min 6 characters" value={pwForm.new_password} onChange={e => setPwForm({ ...pwForm, new_password: e.target.value })} />
                    </div>
                    <div style={styles.field}>
                      <label style={styles.label}>Confirm New Password</label>
                      <input style={styles.input} type="password" value={pwForm.confirm} onChange={e => setPwForm({ ...pwForm, confirm: e.target.value })} />
                    </div>
                    <button onClick={savePassword} disabled={saving} style={styles.saveBtn}>
                      {saving ? 'Updating...' : 'Change Password'}
                    </button>
                  </div>
                </div>

                <div style={styles.section}>
                  <div style={styles.sectionTitle}>Danger Zone</div>
                  <div style={styles.sectionSub}>Irreversible account actions</div>
                  <button onClick={() => { logout(); window.location.href = '/login'; }} style={styles.dangerBtn}>
                    Sign Out of All Devices
                  </button>
                </div>
              </div>
            )}

            {tab === 'categories' && (
              <div style={styles.panel}>
                <div style={styles.section}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
                    <div>
                      <div style={styles.sectionTitle}>Spending Categories</div>
                      <div style={styles.sectionSub}>Customize how your expenses are organized</div>
                    </div>
                  </div>

                  {/* Add new category */}
                  <div style={styles.addCatForm}>
                    <div style={styles.formGrid}>
                      <div style={styles.field}>
                        <label style={styles.label}>Category Name</label>
                        <input style={styles.input} placeholder="e.g. Subscriptions" value={newCat.name} onChange={e => setNewCat({ ...newCat, name: e.target.value })} />
                      </div>
                      <div style={styles.field}>
                        <label style={styles.label}>Icon (Emoji)</label>
                        <input style={styles.input} placeholder="📦" value={newCat.icon} onChange={e => setNewCat({ ...newCat, icon: e.target.value })} />
                      </div>
                      <div style={styles.field}>
                        <label style={styles.label}>Type</label>
                        <select style={styles.input} value={newCat.type} onChange={e => setNewCat({ ...newCat, type: e.target.value })}>
                          <option value="expense">Expense</option>
                          <option value="income">Income</option>
                        </select>
                      </div>
                      <div style={styles.field}>
                        <label style={styles.label}>Monthly Budget ($)</label>
                        <input style={styles.input} type="number" placeholder="0" value={newCat.budget_limit} onChange={e => setNewCat({ ...newCat, budget_limit: e.target.value })} />
                      </div>
                    </div>
                    <button onClick={addCategory} style={{ ...styles.saveBtn, marginTop: 12 }}>+ Add Category</button>
                  </div>

                  {/* Category list */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 20 }}>
                    {categories.map(c => (
                      <div key={c.id} style={styles.catRow}>
                        <div style={{ ...styles.catDot, background: c.color }}>{c.icon}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.type} {c.budget_limit > 0 ? `• $${c.budget_limit}/mo budget` : ''}</div>
                        </div>
                        <button onClick={() => deleteCategory(c.id)} style={styles.deleteBtn}>✕</button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {tab === 'appearance' && (
              <div style={styles.panel}>
                <div style={styles.section}>
                  <div style={{ marginBottom: 24 }}>
                    <div style={styles.sectionTitle}>Theme Appearance</div>
                    <div style={styles.sectionSub}>Choose your preferred visual mode — changes apply instantly</div>
                  </div>

                  <div style={styles.themeRow}>
                    {[
                      { key: 'dark', label: 'Dark', icon: '🌙', preview: 'linear-gradient(135deg, #0d1117 0%, #1c2230 100%)', border: '#1c2230' },
                      { key: 'light', label: 'Light', icon: '☀️', preview: 'linear-gradient(135deg, #f0f4ff 0%, #ffffff 100%)', border: '#dbeafe' },
                      { key: 'system', label: 'System', icon: '💻', preview: 'linear-gradient(135deg, #1c2230 50%, #f0f4ff 50%)', border: '#1c2230' },
                    ].map(({ key, label, icon, preview, border }) => {
                      const isActive = theme === key;
                      return (
                        <div
                          key={key}
                          onClick={() => applyTheme(key)}
                          style={{
                            ...styles.themeCard,
                            ...(isActive ? styles.themeCardActive : {}),
                            cursor: 'pointer',
                          }}
                        >
                          <div style={{
                            width: 90, height: 56, borderRadius: 8, background: preview,
                            border: `1px solid ${border}`, marginBottom: 10,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 22, boxShadow: isActive ? '0 0 0 2px var(--accent)' : 'none',
                            transition: 'box-shadow 0.2s',
                          }}>
                            {icon}
                          </div>
                          <span style={{ fontSize: 12, fontWeight: isActive ? 700 : 500, color: isActive ? 'var(--accent)' : 'var(--text-secondary)' }}>
                            {label}
                          </span>
                          {isActive && (
                            <div style={{ marginTop: 6, width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }} />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div style={{ marginTop: 24, padding: '14px 16px', background: 'var(--accent-dim)', border: '1px solid var(--border-active)', borderRadius: 10, fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14 }}>
                      {theme === 'dark' ? '🌙' : theme === 'light' ? '☀️' : '💻'}
                    </span>
                    Currently using <strong style={{ color: 'var(--accent)', marginLeft: 4 }}>
                      {theme === 'dark' ? 'Dark' : theme === 'light' ? 'Light' : 'System'} mode
                    </strong>
                    {theme === 'system' && <span style={{ marginLeft: 4 }}>(follows your OS preference)</span>}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const TAB_ICONS = {
  general: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>,
  security: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  categories: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  appearance: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
};

const styles = {
  page: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  content: { flex: 1, overflow: 'auto', padding: 24 },
  layout: { display: 'grid', gridTemplateColumns: '240px 1fr', gap: 20 },
  tabNav: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 20, display: 'flex', flexDirection: 'column', height: 'fit-content', position: 'sticky', top: 0 },
  tabNavTitle: { fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, marginBottom: 4 },
  tabNavSub: { fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 },
  tabBtn: {
    display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 8,
    border: 'none', background: 'none', color: 'var(--text-secondary)', cursor: 'pointer',
    fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-body)', textAlign: 'left', width: '100%',
    transition: 'var(--transition)',
  },
  tabBtnActive: { background: 'rgba(30,58,138,0.35)', color: '#93c5fd', boxShadow: 'inset 2px 0 0 #3b82f6' },
  panels: { display: 'flex', flexDirection: 'column', gap: 16 },
  panel: { display: 'flex', flexDirection: 'column', gap: 16 },
  section: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '22px 24px' },
  sectionHeader: { display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 },
  sectionIcon: { width: 36, height: 36, borderRadius: 10, background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 },
  sectionTitle: { fontSize: 14, fontWeight: 700, marginBottom: 2 },
  sectionSub: { fontSize: 12, color: 'var(--text-muted)' },
  badge: { marginLeft: 'auto', background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 20, padding: '4px 12px', fontSize: 11, fontWeight: 600, color: 'var(--accent)' },
  secRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderTop: '1px solid var(--border)' },
  reviewBtn: { background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 14px', color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-body)' },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 },
  field: { display: 'flex', flexDirection: 'column', gap: 5 },
  label: { fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' },
  input: {
    background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
    padding: '9px 12px', color: 'var(--text-primary)', fontSize: 13, outline: 'none',
    fontFamily: 'var(--font-body)', transition: 'var(--transition)',
  },
  saveBtn: {
    background: 'var(--accent)', color: '#0d1117', border: 'none', borderRadius: 'var(--radius-sm)',
    padding: '10px 22px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)',
    transition: 'var(--transition)',
  },
  dangerBtn: {
    marginTop: 14, background: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.25)',
    borderRadius: 'var(--radius-sm)', padding: '10px 20px', color: 'var(--red)', fontSize: 13,
    fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)',
  },
  addCatForm: { background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 10, padding: 16 },
  catRow: { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--bg-input)', borderRadius: 8, border: '1px solid var(--border)' },
  catDot: { width: 34, height: 34, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 },
  deleteBtn: { background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14, padding: 4, borderRadius: 6 },
  themeRow: { display: 'flex', gap: 16 },
  themeCard: { display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', padding: '14px 20px', border: '2px solid var(--border)', borderRadius: 12, transition: 'var(--transition)' },
  themeCardActive: { border: '2px solid var(--accent)', background: 'var(--accent-dim)' },
  themePreview: { width: 80, height: 48, borderRadius: 6 },
};
