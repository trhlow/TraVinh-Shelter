import { useEffect, useMemo, useState } from 'react';
import Icon from './ui/Icon.jsx';

export default function ImageGallery({ images, title = 'Ảnh bài đăng', fallbackImage }) {
  const uniqueImages = useMemo(() => {
    const cleanImages = images.filter(Boolean);
    return [...new Set(cleanImages)];
  }, [images]);
  const galleryImages = uniqueImages.length > 0 ? uniqueImages : [fallbackImage].filter(Boolean);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const hasMultipleImages = galleryImages.length > 1;
  const mainImage = galleryImages[selectedImageIndex] || galleryImages[0];

  const imageKey = galleryImages.join('|');

  useEffect(() => {
    setSelectedImageIndex(0);
  }, [imageKey]);

  useEffect(() => {
    if (!hasMultipleImages) return undefined;
    function handleKeyDown(event) {
      if (event.key === 'ArrowLeft') {
        setSelectedImageIndex((current) => (current === 0 ? galleryImages.length - 1 : current - 1));
      }
      if (event.key === 'ArrowRight') {
        setSelectedImageIndex((current) => (current + 1) % galleryImages.length);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [galleryImages.length, hasMultipleImages]);

  function previousImage() {
    setSelectedImageIndex((current) => (current === 0 ? galleryImages.length - 1 : current - 1));
  }

  function nextImage() {
    setSelectedImageIndex((current) => (current + 1) % galleryImages.length);
  }

  if (galleryImages.length === 0) {
    return <div className="gallery-placeholder">Không có ảnh</div>;
  }

  return (
    <div className="gallery">
      <div className="gallery-main">
        <img
          alt={title}
          className="gallery-main-img"
          data-alt="A bright, high-quality wide photograph of a clean real estate listing in Tra Vinh."
          id="main-gallery-image"
          loading="eager"
          src={mainImage}
        />
        {hasMultipleImages && (
          <>
            <button
              aria-label="Xem ảnh trước"
              className="gallery-nav gallery-nav-prev"
              onClick={previousImage}
              type="button"
            >
              <Icon name="ChevronLeft" size={20} />
            </button>
            <button
              aria-label="Xem ảnh tiếp theo"
              className="gallery-nav gallery-nav-next"
              onClick={nextImage}
              type="button"
            >
              <Icon name="ChevronRight" size={20} />
            </button>
          </>
        )}
        <div className="gallery-counter">
          <Icon name="Image" size={15} />
          {`${selectedImageIndex + 1} / ${galleryImages.length}`}
        </div>
      </div>
      {hasMultipleImages && (
        <div aria-label="Danh sách ảnh bài đăng" className="gallery-thumbs">
          {galleryImages.map((image, index) => (
            <button
              aria-label={`Xem ảnh ${index + 1}`}
              className={`gallery-thumb${selectedImageIndex === index ? ' is-active' : ''}`}
              key={image}
              onClick={() => setSelectedImageIndex(index)}
              type="button"
            >
              <img
                alt={`Ảnh thu nhỏ ${index + 1}`}
                data-alt="Thumbnail showing real estate listing details."
                loading="lazy"
                src={image}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
