import styles from "../auth.module.css";

export default function ContactPage() {
  return (
    <main className={styles.container}>
      <div className={styles.authCard} style={{ maxWidth: "600px" }}>
        <h1>Contact Sales</h1>
        <p>Interested in deploying AixCaller.live for your enterprise? Reach out below.</p>
        
        <form onSubmit={(e) => e.preventDefault()}>
          <div className={styles.formGroup}>
            <label htmlFor="name">Name</label>
            <input type="text" id="name" placeholder="John Smith" required />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="email">Work Email</label>
            <input type="email" id="email" placeholder="john@company.com" required />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="company">Company</label>
            <input type="text" id="company" placeholder="Acme Corp" />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="message">How can we help?</label>
            <textarea 
              id="message" 
              rows={4} 
              style={{
                width: "100%", padding: "0.8rem 1rem", borderRadius: "12px", 
                border: "1px solid rgba(0,0,0,0.1)", background: "rgba(255, 255, 255, 0.5)",
                fontFamily: "inherit", fontSize: "0.95rem", resize: "vertical", outline: "none"
              }}
              required
            ></textarea>
          </div>
          <button type="submit" className={`btn btn-primary ${styles.submitBtn}`}>Send Message</button>
        </form>
      </div>
    </main>
  );
}
