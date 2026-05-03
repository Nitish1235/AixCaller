import Link from 'next/link';
import styles from './layout.module.css';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.container}>
      <aside className={`${styles.sidebar} glass-panel`}>
        <div className={styles.logo}>
          <span className={styles.aix}>AIx</span>Caller
        </div>
        <nav className={styles.nav}>
          <Link href="/dashboard" className={styles.navItem}>
            <span className={styles.icon}>📊</span> Overview
          </Link>
          <Link href="/dashboard/agents" className={styles.navItem}>
            <span className={styles.icon}>🤖</span> Agents
          </Link>
          <Link href="/dashboard/knowledge" className={styles.navItem}>
            <span className={styles.icon}>📚</span> Knowledge Base
          </Link>
          <Link href="/dashboard/integrations" className={styles.navItem}>
            <span className={styles.icon}>🔌</span> Integrations
          </Link>
          <Link href="/dashboard/live" className={`${styles.navItem} ${styles.liveItem}`}>
            <span className={styles.liveIndicator}></span> Live Monitor
          </Link>
        </nav>
        
        <div className={styles.userSection}>
          <div className={styles.credits}>
            <span>Credits:</span>
            <strong>500 min</strong>
          </div>
        </div>
      </aside>
      
      <main className={styles.mainContent}>
        {children}
      </main>
    </div>
  );
}
