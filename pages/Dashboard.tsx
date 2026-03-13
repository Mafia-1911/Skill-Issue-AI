import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../integrations/supabase/client";
import { motion } from "framer-motion";
import { Target, Clock, CheckCircle2, TrendingUp, Calendar, BookOpen, Sparkles, ArrowRight } from "lucide-react";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Progress } from "../components/ui/progress";
import { useNavigate } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState({ totalGoals: 0, completedTasks: 0, totalHours: 0, streak: 0 });
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [recentSessions, setRecentSessions] = useState<any[]>([]);
  const [todayTasks, setTodayTasks] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user) return;

    const [profileRes, goalsRes, sessionsRes, tasksRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", user.id).single(),
      supabase.from("skill_goals").select("*").eq("user_id", user.id),
      supabase.from("learning_sessions").select("*").eq("user_id", user.id).order("logged_at", { ascending: false }).limit(5),
      supabase.from("daily_tasks").select("*").eq("user_id", user.id).eq("scheduled_date", new Date().toISOString().split("T")[0]),
    ]);

    if (profileRes.data) setProfile(profileRes.data);

    const goals = goalsRes.data || [];
    const sessions = sessionsRes.data || [];
    const tasks = tasksRes.data || [];

    const totalMinutes = sessions.reduce((acc: number, s: any) => acc + (s.duration_minutes || 0), 0);

    setStats({
      totalGoals: goals.length,
      completedTasks: tasks.filter((t: any) => t.status === "completed").length,
      totalHours: Math.round(totalMinutes / 60 * 10) / 10,
      streak: 0,
    });

    setRecentSessions(sessions);
    setTodayTasks(tasks);

    // Mock weekly data for chart
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    setWeeklyData(days.map((d) => ({ day: d, hours: Math.round(Math.random() * 3 * 10) / 10 })));
  };

  const statCards = [
    { icon: Target, label: "Active Goals", value: stats.totalGoals, color: "text-primary" },
    { icon: CheckCircle2, label: "Today's Tasks", value: `${stats.completedTasks}/${todayTasks.length}`, color: "text-success" },
    { icon: Clock, label: "Total Hours", value: stats.totalHours, color: "text-info" },
    { icon: TrendingUp, label: "Day Streak", value: stats.streak, color: "text-warning" },
  ];

  const needsSetup = !profile?.career_goal;

  return (
    <div>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="font-display text-3xl font-bold text-foreground">
          Welcome back{profile?.full_name ? `, ${profile.full_name}` : ""}
        </h1>
        <p className="text-muted-foreground mt-1">
          {needsSetup ? "Let's set up your career goal to get started" : "Here's your learning progress overview"}
        </p>
      </motion.div>

      {/* Setup prompt */}
      {needsSetup && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="bg-card border-border p-6 mb-8 relative overflow-hidden">
            <div className="absolute inset-0 gradient-glow opacity-50" />
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl gradient-gold flex items-center justify-center shadow-glow">
                  <Sparkles className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-semibold text-foreground">Set Your Career Goal</h3>
                  <p className="text-muted-foreground text-sm">Define your goal and let AI create your personalized learning path</p>
                </div>
              </div>
              <Button onClick={() => navigate("/goals")} className="gradient-gold text-primary-foreground shadow-glow">
                Get Started <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="bg-card border-border p-5 shadow-card">
              <div className="flex items-center gap-3 mb-3">
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{stat.label}</span>
              </div>
              <p className="font-display text-2xl font-bold text-foreground">{stat.value}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Weekly Activity Chart */}
        <Card className="lg:col-span-2 bg-card border-border p-6 shadow-card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-display text-lg font-semibold text-foreground">Weekly Activity</h3>
            <Calendar className="w-4 h-4 text-muted-foreground" />
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weeklyData}>
              <XAxis dataKey="day" tick={{ fill: "hsl(220 10% 50%)", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "hsl(220 10% 50%)", fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(220 18% 7%)",
                  border: "1px solid hsl(220 14% 14%)",
                  borderRadius: "8px",
                  color: "hsl(40 20% 92%)",
                }}
              />
              <Bar dataKey="hours" fill="hsl(38 92% 55%)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Today's Tasks */}
        <Card className="bg-card border-border p-6 shadow-card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-display text-lg font-semibold text-foreground">Today's Tasks</h3>
            <Button variant="ghost" size="sm" onClick={() => navigate("/weekly-plan")} className="text-primary text-xs">
              View All
            </Button>
          </div>
          {todayTasks.length === 0 ? (
            <div className="text-center py-8">
              <BookOpen className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">No tasks scheduled today</p>
            </div>
          ) : (
            <div className="space-y-3">
              {todayTasks.map((task: any) => (
                <div key={task.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary">
                  <div className={`w-2 h-2 rounded-full ${task.status === "completed" ? "bg-success" : "bg-primary"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">{task.title}</p>
                    <p className="text-xs text-muted-foreground">{task.scheduled_duration_minutes}min</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Recent Sessions */}
      {recentSessions.length > 0 && (
        <Card className="bg-card border-border p-6 shadow-card mt-6">
          <h3 className="font-display text-lg font-semibold text-foreground mb-4">Recent Sessions</h3>
          <div className="space-y-3">
            {recentSessions.map((session: any) => (
              <div key={session.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary">
                <div>
                  <p className="text-sm text-foreground">{session.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(session.logged_at).toLocaleDateString()} • {session.duration_minutes}min
                  </p>
                </div>
                <CheckCircle2 className="w-4 h-4 text-success" />
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;
