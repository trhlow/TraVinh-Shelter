import { useCallback, useEffect, useRef, useState } from 'react';
import Icon from './ui/Icon.jsx';
import Badge from './ui/Badge.jsx';

const AUTO_ADVANCE_MS = 5000;

function normalizeProperty(property) {
  const price = property.priceLabel || property.price;
  const location = property.address || property.location;
  const area = property.area
    ? `${property.area}${Number.isFinite(Number(property.area)) ? 'm²' : ''}`
    : property.size;
  const beds = property.bedrooms ?? property.beds;
  const baths = property.bathrooms ?? property.baths;
  const href = property.id ? `#/property/${property.id}` : '#/property';
  return { price, location, area, beds, baths, href };
}

export default function FeaturedCarousel({ properties }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const intervalRef = useRef(null);

  const items = properties && properties.length > 0 ? properties : [];
  const single = items.length === 1;
  const empty = items.length === 0;

  // Preload next image when index changes
  useEffect(() => {
    if (items.length < 2) return;
    const nextIndex = (index + 1) % items.length;
    const nextSrc = items[nextIndex]?.image;
    if (nextSrc) {
      const img = new Image();
      img.src = nextSrc;
    }
  }, [index, items]);

  // Auto-advance interval — cleaned up properly for StrictMode
  const startInterval = useCallback(() => {
    if (single || empty) return;
    intervalRef.current = setInterval(() => {
      setIndex(prev => (prev + 1) % items.length);
    }, AUTO_ADVANCE_MS);
  }, [items.length, single, empty]);

  const stopInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const goTo = useCallback((i) => {
    setIndex(i);
    // Reset timer on manual navigation
    stopInterval();
    if (!paused) {
      startInterval();
    }
  }, [paused, stopInterval, startInterval]);

  useEffect(() => {
    if (!paused) {
      startInterval();
    }
    return stopInterval;
  }, [paused, startInterval, stopInterval]);

  function goPrev() {
    goTo((index - 1 + items.length) % items.length);
  }

  function goNext() {
    goTo((index + 1) % items.length);
  }

  function handleMouseEnter() { setPaused(true); }
  function handleMouseLeave() { setPaused(false); }
  function handleFocusIn() { setPaused(true); }
  function handleFocusOut() { setPaused(false); }

  // Empty state: skeleton of the same dimensions
  if (empty) {
    return <div className="featured-carousel-skeleton" aria-hidden="true" />;
  }

  return (
    <div
      className="featured-carousel"
      role="region"
      aria-label="Tin nổi bật"
      aria-live="polite"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocusCapture={handleFocusIn}
      onBlurCapture={handleFocusOut}
    >
      <div className="featured-carousel-track">
        {items.map((property, i) => {
          const { price, location, area, beds, baths, href } = normalizeProperty(property);
          const isActive = i === index;

          return (
            <div
              key={property.id || property.title || i}
              className={`featured-carousel-slide${isActive ? ' featured-carousel-slide--active' : ''}`}
              aria-hidden={!isActive}
            >
              {/* Image pane */}
              <div className="featured-carousel-image-pane">
                <img
                  src={property.image}
                  alt={property.title || ''}
                  loading={isActive ? 'eager' : 'lazy'}
                />
              </div>

              {/* Info panel */}
              <div className="featured-carousel-info">
                {price && (
                  <div className="featured-carousel-price">
                    <Badge variant="accent">{price}</Badge>
                  </div>
                )}

                <h3 className="featured-carousel-title">{property.title}</h3>

                {location && (
                  <div className="featured-carousel-location">
                    <Icon name="MapPin" size={14} />
                    {location}
                  </div>
                )}

                {(area || beds > 0 || baths > 0) && (
                  <div className="featured-carousel-meta">
                    {area && (
                      <span className="featured-carousel-meta-item">
                        <Icon name="Maximize2" size={14} /> {area}
                      </span>
                    )}
                    {beds > 0 && (
                      <span className="featured-carousel-meta-item">
                        <Icon name="Bed" size={14} /> {beds} phòng ngủ
                      </span>
                    )}
                    {baths > 0 && (
                      <span className="featured-carousel-meta-item">
                        <Icon name="Bath" size={14} /> {baths} phòng tắm
                      </span>
                    )}
                  </div>
                )}

                <a href={href} className="featured-carousel-link">
                  Xem chi tiết <Icon name="ChevronRight" size={16} />
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {/* Navigation arrows — only when more than one item */}
      {!single && (
        <div className="featured-carousel-arrows">
          <button
            className="featured-carousel-arrow"
            aria-label="Bài đăng trước"
            onClick={goPrev}
            type="button"
          >
            <Icon name="ChevronLeft" size={18} />
          </button>
          <button
            className="featured-carousel-arrow"
            aria-label="Bài đăng tiếp theo"
            onClick={goNext}
            type="button"
          >
            <Icon name="ChevronRight" size={18} />
          </button>
        </div>
      )}

      {/* Dot indicators — only when more than one item */}
      {!single && (
        <div className="featured-carousel-dots" role="group" aria-label="Chọn bài đăng">
          {items.map((_, i) => (
            <button
              key={i}
              className={`featured-carousel-dot${i === index ? ' featured-carousel-dot--active' : ''}`}
              aria-label={`Đến bài ${i + 1}`}
              aria-current={i === index ? 'true' : undefined}
              onClick={() => goTo(i)}
              type="button"
            />
          ))}
        </div>
      )}
    </div>
  );
}
