import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { HiOutlineMenuAlt2 } from 'react-icons/hi';
import { useTheme } from './ThemeProvider';

function RecipeSkeleton({ isMobile, sidebarCollapsed, onToggleSidebar }) {
  const { darkMode } = useTheme();

  const baseColor = darkMode ? '#2a2a2a' : '#ebebeb';
  const highlightColor = darkMode ? '#3a3a3a' : '#f5f5f5';

  const ingredientWidths = ['75%', '60%', '80%', '55%', '70%', '65%', '85%', '50%'];
  const instructionWidths = ['95%', '88%', '92%', '85%', '90%', '80%'];
  const noteWidths = ['70%', '85%', '60%'];

  return (
    <SkeletonTheme baseColor={baseColor} highlightColor={highlightColor}>
      <div className="recipe recipe-skeleton">
        <div className="recipe-view">
          {/* Mobile header - matches RecipeView structure */}
          {isMobile && (
            <div className="recipe-mobile-header">
              {sidebarCollapsed && onToggleSidebar && (
                <button
                  className="mobile-menu-btn"
                  onClick={onToggleSidebar}
                  aria-label="Open menu"
                >
                  <HiOutlineMenuAlt2 size={20} />
                </button>
              )}
              <div className="recipe-action-buttons">
                <span style={{ width: 32, height: 32, display: 'block' }}><Skeleton width={32} height={32} borderRadius={4} /></span>
                <span style={{ width: 32, height: 32, display: 'block' }}><Skeleton width={32} height={32} borderRadius={4} /></span>
                <span style={{ width: 32, height: 32, display: 'block' }}><Skeleton width={32} height={32} borderRadius={4} /></span>
                <span style={{ width: 32, height: 32, display: 'block' }}><Skeleton width={32} height={32} borderRadius={4} /></span>
              </div>
            </div>
          )}

          {/* Title */}
          <Skeleton height={36} width="70%" style={{ marginBottom: '0.5rem' }} />

          {/* Byline */}
          <Skeleton height={16} width="35%" style={{ marginBottom: '0.75rem' }} />

          {/* Action buttons (desktop) */}
          {!isMobile && (
            <div className="recipe-action-buttons">
              <span style={{ width: 32, height: 32, display: 'block' }}><Skeleton width={32} height={32} borderRadius={4} /></span>
              <span style={{ width: 32, height: 32, display: 'block' }}><Skeleton width={32} height={32} borderRadius={4} /></span>
              <span style={{ width: 32, height: 32, display: 'block' }}><Skeleton width={32} height={32} borderRadius={4} /></span>
              <span style={{ width: 32, height: 32, display: 'block' }}><Skeleton width={32} height={32} borderRadius={4} /></span>
            </div>
          )}

          {/* Image skeleton */}
          <div className="recipe-image">
            <Skeleton width="100%" style={{ aspectRatio: '16 / 9' }} borderRadius={8} />
          </div>

          {/* Description */}
          <Skeleton height={20} width="100%" style={{ marginBottom: '0.25rem' }} />
          <Skeleton height={20} width="85%" style={{ marginBottom: '1.5rem' }} />

          {/* Stats row */}
          <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
            <Skeleton width={55} height={16} />
            <Skeleton width={55} height={16} />
            <Skeleton width={65} height={16} />
            <Skeleton width={75} height={16} />
            <Skeleton width={75} height={16} />
            <Skeleton width={65} height={16} />
          </div>

          {/* Ingredients Section */}
          <Skeleton height={28} width="30%" style={{ marginTop: '2.5rem', marginBottom: '1.25rem' }} />
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {ingredientWidths.map((width, index) => (
              <li key={`ing-${index}`} className="ingredient-item">
                <Skeleton width={18} height={18} borderRadius={3} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span style={{ flex: 1 }}>
                  <Skeleton height={18} width={width} />
                </span>
              </li>
            ))}
          </ul>

          {/* Instructions Section */}
          <Skeleton height={28} width="30%" style={{ marginTop: '2.5rem', marginBottom: '1.25rem' }} />
          {instructionWidths.map((width, index) => (
            <div key={`inst-${index}`} style={{ marginBottom: '1.25rem', paddingLeft: '1.25rem' }}>
              <Skeleton height={18} width="100%" style={{ marginBottom: '0.25rem' }} />
              <Skeleton height={18} width={width} />
            </div>
          ))}

          {/* Notes Section */}
          <Skeleton height={28} width="18%" style={{ marginTop: '2.5rem', marginBottom: '1.25rem' }} />
          {noteWidths.map((width, index) => (
            <div key={`note-${index}`} style={{ marginBottom: '0.5rem', paddingLeft: '1.25rem' }}>
              <Skeleton height={18} width={width} />
            </div>
          ))}
        </div>
      </div>
    </SkeletonTheme>
  );
}

export default RecipeSkeleton;
