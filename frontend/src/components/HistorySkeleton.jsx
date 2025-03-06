import React from 'react';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import '../styles/HistorySkeleton.css';

function HistorySkeleton() {
  return (
    <div className="history-skeleton">
      <div className="history-buttons">
        {Array.from({ length: 5 }).map((_, index) => (
          <div className="skeleton-button-wrapper" key={index}>
            <Skeleton className="skeleton-button" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default HistorySkeleton;
