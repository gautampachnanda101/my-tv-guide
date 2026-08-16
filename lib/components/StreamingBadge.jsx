import styles from "./StreamingBadge.module.css";

/**
 * StreamingBadge Component
 * Displays streaming service availability badges
 */
export default function StreamingBadge({ services = [], justWatchUrl, compact = false }) {
  if (!services || services.length === 0) {
    return null;
  }

  const displayServices = compact ? services.slice(0, 3) : services;
  const hasMore = compact && services.length > 3;

  return (
    <div className={styles.container}>
      <div className={styles.badgeList}>
        {displayServices.map((service, index) => (
          <span key={index} className={styles.badge} title={`Available on ${service}`}>
            {service}
          </span>
        ))}
        {hasMore && (
          <span className={styles.badge} title={`+${services.length - 3} more services`}>
            +{services.length - 3}
          </span>
        )}
      </div>
      {justWatchUrl && (
        <a 
          href={justWatchUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className={styles.justWatchLink}
          title="View all streaming options on JustWatch"
        >
          View All Options →
        </a>
      )}
    </div>
  );
}
