import { DATE_PRESETS, resolveDateRange } from '../../utils/dateRange.js';

// Controlled preset pills + optional custom from/to inputs.
// onChange(presetId, custom, resolvedRange)
export default function DateRangeFilter({ preset = 'all', custom = {}, onChange }) {
  const emit = (nextPreset, nextCustom) => {
    onChange(nextPreset, nextCustom, resolveDateRange(nextPreset, nextCustom));
  };

  return (
    <div className="date-range-filter">
      {DATE_PRESETS.map((item) => (
        <button
          key={item.id}
          type="button"
          className={`date-range-pill ${preset === item.id ? 'is-active' : ''}`}
          onClick={() => emit(item.id, custom)}
        >
          {item.label}
        </button>
      ))}
      {preset === 'custom' && (
        <div className="date-range-custom">
          <label className="dashboard-table-sub" htmlFor="date-range-from">Từ ngày</label>
          <input
            id="date-range-from"
            className="input"
            type="date"
            value={custom.from || ''}
            onChange={(event) => emit('custom', { ...custom, from: event.target.value })}
          />
          <label className="dashboard-table-sub" htmlFor="date-range-to">Đến ngày</label>
          <input
            id="date-range-to"
            className="input"
            type="date"
            value={custom.to || ''}
            onChange={(event) => emit('custom', { ...custom, to: event.target.value })}
          />
        </div>
      )}
    </div>
  );
}
