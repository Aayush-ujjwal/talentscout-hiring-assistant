import { Chat } from "@/components/chat"
import { HiringAssistantHeader } from "@/components/hiring-assistant-header"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
      <HiringAssistantHeader />
      <div className="flex flex-1 flex-col items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-3xl rounded-xl bg-white p-4 shadow-lg dark:bg-slate-800 md:p-6">
          <Chat />
        </div>
      </div>
    </main>
  )
}

