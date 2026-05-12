import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { transactionsAPI, categoriesAPI } from '../../services/api';
import Header from '../Layout/Header';

const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

export default function History({ toast }) {
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [viewMode, setViewMode] = useState('list');
  const [filters, setFilters] = useState({ type: '', status: '', category_id: '' });
  const [searchParams] = useSearchParams();
  const search = searchParams.get('search') || '';

  const fetchData = useCallback(() => {
    setLoading(true);
    const params = { page, limit: 15, search, ...filters };
    Object.keys(params).forEach(k => !params[k] && delete params[k]);
    transactionsAPI.list(params)
      .then(res => { setTransactions(res.data.transactions); setTotal(res.data.total); })
      .finally(() => setLoading(false));
  }, [page, search, filters]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { categoriesAPI.list().then(r => setCategories(r.data)); }, []);

  // Group by date
  const grouped = transactions.reduce((acc, tx) => {
    const d = tx.date;
    if (!acc[d]) acc[d] = [];
    acc[d].push(tx);
    return acc;
  }, {});

  const totalMonthly = transactions.reduce((s, t) => t.type === 'expense' ? s + t.amount : s, 0);
  const highest = categories.find(c => c.name === 'Luxury Travel')?.name || 'Luxury Travel';
  const pending = transactions.filter(t => t.status === 'pending');

  return (
    <div style={styles.page}>
      <Header
        title="Expense History"
        actions={
          <button onClick={() => setShowModal(true)} style={styles.addBtn}>
            + Log Expense
          </button>
        }
      />
      <div style={styles.content}>
        {/* Stats row */}
        <div style={styles.statsRow}>
          <StatCard label="TOTAL MONTHLY SPEND" value={fmt(totalMonthly)} sub="12% lower than last month" subColor="var(--accent)" />
          <StatCard label="HIGHEST CATEGORY" value="Luxury Travel" sub="34% of total expenses" />
          <StatCard label="PENDING APPROVAL" value={`${pending.length} transactions`} sub={`Totaling ${fmt(pending.reduce((s, t) => s + t.amount, 0))}`} />
          <StatCard label="STATEMENT HEALTH" value="Optimal" sub="All accounts reconciled" icon="🛡" valueColor="var(--accent)" />
        </div>

        {/* Filters + Table */}
        <div style={styles.card}>
          <div style={styles.filterRow}>
            <div style={styles.tabs}>
              {['All Accounts', 'Business', 'Personal'].map(t => (
                <button key={t} style={styles.tab}>{t}</button>
              ))}
            </div>
            <div style={styles.filterRight}>
              <select
                style={styles.select}
                value={filters.type}
                onChange={e => setFilters({ ...filters, type: e.target.value })}
              >
                <option value="">All Types</option>
                <option value="expense">Expenses</option>
                <option value="income">Income</option>
              </select>
              <select
                style={styles.select}
                value={filters.status}
                onChange={e => setFilters({ ...filters, status: e.target.value })}
              >
                <option value="">All Status</option>
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
              </select>
              <select
                style={styles.select}
                value={filters.category_id}
                onChange={e => setFilters({ ...filters, category_id: e.target.value })}
              >
                <option value="">All Categories</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <button style={styles.exportBtn}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Export
              </button>
            </div>
          </div>

          {/* Table header */}
          <div style={styles.tableHeader}>
            <span>MERCHANT / DESCRIPTION</span>
            <span>CATEGORY</span>
            <span>STATUS</span>
            <span style={{ textAlign: 'right' }}>AMOUNT</span>
          </div>

          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
          ) : Object.keys(grouped).length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No transactions found</div>
          ) : (
            Object.entries(grouped).sort((a, b) => b[0].localeCompare(a[0])).map(([date, txs]) => (
              <div key={date}>
                <div style={styles.dateGroup}>
                  {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })}
                </div>
                {txs.map(tx => (
                  <div key={tx.id} style={styles.txRow}>
                    <div style={styles.txMerchant}>
                      <div style={{ ...styles.txIcon, background: tx.category_color ? `${tx.category_color}22` : 'var(--bg-card-hover)' }}>
                        {tx.category_icon || '💳'}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{tx.merchant}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{tx.description}</div>
                      </div>
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{tx.category_name || (tx.type === 'income' ? 'Income' : 'Other')}</span>
                    <span style={{ ...styles.statusBadge, ...(STATUS_STYLES[tx.status] || {}) }}>
                      • {tx.status}
                    </span>
                    <div style={{ textAlign: 'right', fontWeight: 700, fontSize: 13, color: tx.type === 'income' ? 'var(--accent)' : 'var(--text-primary)' }}>
                      {tx.type === 'income' ? '+' : '-'}{fmt(tx.amount)}
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}

          {/* Pagination */}
          <div style={styles.pagination}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Showing {transactions.length} of {total}
            </span>
            <div style={styles.pageButtons}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={styles.pageBtn}>← Prev</button>
              <span style={{ fontSize: 12, padding: '0 8px' }}>Page {page}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={transactions.length < 15} style={styles.pageBtn}>Next →</button>
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <AddExpenseModal
          categories={categories}
          onClose={() => setShowModal(false)}
          onSave={() => { fetchData(); setShowModal(false); toast?.success('Transaction saved!'); }}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, sub, subColor, icon, valueColor }) {
  return (
    <div style={styles.statCard}>
      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 10 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, color: valueColor || 'var(--text-primary)', marginBottom: 4 }}>
        {icon && <span style={{ marginRight: 6 }}>{icon}</span>}{value}
      </div>
      <div style={{ fontSize: 11, color: subColor || 'var(--text-muted)' }}>{sub}</div>
    </div>
  );
}

function AddExpenseModal({ categories, onClose, onSave }) {
  const [form, setForm] = useState({
    merchant: '', description: '', amount: '', type: 'expense',
    category_id: '', date: new Date().toISOString().slice(0, 10),
    time: new Date().toTimeString().slice(0, 5), status: 'approved',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const expenseCats = categories.filter(c => c.type === 'expense');
  const incomeCats = categories.filter(c => c.type === 'income');
  const displayCats = form.type === 'expense' ? expenseCats : incomeCats;

  const handleSave = async () => {
    if (!form.merchant || !form.amount || !form.date) {
      setError('Merchant, amount and date are required'); return;
    }
    setSaving(true);
    try {
      await transactionsAPI.create({ ...form, amount: parseFloat(form.amount) });
      onSave();
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to save');
    } finally { setSaving(false); }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.modalHeader}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700 }}>Log New Expense</h2>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>Record your corporate expenditure with precision</p>
          </div>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>

        <div style={styles.modalBody}>
          {/* Type toggle */}
          <div style={styles.typeToggle}>
            {['expense', 'income'].map(t => (
              <button
                key={t}
                onClick={() => setForm({ ...form, type: t, category_id: '' })}
                style={{ ...styles.typeBtn, ...(form.type === t ? styles.typeBtnActive : {}) }}
              >
                {t === 'expense' ? '↓ Expense' : '↑ Income'}
              </button>
            ))}
          </div>

          {/* Amount */}
          <div style={styles.amountDisplay}>
            <span style={{ fontSize: 24, color: 'var(--text-muted)', fontWeight: 300 }}>$</span>
            <input
              style={styles.amountInput}
              type="number"
              placeholder="0.00"
              value={form.amount}
              onChange={e => setForm({ ...form, amount: e.target.value })}
            />
          </div>

          <div style={styles.formGrid}>
            <div style={styles.field}>
              <label style={styles.label}>Merchant / Service</label>
              <input style={styles.input} placeholder="e.g. Emirates Airlines" value={form.merchant} onChange={e => setForm({ ...form, merchant: e.target.value })} />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Date</label>
              <input style={styles.input} type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Category</label>
              <select style={styles.input} value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })}>
                <option value="">Select category</option>
                {displayCats.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Status</label>
              <select style={styles.input} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
              </select>
            </div>
            <div style={{ ...styles.field, gridColumn: '1 / -1' }}>
              <label style={styles.label}>Description / Memo</label>
              <input style={styles.input} placeholder="Add notes about this transaction..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
          </div>

          {error && <div style={styles.error}>⚠ {error}</div>}

          {/* Tax note */}
          <div style={styles.taxNote}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <span>This expense may be automatically categorized as <strong style={{ color: 'var(--blue)' }}>Tax Deductible</strong> based on your business profile.</span>
          </div>
        </div>

        <div style={styles.modalFooter}>
          <button onClick={onClose} style={styles.cancelBtn}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={styles.saveBtn}>
            {saving ? 'Saving...' : '✓ Save Expense'}
          </button>
        </div>
      </div>
    </div>
  );
}

const STATUS_STYLES = {
  approved: { color: '#10B981', background: 'rgba(16,185,129,0.1)' },
  pending: { color: 'var(--yellow)', background: 'rgba(245,158,11,0.1)' },
  rejected: { color: 'var(--red)', background: 'var(--red-dim)' },
};

const styles = {
  page: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  content: { flex: 1, overflow: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 20 },
  addBtn: {
    background: 'var(--accent)', color: '#0d1117', border: 'none', borderRadius: 'var(--radius-sm)',
    padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)',
  },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 },
  statCard: {
    background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
    padding: '20px 20px 16px',
  },
  card: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' },
  filterRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border)' },
  tabs: { display: 'flex', gap: 4 },
  tab: {
    background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
    padding: '6px 14px', color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer',
    fontFamily: 'var(--font-body)',
  },
  filterRight: { display: 'flex', gap: 8, alignItems: 'center' },
  select: {
    background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
    padding: '6px 10px', color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer',
    fontFamily: 'var(--font-body)',
  },
  exportBtn: {
    background: 'var(--accent)', color: '#0d1117', border: 'none', borderRadius: 'var(--radius-sm)',
    padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)',
    display: 'flex', alignItems: 'center', gap: 6,
  },
  tableHeader: {
    display: 'grid', gridTemplateColumns: '2.5fr 1.2fr 1fr 1fr', gap: 16, padding: '10px 20px',
    fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.1em',
    borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)',
  },
  dateGroup: {
    padding: '8px 20px', fontSize: 11, fontWeight: 600, color: 'var(--accent)',
    background: 'rgba(0,212,170,0.04)', borderBottom: '1px solid var(--border)',
  },
  txRow: {
    display: 'grid', gridTemplateColumns: '2.5fr 1.2fr 1fr 1fr', gap: 16, alignItems: 'center',
    padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.03)',
    transition: 'background 0.15s',
  },
  txMerchant: { display: 'flex', alignItems: 'center', gap: 12 },
  txIcon: { width: 34, height: 34, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 },
  statusBadge: { fontSize: 11, fontWeight: 500, padding: '3px 10px', borderRadius: 20 },
  pagination: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderTop: '1px solid var(--border)' },
  pageButtons: { display: 'flex', alignItems: 'center', gap: 4 },
  pageBtn: { background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 12px', color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-body)' },
  // Modal
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modal: { background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', width: 560, maxHeight: '90vh', display: 'flex', flexDirection: 'column', animation: 'scaleIn 0.2s ease' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '24px 24px 0' },
  closeBtn: { background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 16, cursor: 'pointer', padding: 4 },
  modalBody: { padding: '20px 24px', overflow: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 16 },
  typeToggle: { display: 'flex', gap: 8 },
  typeBtn: {
    flex: 1, padding: '8px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
    background: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13, fontWeight: 500,
    fontFamily: 'var(--font-body)',
  },
  typeBtnActive: { background: 'rgba(0,212,170,0.1)', borderColor: 'rgba(0,212,170,0.3)', color: 'var(--accent)' },
  amountDisplay: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
    background: 'var(--bg-card)', borderRadius: 'var(--radius)', padding: '20px', textAlign: 'center',
  },
  amountInput: {
    background: 'transparent', border: 'none', outline: 'none', fontFamily: 'var(--font-display)',
    fontSize: 40, fontWeight: 800, color: 'var(--text-primary)', width: 200, textAlign: 'center',
  },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 },
  field: { display: 'flex', flexDirection: 'column', gap: 5 },
  label: { fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' },
  input: {
    background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
    padding: '9px 12px', color: 'var(--text-primary)', fontSize: 13, outline: 'none', fontFamily: 'var(--font-body)',
  },
  error: { background: 'var(--red-dim)', border: '1px solid rgba(255,107,107,0.2)', borderRadius: 8, padding: '10px 14px', color: 'var(--red)', fontSize: 13 },
  taxNote: { display: 'flex', gap: 8, alignItems: 'center', background: 'var(--blue-dim)', border: '1px solid rgba(79,142,247,0.2)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: 'var(--text-secondary)' },
  modalFooter: { display: 'flex', gap: 10, padding: '16px 24px', borderTop: '1px solid var(--border)' },
  cancelBtn: { flex: 1, background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '11px', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-body)' },
  saveBtn: { flex: 2, background: 'var(--accent)', border: 'none', borderRadius: 'var(--radius-sm)', padding: '11px', color: '#0d1117', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)' },
};
