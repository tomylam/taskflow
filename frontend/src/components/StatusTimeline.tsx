import { TaskStatus } from '../types';
import { STATUS_LABELS } from '../lib/constants';
import { Check } from 'lucide-react';

// Progress order for display (REVISION can loop back)
const ORDER: Record<TaskStatus, number> = {
  PENDING_QUOTE: 0,
  QUOTED: 1,
  IN_PROGRESS: 2,
  SUBMITTED: 3,
  REVISION: 3,
  COMPLETED: 4,
};

interface Props {
  currentStatus: TaskStatus;
}

export default function StatusTimeline({ currentStatus }: Props) {
  const currentOrder = ORDER[currentStatus];

  // Simplified 5-step display (collapse REVISION into SUBMITTED)
  const displaySteps: TaskStatus[] = ['PENDING_QUOTE', 'QUOTED', 'IN_PROGRESS', 'SUBMITTED', 'COMPLETED'];

  return (
    <div className="flex items-center w-full">
      {displaySteps.map((step, idx) => {
        const stepOrder = ORDER[step];
        const isDone = stepOrder < currentOrder || currentStatus === 'COMPLETED';
        const isActive = step === currentStatus || (currentStatus === 'REVISION' && step === 'SUBMITTED');
        const isLast = idx === displaySteps.length - 1;

        return (
          <div key={step} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors
                  ${isDone ? 'bg-brand-600 border-brand-600 text-white' : ''}
                  ${isActive && !isDone ? 'bg-white border-brand-600 text-brand-600' : ''}
                  ${!isActive && !isDone ? 'bg-white border-gray-300 text-gray-400' : ''}
                `}
              >
                {isDone ? <Check size={14} /> : idx + 1}
              </div>
              <span className={`mt-1 text-xs text-center leading-tight max-w-[70px] 
                ${isActive ? 'text-brand-600 font-medium' : 'text-gray-400'}`}>
                {step === 'SUBMITTED' && currentStatus === 'REVISION'
                  ? 'Revision'
                  : STATUS_LABELS[step]}
              </span>
            </div>
            {!isLast && (
              <div
                className={`flex-1 h-0.5 mx-1 ${
                  stepOrder < currentOrder ? 'bg-brand-600' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
