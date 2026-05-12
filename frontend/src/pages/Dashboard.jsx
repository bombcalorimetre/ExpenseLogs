import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { analyticsAPI, transactionsAPI } from '../services/api';
import Header from '../components/Layout/Header';

const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
const fmtFull = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

export default function Dashboard() {
  const [overview, setOverview] = useState(null);
  const [trends, setTrends] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      analyticsAPI.overview(),
      analyticsAPI.monthlyTrends(),
      transactionsAPI.list({ limit: 5 }),
      analyticsAPI.budgets(),
    ]).then(([ov, tr, tx, bd]) => {
      setOverview(ov.data);
      setTrends(tr.data);
      setTransactions(tx.data.transactions);
      setBudgets(bd.data.slice(0, 3));
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSkeleton />;

  const momAbs = overview ? Math.abs(overview.mom_change) : 0;
  const momDir = overview?.mom_change <= 0 ? 'down' : 'up';

  return (
    <div style={styles.page}>
      <Header title="Dashboard" />
      <div style={styles.content}>
        {/* Top row */}
        <div style={styles.topRow}>
          {/* Balance card */}
          <div style={styles.balanceCard}>
            <div style={styles.balanceLabel}>TOTAL BALANCE</div>
            <div style={styles.balanceAmount}>{fmtFull(overview?.total_balance || 0)}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
              <span style={{ color: momDir === 'down' ? 'var(--accent)' : 'var(--red)', fontSize: 13, fontWeight: 500 }}>
                {momDir === 'down' ? '↓' : '↑'} {momAbs}% this month
              </span>
            </div>
            {/* Mini bar viz */}
            <div style={styles.miniBar}>
              <div style={{ flex: 1, background: 'rgba(59,130,246,0.15)', borderRadius: 4, overflow: 'hidden', height: 3 }}>
                <div style={{ width: `${Math.min(100, (overview?.current_month?.total_expense / (overview?.current_month?.total_income || 1)) * 100)}%`, height: '100%', background: 'var(--accent)' }} />
              </div>
            </div>
          </div>

          {/* Monthly spend chart */}
          <div style={styles.chartCard}>
            <div style={styles.chartTitle}>Monthly Spending</div>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={trends} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                <XAxis dataKey="label" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                  formatter={(val) => [fmt(val), 'Expenses']}
                  labelStyle={{ color: 'var(--text-secondary)' }}
                />
                {trends.map((entry, i) => null)}
                <Bar dataKey="expenses" radius={[4, 4, 0, 0]}>
                  {trends.map((entry, i) => (
                    <Cell key={i} fill={i === trends.length - 1 ? 'var(--accent)' : 'rgba(79,142,247,0.4)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Main grid */}
        <div style={styles.mainGrid}>
          {/* Transactions */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <span style={styles.cardTitle}>Recent Transactions</span>
              <button onClick={() => navigate('/history')} style={styles.viewAll}>View All</button>
            </div>
            <div style={styles.txTable}>
              <div style={styles.txHeader}>
                <span>MERCHANT / SERVICE</span>
                <span>CATEGORY</span>
                <span>DATE</span>
                <span style={{ textAlign: 'right' }}>AMOUNT</span>
              </div>
              {transactions.map(tx => (
                <div key={tx.id} style={styles.txRow}>
                  <div style={styles.txMerchant}>
                    <div style={{ ...styles.txIcon, background: tx.category_color ? `${tx.category_color}22` : 'var(--bg-card-hover)' }}>
                      {tx.category_icon || '💳'}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{tx.merchant}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{tx.description}</div>
                    </div>
                  </div>
                  <div>
                    <span style={{ ...styles.catBadge, background: tx.type === 'income' ? 'rgba(16,185,129,0.12)' : 'rgba(79,142,247,0.12)', color: tx.type === 'income' ? '#10B981' : 'var(--blue)' }}>
                      {tx.category_name || (tx.type === 'income' ? 'Income' : 'Other')}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                  <div style={{ textAlign: 'right', fontWeight: 600, fontSize: 13, color: tx.type === 'income' ? 'var(--accent)' : 'var(--red)' }}>
                    {tx.type === 'income' ? '+' : '-'}{fmtFull(tx.amount)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Budgets sidebar */}
          <div style={styles.sidebar}>
            {budgets.map(b => (
              <div key={b.name} style={styles.budgetCard}>
                <div style={styles.budgetHeader}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{b.icon} {b.name}</span>
                  <span style={{ fontSize: 13, color: b.is_near_limit ? 'var(--red)' : 'var(--text-secondary)' }}>
                    {b.percentage}%
                  </span>
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: 12, marginBottom: 8 }}>
                  {fmt(b.spent)} / {fmt(b.budget_limit)}
                </div>
                <div style={styles.progressBar}>
                  <div style={{
                    ...styles.progressFill,
                    width: `${Math.min(100, b.percentage)}%`,
                    background: b.is_over ? 'var(--red)' : b.is_near_limit ? 'var(--yellow)' : b.color || 'var(--accent)',
                  }} />
                </div>
                {b.is_near_limit && (
                  <div style={{ fontSize: 11, color: 'var(--yellow)', marginTop: 4 }}>⚠ Near limit</div>
                )}
              </div>
            ))}

            {/* Stats */}
            <div style={styles.statsCard}>
              <div style={styles.statRow}>
                <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>This Month Spend</span>
                <span style={{ fontWeight: 700, color: 'var(--red)' }}>{fmt(overview?.current_month?.total_expense || 0)}</span>
              </div>
              <div style={styles.statRow}>
                <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>This Month Income</span>
                <span style={{ fontWeight: 700, color: 'var(--accent)' }}>{fmt(overview?.current_month?.total_income || 0)}</span>
              </div>
              <div style={styles.statRow}>
                <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Pending Txns</span>
                <span style={{ fontWeight: 600, color: 'var(--yellow)' }}>{overview?.pending_transactions?.count || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div style={styles.page}>
      <Header title="Dashboard" />
      <div style={styles.content}>
        <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
          <div style={{ flex: 1, height: 140, borderRadius: 12 }} className="skeleton" />
          <div style={{ flex: 2, height: 140, borderRadius: 12 }} className="skeleton" />
        </div>
        <div style={{ height: 300, borderRadius: 12 }} className="skeleton" />
      </div>
    </div>
  );
}

const styles = {
  page: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  content: { flex: 1, overflow: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 20 },
  topRow: { display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16 },
  balanceCard: {
    background: 'linear-gradient(135deg, rgba(59,130,246,0.12), rgba(79,142,247,0.08))',
    border: '1px solid rgba(59,130,246,0.2)', borderRadius: 'var(--radius-lg)',
    padding: '24px 24px 20px',
  },
  balanceLabel: { fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 8 },
  balanceAmount: { fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 800, color: 'var(--text-primary)' },
  miniBar: { marginTop: 16, display: 'flex', gap: 4 },
  chartCard: {
    background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px 20px 12px',
  },
  chartTitle: { fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 },
  mainGrid: { display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16, flex: 1 },
  card: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px 24px', overflow: 'hidden' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  cardTitle: { fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700 },
  viewAll: { background: 'none', border: 'none', color: 'var(--accent)', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-body)' },
  txTable: { display: 'flex', flexDirection: 'column', gap: 0 },
  txHeader: {
    display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 12, padding: '0 0 10px',
    fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.08em',
    textTransform: 'uppercase', borderBottom: '1px solid var(--border)',
  },
  txRow: {
    display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 12, alignItems: 'center',
    padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.04)',
  },
  txMerchant: { display: 'flex', alignItems: 'center', gap: 10 },
  txIcon: { width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 },
  catBadge: { fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: '0.05em' },
  sidebar: { display: 'flex', flexDirection: 'column', gap: 12 },
  budgetCard: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16 },
  budgetHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  progressBar: { height: 5, background: 'var(--bg-primary)', borderRadius: 99, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 99, transition: 'width 0.5s ease' },
  statsCard: {
    background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16,
    display: 'flex', flexDirection: 'column', gap: 12,
  },
  statRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
};
