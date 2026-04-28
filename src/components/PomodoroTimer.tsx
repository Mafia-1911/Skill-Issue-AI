// src/components/PomodoroTimer.tsx
// NEW FEATURE: Pomodoro Timer with auto session logging
// Usage: Drop <PomodoroTimer goalId={selectedGoalId} /> anywhere (Dashboard sidebar, Sessions page, etc.)
// It auto-logs a learning_session to Supabase when a Pomodoro completes.

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Pause,
  RotateCcw,
  Coffee,
  Timer,
  CheckCircle2,
  SkipForward,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type Phase = "focus" | "short_break" | "long_break";

interface PomodoroTimerProps {
  defaultGoalId?: string;
}

const PHASES: Record<Phase, { label: string; minutes: number; color: string }> = {
  focus: { label: "Focus", minutes: 25, color: "text-primary" },
  short_break: { label: "Short Break", minutes: 5, color: "text-success" },
  long_break: { label: "Long Break", minutes: 15, color: "text-info" },
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

const PomodoroTimer = ({ defaultGoalId }: PomodoroTimerProps) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [phase, setPhase] = useState<Phase>("focus");
  const [secondsLeft, setSecondsLeft] = useState(PHASES.focus.minutes * 60);
  const [running, setRunning] = useState(false);
  const [pomodorosThisSet, setPomodorosThisSet] = useState(0); // resets at 4
  const [totalCompleted, setTotalCompleted] = useState(0);
  const [goals, setGoals] = useState<any[]>([]);
  const [selectedGoal, setSelectedGoal] = useState<string>(defaultGoalId || "none");
  const [sessionNote, setSessionNote] = useState("");

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<Date | null>(null);

  // Fetch goals for linking sessions
  useEffect(() => {
    if (!user) return;
    supabase
      .from("skill_goals")
      .select("id, title")
      .eq("user_id", user.id)
      .eq("status", "active")
      .then(({ data }) => setGoals(data || []));
  }, [user]);

  // Timer tick
  const tick = useCallback(() => {
    setSecondsLeft((prev) => {
      if (prev <= 1) {
        handlePhaseEnd();
        return 0;
      }
      return prev - 1;
    });
  }, [phase]);

  useEffect(() => {
    if (running) {
      if (!startTimeRef.current) startTimeRef.current = new Date();
      intervalRef.current = setInterval(tick, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, tick]);

  const handlePhaseEnd = async () => {
    setRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);

    if (phase === "focus") {
      const durationMinutes = PHASES.focus.minutes;
      const newCompleted = totalCompleted + 1;
      const newSet = pomodorosThisSet + 1;
      setTotalCompleted(newCompleted);
      setPomodorosThisSet(newSet % 4);

      // Auto-log learning session
      if (user) {
        await supabase.from("learning_sessions").insert({
          user_id: user.id,
          skill_goal_id: selectedGoal !== "none" ? selectedGoal : null,
          duration_minutes: durationMinutes,
          notes: sessionNote || `Pomodoro #${newCompleted}`,
        });

        toast({
          title: "🍅 Pomodoro complete!",
          description: `${durationMinutes} min session logged. ${newSet % 4 === 0 ? "Time for a long break!" : "Take a short break."}`,
        });
      }

      // Decide next phase
      if (newSet % 4 === 0) {
        switchPhase("long_break");
      } else {
        switchPhase("short_break");
      }
    } else {
      toast({ title: "Break over!", description: "Ready for the next focus session?" });
      switchPhase("focus");
    }

    startTimeRef.current = null;
  };

  const switchPhase = (newPhase: Phase) => {
    setPhase(newPhase);
    setSecondsLeft(PHASES[newPhase].minutes * 60);
    setRunning(false);
    startTimeRef.current = null;
  };

  const reset = () => {
    setRunning(false);
    setSecondsLeft(PHASES[phase].minutes * 60);
    startTimeRef.current = null;
  };

  const totalSeconds = PHASES[phase].minutes * 60;
  const progress = ((totalSeconds - secondsLeft) / totalSeconds) * 100;
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  // SVG circle progress
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (progress / 100) * circumference;

  return (
    <Card className="bg-card border-border p-6 shadow-card w-full max-w-sm mx-auto">
      {/* Header */}
      <div className="flex items-center gap-2 mb-5">
        <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center">
          <Timer className="w-4.5 h-4.5 text-primary" />
        </div>
        <div>
          <h3 className="font-display font-semibold text-foreground text-base">Pomodoro Timer</h3>
          <p className="text-xs text-muted-foreground">{totalCompleted} session{totalCompleted !== 1 ? "s" : ""} today</p>
        </div>

        {/* Pomodoro dots */}
        <div className="ml-auto flex gap-1">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={cn(
                "w-2 h-2 rounded-full transition-all",
                i < (pomodorosThisSet === 0 && totalCompleted > 0 ? 4 : pomodorosThisSet)
                  ? "bg-primary"
                  : "bg-secondary"
              )}
            />
          ))}
        </div>
      </div>

      {/* Phase tabs */}
      <div className="flex gap-1 mb-6 bg-secondary rounded-lg p-1">
        {(Object.keys(PHASES) as Phase[]).map((p) => (
          <button
            key={p}
            onClick={() => switchPhase(p)}
            className={cn(
              "flex-1 py-1.5 text-xs font-medium rounded-md transition-all",
              phase === p
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {p === "short_break" ? "Short" : p === "long_break" ? "Long" : "Focus"}
          </button>
        ))}
      </div>

      {/* Timer circle */}
      <div className="flex justify-center mb-6">
        <div className="relative w-36 h-36 flex items-center justify-center">
          <svg className="absolute inset-0 -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r={radius} fill="none" stroke="hsl(var(--secondary))" strokeWidth="6" />
            <motion.circle
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              transition={{ duration: 0.5, ease: "linear" }}
            />
          </svg>
          <div className="text-center">
            <AnimatePresence mode="wait">
              <motion.p
                key={secondsLeft}
                initial={{ opacity: 0.6 }}
                animate={{ opacity: 1 }}
                className="font-display text-3xl font-bold text-foreground tabular-nums"
              >
                {pad(minutes)}:{pad(seconds)}
              </motion.p>
            </AnimatePresence>
            <p className={cn("text-xs font-medium mt-0.5", PHASES[phase].color)}>
              {PHASES[phase].label}
            </p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-2 mb-5 justify-center">
        <Button
          variant="outline"
          size="icon"
          onClick={reset}
          className="border-border bg-secondary hover:bg-secondary/80"
        >
          <RotateCcw className="w-4 h-4" />
        </Button>
        <Button
          onClick={() => setRunning((r) => !r)}
          className="gradient-gold text-primary-foreground shadow-glow px-8"
        >
          {running ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
          {running ? "Pause" : "Start"}
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => handlePhaseEnd()}
          className="border-border bg-secondary hover:bg-secondary/80"
          title="Skip phase"
        >
          <SkipForward className="w-4 h-4" />
        </Button>
      </div>

      {/* Goal selector (only visible in focus mode) */}
      {phase === "focus" && (
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
            Linked Skill Goal
          </label>
          <Select value={selectedGoal} onValueChange={setSelectedGoal}>
            <SelectTrigger className="bg-secondary border-border text-sm">
              <SelectValue placeholder="No goal selected" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No goal</SelectItem>
              {goals.map((g) => (
                <SelectItem key={g.id} value={g.id}>
                  {g.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </Card>
  );
};

export default PomodoroTimer;
