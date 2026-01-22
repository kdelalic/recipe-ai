import '../styles/HistorySkeleton.css';

function HistorySkeleton() {
  return (
    <div className="history-skeleton">
      {Array.from({ length: 10 }).map((_, index) => (
        <div className="skeleton-item" key={index} />
      ))}
    </div>
  );
}

export default HistorySkeleton;
