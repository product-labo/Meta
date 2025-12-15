interface StepIndicatorProps {
  currentStep: number
  totalSteps: number
}

export function StepIndicator({ currentStep, totalSteps }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step, index) => (
        <div key={step} className="flex items-center">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm ${
              step <= currentStep ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            {step}
          </div>
          {index < totalSteps - 1 && (
            <div
              className={`w-20 h-0.5 border-t-2 border-dashed ${
                step < currentStep ? "border-primary" : "border-muted-foreground/30"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  )
}
