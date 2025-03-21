import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { LucideBot, LucideUser } from "lucide-react"

interface ChatMessageProps {
  role: string
  content: string
}

export function ChatMessage({ role, content }: ChatMessageProps) {
  const isUser = role === "user"
  
  // Filter out any special markers
  const cleanContent = content.replace(/\[DONE\]|__DONE__|"\[DONE\]"|"__DONE__"/g, "").trim()

  return (
    <div className={cn("mb-4 flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "flex max-w-[80%] gap-3 rounded-lg p-4",
          isUser ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-900 dark:bg-slate-700 dark:text-slate-100",
        )}
      >
        {!isUser && (
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-blue-600 text-white">
              <LucideBot className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
        )}
        <div className="flex-1">
          <div className="text-sm">
            {cleanContent.split("\n").map((line, i) => (
              <p key={i} className={i > 0 ? "mt-2" : ""}>
                {line}
              </p>
            ))}
          </div>
        </div>
        {isUser && (
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-slate-700 text-white">
              <LucideUser className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
        )}
      </div>
    </div>
  )
}

