import { useEffect, useState } from 'react';
import PropertyCard from '../components/PropertyCard.jsx';
import SearchBar from '../components/SearchBar.jsx';
import MainLayout from '../layouts/MainLayout.jsx';
import { featuredProperties } from '../data/templateData.js';
import { fetchProperties } from '../services/api.js';

export default function HomePage({ session, onLogout }) {
  const [properties, setProperties] = useState(featuredProperties);

  useEffect(() => {
    let alive = true;
    fetchProperties({ category: 'all', transaction: 'all' })
      .then((items) => {
        if (alive && items.length > 0) setProperties(items.slice(0, 3));
      })
      .catch(() => {
        if (alive) setProperties(featuredProperties);
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <MainLayout session={session} onLogout={onLogout}>
      <main className="flex-grow">
        <section className="relative min-h-[600px] flex items-center justify-center overflow-hidden">
          <img
            className="absolute inset-0 w-full h-full object-cover"
            data-alt="A wide aerial city view used as a real estate search hero background."
            src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1800&q=80"
            alt="Bất động sản Trà Vinh"
          />
          <div className="absolute inset-0 bg-primary/65"></div>
          <div className="relative z-10 px-margin-mobile md:px-margin-desktop w-full text-center">
            <h1 className="font-headline-xl-mobile md:font-headline-xl text-headline-xl-mobile md:text-headline-xl text-white max-w-[760px] mx-auto mb-stack-lg">
              Tìm nhà trọ, bất động sản Trà Vinh nhanh chóng
            </h1>
            <SearchBar />
          </div>
        </section>

        <section className="px-margin-mobile md:px-margin-desktop py-[96px] max-w-container-max mx-auto">
          <div className="flex justify-between items-end mb-stack-lg">
            <div>
              <h2 className="font-headline-lg text-headline-lg text-trust-navy mb-2">Tin nổi bật</h2>
              <p className="font-body-md text-body-md text-on-surface-variant">Khám phá các bất động sản tốt nhất tại Trà Vinh</p>
            </div>
            <a className="hidden md:flex items-center gap-1 font-label-bold text-label-bold text-trust-navy hover:text-action-orange transition-colors" href="#/search">
              Xem tất cả →
            </a>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
            {properties.map((property) => (
              <PropertyCard key={property.title} property={property} />
            ))}
          </div>
        </section>
      </main>
    </MainLayout>
  );
}
