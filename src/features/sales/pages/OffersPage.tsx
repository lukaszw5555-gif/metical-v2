import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/layout/PageHeader';
import { Sun, Flame, Building2, Home, FileText } from 'lucide-react';

interface OfferTile {
  label: string;
  icon: React.ReactNode;
  color: string;
  to?: string;
  disabled?: boolean;
}

const offerTiles: OfferTile[] = [
  { label: 'Oferta Fotowoltaika', icon: <Sun size={24} />, color: '#d97706', to: '/sales/offers/pv' },
  { label: 'Oferta Źródło ciepła', icon: <Flame size={24} />, color: '#dc2626', disabled: true },
  { label: 'Oferta Hala Stalowa', icon: <Building2 size={24} />, color: '#4f46e5', disabled: true },
  { label: 'Oferta Dom Stalowy', icon: <Home size={24} />, color: '#16a34a', disabled: true },
  { label: 'Oferta Indywidualna', icon: <FileText size={24} />, color: '#6366f1', disabled: true },
];

export default function OffersPage() {
  const navigate = useNavigate();

  return (
    <>
      <PageHeader title="Oferty" showBack />
      <div className="px-4 py-4 mx-auto max-w-lg md:max-w-5xl pb-24 md:pb-8">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {offerTiles.map((t) => (
            <div
              key={t.label}
              onClick={() => t.to && navigate(t.to)}
              className={`card p-5 flex flex-col items-center text-center gap-3 transition-all ${
                t.disabled
                  ? 'opacity-60 cursor-not-allowed'
                  : 'cursor-pointer hover:shadow-md hover:border-primary-200 active:scale-[0.98]'
              }`}
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: t.color + '18', color: t.color }}>
                {t.icon}
              </div>
              <p className="text-xs font-semibold text-gray-700">{t.label}</p>
              {t.disabled && (
                <span className="text-[10px] text-muted-400">W przygotowaniu</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
