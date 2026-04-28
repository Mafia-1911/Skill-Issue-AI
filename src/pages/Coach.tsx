// src/pages/Coach.tsx
// NEW FEATURE: AI Coach Chat Page
// Add to App.tsx routes: <Route path="/coach" element={<Coach />} />
// Add to AppLayout navLinks: { icon: MessageSquare, label: "AI Coach", path: "/coach" }
// Uses Supabase edge function "ai-planner" with action: "coach"
// OR: calls Anthropic API directly via the ai-planner edge function

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  Send,
  Bot,
  User,
  Sparkles,
  RefreshCw,
  ChevronDown,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const SUGGESTED_PROMPTS = [
  "How am I progressing toward my career goal?",
  "What should I focus on this week?",
  "I'm feeling overwhelmed — help me prioritize",
  "Suggest a learning resource for my top skill gap",
  "Give me a motivational pep talk",
];

const Coach = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [goals, setGoals] = useState<any[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!user) return;
    fetchContext();
  }, [user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchContext = async () => {
    const [profileRes, goalsRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", user!.id).single(),
      supabase.from("skill_goals").select("*").eq("user_id", user!.id).eq("status", "active"),
    ]);
    setProfile(profileRes.data);
    setGoals(goalsRes.data || []);

    // Welcome message
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: `Hey ${profileRes.data?.full_name?.split(" ")[0] || "there"}! 👋 I'm your AI learning coach. I know your goals and can help you stay on track, troubleshoot challenges, or just plan your next steps.\n\nWhat's on your mind?`,
        timestamp: new Date(),
      },
    ]);
  };

  const sendMessage = async (text?: string) => {
    const content = (text || input).trim();
    if (!content || sending) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);

    try {
      // Build conversation history for the AI
      const history = messages
        .filter((m) => m.id !== "welcome")
        .map((m) => ({ role: m.role, content: m.content }));

      const systemContext = `You are a supportive, expert learning coach for SkillForge, a skill-building app.
The user's profile:
- Name: ${profile?.full_name || "Unknown"}
- Career Goal: ${profile?.career_goal || "Not set"}
- Weekly Study Hours Available: ${profile?.available_hours_per_week || 10}h
- Active Skill Goals: ${goals.map((g) => `${g.title} (${g.progress || 0}% complete)`).join(", ") || "None set"}

Be encouraging, practical, and concise. Use markdown sparingly. If the user seems burned out, acknowledge it and suggest lighter strategies. Always tie advice back to their specific goals.`;

      const res = await supabase.functions.invoke("ai-planner", {
        body: {
          action: "coach",
          systemContext,
          history,
          userMessage: content,
        },
      });

      if (res.error) throw res.error;

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: res.data?.reply || res.data?.message || "I'm not sure how to respond to that. Could you rephrase?",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Sorry, I couldn't connect right now. Please try again in a moment.",
          timestamp: new Date(),
        },
      ]);
    }

    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
    fetchContext();
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4 flex items-center justify-between"
      >
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground flex items-center gap-2">
            <Sparkles className="w-7 h-7 text-primary" /> AI Coach
          </h1>
          <p className="text-muted-foreground mt-1">Your personal learning mentor</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={clearChat}
          className="border-border bg-secondary gap-2"
        >
          <RefreshCw className="w-3.5 h-3.5" /> New chat
        </Button>
      </motion.div>

      {/* Chat area */}
      <Card className="bg-card border-border shadow-card flex-1 flex flex-col overflow-hidden">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={cn("flex gap-3", msg.role === "user" ? "flex-row-reverse" : "flex-row")}
              >
                {/* Avatar */}
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                    msg.role === "assistant"
                      ? "bg-primary/20"
                      : "bg-secondary"
                  )}
                >
                  {msg.role === "assistant" ? (
                    <Bot className="w-4 h-4 text-primary" />
                  ) : (
                    <User className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>

                {/* Bubble */}
                <div
                  className={cn(
                    "max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                    msg.role === "assistant"
                      ? "bg-secondary text-foreground rounded-tl-sm"
                      : "bg-primary/20 text-foreground rounded-tr-sm border border-primary/20"
                  )}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  <p className="text-[10px] text-muted-foreground mt-1.5 text-right">
                    {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </motion.div>
            ))}

            {/* Typing indicator */}
            {sending && (
              <motion.div
                key="typing"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3"
              >
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
                <div className="bg-secondary rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="w-2 h-2 bg-muted-foreground rounded-full"
                      animate={{ y: [0, -4, 0] }}
                      transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={bottomRef} />
        </div>

        {/* Suggested prompts (show only at start) */}
        {messages.length <= 1 && (
          <div className="px-4 pb-2">
            <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider font-medium">
              Try asking…
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  className="text-xs bg-secondary hover:bg-secondary/80 border border-border rounded-full px-3 py-1.5 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t border-border">
          <div className="flex gap-2 items-end">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask your coach anything… (Enter to send)"
              className="bg-secondary border-border text-sm min-h-[44px] max-h-32 resize-none flex-1"
              rows={1}
              disabled={sending}
            />
            <Button
              onClick={() => sendMessage()}
              disabled={!input.trim() || sending}
              className="gradient-gold text-primary-foreground shadow-glow h-11 w-11 p-0 shrink-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
            Shift+Enter for new line · Enter to send
          </p>
        </div>
      </Card>
    </div>
  );
};

export default Coach;
