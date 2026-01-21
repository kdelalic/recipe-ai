import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { HiOutlineMenuAlt2 } from 'react-icons/hi';
import { useTheme } from './ThemeProvider';

function RecipeSkeleton({ isMobile, sidebarCollapsed, onToggleSidebar }) {
  const { darkMode } = useTheme();

  const baseColor = darkMode ? '#2a2a2a' : '#ebebeb';
  const highlightColor = darkMode ? '#3a3a3a' : '#f5f5f5';

  return (
    <SkeletonTheme baseColor={baseColor} highlightColor={highlightColor}>
      <div className="recipe recipe-skeleton" style={{ marginTop: '2rem' }}>
        {/* Title Skeleton */}
        <div className="recipe-title-row">
          {isMobile && sidebarCollapsed && onToggleSidebar && (
            <button
              className="mobile-menu-btn"
              onClick={onToggleSidebar}
              aria-label="Open menu"
            >
              <HiOutlineMenuAlt2 size={20} />
            </button>
          )}
          <Skeleton height={40} width="60%" style={{ flex: 1 }} />
        </div>
        {/* Introduction Paragraph Skeleton */}
        <Skeleton height={20} width="90%" style={{ marginTop: '1rem', marginBottom: '1rem' }} />

        {/* Ingredients Section */}
        <Skeleton height={30} width="30%" style={{ marginBottom: '0.5rem' }} />
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} height={20} width="80%" style={{ marginBottom: '0.3rem' }} />
        ))}

        {/* Instructions Section */}
        <Skeleton height={30} width="30%" style={{ margin: '1rem 0 0.5rem 0' }} />
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} height={20} width="90%" style={{ marginBottom: '0.3rem' }} />
        ))}

        {/* Notes Section */}
        <Skeleton height={30} width="30%" style={{ margin: '1rem 0 0.5rem 0' }} />
        {Array.from({ length: 2 }).map((_, index) => (
          <Skeleton key={index} height={20} width="70%" style={{ marginBottom: '0.3rem' }} />
        ))}
      </div>
    </SkeletonTheme>
  );
}

export default RecipeSkeleton;
