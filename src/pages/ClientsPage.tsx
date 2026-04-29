import PageHeader from '@/components/layout/PageHeader';
import { Users, Construction } from 'lucide-react';

export default function ClientsPage() {
  return (
    <>
      <PageHeader title="Klienci" />
      <div className="px-4 py-6 mx-auto max-w-lg">
        <div className="mt-12 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-surface-100 flex items-center justify-center mb-4">
            <Users size={28} className="text-muted-400" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-surface-100 rounded-full mb-3">
            <Construction size={14} className="text-muted-400" />
            <span className="text-xs font-medium text-muted-500">
              W przygotowaniu
            </span>
          </div>
          <h2 className="text-lg font-semibold text-slate-800 mb-1">
            Moduł klientów
          </h2>
          <p className="text-sm text-muted-500 max-w-xs">
            Ten moduł jest planowany na przyszłe wersje. Dane klientów są
            dostępne na kartach inwestycji.
          </p>
        </div>
      </div>
    </>
  );
}
