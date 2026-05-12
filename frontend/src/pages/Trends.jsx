import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { analyticsAPI } from '../services/api';
import Header from '../components/Layout/Header';

const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

export default function Trends() {
  const [trends, setTrends] = useState([]);
  const [dist, setDist] = useState({ categories: [], total: 0 });
  const [budgets, setBudgets] = useState([]);
  const [overview, setOverview] = useState(null);
  const [topMerchants, setTopMerchants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      analyticsAPI.monthlyTrends(),
      analyticsAPI.categoryDistribution(),
      analyticsAPI.budgets(),
      analyticsAPI.overview(),
      analyticsAPI.topMerchants(5),
    ]).then(([tr, di, bu, ov, tm]) => {
      setTrends(tr.data);
      setDist(di.data);
      setBudgets(bu.data);
      setOverview(ov.data);
      setTopMerchants(tm.data);
    }).finally(() => setLoading(false));
  }, []);

  const avgBurn = trends.length ? trends.reduce((s, t) => s + t.expenses, 0) / trends.length : 0;
  const latestIncome = trends[trends.length - 1]?.income || 0;
  const latestExpenses = trends[trends.length - 1]?.expenses || 0;
  const savingsRate = latestIncome > 0 ? (((latestIncome - latestExpenses) / latestIncome) * 100).toFixed(1) : 0;
  const yearEndForecast = avgBurn * 12;

  const COLORS = dist.categories.map(c => c.color || '#00d4aa');

  return (
    <div style={styles.page}>
      <Header title="Spending Analytics" actions={
        <button style={styles.exportBtn}>↓ Export Report</button>
      } />
      <div style={styles.content}>
        {/* Top KPIs */}
        <div style={styles.kpiRow}>
          <KpiCard label="AVG. MONTHLY BURN" value={fmt(avgBurn)} sub="4.2% vs. last year" subColor="var(--accent)" icon="🔥" />
          <KpiCard label="NET SAVINGS RATE" value={`${savingsRate}%`} sub="1.8% optimal efficiency" subColor="var(--accent)" icon="💹" />
          <KpiCard label="YEAR-END FORECAST" value={fmt(yearEndForecast)} sub="Based on current trajectory" icon="📊" />
        </div>

        {/* Charts row */}
        <div style={styles.chartsRow}>
          {/* Line chart */}
          <div style={styles.lineCard}>
            <div style={styles.chartHeader}>
              <span style={styles.chartTitle}>Monthly Spending Trends</span>
              <div style={styles.legend}>
                <span style={{ color: 'var(--accent)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 20, height: 2, background: 'var(--accent)', display: 'inline-block', borderRadius: 1 }} /> Spending
                </span>
                <span style={{ color: 'var(--text-muted)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 20, height: 2, background: 'rgba(255,255,255,0.2)', display: 'inline-block', borderRadius: 1 }} /> Baseline
                </span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={trends} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                <XAxis dataKey="label" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12 }}
                  formatter={(v, name) => [fmt(v), name === 'expenses' ? 'Expenses' : 'Income']}
                />
                <Line type="monotone" dataKey="expenses" stroke="var(--accent)" strokeWidth={2.5} dot={{ fill: 'var(--accent)', r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="income" stroke="rgba(255,255,255,0.2)" strokeWidth={1.5} dot={false} strokeDasharray="4 4" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Donut chart */}
          <div style={styles.donutCard}>
            <div style={styles.chartTitle}>Distribution</div>
            {dist.categories.length > 0 ? (
              <>
                <div style={{ position: 'relative' }}>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={dist.categories} dataKey="total" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={2}>
                        {dist.categories.map((c, i) => <Cell key={i} fill={c.color || COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v) => [fmt(v)]} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={styles.donutCenter}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>TOTAL</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700 }}>{fmt(dist.total)}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                  {dist.categories.slice(0, 4).map((c, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 10, height: 10, borderRadius: 3, background: c.color || 'var(--accent)', flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{c.name}</span>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{c.percentage}%</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 13 }}>No data for this period</div>
            )}
          </div>
        </div>

        {/* Bottom row */}
        <div style={styles.bottomRow}>
          {/* Top merchants */}
          <div style={styles.merchantCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={styles.chartTitle}>Major Outflows</span>
              <button style={styles.viewAllBtn}>View All</button>
            </div>
            {topMerchants.map((m, i) => (
              <div key={i} style={styles.merchantRow}>
                <div style={styles.merchantIcon}>🏢</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{m.merchant}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.count} transactions</div>
                </div>
                <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--red)' }}>-{fmt(m.total)}</span>
              </div>
            ))}
          </div>

          {/* Budget tracker */}
          <div style={styles.budgetCol}>
            {budgets.slice(0, 2).map(b => (
              <div key={b.name} style={styles.budgetCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-secondary)' }}>{b.name} Budget</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: b.is_near_limit ? 'var(--red)' : 'var(--accent)' }}>{b.percentage}% Used</span>
                </div>
                <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-display)', marginBottom: 10 }}>
                  {fmt(b.spent)} <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-muted)' }}>/ {fmt(b.budget_limit)} limit</span>
                </div>
                <div style={styles.progressBar}>
                  <div style={{ ...styles.progressFill, width: `${Math.min(100, b.percentage)}%`, background: b.is_over ? 'var(--red)' : b.is_near_limit ? 'var(--yellow)' : b.color || 'var(--accent)' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, sub, subColor, icon }) {
  return (
    <div style={styles.kpiCard}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.1em' }}>{label}</span>
        <span style={{ fontSize: 18 }}>{icon}</span>
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, marginBottom: 6 }}>{value}</div>
      <div style={{ fontSize: 11, color: subColor || 'var(--text-secondary)' }}>↑ {sub}</div>
    </div>
  );
}

const styles = {
  page: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  content: { flex: 1, overflow: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 18 },
  exportBtn: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 14px', color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-body)' },
  kpiRow: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 },
  kpiCard: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '22px 22px 18px' },
  chartsRow: { display: 'grid', gridTemplateColumns: '1fr 280px', gap: 14 },
  lineCard: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px 20px 12px' },
  donutCard: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 20, position: 'relative' },
  chartHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  chartTitle: { fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' },
  legend: { display: 'flex', gap: 16 },
  donutCenter: { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -20%)', textAlign: 'center', pointerEvents: 'none' },
  bottomRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 },
  merchantCard: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px' },
  merchantRow: { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' },
  merchantIcon: { width: 34, height: 34, background: 'var(--bg-card-hover)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 },
  viewAllBtn: { background: 'none', border: 'none', color: 'var(--accent)', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-body)' },
  budgetCol: { display: 'flex', flexDirection: 'column', gap: 14 },
  budgetCard: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 20 },
  progressBar: { height: 6, background: 'var(--bg-primary)', borderRadius: 99, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 99, transition: 'width 0.6s ease' },
};
