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
