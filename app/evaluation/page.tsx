"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ArrowLeft, Star, StarHalf } from "lucide-react"
import Link from "next/link"

// Define types for evaluation data
interface EvaluationSkill {
  score: number;
  assessment: string;
}

interface EvaluationData {
  technicalSkills: EvaluationSkill;
  communicationSkills: EvaluationSkill;
  culturalFit: EvaluationSkill;
  overallRecommendation: string;
  strengths: string[];
  areasForImprovement: string[];
  suggestedFollowUpQuestions: string[];
  rawText?: string;
}

export default function EvaluationPage() {
  const searchParams = useSearchParams()
  const candidateName = searchParams.get("name")
  const candidateRole = searchParams.get("role")
  const candidateExperience = searchParams.get("experience")
  const candidateTechStack = searchParams.get("techStack")
  
  const [evaluation, setEvaluation] = useState<EvaluationData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchEvaluation = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        const conversationHistory = localStorage.getItem("conversationHistory")
        
        if (!conversationHistory) {
          setError("No conversation history found. Please complete an interview first.")
          setIsLoading(false)
          return
        }
        
        let messages;
        try {
          messages = JSON.parse(conversationHistory)
        } catch (e) {
          setError("Invalid conversation history format. Please try again.")
          setIsLoading(false)
          return
        }
        
        // Add an evaluation request message
        messages.push({
          role: "user",
          content: "[EVALUATE_CANDIDATE]"
        })
        
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ messages }),
        })
        
        if (!response.ok) {
          throw new Error(`Failed to fetch evaluation: ${response.status}`)
        }
        
        const data = await response.json()
        
        if (data.response) {
          if (data.response.rawText) {
            // Handle legacy format or parsing failure
            setEvaluation({
              technicalSkills: { score: 0, assessment: "Not available" },
              communicationSkills: { score: 0, assessment: "Not available" },
              culturalFit: { score: 0, assessment: "Not available" },
              overallRecommendation: "Not available",
              strengths: [],
              areasForImprovement: [],
              suggestedFollowUpQuestions: [],
              rawText: data.response.rawText
            });
          } else {
            // Handle structured JSON format
            setEvaluation(data.response as EvaluationData);
          }
        } else {
          throw new Error("No evaluation data received");
        }
      } catch (error) {
        console.error("Error fetching evaluation:", error)
        setError(error instanceof Error ? error.message : "Error generating evaluation. Please try again.")
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchEvaluation()
  }, [])

  // Render a score with stars
  const renderScore = (score: number) => {
    const fullStars = Math.floor(score);
    const hasHalfStar = score % 1 >= 0.5;
    
    return (
      <div className="flex items-center gap-1">
        <span className="font-bold text-2xl mr-2">{score}/10</span>
        <div className="flex">
          {Array(fullStars).fill(0).map((_, i) => (
            <Star key={`full-${i}`} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
          ))}
          {hasHalfStar && <StarHalf className="h-5 w-5 fill-yellow-400 text-yellow-400" />}
          {Array(10 - fullStars - (hasHalfStar ? 1 : 0)).fill(0).map((_, i) => (
            <Star key={`empty-${i}`} className="h-5 w-5 text-gray-300" />
          ))}
        </div>
      </div>
    );
  };

  // Get recommendation style based on value
  const getRecommendationStyle = (recommendation: string) => {
    const styles = {
      "Reject": "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
      "Consider": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
      "Strong Consider": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
      "Hire": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
    };
    
    return styles[recommendation as keyof typeof styles] || "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
  };

  // Render raw text if we have it
  const renderRawText = (text: string) => {
    return text.split('\n').map((line, index) => <p key={index} className="my-1">{line}</p>);
  };

  return (
    <main className="flex min-h-screen flex-col bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
      <div className="container mx-auto p-4 md:p-8">
        <div className="mb-6">
          <Link href="/">
            <Button variant="outline" size="sm" className="flex items-center gap-1">
              <ArrowLeft className="h-4 w-4" />
              Back to Interviews
            </Button>
          </Link>
        </div>
        
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Candidate Evaluation</h1>
          {candidateName && (
            <div className="text-lg text-slate-600 dark:text-slate-300">
              <p>
                <span className="font-medium">{candidateName}</span> - {candidateRole}
                {candidateExperience && <span> ({candidateExperience} years of experience)</span>}
              </p>
              {candidateTechStack && (
                <p className="text-sm mt-1">
                  Tech Stack: {candidateTechStack.split(',').join(', ')}
                </p>
              )}
            </div>
          )}
        </div>
        
        <Card className="p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="h-8 w-8 rounded-full border-4 border-t-blue-500 border-blue-200 animate-spin"></div>
              <p className="mt-4 text-slate-600 dark:text-slate-300">Generating evaluation...</p>
            </div>
          ) : error ? (
            <div className="text-center text-red-500 py-8">
              <p>{error}</p>
              <Button variant="outline" className="mt-4" onClick={() => window.location.href = "/"}>
                Return to Interview
              </Button>
            </div>
          ) : evaluation ? (
            <ScrollArea className="h-[70vh]">
              <div className="space-y-8">
                {/* Overall Recommendation */}
                <div className="mb-6">
                  <h2 className="text-xl font-bold mb-3">Overall Recommendation</h2>
                  <div className={`inline-block px-4 py-2 rounded-full text-md font-medium ${getRecommendationStyle(evaluation.overallRecommendation)}`}>
                    {evaluation.overallRecommendation}
                  </div>
                </div>
                
                {/* Skills Assessment */}
                <div className="grid md:grid-cols-3 gap-4 mb-6">
                  {/* Technical Skills */}
                  <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm">
                    <h3 className="text-lg font-semibold mb-2">Technical Skills</h3>
                    {renderScore(evaluation.technicalSkills.score)}
                    <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                      {evaluation.technicalSkills.assessment}
                    </p>
                  </div>
                  
                  {/* Communication Skills */}
                  <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm">
                    <h3 className="text-lg font-semibold mb-2">Communication Skills</h3>
                    {renderScore(evaluation.communicationSkills.score)}
                    <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                      {evaluation.communicationSkills.assessment}
                    </p>
                  </div>
                  
                  {/* Cultural Fit */}
                  <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm">
                    <h3 className="text-lg font-semibold mb-2">Cultural Fit</h3>
                    {renderScore(evaluation.culturalFit.score)}
                    <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                      {evaluation.culturalFit.assessment}
                    </p>
                  </div>
                </div>
                
                {/* Strengths and Areas for Improvement */}
                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  {/* Strengths */}
                  <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm">
                    <h3 className="text-lg font-semibold mb-3">Strengths</h3>
                    <ul className="list-disc pl-5 space-y-1">
                      {evaluation.strengths.map((strength, index) => (
                        <li key={index} className="text-slate-600 dark:text-slate-300">{strength}</li>
                      ))}
                    </ul>
                  </div>
                  
                  {/* Areas for Improvement */}
                  <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm">
                    <h3 className="text-lg font-semibold mb-3">Areas for Improvement</h3>
                    <ul className="list-disc pl-5 space-y-1">
                      {evaluation.areasForImprovement.map((area, index) => (
                        <li key={index} className="text-slate-600 dark:text-slate-300">{area}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                
                {/* Suggested Follow-up Questions */}
                <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm mb-6">
                  <h3 className="text-lg font-semibold mb-3">Suggested Follow-up Questions</h3>
                  <ol className="list-decimal pl-5 space-y-2">
                    {evaluation.suggestedFollowUpQuestions.map((question, index) => (
                      <li key={index} className="text-slate-600 dark:text-slate-300">{question}</li>
                    ))}
                  </ol>
                </div>
                
                {/* Raw Text (if available) */}
                {evaluation.rawText && (
                  <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm">
                    <h3 className="text-lg font-semibold mb-3">Original Evaluation</h3>
                    <div className="text-slate-600 dark:text-slate-300">
                      {renderRawText(evaluation.rawText)}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center text-amber-500 py-8">
              <p>No evaluation data available.</p>
              <Button variant="outline" className="mt-4" onClick={() => window.location.href = "/"}>
                Return to Interview
              </Button>
            </div>
          )}
        </Card>
      </div>
    </main>
  )
} 