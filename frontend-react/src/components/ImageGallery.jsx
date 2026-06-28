import { useEffect, useMemo, useState } from 'react';
import MaterialIcon from './MaterialIcon.jsx';

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

  return (
    <div className="flex flex-col gap-stack-sm">
      <div className="group relative h-[300px] w-full overflow-hidden rounded-xl shadow-sm md:h-[450px]">
        <img
          alt={title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          data-alt="A bright, high-quality wide photograph of a clean real estate listing in Tra Vinh."
          id="main-gallery-image"
          src={mainImage}
        />
        {hasMultipleImages && (
          <>
            <button
              aria-label="Xem ảnh trước"
              className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded bg-surface/90 text-on-surface shadow-sm backdrop-blur transition-colors hover:bg-surface-container-low"
              onClick={previousImage}
              type="button"
            >
              <MaterialIcon>chevron_left</MaterialIcon>
            </button>
            <button
              aria-label="Xem ảnh tiếp theo"
              className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded bg-surface/90 text-on-surface shadow-sm backdrop-blur transition-colors hover:bg-surface-container-low"
              onClick={nextImage}
              type="button"
            >
              <MaterialIcon>chevron_right</MaterialIcon>
            </button>
          </>
        )}
        <div className="absolute bottom-4 right-4 flex items-center gap-2 rounded bg-surface/90 px-3 py-1 font-label-bold text-label-bold text-on-surface shadow-sm backdrop-blur border border-outline-variant">
          <MaterialIcon className="text-[16px]">photo_library</MaterialIcon>
          {galleryImages.length > 0 ? `${selectedImageIndex + 1}/${galleryImages.length}` : '0/0'}
        </div>
      </div>
      {galleryImages.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar" aria-label="Danh sách ảnh bài đăng">
          {galleryImages.map((image, index) => (
            <button
              aria-label={`Xem ảnh ${index + 1}`}
              className={`h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 transition-all ${selectedImageIndex === index ? 'border-primary opacity-100' : 'border-transparent opacity-70 hover:border-outline-variant hover:opacity-100'}`}
              key={image}
              onClick={() => setSelectedImageIndex(index)}
              type="button"
            >
              <img
                alt={`Ảnh thu nhỏ ${index + 1}`}
                className="h-full w-full object-cover"
                data-alt="Thumbnail showing real estate listing details."
                src={image}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

