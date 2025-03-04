import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

function RecipeSkeleton() {
  return (
    <div className="recipe recipe-skeleton" style={{ marginTop: '2rem' }}>
        {/* Title Skeleton */}
        <Skeleton height={40} width="60%" style={{ marginBottom: '1rem' }} />
        {/* Introduction Paragraph Skeleton */}
        <Skeleton height={20} width="90%" style={{ marginBottom: '1rem' }} />
        
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
  );
}

export default RecipeSkeleton;
