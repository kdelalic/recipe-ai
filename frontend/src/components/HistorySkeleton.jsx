import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { useTheme } from './ThemeProvider';
import '../styles/HistorySkeleton.css';

function HistorySkeleton() {
  const { darkMode } = useTheme();
  // Sidebar uses standardized skeleton colors - guard for SSR
  const baseColor = typeof window !== 'undefined' 
    ? getComputedStyle(document.documentElement).getPropertyValue('--skeleton-base').trim() || (darkMode ? '#1e293b' : '#e5e7eb')
    : (darkMode ? '#1e293b' : '#e5e7eb');
  const highlightColor = typeof window !== 'undefined'
    ? getComputedStyle(document.documentElement).getPropertyValue('--skeleton-highlight').trim() || (darkMode ? '#334155' : '#f3f4f6')
    : (darkMode ? '#334155' : '#f3f4f6');

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
