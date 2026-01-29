import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import '../styles/RecipeSkeleton.css';

import { useTheme } from './ThemeProvider';

function RecipeSkeleton({ showImageSkeleton = true }) {
  const { darkMode } = useTheme();
  const baseColor = getComputedStyle(document.documentElement).getPropertyValue('--skeleton-base').trim() || (darkMode ? '#1e293b' : '#e5e7eb');
  const highlightColor = getComputedStyle(document.documentElement).getPropertyValue('--skeleton-highlight').trim() || (darkMode ? '#334155' : '#f3f4f6');

  const ingredientWidths = ['75%', '60%', '80%', '55%', '70%', '65%', '85%', '50%'];
  const instructionWidths = ['95%', '88%', '92%', '85%', '90%', '80%'];
  const noteWidths = ['70%', '85%', '60%'];

  /* Use actual button classes to ensure identical sizing (padding, min-width) */
  /* Real buttons are 44x44 on mobile (14px icon + 12px padding*2 = 38px, but min-width is 44px) */
  /* Real buttons: 12px padding. 20px skeleton + 24px padding = 44px. */
  const actionButtonsSkeleton = (
    <div className="recipe-action-buttons">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="recipe-action-btn" style={{ pointerEvents: 'none', border: 'none', boxShadow: 'none' }}>
           <Skeleton width={18} height={18} borderRadius={4} />
        </div>
      ))}
    </div>
  );

  return (
    <SkeletonTheme baseColor={baseColor} highlightColor={highlightColor}>
      <div className="recipe recipe-skeleton">
        {/* Mobile header - always rendered, CSS handles visibility - MOVED outside view to prevent animation snap */}
        <div className="recipe-mobile-header">
          {actionButtonsSkeleton}
        </div>

        <div className="recipe-view">
          {/* Title */}
          <Skeleton height={36} width="70%" className="mb-2" />

          {/* Byline */}
          <Skeleton height={16} width="35%" className="mb-3" />

          {/* Desktop action buttons - always rendered, CSS handles visibility */}
          <div className="recipe-action-buttons-desktop">
            {actionButtonsSkeleton}
          </div>

          {/* Image skeleton */}
          {showImageSkeleton && (
            <div className="recipe-image">
              <Skeleton width="100%" className="aspect-video" borderRadius={8} />
            </div>
          )}

          {/* Description */}
          <Skeleton height={20} width="100%" className="mb-1" />
          <Skeleton height={20} width="85%" className="mb-6" />

          {/* Stats row */}
          <div className="sk-stats">
            <Skeleton width={55} height={16} />
            <Skeleton width={55} height={16} />
            <Skeleton width={65} height={16} />
            <Skeleton width={75} height={16} />
            <Skeleton width={75} height={16} />
            <Skeleton width={65} height={16} />
          </div>

          {/* Ingredients Section */}
          <Skeleton height={28} width="30%" className="sk-section-title" />
          <ul className="list-reset">
            {ingredientWidths.map((width, index) => (
              <li key={`ing-${index}`} className="ingredient-item">
                <Skeleton width={18} height={18} borderRadius={3} className="sk-checkbox-container" />
                <span className="flex-1">
                  <Skeleton height={18} width={width} />
                </span>
              </li>
            ))}
          </ul>

          {/* Instructions Section */}
          <Skeleton height={28} width="30%" className="sk-section-title" />
          {instructionWidths.map((width, index) => (
            <div key={`inst-${index}`} className="sk-instruction-item">
              <Skeleton height={18} width="100%" className="mb-1" />
              <Skeleton height={18} width={width} />
            </div>
          ))}

          {/* Notes Section */}
          <Skeleton height={28} width="18%" className="sk-section-title" />
          {noteWidths.map((width, index) => (
            <div key={`note-${index}`} className="sk-note-item">
              <Skeleton height={18} width={width} />
            </div>
          ))}
        </div>
      </div>
    </SkeletonTheme>
  );
}

export default RecipeSkeleton;
