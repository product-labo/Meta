"use client"

interface RetentionData {
  cohort: string
  users: number
  retention: number[] // Week 0 to Week 4
}

const data: RetentionData[] = [
  { cohort: "May 25 - Jun 2", users: 180, retention: [100, 48.2, 35.1, 29.8, 21.5] },
  { cohort: "Jun 3 - Jun 9", users: 210, retention: [100, 55.3, 42.7, 33.1] },
  { cohort: "Jun 10 - Jun 16", users: 195, retention: [100, 45.9, 38.2] },
  { cohort: "Jun 17 - Jun 23", users: 250, retention: [100, 58.0] },
  { cohort: "Jun 24 - Jun 30", users: 233, retention: [100] },
]

export function RetentionTable() {
  const getBackgroundColor = (value: number) => {
    if (value === 100) return "bg-[#D1E9FF]"
    if (value > 50) return "bg-[#60A5FA]/60"
    if (value > 40) return "bg-[#60A5FA]/40"
    if (value > 30) return "bg-[#60A5FA]/30"
    if (value > 20) return "bg-[#60A5FA]/20"
    return "bg-[#60A5FA]/10"
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="text-left text-[10px] font-bold text-[#6B7280] uppercase tracking-wider border-b border-gray-100">
            <th className="py-4 font-bold">Cohort</th>
            <th className="py-4 font-bold">Week 0</th>
            <th className="py-4 font-bold">Week 1</th>
            <th className="py-4 font-bold">Week 2</th>
            <th className="py-4 font-bold">Week 3</th>
            <th className="py-4 font-bold">Week 4</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {data.map((row, i) => (
            <tr key={i} className="hover:bg-gray-50/50 transition-colors">
              <td className="py-4">
                <div className="text-xs font-bold text-[#111827]">{row.cohort}</div>
                <div className="text-[10px] text-[#6B7280]">{row.users} Users</div>
              </td>
              {[0, 1, 2, 3, 4].map((week) => (
                <td key={week} className="py-4 pr-2">
                  {row.retention[week] !== undefined ? (
                    <div
                      className={`h-8 w-16 flex items-center justify-center rounded-sm text-[10px] font-bold text-[#1D4ED8] ${getBackgroundColor(
                        row.retention[week]
                      )}`}
                    >
                      {row.retention[week]}%
                    </div>
                  ) : null}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
