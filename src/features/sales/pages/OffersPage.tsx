import PageHeader from '@/components/layout/PageHeader';
import { Sun, Flame, Building2, Home, FileText } from 'lucide-react';

const offerTiles = [
  { label: 'Oferta Fotowoltaika', icon: <Sun size={24} />, color: '#d97706' },
  { label: 'Oferta Źródło ciepła', icon: <Flame size={24} />, color: '#dc2626' },
  { label: 'Oferta Hala Stalowa', icon: <Building2 size={24} />, color: '#4f46e5' },
  { label: 'Oferta Dom Stalowy', icon: <Home size={24} />, color: '#16a34a' },
  { label: 'Oferta Indywidualna', icon: <FileText size={24} />, color: '#6366f1' },
];

export default function OffersPage() {
  return (
    <>
      <PageHeader title="Oferty" showBack />
      <div className="px-4 py-4 mx-auto max-w-lg pb-24">
        <div className="grid grid-cols-2 gap-3">
          {offerTiles.map((t) => (
            <div key={t.label} className="card p-5 flex flex-col items-center text-center gap-3 opacity-60">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: t.color + '18', color: t.color }}>
                {t.icon}
              </div>
              <p className="text-xs font-semibold text-gray-700">{t.label}</p>
            </div>
          ))}
        </div>
        <p className="text-center text-sm text-muted-400 mt-6">Moduł ofert — w przygotowaniu.</p>
      </div>
    </>
  );
}
