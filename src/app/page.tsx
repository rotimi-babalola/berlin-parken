import { AddressSearch } from "@/components/address-search";
import styles from "./page.module.css";

const dataSources = ["Street parking", "Parking zones", "Road events"];

export default function Home() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <a className={styles.brand} href="#top" aria-label="Berlin Parken home">
          <span className={styles.brandMark} aria-hidden="true"><span /><span /><span /></span>
          <span>berlin<span className={styles.brandLight}>parken</span></span>
        </a>
        <span className={styles.headerNote}><span className={styles.liveDot} /> BERLIN, GERMANY</span>
      </header>

      <div className={styles.content} id="top">
        <section className={styles.intro}>
          <p className={styles.eyebrow}>PARKING, WITH A LITTLE MORE CLARITY</p>
          <h1>Know the streets<br />before you arrive.</h1>
          <p className={styles.lede}>Explore mapped street parking, paid zones and planned events around your destination.</p>
        </section>

        <div className={styles.workspace}>
          <AddressSearch />

          <aside className={styles.context} aria-labelledby="context-title">
            <div className={styles.contextTop}>
              <span className={styles.contextKicker}>A clearer picture of parking</span>
              <h2 id="context-title">Know what’s nearby.</h2>
              <p>Official Berlin data can show parking infrastructure and street restrictions. It can’t tell us which spaces are free right now.</p>
            </div>

            <div className={styles.sourceList}>
              <span className={styles.sourceHeading}>WHAT WE LOOK AT</span>
              {dataSources.map((source, index) => (
                <div className={styles.sourceRow} key={source}>
                  <span className={styles.sourceIndex}>0{index + 1}</span>
                  <span>{source}</span>
                  <span className={styles.sourceArrow} aria-hidden="true">↗</span>
                </div>
              ))}
            </div>

            <p className={styles.contextFoot}>Built around Berlin’s open geodata<span aria-hidden="true"> · </span>Updated as source data allows</p>
          </aside>
        </div>

        <footer className={styles.footer}>
          <span>Designed for getting there, not circling the block.</span>
          <span>Data guidance only · Always follow local signs</span>
        </footer>
      </div>
    </main>
  );
}
