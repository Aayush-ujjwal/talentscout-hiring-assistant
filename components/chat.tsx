"use client"

import { useChat } from "ai/react"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card } from "@/components/ui/card"
import { ChatMessage } from "@/components/chat-message"
import { CandidateInfoForm } from "@/components/candidate-info-form"
import { LucideSend, LucideAlertTriangle } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

export function Chat() {
  const router = useRouter()
  const [showForm, setShowForm] = useState(true)
  const [candidateInfo, setCandidateInfo] = useState<{
    name: string
    email: string
    role: string
    experience: string
    techStack: string[]
  } | null>(null)
  const [interviewEnded, setInterviewEnded] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { messages, input, handleInputChange, handleSubmit, isLoading, append, reload } = useChat({
    api: "/api/chat",
    initialMessages: [
      {
        id: "1",
        role: "system",
        content:
          "You are an AI Hiring Assistant for TalentScout, a recruitment agency specializing in technology placements. Your job is to conduct initial screening interviews with candidates. Be professional, friendly, and thorough. Ask relevant technical questions based on the candidate's tech stack. After 5-6 exchanges, end the interview and provide evaluation tags.",
      },
    ],
    onResponse(response) {
      // Handle possible error responses
      if (!response.ok) {
        setError(`Error: ${response.status} - ${response.statusText}`)
        toast.error("Failed to get a response from the AI assistant")
        return
      }
      setError(null) // Clear error on successful response
    },
    onFinish: (message) => {
      // Check if the interview has ended
      if (message.content.includes("[END_INTERVIEW]")) {
        setInterviewEnded(true)
      }

      // Scroll to bottom when a message is received
      setTimeout(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
        }
      }, 100)

      // Save conversation to localStorage for evaluation
      localStorage.setItem("conversationHistory", JSON.stringify([...messages, message]))
    },
    onError: (error) => {
      console.error("Chat error:", error)
      setError(error.message || "An error occurred during the conversation")
      toast.error("There was a problem with the AI assistant")
    }
  })

  // Custom submit handler to help with error handling
  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting || !input.trim()) return;
    
    try {
      setIsSubmitting(true);
      setError(null);
      await handleSubmit(e);
    } catch (error) {
      console.error("Error submitting message:", error);
      setError(error instanceof Error ? error.message : "Failed to send message");
      toast.error("Failed to send message")
    } finally {
      setIsSubmitting(false);
    }
  };

  // Effect to navigate to evaluation page when interview ends
  useEffect(() => {
    if (interviewEnded && candidateInfo) {
      const timer = setTimeout(() => {
        const queryParams = new URLSearchParams({
          name: candidateInfo.name,
          role: candidateInfo.role,
          experience: candidateInfo.experience,
          techStack: candidateInfo.techStack.join(',')
        }).toString();
        
        router.push(`/evaluation?${queryParams}`)
      }, 2000) // Delay to allow user to read final message
      
      return () => clearTimeout(timer)
    }
  }, [interviewEnded, candidateInfo, router])

  const handleCandidateSubmit = (data: any) => {
    setCandidateInfo(data)
    setShowForm(false)
    setError(null)

    // Trigger the initial message after form submission
    const initialMessage = `I'm interviewing a candidate named ${data.name} for a ${data.role} position. They have ${data.experience} years of experience and are skilled in ${data.techStack.join(", ")}. Please start the interview with an introduction and ask relevant technical questions based on their tech stack.`

    setTimeout(() => {
      append({
        role: "user",
        content: initialMessage,
      }).catch(err => {
        console.error("Error sending initial message:", err);
        setError("Failed to start the interview. Please try again.");
        toast.error("Failed to start the interview")
      })
    }, 100)
  }

  const handleRetry = () => {
    reload();
    setError(null);
  }

  if (showForm) {
    return <CandidateInfoForm onSubmit={handleCandidateSubmit} />
  }

  return (
    <div className="flex h-[calc(80vh)] flex-col">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">AI Hiring Assistant</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setShowForm(true)
            setCandidateInfo(null)
            setInterviewEnded(false)
            setError(null)
            localStorage.removeItem("conversationHistory")
          }}
        >
          New Candidate
        </Button>
      </div>

      <Card className="flex-1 overflow-hidden">
        <ScrollArea className="h-full p-4 chat-messages-container">
          {messages.length > 0 ? (
            <div>
              {messages
                .filter((message) => message.role !== "system")
                .map((message) => (
                  <ChatMessage 
                    key={message.id} 
                    role={message.role} 
                    content={typeof message.content === 'string' 
                      ? message.content
                          .replace("[END_INTERVIEW]", "")
                          .replace(/\[DONE\]|__DONE__|"\[DONE\]"|"__DONE__"/g, "").trim()
                      : JSON.stringify(message.content)} 
                  />
                ))}
              
              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
                  <LucideAlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium">Error</p>
                    <p className="text-sm mt-1">{error}</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2 text-xs h-7 bg-white dark:bg-slate-800"
                      onClick={handleRetry}
                    >
                      Retry
                    </Button>
                  </div>
                </div>
              )}
                
              {interviewEnded && (
                <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Interview completed! Redirecting to evaluation...
                  </p>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          ) : (
            <div className="flex h-full items-center justify-center">
              {error ? (
                <div className="text-center">
                  <LucideAlertTriangle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-3"
                    onClick={handleRetry}
                  >
                    Try Again
                  </Button>
                </div>
              ) : (
                <p className="text-center text-sm text-slate-500">The AI assistant will begin the interview shortly...</p>
              )}
            </div>
          )}
        </ScrollArea>
      </Card>

      <form onSubmit={handleFormSubmit} className="mt-4 flex items-center gap-2">
        <Input
          value={input}
          onChange={handleInputChange}
          placeholder="Type your message..."
          disabled={isLoading || isSubmitting || interviewEnded}
          className="flex-1"
        />
        <Button 
          type="submit" 
          disabled={isLoading || isSubmitting || interviewEnded || !input.trim()}
          className={isSubmitting ? "opacity-70" : ""}
        >
          <LucideSend className="h-4 w-4" />
          <span className="ml-2 sr-only">Send</span>
        </Button>
      </form>
      
      {isSubmitting && (
        <p className="mt-2 text-xs text-slate-500 text-center">
          Processing your message...
        </p>
      )}
      
      {interviewEnded && (
        <p className="mt-2 text-xs text-slate-500 text-center">
          The interview has concluded. Preparing your evaluation...
        </p>
      )}
    </div>
  )
}

