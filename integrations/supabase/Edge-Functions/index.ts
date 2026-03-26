//We will integrate gemini for now but the function should be compatible with other common ai 
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
 
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};
 
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
 
  try {
    const { action, careerGoal, availableHours, skills, moodData } =
      await req.json();
 
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");
 
    let systemPrompt = "";
    let userPrompt = "";
 
    // ── Action: break career goal into skill areas ──────────────────────────
    if (action === "breakdown") {
      systemPrompt = `You are a career skill planning AI. Given a career goal and available study hours per week, break it down into 4-6 concrete, actionable skill goals.
 
Return ONLY a raw JSON object (no markdown, no code fences) with a "skills" array. Each skill must have:
- title (string)
- description (string, 1-2 sentences)
- priority (number 1-5, where 1 = highest priority)`;
 
      userPrompt = `Career Goal: ${careerGoal}
Available hours per week: ${availableHours}
 
Break this career goal into 4-6 specific skill areas I need to learn.`;
 
    // ── Action: generate weekly study plan ──────────────────────────────────
    } else if (action === "weekly_plan") {
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay() + 1);
 
      const dates = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(startOfWeek);
        d.setDate(startOfWeek.getDate() + i);
        return d.toISOString().split("T")[0];
      });
 
        systemPrompt = `You are an AI study scheduler that accounts for user wellbeing. Create a weekly study plan with specific daily tasks.
 
Return ONLY a raw JSON object (no markdown, no code fences) with:
- summary: string (1-2 sentence overview)
- totalHours: number
- tasks: array of objects, each with:
  - title (string)
  - description (string)
  - date (YYYY-MM-DD, must be one of the provided dates)
  - durationMinutes (number, between 15 and 60)
  - skillGoalId (string matching one of the provided skill IDs, or null)
 
BURNOUT RULES:
- Burnout score > 70 (HIGH): Cut total hours by 40%, light review tasks only
- Burnout score > 50 (ELEVATED): Cut total hours by 20%, sessions 15-25 min
- Burnout score > 25 (MODERATE): Normal schedule, cap sessions at 45 min
- Burnout score <= 25 (LOW): Optimise for productivity
- Mood 1-2: Easy review content only
- Energy 1-2: Short sessions earlier in the day
- Stress 4-5: Add mindfulness breaks between sessions
 
Give rest on weekends. Spread tasks evenly.`;
 
      const moodContext = moodData
        ? `User Wellbeing:
- Burnout Score: ${moodData.burnoutScore}/100
- Mood: ${moodData.mood}/5
- Energy: ${moodData.energy}/5
- Stress: ${moodData.stress}/5
- Trend: ${moodData.trend}`
        : "No mood data — use standard scheduling.";
 
      userPrompt = `Career Goal: ${careerGoal}
Available hours/week: ${availableHours}
Skills: ${JSON.stringify(skills)}
Dates this week: ${JSON.stringify(dates)}
 
${moodContext}
 
Create a detailed weekly study plan.`;
 
    } else {
      throw new Error("Unknown action: " + action);
    }
 // ── Call Gemini API (OpenAI-compatible endpoint) ────────────────────────
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${GEMINI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gemini-1.5-flash",  // free model
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.7,
        }),
      }
    );
 if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);
 
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit hit. Please wait a moment and try again." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 401) {
        return new Response(
          JSON.stringify({ error: "Invalid Gemini API key. Check your Supabase secrets." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`Gemini API returned ${response.status}`);
    }
 
    const data = await response.json();
 
    // 
    const content = data.choices?.[0]?.message?.content || "";
  
 
    // ── Parse JSON from response ────────────────────────────────────────────
    let parsed;
    try {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[1].trim()) : JSON.parse(content);
    } catch {
      console.error("Failed to parse Gemini response:", content);
 
      parsed = action === "breakdown"
        ? {
            skills: [
              { title: "Core Fundamentals", description: "Build foundational knowledge in this area.", priority: 1 },
              { title: "Practical Application", description: "Apply concepts through hands-on projects.", priority: 2 },
              { title: "Advanced Topics", description: "Explore deeper and more advanced concepts.", priority: 3 },
            ],
          }
        : { summary: "Weekly study plan generated.", totalHours: availableHours, tasks: [] };
    }
 
    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

     } catch (e) {
    console.error("ai-planner error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
