import React, { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { DataTable, Column } from '../components/DataTable.js';

export const EnterMeasurementPage: React.FC = () => {
  const [indicators, setIndicators] = useState<any[]>([]);
  const [recentMeasurements, setRecentMeasurements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedIndId, setSelectedIndId] = useState<number | ''>('');
  const [value, setValue] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [source, setSource] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [dims, recent] = await Promise.all([
        api.get('/api/sustainability/indicators'),
        api.get('/api/operational/measurements'),
      ]);

      const flat: any[] = [];
      dims.forEach((d: any) => {
        if (d.indicators) {
          d.indicators.forEach((ind: any) => {
            flat.push({ ...ind, dimensionName: d.name });
          });
        }
      });
      setIndicators(flat);
      setRecentMeasurements(recent);
      if (flat.length > 0 && selectedIndId === '') {
        setSelectedIndId(flat[0].indicator_id);
      }
    } catch (err: any) {
      console.error('Failed to load measurement data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const selectedIndObj = indicators.find((i) => i.indicator_id === Number(selectedIndId));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const today = new Date().toISOString().slice(0, 10);
    if (date > today) {
      setError(`Measurement date cannot be in the future (today is ${today}).`);
      return;
    }

    const numValue = Number(value);
    if (isNaN(numValue)) {
      setError('Value must be a valid number.');
      return;
    }

    setSaving(true);
    try {
      await api.post('/api/operational/measurements', {
        indicator_id: Number(selectedIndId),
        value: numValue,
        measurement_date: date,
        source,
      });

      setSuccessMsg('Measurement entered and saved to database successfully.');
      setValue('');
      setSource('');
      loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<any>[] = [
    { key: 'measurement_id', header: 'ID' },
    { key: 'indicator_name', header: 'Indicator' },
    { key: 'dimension_name', header: 'Dimension' },
    { key: 'value', header: 'Value', render: (r) => <span className="font-mono" style={{ fontWeight: 600 }}>{r.value}</span> },
    { key: 'unit', header: 'Unit', render: (r) => <span className="font-mono">{r.unit}</span> },
    { key: 'measurement_date', header: 'Date', render: (r) => r.measurement_date?.slice(0, 10) },
    { key: 'source', header: 'Source / Location' },
    { key: 'recorded_by_username', header: 'Operator', render: (r) => r.recorded_by_username || '—' },
  ];

  if (loading) return <div className="panel">Loading measurement entry...</div>;

  return (
    <div>
      <div className="panel-header">
        <div>
          <h1>Enter Sustainability Measurement</h1>
          <p style={{ color: 'var(--ink-soft)' }}>
            Operational data entry for field telemetry, water meters, flue emissions, and energy logs (G9).
          </p>
        </div>
      </div>

      {/* Entry Form Panel */}
      <div className="panel" style={{ maxWidth: '640px', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Record Field Telemetry</h2>

        {error && (
          <div
            style={{
              padding: '0.6rem 0.8rem',
              backgroundColor: 'var(--danger-bg)',
              border: '1px solid var(--danger)',
              borderRadius: 'var(--radius)',
              color: 'var(--danger)',
              marginBottom: '1rem',
              fontSize: '0.85rem',
            }}
          >
            {error}
          </div>
        )}

        {successMsg && (
          <div
            style={{
              padding: '0.6rem 0.8rem',
              backgroundColor: 'var(--surface-hover)',
              border: '1px solid var(--moss)',
              borderRadius: 'var(--radius)',
              color: 'var(--moss)',
              marginBottom: '1rem',
              fontSize: '0.85rem',
              fontWeight: 600,
            }}
          >
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Target Sustainability Indicator</label>
            <select
              value={selectedIndId}
              onChange={(e) => setSelectedIndId(Number(e.target.value))}
            >
              {indicators.map((ind) => (
                <option key={ind.indicator_id} value={ind.indicator_id}>
                  {ind.name} ({ind.dimensionName} — {ind.unit})
                </option>
              ))}
            </select>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>Measurement Value {selectedIndObj ? `(${selectedIndObj.unit})` : ''}</label>
              <input
                type="number"
                step="any"
                required
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="e.g. 1420.50"
              />
            </div>
            <div className="form-group">
              <label>Measurement Date</label>
              <input
                type="date"
                required
                max={new Date().toISOString().slice(0, 10)}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Data Source / Physical Measuring Station</label>
            <input
              type="text"
              required
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="e.g. Flue Gas Sensor 1, Water Meter Station B"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={saving}
            style={{ marginTop: '0.5rem' }}
          >
            {saving ? 'Saving...' : 'Submit Measurement'}
          </button>
        </form>
      </div>

      {/* Recent Measurements Log */}
      <div>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '0.75rem' }}>Recent Operational Measurements</h2>
        <DataTable
          columns={columns}
          data={recentMeasurements}
          emptyMessage="No measurements recorded yet."
        />
      </div>
    </div>
  );
};
