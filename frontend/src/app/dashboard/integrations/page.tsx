import styles from './integrations.module.css';

export default function IntegrationsPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Integrations Hub</h1>
        <p className={styles.subtitle}>Connect your AI workforce to your existing business tools.</p>
      </header>

      <div className={styles.integrationsGrid}>
        {/* Shopify Card */}
        <div className={`${styles.integrationCard} glass-panel`}>
          <div className={styles.cardHeader}>
            <div className={styles.logoPlaceholder}>🛍️</div>
            <div className={styles.statusToggle}>
              <span className={styles.statusOff}>Not Connected</span>
            </div>
          </div>
          <div className={styles.cardBody}>
            <h2>Shopify</h2>
            <p>Allow your AI to check real-time order status and inventory directly from your store.</p>
          </div>
          <div className={styles.cardFooter}>
            <button className={`${styles.connectButton} glow-button`}>Connect Shopify</button>
          </div>
        </div>

        {/* Zoho CRM Card */}
        <div className={`${styles.integrationCard} glass-panel`}>
          <div className={styles.cardHeader}>
            <div className={styles.logoPlaceholder}>💼</div>
            <div className={styles.statusToggle}>
              <span className={styles.statusOff}>Not Connected</span>
            </div>
          </div>
          <div className={styles.cardBody}>
            <h2>Zoho CRM</h2>
            <p>Automatically create leads and log calls directly into your Zoho account after every conversation.</p>
          </div>
          <div className={styles.cardFooter}>
            <button className={`${styles.connectButton} glow-button`}>Connect Zoho</button>
          </div>
        </div>

        {/* Telegram Alerts Card */}
        <div className={`${styles.integrationCard} glass-panel`}>
          <div className={styles.cardHeader}>
            <div className={styles.logoPlaceholder}>📱</div>
            <div className={styles.statusToggle}>
              <span className={styles.statusOff}>Not Connected</span>
            </div>
          </div>
          <div className={styles.cardBody}>
            <h2>Telegram Alerts</h2>
            <p>Receive instant call summaries, action items, and booking details directly to your Telegram app.</p>
          </div>
          <div className={styles.cardFooter}>
            <a 
              href={`https://t.me/${process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'AIxCaller_Alerts_Bot'}?start=tenant-YOUR-TENANT-ID`} 
              target="_blank" 
              rel="noopener noreferrer" 
              className={`${styles.connectButton} glow-button`}
              style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}
            >
              Connect Telegram
            </a>
          </div>
        </div>

        {/* Custom Webhook Card */}
        <div className={`${styles.integrationCard} glass-panel`}>
          <div className={styles.cardHeader}>
            <div className={styles.logoPlaceholder}>⚡</div>
            <div className={styles.statusToggle}>
              <span className={`${styles.statusOn}`}>Active</span>
            </div>
          </div>
          <div className={styles.cardBody}>
            <h2>Zapier / Webhooks</h2>
            <p>Send a full payload (summary, sentiment, transcript) to a custom webhook URL when a call ends.</p>
          </div>
          <div className={styles.cardFooter}>
            <button className={styles.manageButton}>Manage Webhook</button>
          </div>
        </div>
      </div>
    </div>
  );
}
