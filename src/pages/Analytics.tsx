// src/pages/Analytics.tsx
// NEW FEATURE: Analytics & Insights Page
// Add to App.tsx routes: <Route path="/analytics" element={<Analytics />} />
// Add to AppLayout navLinks: { icon: BarChart2, label: "Analytics", path: "/analytics" }

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import {
  BarChart2,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  Clock,
  Target,
  Flame,
  Brain,
  Zap,
  Heart,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  Legend,
} from "recharts";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

// ── Custom tooltip for charts ─────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl px-4 py-2 shadow-card text-sm">
      <p className="text-muted-foreground mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="font-medium">
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
};

const Analytics = () => {
  const { user } = useAuth();
  const [range, setRange] = useState<"7" | "30" | "90">("30");
  const [sessions, setSessions] = useState<any[]>([]);
  const [moods, setMoods] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchAll();
  }, [user, range]);

  const fetchAll = async () => {
    setLoading(true);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - Number(range));
    const iso = cutoff.toISOString();

    const [sessRes, moodRes, goalRes, taskRes] = await Promise.all([
      supabase
        .from("learning_sessions")
        .select("*")
        .eq("user_id", user!.id)
        .gte("created_at", iso)
        .order("created_at"),
      supabase
        .from("mood_checkins")
        .select("*")
        .eq("user_id", user!.id)
        .gte("created_at", iso)
        .order("created_at"),
      supabase
        .from("skill_goals")
        .select("*")
        .eq("user_id", user!.id),
      supabase
        .from("daily_tasks")
        .select("*")
        .eq("user_id", user!.id)
        .gte("created_at", iso),
    ]);

    setSessions(sessRes.data || []);
    setMoods(moodRes.data || []);
    setGoals(goalRes.data || []);
    setTasks(taskRes.data || []);
    setLoading(false);
  };

  // ── Derived data ────────────────────────────────────────────────────────────
  const totalHours = sessions.reduce((a, s) => a + (s.duration_minutes || 0) / 60, 0);
  const completedTasks = tasks.filter((t) => t.status === "completed").length;
  const taskRate = tasks.length ? Math.round((completedTasks / tasks.length) * 100) : 0;

  // Sessions grouped by day
  const sessionsByDay = sessions.reduce((acc: Record<string, number>, s) => {
    const day = s.created_at?.split("T")[0] || "";
    acc[day] = (acc[day] || 0) + (s.duration_minutes || 0) / 60;
    return acc;
  }, {});
  const sessionChartData = Object.entries(sessionsByDay).map(([date, hours]) => ({
    date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    hours: Math.round((hours as number) * 10) / 10,
  }));

  // Mood trend
  const moodChartData = moods.map((m) => ({
    date: new Date(m.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    mood: m.mood_score,
    energy: m.energy_level,
    stress: m.stress_level,
  }));

  // Goal progress radar
  const radarData = goals.slice(0, 6).map((g) => ({
    skill: g.title.length > 12 ? g.title.slice(0, 12) + "…" : g.title,
    progress: g.progress || 0,
  }));

  // Avg mood
  const avgMood = moods.length
    ? (moods.reduce((a, m) => a + m.mood_score, 0) / moods.length).toFixed(1)
    : "—";
  const avgEnergy = moods.length
    ? (moods.reduce((a, m) => a + m.energy_level, 0) / moods.length).toFixed(1)
    : "—";

  const moodTrendIcon = () => {
    if (moods.length < 2) return <Minus className="w-4 h-4 text-muted-foreground" />;
    const first = moods[0].mood_score;
    const last = moods[moods.length - 1].mood_score;
    if (last > first) return <TrendingUp className="w-4 h-4 text-success" />;
    if (last < first) return <TrendingDown className="w-4 h-4 text-destructive" />;
    return <Minus className="w-4 h-4 text-muted-foreground" />;
  };

  const statCards = [
    {
      label: "Total Study Hours",
      value: totalHours.toFixed(1) + "h",
      icon: Clock,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "Sessions Logged",
      value: sessions.length,
      icon: BookOpen,
      color: "text-info",
      bg: "bg-info/10",
    },
    {
      label: "Task Completion",
      value: taskRate + "%",
      icon: Target,
      color: "text-success",
      bg: "bg-success/10",
    },
    {
      label: "Avg Mood",
      value: avgMood + " / 5",
      icon: Heart,
      color: "text-accent",
      bg: "bg-accent/10",
    },
    {
      label: "Avg Energy",
      value: avgEnergy + " / 5",
      icon: Zap,
      color: "text-warning",
      bg: "bg-warning/10",
    },
    {
      label: "Active Goals",
      value: goals.filter((g) => g.status === "active").length,
      icon: Flame,
      color: "text-primary",
      bg: "bg-primary/10",
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground flex items-center gap-2">
            <BarChart2 className="w-7 h-7 text-primary" /> Analytics
          </h1>
          <p className="text-muted-foreground mt-1">Your learning insights at a glance</p>
        </div>

        {/* Time range selector */}
        <Tabs value={range} onValueChange={(v) => setRange(v as any)}>
          <TabsList className="bg-secondary border border-border">
            <TabsTrigger value="7">7 days</TabsTrigger>
            <TabsTrigger value="30">30 days</TabsTrigger>
            <TabsTrigger value="90">90 days</TabsTrigger>
          </TabsList>
        </Tabs>
      </motion.div>

      {/* Stat cards */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8"
      >
        {statCards.map((s, i) => (
          <Card key={s.label} className="bg-card border-border p-4 shadow-card">
            <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center mb-3`}>
              <s.icon className={`w-4 h-4 ${s.color}`} />
            </div>
            <p className="text-xl font-display font-bold text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </Card>
        ))}
      </motion.div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Study hours bar chart */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="bg-card border-border p-6 shadow-card">
            <h3 className="font-display font-semibold text-foreground mb-5 flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" /> Daily Study Hours
            </h3>
            {sessionChartData.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-12">No sessions yet in this range.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={sessionChartData} barSize={12}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} unit="h" />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="hours" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Hours" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </motion.div>

        {/* Mood / energy line chart */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="bg-card border-border p-6 shadow-card">
            <h3 className="font-display font-semibold text-foreground mb-5 flex items-center gap-2">
              <Heart className="w-4 h-4 text-accent" /> Mood & Energy Trend
              <span className="ml-auto">{moodTrendIcon()}</span>
            </h3>
            {moodChartData.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-12">No mood check-ins yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={moodChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <YAxis domain={[1, 5]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line type="monotone" dataKey="mood" stroke="hsl(var(--accent))" strokeWidth={2} dot={false} name="Mood" />
                  <Line type="monotone" dataKey="energy" stroke="hsl(var(--info))" strokeWidth={2} dot={false} name="Energy" />
                  <Line type="monotone" dataKey="stress" stroke="hsl(var(--destructive))" strokeWidth={2} dot={false} name="Stress" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Card>
        </motion.div>
      </div>

      {/* Skill radar */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <Card className="bg-card border-border p-6 shadow-card">
          <h3 className="font-display font-semibold text-foreground mb-5 flex items-center gap-2">
            <Brain className="w-4 h-4 text-primary" /> Skill Progress Overview
          </h3>
          {radarData.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-12">Add skill goals to see your radar.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="skill" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                <Radar
                  name="Progress"
                  dataKey="progress"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.25}
                />
              </RadarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </motion.div>
    </div>
  );
};

// Missing import – add this at top with others
import { BookOpen } from "lucide-react";

export default Analytics;
