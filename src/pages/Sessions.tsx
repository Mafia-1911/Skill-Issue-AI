import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Plus, Clock, Calendar, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const Sessions = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState("30");
  const [notes, setNotes] = useState("");
  const [selectedGoal, setSelectedGoal] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null); // ← tracks which session is being deleted

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    const [sessionsRes, goalsRes] = await Promise.all([
      supabase
        .from("learning_sessions")
        .select("*, skill_goals(title)")
        .eq("user_id", user.id)
        .order("logged_at", { ascending: false })
        .limit(50),
      supabase
        .from("skill_goals")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "active"),
    ]);
    setSessions(sessionsRes.data || []);
    setGoals(goalsRes.data || []);
  };

  const logSession = async () => {
    if (!user || !title.trim() || isSaving) return; // ← guard against double clicks
    setIsSaving(true);

    // ── OPTIMISTIC UPDATE ───────────────────────────────────────────────────
    // Immediately add the new session to local state so the weekly summary
    // recalculates instantly — before the DB round trip completes.
    const optimisticSession = {
      id: `optimistic-${Date.now()}`,
      title: title.trim(),
      duration_minutes: Number(duration) || 30,
      logged_at: new Date().toISOString(),
      notes: notes.trim() || null,
      skill_goals: goals.find((g) => g.id === selectedGoal)
        ? { title: goals.find((g) => g.id === selectedGoal)!.title }
        : null,
    };
    setSessions((prev) => [optimisticSession, ...prev]);

    // Snapshot form values before resetting (used in skill update below)
    const savedGoalId = selectedGoal;

    // Reset form immediately so UX feels snappy
    setTitle("");
    setDuration("30");
    setNotes("");
    setSelectedGoal("");
    setShowForm(false);

    // ── DB INSERT ───────────────────────────────────────────────────────────
    const { error } = await supabase.from("learning_sessions").insert({
      user_id: user.id,
      title: optimisticSession.title,
      duration_minutes: optimisticSession.duration_minutes,
      notes: optimisticSession.notes,
      skill_goal_id: savedGoalId || null,
    });

    if (error) {
      // Rollback optimistic update on failure
      setSessions((prev) =>
        prev.filter((s) => s.id !== optimisticSession.id)
      );
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setIsSaving(false);
      return;
    }

    // ── SKILL PROGRESS UPDATE ───────────────────────────────────────────────
    if (savedGoalId) {
      const goal = goals.find((g) => g.id === savedGoalId);
      if (goal) {
        const newProgress = Math.min(100, Number(goal.progress) + 5);
        await supabase
          .from("skill_goals")
          .update({ progress: newProgress })
          .eq("id", savedGoalId);
      }
    }

    // ── SYNC REAL DATA ──────────────────────────────────────────────────────
    // Replace the optimistic entry with real DB data (gets the real UUID etc.)
    await fetchData(); // ← NOW awaited, so state is always fresh after this

    toast({ title: "Session logged!" });
    setIsSaving(false);
  };

  const deleteSession = async (sessionId: string) => {
    if (deletingId) return; // prevent deleting multiple at once
    setDeletingId(sessionId);

    // ── OPTIMISTIC REMOVAL ──────────────────────────────────────────────────
    // Remove from UI instantly, rollback if DB delete fails
    const previousSessions = sessions;
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));

    const { error } = await supabase
      .from("learning_sessions")
      .delete()
      .eq("id", sessionId)
      .eq("user_id", user!.id); // safety: only delete own sessions

    if (error) {
      // Rollback if delete failed
      setSessions(previousSessions);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Session deleted" });
    }

    setDeletingId(null);
  };

  // ── Weekly summary (reactive — recalculates on every sessions state change)
  const now = new Date();
  const weekStart = new Date(now);
  // getDay() returns 0 for Sunday. The original formula (- 0 + 1) pushed
  // weekStart to *tomorrow* on Sundays, filtering out all sessions.
  // Fix: if Sunday go back 6 days to Monday, otherwise go back (day - 1).
  const dayOfWeek = now.getDay();
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  weekStart.setDate(now.getDate() - daysFromMonday);
  weekStart.setHours(0, 0, 0, 0);

  const thisWeekSessions = sessions.filter(
    (s) => new Date(s.logged_at) >= weekStart
  );
  const weeklyMinutes = thisWeekSessions.reduce(
    (acc, s) => acc + s.duration_minutes,
    0
  );
  const weeklyHours = Math.round((weeklyMinutes / 60) * 10) / 10;

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-8"
      >
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">
            Learning Sessions
          </h1>
          <p className="text-muted-foreground mt-1">
            Log and track your learning activity
          </p>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="gradient-gold text-primary-foreground shadow-glow"
        >
          <Plus className="w-4 h-4 mr-2" /> Log Session
        </Button>
      </motion.div>

      {/* Weekly Summary */}
      <Card className="bg-card border-border p-5 mb-6 shadow-card">
        <h3 className="font-display font-semibold text-foreground mb-3">
          This Week's Summary
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              Sessions
            </p>
            <p className="font-display text-2xl font-bold text-foreground">
              {thisWeekSessions.length}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              Total Hours
            </p>
            {/* AnimatePresence makes the number animate on change */}
            <AnimatePresence mode="wait">
              <motion.p
                key={weeklyHours} // ← re-triggers animation whenever value changes
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.2 }}
                className="font-display text-2xl font-bold text-primary"
              >
                {weeklyHours}h
              </motion.p>
            </AnimatePresence>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              Avg/Session
            </p>
            <AnimatePresence mode="wait">
              <motion.p
                key={thisWeekSessions.length} // ← re-triggers on session count change
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.2 }}
                className="font-display text-2xl font-bold text-foreground"
              >
                {thisWeekSessions.length > 0
                  ? Math.round(weeklyMinutes / thisWeekSessions.length)
                  : 0}
                m
              </motion.p>
            </AnimatePresence>
          </div>
        </div>
      </Card>

      {/* Log form */}
      {showForm && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="bg-card border-border p-5 mb-6 shadow-card">
            <h3 className="font-display font-semibold text-foreground mb-4">
              Log a Session
            </h3>
            <div className="space-y-4">
              <div>
                <Label className="text-sm text-muted-foreground">
                  What did you study?
                </Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., React hooks tutorial"
                  className="mt-1.5 bg-secondary border-border"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground">
                    Duration (minutes)
                  </Label>
                  <Input
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    min="5"
                    className="mt-1.5 bg-secondary border-border"
                  />
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">
                    Related Skill
                  </Label>
                  <Select value={selectedGoal} onValueChange={setSelectedGoal}>
                    <SelectTrigger className="mt-1.5 bg-secondary border-border">
                      <SelectValue placeholder="Select skill" />
                    </SelectTrigger>
                    <SelectContent>
                      {goals.map((g) => (
                        <SelectItem key={g.id} value={g.id}>
                          {g.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">
                  Notes (optional)
                </Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="What did you learn?"
                  className="mt-1.5 bg-secondary border-border"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={logSession}
                  disabled={!title.trim() || isSaving} // ← disabled while saving
                  className="gradient-gold text-primary-foreground"
                >
                  {isSaving ? "Saving..." : "Save Session"} {/* ← live feedback */}
                </Button>
                <Button variant="ghost" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Sessions list */}
      <div className="space-y-2">
        {sessions.map((session, i) => (
          <motion.div
            key={session.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
          >
            <Card className="bg-card border-border p-4 shadow-card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <BookOpen className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {session.title}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {session.duration_minutes}min
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3" />{" "}
                        {new Date(session.logged_at).toLocaleDateString()}
                      </span>
                      {session.skill_goals?.title && (
                        <span className="text-xs text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                          {session.skill_goals.title}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteSession(session.id)}
                  disabled={deletingId === session.id}
                  className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              {session.notes && (
                <p className="text-xs text-muted-foreground mt-2 ml-12">
                  {session.notes}
                </p>
              )}
            </Card>
          </motion.div>
        ))}
        {sessions.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="font-display text-lg">No sessions logged yet</p>
            <p className="text-sm mt-1">
              Click "Log Session" to record your learning
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sessions;