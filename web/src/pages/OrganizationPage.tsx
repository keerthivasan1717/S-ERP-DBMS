import React, { useEffect, useState } from 'react';
import { api } from '../api/client.js';

export const OrganizationPage: React.FC = () => {
  const [org, setOrg] = useState<any>(null);
  const [allDimensions, setAllDimensions] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [selectedDimIds, setSelectedDimIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadOrg() {
      try {
        const [orgData, dims] = await Promise.all([
          api.get('/api/admin/organization'),
          api.get('/api/sustainability/indicators'),
        ]);
        setOrg(orgData);
        setAllDimensions(dims);
        setName(orgData.name || '');
        setDescription(orgData.description || '');
        setAddress(orgData.address || '');
        setSelectedDimIds(orgData.dimensions?.map((d: any) => d.dimension_id) || []);
      } catch (err: any) {
        console.error('Failed to load organization:', err);
      } finally {
        setLoading(false);
      }
    }
    loadOrg();
  }, []);

  const handleToggleDim = (dimId: number) => {
    setSelectedDimIds((prev) =>
      prev.includes(dimId) ? prev.filter((id) => id !== dimId) : [...prev, dimId]
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const updated = await api.put('/api/admin/organization', {
        name,
        description,
        address,
        dimensionIds: selectedDimIds,
      });
      setOrg(updated);
      setMessage('Organization profile and sustainability focus areas updated successfully.');
    } catch (err: any) {
      setMessage(`Error updating organization: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="panel">Loading organization profile...</div>;

  return (
    <div>
      <div className="panel-header">
        <div>
          <h1>Organization Profile</h1>
          <p style={{ color: 'var(--ink-soft)' }}>
            System-level organization master record and strategic sustainability dimension focus.
          </p>
        </div>
      </div>

      <div className="panel" style={{ maxWidth: '680px' }}>
        {message && (
          <div
            style={{
              padding: '0.6rem 0.8rem',
              backgroundColor: message.startsWith('Error') ? 'var(--danger-bg)' : 'var(--surface-hover)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius)',
              marginBottom: '1rem',
              fontSize: '0.85rem',
            }}
          >
            {message}
          </div>
        )}

        <form onSubmit={handleSave}>
          <div className="form-group">
            <label>Enterprise Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Physical Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Description & Mission</label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div style={{ marginTop: '1.25rem', marginBottom: '1.25rem' }}>
            <label style={{ marginBottom: '0.6rem' }}>Strategic Sustainability Focus Areas (G1)</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {allDimensions.map((d: any) => (
                <label
                  key={d.dimension_id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    textTransform: 'none',
                    fontWeight: 400,
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedDimIds.includes(d.dimension_id)}
                    onChange={() => handleToggleDim(d.dimension_id)}
                  />
                  <span>
                    <strong>{d.name} Dimension</strong> — {d.description}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save Profile Changes'}
          </button>
        </form>
      </div>
    </div>
  );
};
