import { NextRequest, NextResponse } from "next/server"
import { Message } from "ai"
import { GoogleGenerativeAI } from "@google/generative-ai"

// Initialize the Gemini API client
const genAI = new GoogleGenerativeAI("AIzaSyAMr2oG58SuyMJ5OncdI-UO1RCcqYvxY-o");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Function to create a properly formatted response for Vercel AI SDK
function createStream(stream: AsyncIterable<any>) {
  const encoder = new TextEncoder();
  
  return new Response(
    new ReadableStream({
      async start(controller) {
        try {
          // Stream the Gemini response
          for await (const chunk of stream) {
            // Get the chunk text
            const chunkText = chunk.text();
            if (chunkText) {
              // The key format for text in the data stream protocol is "0:" followed by the JSON string
              controller.enqueue(encoder.encode(`0:${JSON.stringify(chunkText)}\n`));
            }
          }
          
          // Signal the end of the stream with a special character that won't be visible
          // Use "__DONE__" instead of "[DONE]" as it's less likely to be displayed in the UI
          controller.enqueue(encoder.encode(`0:"__DONE__"\n`));
          controller.close();
        } catch (error) {
          console.error("Error streaming content:", error);
          controller.error(error);
        }
      }
    }),
    {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "x-vercel-ai-data-stream": "v1" // Important header for data stream protocol
      },
    }
  );
}

// Update the POST function to ensure it properly handles the chat
export async function POST(req: NextRequest) {
  try {
    console.log("Chat API called");
    const { messages } = await req.json();
    console.log("Messages received:", messages.length);

    // Extract the first user message to get candidate info
    const userMessage = messages.find((m: Message) => m.role === "user");
    
    // Check if this is an evaluation request
    const isEvaluationRequest = messages.some((m: Message) => 
      m.role === "user" && 
      typeof m.content === "string" &&
      m.content.includes("[EVALUATE_CANDIDATE]")
    );
    
    console.log("Is evaluation request:", isEvaluationRequest);

    const systemPrompt = `You are an AI Hiring Assistant named Alex from TalentScout, a recruitment agency specializing in technology placements. 
      You are directly conducting an initial screening interview with the candidate right now. Be professional, friendly, and conversational.
      
      DO NOT provide interview instructions, notes, or guidance for others. DO NOT use placeholders like "[Your Name]".
      DO NOT include stage directions like "(Pause for response)" or explanatory notes like "(This probes for...)".
      
      When interviewing candidates:
      1. Introduce yourself as Alex from TalentScout
      2. Ask relevant technical questions based on the candidate's tech stack
      3. Evaluate their responses and provide constructive feedback
      4. Ask about their experience, projects, and problem-solving abilities
      5. Assess their communication skills and cultural fit
      
      Adapt your questions based on the candidate's experience level and the specific technologies they know.
      For junior candidates, focus on fundamentals. For senior candidates, ask about architecture, best practices, and leadership.
      
      Keep your responses concise and conversational as if you are directly speaking to the candidate.
      
      After 5-6 exchanges, politely conclude the interview with: "Thank you for your time today. I've gathered enough information for our initial assessment. The recruiter will contact you with next steps. [END_INTERVIEW]"
      
      If the message contains [EVALUATE_CANDIDATE], provide a detailed evaluation of the candidate based on the conversation history. Include:
      1. Technical skills assessment (scale 1-10)
      2. Communication skills assessment (scale 1-10)
      3. Cultural fit assessment (scale 1-10)
      4. Overall recommendation (Reject, Consider, Strong Consider, Hire)
      5. Strengths
      6. Areas for improvement
      7. Suggested follow-up questions for the human interviewer`;

    // Filter out system messages and if it's evaluation request, remove the evaluation tag
    const filteredMessages = messages.filter((m: Message) => 
      m.role !== "system" && 
      !(isEvaluationRequest && typeof m.content === "string" && m.content === "[EVALUATE_CANDIDATE]")
    );
    
    console.log("Filtered messages:", filteredMessages.length);
    
    // Format conversation history for the Gemini API
    const formattedMessages = filteredMessages.map((m: Message) => {
      const role = m.role === "user" ? "user" : "model";
      const content = typeof m.content === "string" ? m.content : JSON.stringify(m.content);
      return { role, parts: [{ text: content }] };
    });
    
    // Count the number of exchanges (a back-and-forth between user and AI)
    // Each user message (except the first setup message) counts as one exchange
    let exchangeCount = 0;
    if (filteredMessages.length > 2) {
      // Count the number of user messages after the initial setup
      exchangeCount = filteredMessages.filter((m: Message, index: number) => 
        m.role === "user" && index > 0
      ).length;
    }
    
    console.log("Exchange count:", exchangeCount);
    
    // Force evaluation after 5 exchanges
    const shouldEndInterview = exchangeCount >= 5;
    if (shouldEndInterview && !isEvaluationRequest) {
      console.log("Forcing interview end after 5 exchanges");
    }
    
    // Add the system prompt as a preamble for the AI's context
    const aiPrompt = isEvaluationRequest ?
      `${systemPrompt}\n\nBased on the conversation, provide a detailed evaluation of the candidate.` :
      systemPrompt;
      
    const historyMessages = formattedMessages.length > 0 ? formattedMessages : [];
    
    try {
      // For evaluation requests, we'll use a non-streaming response
      if (isEvaluationRequest) {
        console.log("Generating evaluation...");
        
        // Create a chat with history and add the evaluation request
        const chat = model.startChat({
          history: historyMessages,
          generationConfig: {
            temperature: 0.7,
            topP: 0.8,
            topK: 40,
            maxOutputTokens: 2048,
          },
        });
        
        // Create a structured evaluation prompt to get JSON format
        const structuredEvalPrompt = `
Based on the conversation history, provide a detailed evaluation of the candidate.
Return your evaluation in the following JSON format:

{
  "technicalSkills": {
    "score": <number between 1-10>,
    "assessment": "<detailed explanation of technical skills assessment>"
  },
  "communicationSkills": {
    "score": <number between 1-10>,
    "assessment": "<detailed explanation of communication skills assessment>"
  },
  "culturalFit": {
    "score": <number between 1-10>,
    "assessment": "<detailed explanation of cultural fit assessment>"
  },
  "overallRecommendation": "<Reject, Consider, Strong Consider, or Hire>",
  "strengths": [
    "<strength 1>",
    "<strength 2>",
    "<strength 3>"
  ],
  "areasForImprovement": [
    "<area 1>",
    "<area 2>",
    "<area 3>"
  ],
  "suggestedFollowUpQuestions": [
    "<question 1>",
    "<question 2>",
    "<question 3>"
  ]
}

Ensure your response is properly formatted JSON that can be parsed. Do not include any explanatory text outside the JSON structure.`;
        
        const result = await chat.sendMessage(structuredEvalPrompt);
        const responseText = result.response.text();
        
        console.log("Evaluation generated");
        
        // Try to parse the JSON response, fall back to string if parsing fails
        let evaluationData;
        try {
          // Extract JSON if it's wrapped in backticks or other formatting
          const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```|```\s*([\s\S]*?)\s*```|(\{[\s\S]*\})/);
          const jsonString = jsonMatch ? (jsonMatch[1] || jsonMatch[2] || jsonMatch[3]) : responseText;
          evaluationData = JSON.parse(jsonString);
          console.log("Successfully parsed JSON evaluation");
        } catch (error) {
          console.error("Failed to parse JSON evaluation:", error);
          // Fall back to the raw text
          evaluationData = { rawText: responseText };
        }
        
        return NextResponse.json({ 
          response: evaluationData,
          isEvaluation: true 
        });
      }
      
      // For regular chat, we'll use streaming
      console.log("Generating streaming response...");
      
      // Add system message to the beginning of history
      const systemMessage = {
        role: "user",
        parts: [{ 
          text: "SYSTEM INSTRUCTION: You're Alex, an AI Hiring Assistant from TalentScout conducting an interview. Respond directly as Alex speaking to the candidate. Be conversational, don't list multiple questions at once, don't include stage directions or explanatory notes in parentheses, and never use placeholders. Ask only one question at a time." 
        }]
      };
      
      const modelResponse = {
        role: "model",
        parts: [{ 
          text: "I understand. I am Alex from TalentScout. I will conduct the interview in a conversational manner, asking one question at a time, without any stage directions or notes. I'll speak directly to the candidate as if we're having a real conversation."
        }]
      };
      
      // Create a proper history with the system message
      const enhancedHistory = [systemMessage, modelResponse, ...formattedMessages];
      
      // Create a chat with enhanced history
      const chat = model.startChat({
        history: enhancedHistory.length > 2 ? enhancedHistory : [],
        generationConfig: {
          temperature: 0.7,
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 1024,
        },
      });
      
      // Get the last user message or use a default introduction if none exists
      const lastUserMessage = filteredMessages.length > 0 && filteredMessages[filteredMessages.length - 1].role === "user" 
        ? filteredMessages[filteredMessages.length - 1].content 
        : "Let's start the interview";
      
      // Add specific instructions for the response style based on exchange count
      let enhancedPrompt;
      
      if (shouldEndInterview) {
        // Force the interview to end on the 5th exchange
        enhancedPrompt = "RESPOND AS ALEX: This is the FINAL response. Thank the candidate for their time, mention you've gathered enough information, and explicitly end with: 'Thank you for your time today. I've gathered enough information for our initial assessment. The recruiter will contact you with next steps. [END_INTERVIEW]'";
      } else if (filteredMessages.length <= 1) {
        enhancedPrompt = "RESPOND AS ALEX: Introduce yourself as Alex from TalentScout. Start the interview with a friendly introduction and ask only ONE question to begin.";
      } else {
        enhancedPrompt = `RESPOND AS ALEX: Respond to the candidate's last message. This is exchange ${exchangeCount} out of 5. Keep your response conversational, as if this is a real-time interview. Ask just one follow-up question.`;
      }
        
      // Generate streaming content
      const streamResult = await chat.sendMessageStream(enhancedPrompt);
      
      // Return the streaming response
      return createStream(streamResult.stream);
      
    } catch (generationError) {
      console.error("Error generating content:", generationError);
      
      // Fallback to a simple response
      const fallbackResponse = isEvaluationRequest
        ? "I couldn't generate a detailed evaluation at this time. Please try again later."
        : "I'm having trouble responding right now. Let's continue the interview when the system is stable.";
      
      if (isEvaluationRequest) {
        return NextResponse.json({ 
          response: fallbackResponse,
          isEvaluation: true 
        });
      } else {
        // For fallback in chat mode, create a simple stream with the error message
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode(`0:${JSON.stringify(fallbackResponse)}\n`));
            controller.enqueue(encoder.encode(`0:"__DONE__"\n`));
            controller.close();
          }
        });
        
        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "x-vercel-ai-data-stream": "v1"
          },
        });
      }
    }
  } catch (error) {
    console.error("Error in chat route:", error);
    return NextResponse.json({ 
      error: "Failed to process the request",
      details: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 });
  }
}

