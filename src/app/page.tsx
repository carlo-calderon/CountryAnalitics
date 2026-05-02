import { fetchWorldBankHistory } from '@/lib/worldbank';
import DevelopmentChart from '@/components/DevelopmentChart';
import { Globe, TrendingUp, AlertCircle, Info } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const data = await fetchWorldBankHistory();

  // Simple analytics
  const data2024 = data.map(c => {
    const latest = c.history[2024] || {};
    return {
      name: c.name,
      gini: (latest.gini as number) || 0,
      gdpPpp: (latest.gdpPpp as number) || 0
    };
  });
  
  const totalCountries = data.length;
  const avgGini = data2024.reduce((acc, curr) => acc + curr.gini, 0) / totalCountries;
  const highestGdp = [...data2024].sort((a, b) => b.gdpPpp - a.gdpPpp)[0];
  const lowestGini = [...data2024].sort((a, b) => a.gini - b.gini)[0];

  return (
    <main className="animate-fade-in">
      <header style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Globe size={24} className="title-gradient" style={{ opacity: 0.8 }} />
            <h1 style={{ fontSize: '1.75rem', fontWeight: '800' }} className="title-gradient">
              Country Analytics
            </h1>
          </div>
          <p style={{ fontSize: '0.875rem', opacity: 0.6 }}>
            Visualización interactiva de desigualdad y riqueza global.
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
           <p style={{ fontSize: '0.65rem', opacity: 0.4, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Fuente de datos</p>
           <p style={{ fontSize: '0.875rem', fontWeight: '600' }}>World Bank Open Data</p>
        </div>
      </header>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="glass-card" style={{ padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--accent-primary)' }}>
            <TrendingUp size={16} />
            <h3 style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Países</h3>
          </div>
          <p style={{ fontSize: '1.5rem', fontWeight: '700' }}>{totalCountries}</p>
        </div>

        <div className="glass-card" style={{ padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--accent-secondary)' }}>
            <Info size={16} />
            <h3 style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Gini Promedio</h3>
          </div>
          <p style={{ fontSize: '1.5rem', fontWeight: '700' }}>{avgGini.toFixed(1)}</p>
        </div>

        <div className="glass-card" style={{ padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--accent-tertiary)' }}>
            <TrendingUp size={16} />
            <h3 style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Líder PIB PPA</h3>
          </div>
          <p style={{ fontSize: '1.125rem', fontWeight: '700' }}>{highestGdp?.name}</p>
        </div>

        <div className="glass-card" style={{ padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--success)' }}>
            <AlertCircle size={16} />
            <h3 style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Menor Desigualdad</h3>
          </div>
          <p style={{ fontSize: '1.125rem', fontWeight: '700' }}>{lowestGini?.name}</p>
        </div>
      </section>

      <section>
        <DevelopmentChart data={data} />
      </section>

      <footer style={{ marginTop: '4rem', paddingBottom: '2rem', borderTop: '1px solid var(--card-border)', paddingTop: '2rem', textAlign: 'center', opacity: 0.6, fontSize: '0.875rem' }}>
        <p>Datos provistos por el Banco Mundial API • Desarrollado con Next.js y Recharts</p>
      </footer>
    </main>
  );
}
