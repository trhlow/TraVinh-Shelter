import MaterialIcon from './MaterialIcon.jsx';

export default function PropertyCard({ property, compact = false }) {
  const price = property.priceLabel || property.price;
  const location = property.address || property.location;
  const area = property.area ? `${property.area}${Number.isFinite(Number(property.area)) ? 'm²' : ''}` : property.size;
  const beds = property.bedrooms ?? property.beds;
  const baths = property.bathrooms ?? property.baths;
  const broker = property.broker?.name || property.broker;
  const brokerInitial = property.brokerInitial || broker?.charAt(0) || 'B';
  const postedAt = property.postedAt || 'Mới cập nhật';
  const href = property.id ? `#/property/${property.id}` : '#/property';

  if (compact) {
    return (
      <article className="ui-card overflow-hidden group">
        <a className="block relative h-48 w-full" href={href}>
          <img className="w-full h-full object-cover" data-alt={property.dataAlt} src={property.image} alt={property.title} />
          <div className="absolute bottom-0 w-full h-1/2 bg-gradient-to-t from-black/60 to-transparent"></div>
          <span className="absolute top-2 left-2 bg-trust-navy text-on-primary font-label-bold text-label-bold px-2 py-1 rounded">{price}</span>
        </a>
        <div className="p-4">
          <a href={href} className="block">
            <h3 className="font-headline-md text-headline-md text-trust-navy mb-2 line-clamp-2 group-hover:text-action-orange transition-colors">{property.title}</h3>
          </a>
          <p className="font-body-sm text-body-sm text-on-surface-variant mb-4 flex items-center gap-1">
            <MaterialIcon className="text-base">location_on</MaterialIcon> {location}
          </p>
          <div className="flex justify-between items-center border-t border-surface-variant pt-2 mt-2">
            <div className="flex gap-4 font-body-sm text-body-sm text-trust-navy font-semibold">
              {area && <span className="flex items-center gap-1"><MaterialIcon className="text-sm">straighten</MaterialIcon> {area}</span>}
              {beds > 0 && <span className="flex items-center gap-1"><MaterialIcon className="text-sm">bed</MaterialIcon> {beds}</span>}
              {baths > 0 && <span className="flex items-center gap-1"><MaterialIcon className="text-sm">shower</MaterialIcon> {baths}</span>}
            </div>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="ui-card overflow-hidden">
      <a className="block relative h-72 w-full" href={href}>
        <img className="w-full h-full object-cover" data-alt={property.dataAlt} src={property.image} alt={property.title} />
        <span className="absolute top-4 left-4 bg-primary text-on-primary font-label-bold text-label-bold px-3 py-1 rounded">{price}</span>
        {property.status && (
          <span className="absolute top-4 right-4 bg-white text-trust-navy font-label-bold text-label-bold px-3 py-1 rounded flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-success-green"></span>{property.status}
          </span>
        )}
      </a>
      <div className="p-4">
        <a href={href} className="block">
          <h3 className="font-headline-md text-headline-md text-on-surface mb-3">{property.title}</h3>
        </a>
        <div className="flex flex-wrap gap-4 font-body-sm text-body-sm text-on-surface-variant mb-3">
          {area && <span className="flex items-center gap-1"><MaterialIcon className="text-sm">square_foot</MaterialIcon> {area}</span>}
          {beds > 0 && <span className="flex items-center gap-1"><MaterialIcon className="text-sm">bed</MaterialIcon> {beds}</span>}
          {baths > 0 && <span className="flex items-center gap-1"><MaterialIcon className="text-sm">shower</MaterialIcon> {baths}</span>}
          {property.size && <span className="flex items-center gap-1"><MaterialIcon className="text-sm">crop</MaterialIcon> {property.size}</span>}
          {property.legal && <span className="flex items-center gap-1"><MaterialIcon className="text-sm">landscape</MaterialIcon> {property.legal}</span>}
        </div>
        <p className="font-body-sm text-body-sm text-on-surface-variant mb-4 flex items-center gap-1">
          <MaterialIcon>location_on</MaterialIcon> {location}
        </p>
        <div className="border-t border-surface-variant pt-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-surface-container flex items-center justify-center font-label-bold text-label-bold text-trust-navy">{brokerInitial}</div>
            <span className="font-body-sm text-body-sm text-on-surface">{broker}</span>
          </div>
          <span className="font-body-sm text-body-sm text-on-surface-variant">{postedAt}</span>
        </div>
      </div>
    </article>
  );
}
