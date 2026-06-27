import MaterialIcon from './MaterialIcon.jsx';

export default function PropertyCard({ property, compact = false }) {
  if (compact) {
    return (
      <article className="bg-surface-container-lowest rounded-lg overflow-hidden shadow-[0_2px_10px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)] hover:border-trust-navy border border-transparent transition-all group">
        <div className="relative h-48 w-full">
          <img className="w-full h-full object-cover" data-alt={property.dataAlt} src={property.image} alt={property.title} />
          <div className="absolute bottom-0 w-full h-1/2 bg-gradient-to-t from-black/60 to-transparent"></div>
          <span className="absolute top-2 left-2 bg-trust-navy text-on-primary font-label-bold text-label-bold px-2 py-1 rounded">{property.price}</span>
        </div>
        <div className="p-4">
          <h3 className="font-headline-md text-headline-md text-trust-navy mb-2 line-clamp-2 group-hover:text-action-orange transition-colors">{property.title}</h3>
          <p className="font-body-sm text-body-sm text-on-surface-variant mb-4 flex items-center gap-1">
            <MaterialIcon className="text-base">location_on</MaterialIcon> {property.location}
          </p>
          <div className="flex justify-between items-center border-t border-surface-variant pt-2 mt-2">
            <div className="flex gap-4 font-body-sm text-body-sm text-trust-navy font-semibold">
              {property.area && <span className="flex items-center gap-1"><MaterialIcon className="text-sm">straighten</MaterialIcon> {property.area}</span>}
              {property.beds && <span className="flex items-center gap-1"><MaterialIcon className="text-sm">bed</MaterialIcon> {property.beds}</span>}
              {property.baths && <span className="flex items-center gap-1"><MaterialIcon className="text-sm">shower</MaterialIcon> {property.baths}</span>}
            </div>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="bg-white rounded-lg overflow-hidden shadow-[0_2px_10px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)] border border-transparent transition-all">
      <div className="relative h-72 w-full">
        <img className="w-full h-full object-cover" data-alt={property.dataAlt} src={property.image} alt={property.title} />
        <span className="absolute top-4 left-4 bg-primary text-on-primary font-label-bold text-label-bold px-3 py-1 rounded">{property.price}</span>
        {property.status && (
          <span className="absolute top-4 right-4 bg-white text-trust-navy font-label-bold text-label-bold px-3 py-1 rounded flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-success-green"></span>{property.status}
          </span>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-headline-md text-headline-md text-on-surface mb-3">{property.title}</h3>
        <div className="flex flex-wrap gap-4 font-body-sm text-body-sm text-on-surface-variant mb-3">
          {property.area && <span className="flex items-center gap-1"><MaterialIcon className="text-sm">square_foot</MaterialIcon> {property.area}</span>}
          {property.beds && <span className="flex items-center gap-1"><MaterialIcon className="text-sm">bed</MaterialIcon> {property.beds}</span>}
          {property.baths && <span className="flex items-center gap-1"><MaterialIcon className="text-sm">shower</MaterialIcon> {property.baths}</span>}
          {property.size && <span className="flex items-center gap-1"><MaterialIcon className="text-sm">crop</MaterialIcon> {property.size}</span>}
          {property.legal && <span className="flex items-center gap-1"><MaterialIcon className="text-sm">landscape</MaterialIcon> {property.legal}</span>}
        </div>
        <p className="font-body-sm text-body-sm text-on-surface-variant mb-4 flex items-center gap-1">
          <MaterialIcon>location_on</MaterialIcon> {property.location}
        </p>
        <div className="border-t border-surface-variant pt-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center font-label-bold text-label-bold text-trust-navy">{property.brokerInitial}</div>
            <span className="font-body-sm text-body-sm text-on-surface">{property.broker}</span>
          </div>
          <span className="font-body-sm text-body-sm text-on-surface-variant">{property.postedAt}</span>
        </div>
      </div>
    </article>
  );
}
