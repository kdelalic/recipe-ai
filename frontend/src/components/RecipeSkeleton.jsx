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
      <div className="recipe recipe-skeleton recipe-view">
        {/* Mobile header - matches RecipeView structure */}
        {isMobile && (
          <div className="recipe-mobile-header">
            {sidebarCollapsed && onToggleSidebar && (
              <button
                className="mobile-menu-btn"
                onClick={onToggleSidebar}
                aria-label="Open menu"
              >
                <HiOutlineMenuAlt2 size={18} />
              </button>
            )}
            <div className="recipe-action-buttons">
              <Skeleton width={32} height={32} borderRadius={4} />
              <Skeleton width={32} height={32} borderRadius={4} />
              <Skeleton width={32} height={32} borderRadius={4} />
            </div>
          </div>
        )}

        {/* Title */}
        <Skeleton height={36} width="70%" style={{ marginBottom: '0.5rem' }} />

        {/* Byline */}
        <Skeleton height={16} width="40%" style={{ marginBottom: '0.75rem' }} />

        {/* Action buttons (desktop) */}
        {!isMobile && (
          <div className="recipe-action-buttons">
            <Skeleton width={32} height={32} borderRadius={4} />
            <Skeleton width={32} height={32} borderRadius={4} />
            <Skeleton width={32} height={32} borderRadius={4} />
          </div>
        )}

        {/* Description */}
        <Skeleton height={20} width="100%" style={{ marginBottom: '0.25rem' }} />
        <Skeleton height={20} width="85%" style={{ marginBottom: '1.5rem' }} />

        {/* Stats row */}
        <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
          <Skeleton width={60} height={16} />
          <Skeleton width={60} height={16} />
          <Skeleton width={70} height={16} />
          <Skeleton width={80} height={16} />
          <Skeleton width={80} height={16} />
          <Skeleton width={70} height={16} />
        </div>

        {/* Ingredients Section */}
        <Skeleton height={28} width="35%" style={{ marginTop: '2.5rem', marginBottom: '1.25rem' }} />
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={`ing-${index}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Skeleton width={18} height={18} borderRadius={3} />
            <Skeleton height={18} width={`${60 + Math.random() * 30}%`} />
          </div>
        ))}

        {/* Instructions Section */}
        <Skeleton height={28} width="35%" style={{ marginTop: '2.5rem', marginBottom: '1.25rem' }} />
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={`inst-${index}`} style={{ marginBottom: '1.25rem', paddingLeft: '1.25rem' }}>
            <Skeleton height={18} width="100%" style={{ marginBottom: '0.25rem' }} />
            <Skeleton height={18} width={`${70 + Math.random() * 25}%`} />
          </div>
        ))}

        {/* Notes Section */}
        <Skeleton height={28} width="20%" style={{ marginTop: '2.5rem', marginBottom: '1.25rem' }} />
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={`note-${index}`} style={{ marginBottom: '0.5rem', paddingLeft: '1.25rem' }}>
            <Skeleton height={18} width={`${50 + Math.random() * 40}%`} />
          </div>
        ))}
      </div>
    </SkeletonTheme>
  );
}

export default RecipeSkeleton;
