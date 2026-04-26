import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Shield, AlertTriangle, Flame, Activity } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const BurnoutIndicator = () => {
  const { user } = useAuth();
  const [burnoutScore, setBurnoutScore] = useState<number | null>(null);
  const [trend, setTrend] = useState<string>("stable");
  const [latestMood, setLatestMood] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    fetchBurnoutData();
  }, [user]);

  const fetchBurnoutData = async () => {
    if (!user) return;

    // Get last 7 days of mood check-ins
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const { data: checkins } = await supabase
      .from("mood_checkins")
      .select("*")
      .eq("user_id", user.id)
      .gte("created_at", weekAgo.toISOString())
      .order("created_at", { ascending: false });

    if (!checkins || checkins.length === 0) {
      setBurnoutScore(null);
      return;
    }

    setLatestMood(checkins[0]);

    // Calculate burnout risk (0-100)
    // Low mood + low energy + high stress = high burnout
    const avgMood = checkins.reduce((a: number, c: any) => a + c.mood_score, 0) / checkins.length;
    const avgEnergy = checkins.reduce((a: number, c: any) => a + c.energy_level, 0) / checkins.length;
    const avgStress = checkins.reduce((a: number, c: any) => a + c.stress_level, 0) / checkins.length;

    // Burnout formula: invert mood & energy, keep stress, scale to 0-100
    const score = Math.round(
      ((5 - avgMood) / 4 * 30 + (5 - avgEnergy) / 4 * 30 + (avgStress - 1) / 4 * 40)
    );

    setBurnoutScore(Math.min(100, Math.max(0, score)));

    // Trend: compare first half vs second half of checkins
    if (checkins.length >= 4) {
      const mid = Math.floor(checkins.length / 2);
      const recentAvg = checkins.slice(0, mid).reduce((a: number, c: any) => a + c.mood_score, 0) / mid;
      const olderAvg = checkins.slice(mid).reduce((a: number, c: any) => a + c.mood_score, 0) / (checkins.length - mid);
      setTrend(recentAvg > olderAvg + 0.3 ? "improving" : recentAvg < olderAvg - 0.3 ? "declining" : "stable");
    }
  };

  if (burnoutScore === null) return null;

  const getLevel = () => {
    if (burnoutScore <= 25) return { label: "Healthy", color: "text-success", bg: "bg-success", icon: Shield };
    if (burnoutScore <= 50) return { label: "Moderate", color: "text-primary", bg: "bg-primary", icon: Activity };
    if (burnoutScore <= 75) return { label: "Elevated", color: "text-warning", bg: "bg-warning", icon: AlertTriangle };
    return { label: "High Risk", color: "text-destructive", bg: "bg-destructive", icon: Flame };
  };

  const level = getLevel();
  const LevelIcon = level.icon;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="bg-card border-border p-5 shadow-card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <LevelIcon className={`w-4.5 h-4.5 ${level.color}`} />
            <h3 className="font-display text-sm font-semibold text-foreground">Burnout Risk</h3>
          </div>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${level.color} ${level.bg}/15`}>
            {level.label}
          </span>
        </div>

        <div className="mb-3">
          <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
            <span>Risk Score</span>
            <span className={level.color}>{burnoutScore}%</span>
          </div>
          <Progress value={burnoutScore} className="h-2" />
        </div>

        {latestMood && (
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-secondary/50 rounded-lg p-2">
              <p className="text-lg">{["😫", "😔", "😐", "😊", "🔥"][latestMood.mood_score - 1]}</p>
              <p className="text-[10px] text-muted-foreground">Mood</p>
            </div>
            <div className="bg-secondary/50 rounded-lg p-2">
              <p className="text-sm font-bold text-foreground">{latestMood.energy_level}/5</p>
              <p className="text-[10px] text-muted-foreground">Energy</p>
            </div>
            <div className="bg-secondary/50 rounded-lg p-2">
              <p className="text-sm font-bold text-foreground">{latestMood.stress_level}/5</p>
              <p className="text-[10px] text-muted-foreground">Stress</p>
            </div>
          </div>
        )}

        <div className="mt-3 text-xs text-muted-foreground text-center">
          Trend: <span className={
            trend === "improving" ? "text-success" : trend === "declining" ? "text-destructive" : "text-muted-foreground"
          }>
            {trend === "improving" ? "↗ Improving" : trend === "declining" ? "↘ Declining" : "→ Stable"}
          </span>
        </div>
      </Card>
    </motion.div>
  );
};

export default BurnoutIndicator;
