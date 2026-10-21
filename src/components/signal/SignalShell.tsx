import type { ReactNode } from "react";
import styles from "./signal.module.css";
import { SignalFooter } from "./SignalFooter";
import { SignalHeader } from "./SignalHeader";

// Shared page frame for the search, results and area-guide routes.
export function SignalShell({ children }: { children: ReactNode }) {
  return (
    <div className={styles.page}>
      <SignalHeader />
      {children}
      <SignalFooter />
    </div>
  );
}
