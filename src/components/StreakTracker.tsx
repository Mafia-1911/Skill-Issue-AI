// src/components/StreakTracker.tsx
// NEW FEATURE: Visual Streak Tracker with heatmap-style calendar
// Shows daily activity for the last 12 weeks (GitHub-contribution style)
// Usage: <StreakTracker /> — drop into Dashboard sidebar

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Flame, Trophy, Calendar } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface DayData {
  date: string; // YYYY-MM-DD
  minutes: number;
}

function getIntensity(minutes: number): 0 | 1 | 2 | 3 | 4 {
  if (minutes === 0) return 0;
  if (minutes < 30) return 1;
  if (minutes < 60) return 2;
  if (minutes < 120) return 3;
  return 4;
}

const intensityClasses = [
  "bg-secondary",
  "bg-primary/20",
  "bg-primary/40",
  "bg-primary/70",
  "bg-primary",
];

const WEEKS = 12;
const DAYS_PER_WEEK = 7;

const StreakTracker = () => {
  const { user } = useAuth();
  const [activityMap, setActivityMap] = useState<Record<string, number>>({});
  const [currentStreak, setCurrentStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchActivity();
  }, [user]);

  const fetchActivity = async () => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - WEEKS * 7);

    const { data } = await supabase
      .from("learning_sessions")
      .select("created_at, duration_minutes")
      .eq("user_id", user!.id)
      .gte("created_at", cutoff.toISOString());

    const map: Record<string, number> = {};
    (data || []).forEach((s) => {
      const day = s.created_at?.split("T")[0] || "";
      map[day] = (map[day] || 0) + (s.duration_minutes || 0);
    });
    setActivityMap(map);

    // Calculate streaks
    const today = new Date();
    let streak = 0;
    let longest = 0;
    let temp = 0;
    let checking = new Date(today);

    for (let i = 0; i < 365; i++) {
      const key = checking.toISOString().split("T")[0];
      if (map[key]) {
        temp++;
        if (i === 0 || streak === i) streak = temp;
      } else {
        longest = Math.max(longest, temp);
        temp = 0;
        if (i === 0) streak = 0; // no activity today
      }
      checking.setDate(checking.getDate() - 1);
    }
    longest = Math.max(longest, temp);

    setCurrentStreak(streak);
    setLongestStreak(longest);
    setLoading(false);
  };

  // Build grid: WEEKS columns × 7 rows, starting from Sunday
  const buildGrid = (): DayData[][] => {
    const today = new Date();
    // Start from WEEKS*7 days ago, aligned to Sunday
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - (WEEKS * 7 - 1));
    // adjust to previous Sunday
    const dayOfWeek = startDate.getDay();
    startDate.setDate(startDate.getDate() - dayOfWeek);

    const weeks: DayData[][] = [];
    const cursor = new Date(startDate);

    for (let w = 0; w < WEEKS; w++) {
      const week: DayData[] = [];
      for (let d = 0; d < DAYS_PER_WEEK; d++) {
        const key = cursor.toISOString().split("T")[0];
        week.push({ date: key, minutes: activityMap[key] || 0 });
        cursor.setDate(cursor.getDate() + 1);
      }
      weeks.push(week);
    }
    return weeks;
  };

  const grid = buildGrid();
  const dayLabels = ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <Card className="bg-card border-border p-6 shadow-card">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center">
          <Flame className="w-4.5 h-4.5 text-primary" />
        </div>
        <div>
          <h3 className="font-display font-semibold text-foreground text-base">Study Streak</h3>
          <p className="text-xs text-muted-foreground">Last {WEEKS} weeks activity</p>
        </div>
      </div>

      {/* Streak stats */}
      <div className="flex gap-4 mb-5">
        <div className="flex-1 bg-secondary/60 rounded-xl p-3 text-center">
          <p className="font-display text-2xl font-bold text-primary">{currentStreak}</p>
          <p className="text-xs text-muted-foreground mt-0.5 flex items-center justify-center gap-1">
            <Flame className="w-3 h-3" /> Current
          </p>
        </div>
        <div className="flex-1 bg-secondary/60 rounded-xl p-3 text-center">
          <p className="font-display text-2xl font-bold text-foreground">{longestStreak}</p>
          <p className="text-xs text-muted-foreground mt-0.5 flex items-center justify-center gap-1">
            <Trophy className="w-3 h-3" /> Best
          </p>
        </div>
      </div>

      {/* Heatmap grid */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="flex gap-1 min-w-max">
            {/* Day labels */}
            <div className="flex flex-col gap-1 mr-1">
              <div className="h-2.5" /> {/* spacer for month row */}
              {dayLabels.map((d, i) => (
                <div key={i} className="h-2.5 w-3 text-[8px] text-muted-foreground flex items-center">
                  {i % 2 === 1 ? d : ""}
                </div>
              ))}
            </div>

            {/* Weeks */}
            {grid.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-1">
                {/* Month label (show on first day of month) */}
                <div className="h-2.5 text-[8px] text-muted-foreground">
                  {week[0].date.endsWith("-01") || (wi === 0)
                    ? new Date(week[0].date).toLocaleDateString("en-US", { month: "short" })
                    : ""}
                </div>
                {week.map((day, di) => {
                  const intensity = getIntensity(day.minutes);
                  const isFuture = new Date(day.date) > new Date();
                  return (
                    <Tooltip key={di}>
                      <TooltipTrigger asChild>
                        <motion.div
                          whileHover={{ scale: 1.3 }}
                          className={cn(
                            "w-2.5 h-2.5 rounded-sm cursor-default transition-colors",
                            isFuture ? "bg-secondary/30" : intensityClasses[intensity]
                          )}
                        />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        <p className="font-medium">
                          {new Date(day.date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                        <p className="text-muted-foreground">
                          {day.minutes > 0
                            ? `${Math.round(day.minutes / 60 * 10) / 10}h studied`
                            : "No activity"}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-1.5 mt-3 justify-end">
        <span className="text-[10px] text-muted-foreground mr-1">Less</span>
        {intensityClasses.map((cls, i) => (
          <div key={i} className={cn("w-2.5 h-2.5 rounded-sm", cls)} />
        ))}
        <span className="text-[10px] text-muted-foreground ml-1">More</span>
      </div>
    </Card>
  );
};

export default StreakTracker;
