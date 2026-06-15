interface Step {
  label: string;
  number: number;
}

interface StepIndicatorProps {
  steps: Step[];
  current: number;
}

export function StepIndicator({ steps, current }: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-0">
      {steps.map((step, i) => {
        const isCompleted = step.number < current;
        const isActive = step.number === current;
        return (
          <div key={step.number} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-colors
                  ${isActive ? "bg-primary border-primary text-white" : isCompleted ? "bg-primary border-primary text-white" : "bg-surface border-border text-muted"}`}
              >
                {step.number}
              </div>
              <span className={`text-xs whitespace-nowrap ${isActive ? "text-primary font-medium" : "text-muted"}`}>
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`h-0.5 w-20 mx-2 mb-4 ${isCompleted ? "bg-primary" : "bg-border"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
