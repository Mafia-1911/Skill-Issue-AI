import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../integrations/supabase/client";
import { motion } from "framer-motion";
import { Calendar, CheckCircle2, Clock, RefreshCw, Sparkles, Loader2, XCircle, RotateCcw } from "lucide-react";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { useToast } from "../hooks/use-toast";

const WeeklyPlan = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<any[]>([]);
  const [weeklyPlan, setWeeklyPlan] = useState<any>(null);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    // Get current week
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + 1);
    const weekStart = startOfWeek.toISOString().split("T")[0];

    const [planRes, tasksRes] = await Promise.all([
      supabase.from("weekly_plans").select("*").eq("user_id", user.id).eq("week_start", weekStart).maybeSingle(),
      supabase.from("daily_tasks").select("*, skill_goals(title)").eq("user_id", user.id)
        .gte("scheduled_date", weekStart)
        .lte("scheduled_date", new Date(startOfWeek.getTime() + 6 * 86400000).toISOString().split("T")[0])
        .order("scheduled_date")
        .order("created_at"),
    ]);

    if (planRes.data) setWeeklyPlan(planRes.data);
    setTasks(tasksRes.data || []);
    setLoading(false);
  };

  const generateWeeklyPlan = async () => {
    if (!user) return;
    setGenerating(true);
    try {
      const [profileRes, goalsRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", user.id).single(),
        supabase.from("skill_goals").select("*").eq("user_id", user.id).eq("status", "active"),
      ]);

      const profile = profileRes.data;
      const goals = goalsRes.data || [];

      if (!profile?.career_goal || goals.length === 0) {
        toast({ title: "Setup needed", description: "Please set your career goal and add skill goals first.", variant: "destructive" });
        setGenerating(false);
        return;
      }

      const res = await supabase.functions.invoke("ai-planner", {
        body: {
          action: "weekly_plan",
          careerGoal: profile.career_goal,
          availableHours: profile.available_hours_per_week,
          skills: goals.map((g: any) => ({ id: g.id, title: g.title, progress: g.progress })),
        },
      });

      if (res.error) throw res.error;

      const plan = res.data;

      // Create weekly plan
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay() + 1);
      const weekStart = startOfWeek.toISOString().split("T")[0];
      const weekEnd = new Date(startOfWeek.getTime() + 6 * 86400000).toISOString().split("T")[0];

      // Delete existing plan for this week
      await supabase.from("daily_tasks").delete().eq("user_id", user.id).gte("scheduled_date", weekStart).lte("scheduled_date", weekEnd);
      await supabase.from("weekly_plans").delete().eq("user_id", user.id).eq("week_start", weekStart);

      const { data: newPlan } = await supabase.from("weekly_plans").insert({
        user_id: user.id,
        week_start: weekStart,
        week_end: weekEnd,
        summary: plan.summary || "AI-generated weekly plan",
        total_planned_hours: plan.totalHours || 0,
      }).select().single();

      // Insert tasks
      if (plan.tasks && newPlan) {
        for (const task of plan.tasks) {
          await supabase.from("daily_tasks").insert({
            user_id: user.id,
            weekly_plan_id: newPlan.id,
            skill_goal_id: task.skillGoalId || null,
            title: task.title,
            description: task.description || null,
            scheduled_date: task.date,
            scheduled_duration_minutes: task.durationMinutes || 30,
          });
        }
      }

      toast({ title: "Weekly plan generated!", description: `${plan.tasks?.length || 0} tasks created` });
      fetchData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to generate plan", variant: "destructive" });
    }
    setGenerating(false);
  };

  const completeTask = async (taskId: string) => {
    await supabase.from("daily_tasks").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", taskId);

    // Log a session
    const task = tasks.find((t) => t.id === taskId);
    if (task && user) {
      await supabase.from("learning_sessions").insert({
        user_id: user.id,
        task_id: taskId,
        skill_goal_id: task.skill_goal_id,
        title: task.title,
        duration_minutes: task.scheduled_duration_minutes,
      });
    }
    fetchData();
  };

  const missTask = async (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    // Reschedule to next available day
    const nextDate = new Date(task.scheduled_date);
    nextDate.setDate(nextDate.getDate() + 1);
    const rescheduledTo = nextDate.toISOString().split("T")[0];

    await supabase.from("daily_tasks").update({
      status: "rescheduled",
      rescheduled_to: rescheduledTo,
    }).eq("id", taskId);

    // Create rescheduled task
    if (user) {
      await supabase.from("daily_tasks").insert({
        user_id: user.id,
        weekly_plan_id: task.weekly_plan_id,
        skill_goal_id: task.skill_goal_id,
        title: `[Rescheduled] ${task.title}`,
        description: task.description,
        scheduled_date: rescheduledTo,
        scheduled_duration_minutes: Math.max(15, task.scheduled_duration_minutes - 10),
      });
    }

    toast({ title: "Task rescheduled", description: "A lighter version has been moved to tomorrow" });
    fetchData();
  };

  // Group tasks by date
  const groupedTasks: Record<string, any[]> = {};
  tasks.forEach((t) => {
    const date = t.scheduled_date;
    if (!groupedTasks[date]) groupedTasks[date] = [];
    groupedTasks[date].push(t);
  });

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    const today = new Date().toISOString().split("T")[0];
    if (dateStr === today) return "Today";
    return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
  };

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Weekly Plan</h1>
          <p className="text-muted-foreground mt-1">Your AI-generated study schedule for this week</p>
        </div>
        <Button
          onClick={generateWeeklyPlan}
          disabled={generating}
          className="gradient-gold text-primary-foreground shadow-glow"
        >
          {generating ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
          ) : (
            <><Sparkles className="w-4 h-4 mr-2" /> Generate Plan</>
          )}
        </Button>
      </motion.div>

      {weeklyPlan && (
        <Card className="bg-card border-border p-5 mb-6 shadow-card">
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="w-5 h-5 text-primary" />
            <h3 className="font-display font-semibold text-foreground">Week Summary</h3>
          </div>
          <p className="text-sm text-muted-foreground">{weeklyPlan.summary}</p>
          <div className="flex gap-4 mt-3 text-sm">
            <span className="text-muted-foreground">Planned: <strong className="text-foreground">{weeklyPlan.total_planned_hours}h</strong></span>
            <span className="text-muted-foreground">Completed: <strong className="text-success">{weeklyPlan.total_completed_hours}h</strong></span>
          </div>
        </Card>
      )}

      {loading ? (
        <div className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></div>
      ) : Object.keys(groupedTasks).length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="font-display text-lg">No tasks scheduled this week</p>
          <p className="text-sm mt-1">Click "Generate Plan" to create your AI-powered schedule</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedTasks).map(([date, dayTasks]) => (
            <div key={date}>
              <h4 className="font-display text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                {formatDate(date)}
              </h4>
              <div className="space-y-2">
                {dayTasks.map((task: any, i: number) => (
                  <motion.div key={task.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}>
                    <Card className={`bg-card border-border p-4 shadow-card transition-all ${
                      task.status === "completed" ? "opacity-60" : ""
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                            task.status === "completed" ? "bg-success" :
                            task.status === "rescheduled" ? "bg-warning" :
                            task.status === "missed" ? "bg-destructive" : "bg-primary"
                          }`} />
                          <div className="min-w-0">
                            <p className={`text-sm font-medium truncate ${
                              task.status === "completed" ? "line-through text-muted-foreground" : "text-foreground"
                            }`}>
                              {task.title}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Clock className="w-3 h-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">{task.scheduled_duration_minutes}min</span>
                              {task.skill_goals?.title && (
                                <span className="text-xs text-primary bg-primary/10 px-1.5 py-0.5 rounded">{task.skill_goals.title}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        {task.status === "pending" && (
                          <div className="flex gap-1 shrink-0">
                            <Button variant="ghost" size="sm" onClick={() => completeTask(task.id)} className="text-success hover:text-success h-8 w-8 p-0">
                              <CheckCircle2 className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => missTask(task.id)} className="text-muted-foreground hover:text-warning h-8 w-8 p-0">
                              <RotateCcw className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                        {task.status === "rescheduled" && (
                          <span className="text-xs text-warning bg-warning/10 px-2 py-1 rounded">Rescheduled</span>
                        )}
                        {task.status === "completed" && (
                          <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                        )}
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WeeklyPlan;
