import styles from "./StreamingProviders.module.css";

/**
 * StreamingProviders Component
 * Displays all available streaming providers in the UK
 */
export default function StreamingProviders({ providers = [] }) {
  const popularServices = [
    { name: "Netflix", color: "#E50914" },
    { name: "BBC iPlayer", color: "#FF1A8C" },
    { name: "Amazon Prime Video", color: "#00A8E1" },
    { name: "Disney+", color: "#113CCF" },
    { name: "NOW", color: "#00CFFF" },
    { name: "Apple TV+", color: "#000000" },
    { name: "ITVX", color: "#FF6B00" },
    { name: "Channel 4", color: "#0094C6" },
    { name: "Paramount+", color: "#0064FF" },
    { name: "Discovery+", color: "#0066FF" }
  ];

  const servicesToDisplay = providers.length > 0 ? providers : popularServices;

  return (
    <div className={styles.container}>
      <h2 className={styles.heading}>Popular Streaming Services</h2>
      <div className={styles.grid}>
        {servicesToDisplay.map((service, index) => (
          <div
            key={index}
            className={styles.card}
            style={{ borderLeftColor: service.color }}
          >
            <div className={styles.serviceName}>{service.name}</div>
            {service.shortName && (
              <div className={styles.serviceShortName}>{service.shortName}</div>
            )}
          </div>
        ))}
      </div>
      <div className={styles.attribution}>
        Streaming availability powered by JustWatch
      </div>
    </div>
  );
}
