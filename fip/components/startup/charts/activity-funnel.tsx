"use client"

interface FunnelStep {
  label: string
  percentage: number
  color: string
  subtext?: string
}

const steps: FunnelStep[] = [
  { label: "Account Created", percentage: 100, color: "#3B82F6" },
  { label: "Profile Created", percentage: 91, color: "#3B82F6" },
  { label: "First API Call", percentage: 64, color: "#EF4444", subtext: "-31% Drop-off" },
  { label: "Invited Teammate", percentage: 58, color: "#3B82F6" },
]

export function ActivityFunnel() {
  return (
    <div className="space-y-6">
      {steps.map((step, i) => (
        <div key={i} className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-[#D1E9FF] text-[#1D4ED8] flex items-center justify-center text-[10px] font-bold">
                {i + 1}
              </div>
              <div className="text-[10px] font-bold text-[#111827]">{step.label}</div>
            </div>
            <div className="text-[10px] font-bold text-[#111827]">{step.percentage}%</div>
          </div>
          <div className="relative h-4 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`absolute left-0 top-0 h-full rounded-full transition-all duration-500`}
              style={{
                width: `${step.percentage}%`,
                backgroundColor: step.color,
              }}
            />
            {step.subtext && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[8px] font-bold text-white uppercase">{step.subtext}</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
