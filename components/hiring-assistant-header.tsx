import { LucideUser, LucideUsers } from "lucide-react"

export function HiringAssistantHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="container flex h-16 items-center px-4 sm:px-6">
        <div className="flex items-center gap-2">
          <div className="rounded-md bg-blue-600 p-1.5">
            <LucideUsers className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold">TalentScout</span>
        </div>
        <div className="ml-auto flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-slate-100 p-1.5 dark:bg-slate-800">
              <LucideUser className="h-5 w-5 text-slate-600 dark:text-slate-400" />
            </div>
            <span className="hidden text-sm font-medium md:inline-block">Recruiter</span>
          </div>
        </div>
      </div>
    </header>
  )
}

