import Link from "next/link";
import styles from "../auth.module.css";

export default function SignupPage() {
  return (
    <main className={styles.container}>
      <div className={styles.authCard}>
        <h1>Create an Account</h1>
        <p>Start deploying your AI voice agents today.</p>
        
        <form onSubmit={(e) => e.preventDefault()}>
          <div className={styles.formGroup}>
            <label htmlFor="name">Full Name</label>
            <input type="text" id="name" placeholder="Jane Doe" required />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="email">Email Address</label>
            <input type="email" id="email" placeholder="you@company.com" required />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="password">Password</label>
            <input type="password" id="password" placeholder="••••••••" required />
          </div>
          <button type="submit" className={`btn btn-primary ${styles.submitBtn}`}>Sign Up</button>
        </form>

        <div className={styles.divider}>
          <span>OR</span>
        </div>

        <button className={styles.socialBtn}>
          <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" width={20} height={20} />
          Sign up with Google
        </button>

        <div className={styles.footerText}>
          Already have an account? <Link href="/login">Log in</Link>
        </div>
      </div>
    </main>
  );
}
