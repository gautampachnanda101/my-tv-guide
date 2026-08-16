import Image from "next/image";
import StreamingBadge from "./StreamingBadge";
import styles from "./EnhancedShowCard.module.css";

/**
 * EnhancedShowCard Component
 * Displays a show card with TMDB metadata and JustWatch streaming info
 */
export default function EnhancedShowCard({ item, onClick }) {
  const {
    title,
    show,
    summary,
    image,
    rating,
    channel,
    startAt,
    endAt,
    genres = [],
    tmdb,
    justWatch,
    streamingOn = [],
    isStreaming = false
  } = item;

  const displayTitle = title || show;
  const displayImage = tmdb?.backdropPath || tmdb?.posterPath || image;
  const displayRating = tmdb?.rating || rating;
  const displaySummary = tmdb?.overview || summary;
  const displayGenres = tmdb?.genres || genres;

  // Format time
  const formatTime = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/London"
    });
  };

  const startTime = formatTime(startAt);
  const endTime = formatTime(endAt);

  const handleKeyPress = (e) => {
    if (onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div 
      className={styles.card} 
      onClick={onClick}
      onKeyDown={handleKeyPress}
      role="button"
      tabIndex={0}
    >
      {displayImage && (
        <div className={styles.imageContainer}>
          <Image
            src={displayImage}
            alt={displayTitle}
            fill
            className={styles.image}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          {displayRating && (
            <div className={styles.ratingBadge}>
              ⭐ {displayRating.toFixed(1)}
            </div>
          )}
        </div>
      )}
      
      <div className={styles.content}>
        <div className={styles.header}>
          <h3 className={styles.title}>{displayTitle}</h3>
          {channel && <p className={styles.channel}>{channel}</p>}
        </div>

        {(startTime || endTime) && (
          <div className={styles.timeSlot}>
            {startTime && <span className={styles.time}>{startTime}</span>}
            {endTime && (
              <>
                <span className={styles.timeSeparator}>-</span>
                <span className={styles.time}>{endTime}</span>
              </>
            )}
          </div>
        )}

        {displayGenres && displayGenres.length > 0 && (
          <div className={styles.genres}>
            {displayGenres.slice(0, 3).map((genre, idx) => (
              <span key={idx} className={styles.genreBadge}>
                {genre}
              </span>
            ))}
          </div>
        )}

        {displaySummary && (
          <p className={styles.summary}>
            {displaySummary.length > 150
              ? `${displaySummary.substring(0, 150)}...`
              : displaySummary}
          </p>
        )}

        {/* Cast from TMDB */}
        {tmdb?.cast && tmdb.cast.length > 0 && (
          <div className={styles.cast}>
            <strong>Cast:</strong>{" "}
            {tmdb.cast.slice(0, 3).map((c) => c.name).join(", ")}
          </div>
        )}

        {/* Streaming availability from JustWatch */}
        {isStreaming && streamingOn && streamingOn.length > 0 && (
          <div className={styles.streaming}>
            <div className={styles.streamingLabel}>Watch on:</div>
            <StreamingBadge
              services={streamingOn}
              justWatchUrl={justWatch?.justWatchUrl}
              compact={true}
            />
          </div>
        )}

        {/* TMDB/JustWatch attribution */}
        {(tmdb || justWatch) && (
          <div className={styles.attribution}>
            {tmdb && <span>Metadata by TMDB</span>}
            {tmdb && justWatch && <span> • </span>}
            {justWatch && <span>Streaming data by JustWatch</span>}
          </div>
        )}
      </div>
    </div>
  );
}
