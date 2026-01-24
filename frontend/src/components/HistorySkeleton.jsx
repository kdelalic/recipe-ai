import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { useTheme } from './ThemeProvider';
import '../styles/HistorySkeleton.css';

function HistorySkeleton() {
  const { darkMode } = useTheme();
  const baseColor = darkMode ? '#2a2a2a' : '#ebebeb';
  const highlightColor = darkMode ? '#3a3a3a' : '#f5f5f5';

  return (
    <SkeletonTheme baseColor={baseColor} highlightColor={highlightColor}>
      <div className="history-skeleton">
        {Array.from({ length: 10 }).map((_, index) => (
          <Skeleton key={index} containerClassName="skeleton-item" />
        ))}
      </div>
    </SkeletonTheme>
  );
}

export default HistorySkeleton;
