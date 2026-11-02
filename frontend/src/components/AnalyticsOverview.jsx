import React, { useState, useEffect } from 'react';

export default function AnalyticsOverview() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/analytics/summary');
      if (!res.ok) {
        throw new Error(`Fejl ved hentning af nøgletal (Status: ${res.status})`);
      }
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
      } else {
        throw new Error(json.error || 'Uventet datastruktur modtaget.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const formatDKK = (amount) => {
    return new Intl.NumberFormat('da-DK', {
      style: 'currency',
      currency: 'DKK',
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  if (loading) {
    return (
      <div style={styles.cardContainer}>
        <p style={styles.infoText}>Henter aktuelle nøgletal for Hotel Kong Arthur...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ ...styles.cardContainer, borderColor: '#e53e3e' }}>
        <p style={{ color: '#e53e3e', fontWeight: 'bold' }}>Kunne ikke indlæse nøgletal</p>
        <p style={styles.infoText}>{error}</p>
        <button style={styles.button} onClick={fetchSummary}>Prøv igen</button>
      </div>
    );
  }

  const { financials, occupancy } = data || {};

  return (
    <section style={styles.container}>
      <div style={styles.headerRow}>
        <div>
          <h2 style={styles.title}>Hurtigt Nøgletalsoverblik</h2>
          <p style={styles.subtitle}>Realtidsoverblik over hotellets drift og lobbybar</p>
        </div>
        <button style={styles.button} onClick={fetchSummary}>Opdater tal</button>
      </div>

      <div style={styles.grid}>
        {/* Samlet Omsætning */}
        <div style={{ ...styles.kpiCard, borderLeft: '4px solid #2b6cb0' }}>
          <span style={styles.kpiLabel}>Samlet Omsætning</span>
          <span style={styles.kpiValue}>{formatDKK(financials?.totalRevenue)}</span>
          <span style={styles.kpiSub}>Værelser + Bar</span>
        </div>

        {/* Værelsesomsætning */}
        <div style={{ ...styles.kpiCard, borderLeft: '4px solid #319795' }}>
          <span style={styles.kpiLabel}>Værelsesomsætning</span>
          <span style={styles.kpiValue}>{formatDKK(financials?.roomRevenue)}</span>
          <span style={styles.kpiSub}>{financials?.roomRevenuePercentage || 0}% af total</span>
        </div>

        {/* Baromsætning */}
        <div style={{ ...styles.kpiCard, borderLeft: '4px solid #d69e2e' }}>
          <span style={styles.kpiLabel}>Baromsætning (Helene)</span>
          <span style={styles.kpiValue}>{formatDKK(financials?.barRevenue)}</span>
          <span style={styles.kpiSub}>{financials?.barRevenuePercentage || 0}% af total</span>
        </div>

        {/* Belægningsgrad */}
        <div style={{ ...styles.kpiCard, borderLeft: '4px solid #805ad5' }}>
          <span style={styles.kpiLabel}>Belægningsgrad</span>
          <span style={styles.kpiValue}>{occupancy?.estimatedOverallOccupancyPercent || 0}%</span>
          <span style={styles.kpiSub}>
            {occupancy?.occupiedRoomNights?.toLocaleString('da-DK')} nætter (Kapacitet: {occupancy?.totalRoomsCapacity || 214} værelser)
          </span>
        </div>
      </div>
    </section>
  );
}

const styles = {
  container: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    marginBottom: '24px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  title: {
    margin: 0,
    fontSize: '20px',
    color: '#2d3748',
  },
  subtitle: {
    margin: '4px 0 0 0',
    fontSize: '14px',
    color: '#718096',
  },
  button: {
    backgroundColor: '#3182ce',
    color: '#ffffff',
    border: 'none',
    borderRadius: '4px',
    padding: '8px 14px',
    cursor: 'pointer',
    fontWeight: '500',
    fontSize: '14px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
  },
  kpiCard: {
    backgroundColor: '#f7fafc',
    borderRadius: '6px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  },
  kpiLabel: {
    fontSize: '13px',
    color: '#718096',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  kpiValue: {
    fontSize: '22px',
    color: '#1a202c',
    fontWeight: 'bold',
    margin: '6px 0',
  },
  kpiSub: {
    fontSize: '12px',
    color: '#a0aec0',
  },
  cardContainer: {
    padding: '24px',
    backgroundColor: '#f7fafc',
    borderRadius: '8px',
    textAlign: 'center',
    border: '1px solid #e2e8f0',
    marginBottom: '24px',
  },
  infoText: {
    color: '#4a5568',
    fontSize: '14px',
  },
};
