export default function BuilderLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ margin: "-2.25rem", overflow: "hidden" }}>
      {children}
    </div>
  );
}
