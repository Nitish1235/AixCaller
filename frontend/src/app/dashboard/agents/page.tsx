import { fetchAgents } from '@/lib/api';
import styles from './agents.module.css';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function AgentsPage() {
  const agents = await fetchAgents();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Agent Command Center</h1>
          <p className={styles.subtitle}>Manage your AI workforce, edit prompts, and assign tools.</p>
        </div>
        <Link href="/dashboard/agents/create" className="glow-button" style={{ display: 'inline-block', textDecoration: 'none', textAlign: 'center' }}>
          + Create New Agent
        </Link>
      </header>

      <div className={styles.agentGrid}>
        {agents.length === 0 ? (
          <div className={`${styles.emptyState} glass-panel`}>
            No agents found. Create your first AI agent to get started.
          </div>
        ) : (
          agents.map((agent: any) => (
            <div key={agent.id} className={`${styles.agentCard} glass-panel`}>
              <div className={styles.cardHeader}>
                <h2>{agent.name}</h2>
                <span className={styles.statusBadge}>Active</span>
              </div>
              
              <div className={styles.cardBody}>
                <div className={styles.detailRow}>
                  <span className={styles.label}>Phone:</span>
                  <span className={styles.value}>{agent.phone_number}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.label}>Voice ID:</span>
                  <span className={styles.value}>{agent.voice_id}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.label}>Active Tools:</span>
                  <span className={styles.value}>
                    {agent.tools_config ? Object.keys(agent.tools_config).length : 0} Configured
                  </span>
                </div>
              </div>
              
              <div className={styles.cardFooter}>
                <Link href={`/dashboard/agents/${agent.id}`} className={styles.editButton}>
                  Configure Agent →
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
