import styles from './dashboard.module.css';
import { fetchCalls } from '@/lib/api';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const calls = await fetchCalls();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Dashboard Overview</h1>
        <p className={styles.subtitle}>Welcome back. Here is how your AI agents are performing.</p>
      </header>

      <div className={styles.statsGrid}>
        <div className={`${styles.statCard} glass-panel`}>
          <h3>Total Calls</h3>
          <div className={styles.statValue}>{calls.length || 0}</div>
        </div>
        <div className={`${styles.statCard} glass-panel`}>
          <h3>Avg Duration</h3>
          <div className={styles.statValue}>1m 24s</div>
        </div>
        <div className={`${styles.statCard} glass-panel`}>
          <h3>Leads Generated</h3>
          <div className={styles.statValue}>12</div>
        </div>
      </div>

      <div className={`${styles.tableContainer} glass-panel`}>
        <div className={styles.tableHeader}>
          <h2>Recent Calls</h2>
        </div>
        
        {calls.length === 0 ? (
          <div className={styles.emptyState}>No calls recorded yet.</div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Date</th>
                <th>From</th>
                <th>Sentiment</th>
                <th>Summary</th>
              </tr>
            </thead>
            <tbody>
              {calls.map((call: any) => (
                <tr key={call.id}>
                  <td>{new Date(call.created_at).toLocaleDateString()}</td>
                  <td>{call.from_number}</td>
                  <td>
                    <span className={`${styles.sentiment} ${styles[call.sentiment?.toLowerCase() || 'neutral']}`}>
                      {call.sentiment || 'Pending'}
                    </span>
                  </td>
                  <td className={styles.summaryCell}>{call.summary || 'Processing...'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
