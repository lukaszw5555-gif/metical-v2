import type { PvOfferType, PvOfferItemDraft } from '../types/pvOfferTypes';
import { getOfferFlow, type PvOfferFlowStep } from '../config/pvOfferFlowConfig';
import { CheckCircle2, Circle, Plus, Info, FileText } from 'lucide-react';

interface Props {
  offerType: PvOfferType;
  items: PvOfferItemDraft[];
  onAddFromStep: (step: PvOfferFlowStep) => void;
}

export default function PvOfferFlowChecklist({ offerType, items, onAddFromStep }: Props) {
  const flow = getOfferFlow(offerType);

  if (offerType === 'individual') {
    return (
      <div className="card p-4">
        <p className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-3">Ścieżka konfiguracji</p>
        <div className="flex items-start gap-2 p-3 bg-surface-50 rounded-lg">
          <FileText size={14} className="text-muted-400 shrink-0 mt-0.5" />
          <p className="text-xs text-muted-500">Oferta indywidualna nie ma wymaganych kroków. Dodawaj dowolne pozycje z katalogu.</p>
        </div>
      </div>
    );
  }

  const hasCat = (cat: string) => items.some(i => i.category === cat);
  const countCat = (cat: string) => items.filter(i => i.category === cat).length;

  return (
    <div className="card p-4">
      <p className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-3">Ścieżka konfiguracji</p>

      {/* Required steps */}
      {flow.requiredSteps.length > 0 && (
        <div className="mb-4">
          <p className="text-[10px] font-semibold text-muted-500 uppercase mb-2">Wymagane</p>
          <div className="space-y-1.5">
            {flow.requiredSteps.map(step => <StepRow key={step.key} step={step} done={hasCat(step.category)} count={countCat(step.category)} onAdd={() => onAddFromStep(step)} />)}
          </div>
        </div>
      )}

      {/* Optional steps */}
      {flow.optionalSteps.length > 0 && (
        <div className="mb-4">
          <p className="text-[10px] font-semibold text-muted-500 uppercase mb-2">Opcjonalne</p>
          <div className="space-y-1.5">
            {flow.optionalSteps.map(step => <StepRow key={step.key} step={step} done={hasCat(step.category)} count={countCat(step.category)} onAdd={() => onAddFromStep(step)} optional />)}
          </div>
        </div>
      )}

      {/* Auto items hint */}
      {flow.autoItemsHint.length > 0 && (
        <div className="flex items-start gap-1.5 p-2.5 bg-blue-50 rounded-lg">
          <Info size={12} className="text-blue-500 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            {flow.autoItemsHint.map((h, i) => (
              <p key={i} className="text-[10px] text-blue-700">{h}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StepRow({ step, done, count, onAdd, optional }: {
  step: PvOfferFlowStep;
  done: boolean;
  count: number;
  onAdd: () => void;
  optional?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-surface-50/50 hover:bg-surface-100/50 transition-colors">
      {done
        ? <CheckCircle2 size={16} className="text-green-500 shrink-0" />
        : <Circle size={16} className="text-muted-300 shrink-0" />}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className={`text-xs font-medium ${done ? 'text-gray-700' : 'text-muted-400'}`}>{step.label}</span>
          {optional && <span className="text-[8px] px-1 py-0.5 rounded bg-muted-100 text-muted-400 font-semibold uppercase">OPC</span>}
          {done && <span className="text-[9px] text-green-600 font-medium">({count})</span>}
        </div>
        {step.description && <p className="text-[9px] text-muted-400 mt-0.5">{step.description}</p>}
      </div>
      <button type="button" onClick={onAdd}
        className="shrink-0 inline-flex items-center gap-0.5 px-2 py-1 rounded-lg text-[10px] font-semibold text-primary-600 bg-primary-50 hover:bg-primary-100 active:scale-95 transition-all">
        <Plus size={10} />{done ? 'Kolejny' : 'Dodaj'}
      </button>
    </div>
  );
}
