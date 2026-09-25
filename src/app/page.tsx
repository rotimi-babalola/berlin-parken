import { AddressSearch } from "@/components/address-search";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <a className={styles.brand} href="#top" aria-label="Berlin Parken home">
          <span className={styles.brandMark} aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          <span>
            berlin<span className={styles.brandLight}>parken</span>
          </span>
        </a>
        <span className={styles.headerNote}>
          <span className={styles.liveDot} /> BERLIN, GERMANY
        </span>
      </header>

      <div className={styles.content} id="top">
        <section className={styles.intro}>
          <h1>
            Know the streets
            <br />
            before you arrive.
          </h1>
          <p className={styles.lede}>
            Explore mapped street parking, paid zones and planned events around
            your destination.
          </p>
        </section>

        <AddressSearch />

        <footer className={styles.footer}>
          <span>Designed for getting there, not circling the block.</span>
          <span>Data guidance only · Always follow local signs</span>
        </footer>
      </div>
    </main>
  );
}
