import { HiringAssistantHeader } from "@/components/hiring-assistant-header"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Candidate Evaluation - TalentScout",
  description: "AI-generated evaluation of the candidate interview",
}

export default function EvaluationLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <HiringAssistantHeader />
      {children}
    </>
  )
} 