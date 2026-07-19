import { useEffect, useRef, useState } from 'react';
import PropertyCard from './PropertyCard.jsx';
import Icon from './ui/Icon.jsx';

// Pure — separated from the component so button-disabled logic is testable
// with plain numbers, since jsdom never computes real scrollWidth/clientWidth.
export function getCarouselButtonState(scrollLeft, scrollWidth, clientWidth, epsilon = 1) {
  return {
    canGoPrev: scrollLeft > epsilon,
    canGoNext: scrollLeft + clientWidth < scrollWidth - epsilon,
  };
}

export default function PropertyCarousel({ items, visibleCount = 3 }) {
  const trackRef = useRef(null);
  // Optimistic default: assume both directions usable until the real layout
  // is measured. scrollBy() naturally clamps at either edge, so a
  // momentarily-wrong "enabled" is harmless — unlike a wrongly-disabled
  // button, which would block a legitimate click.
  const [buttonState, setButtonState] = useState({ canGoPrev: true, canGoNext: true });

  function updateButtonState() {
    const track = trackRef.current;
    // scrollWidth === 0 means the track has no real layout yet (e.g. not
    // painted, or measured in an environment with no layout engine) — keep
    // the optimistic default rather than disabling both arrows on a
    // meaningless 0/0/0 reading.
    if (!track || track.scrollWidth === 0) return;
    setButtonState(getCarouselButtonState(track.scrollLeft, track.scrollWidth, track.clientWidth));
  }

  useEffect(() => {
    updateButtonState();
    // items changes the track's content/width — re-measure once rendered.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  function scrollByOneView(direction) {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({ left: direction * track.clientWidth, behavior: 'smooth' });
  }

  if (items === null) {
    return (
      <section className="section">
        <div className="container">
          <div className="pcard-grid">
            {Array.from({ length: visibleCount }, (_, i) => (
              <div key={i} className="pcard-skeleton" aria-hidden="true" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (items.length === 0) return null;

  const showArrows = items.length > visibleCount;

  return (
    <section className="section">
      <div className="container">
        <div className="section-header">
          <div className="section-header-text">
            <h2 className="text-display-md">Tin đăng mới nhất</h2>
            <p>Tin mới cập nhật trên toàn hệ thống</p>
          </div>
          <div className="carousel-header-actions">
            {showArrows && (
              <div className="carousel-arrows">
                <button
                  type="button"
                  className="carousel-arrow-btn"
                  aria-label="Xem tin trước đó"
                  disabled={!buttonState.canGoPrev}
                  onClick={() => scrollByOneView(-1)}
                >
                  <Icon name="ChevronLeft" size={18} />
                </button>
                <button
                  type="button"
                  className="carousel-arrow-btn"
                  aria-label="Xem tin tiếp theo"
                  disabled={!buttonState.canGoNext}
                  onClick={() => scrollByOneView(1)}
                >
                  <Icon name="ChevronRight" size={18} />
                </button>
              </div>
            )}
            <a href="#/search" className="section-header-link">
              Xem tất cả <Icon name="ArrowRight" size={15} />
            </a>
          </div>
        </div>
        <div className="carousel-track" ref={trackRef} onScroll={updateButtonState}>
          {items.map((property) => (
            <div className="carousel-item" key={property.id || property.title}>
              <PropertyCard property={property} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
