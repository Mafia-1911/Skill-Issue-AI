import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Target, Plus, Sparkles, Loader2, Trash2, ChevronRight } from "lucide-react";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Progress } from "../components/ui/progress";
import { useToast } from "../hooks/use-toast";

const Goals = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [goals, setGoals] = useState<any[]>([]);
  const [careerGoal, setCareerGoal] = useState("");
  const [studyHours, setStudyHours] = useState("10");
  const [isGenerating, setIsGenerating] = useState(false);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [newGoalDesc, setNewGoalDesc] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    const [profileRes, goalsRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", user.id).single(),
      supabase.from("skill_goals").select("*").eq("user_id", user.id).order("priority"),
    ]);
    if (profileRes.data) {
      setProfile(profileRes.data);
      setCareerGoal(profileRes.data.career_goal || "");
      setStudyHours(String(profileRes.data.available_hours_per_week || 10));
    }
    if (goalsRes.data) setGoals(goalsRes.data);
  };

  const saveCareerGoal = async () => {
    if (!user || !careerGoal.trim()) return;
    setSavingProfile(true);
    const { error } = await supabase.from("profiles").update({
      career_goal: careerGoal.trim(),
      available_hours_per_week: Number(studyHours) || 10,
    }).eq("user_id", user.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Career goal saved!" });
      setProfile({ ...profile, career_goal: careerGoal, available_hours_per_week: Number(studyHours) });
    }
    setSavingProfile(false);
  };

  const generateSkillBreakdown = async () => {
    if (!careerGoal.trim()) return;
    setIsGenerating(true);
    try {
      const res = await supabase.functions.invoke("ai-planner", {
        body: {
          action: "breakdown",
          careerGoal: careerGoal.trim(),
          availableHours: Number(studyHours) || 10,
        },
      });

      if (res.error) throw res.error;

      const skills = res.data?.skills || [];
      for (const skill of skills) {
        await supabase.from("skill_goals").insert({
          user_id: user!.id,
          title: skill.title,
          description: skill.description,
          priority: skill.priority || 1,
        });
      }
      toast({ title: "Skills generated!", description: `${skills.length} skill goals created by AI` });
      fetchData();
    } catch (err: any) {
      toast({ title: "AI Error", description: err.message || "Failed to generate", variant: "destructive" });
    }
    setIsGenerating(false);
  };

  const addManualGoal = async () => {
    if (!user || !newGoalTitle.trim()) return;
    const { error } = await supabase.from("skill_goals").insert({
      user_id: user.id,
      title: newGoalTitle.trim(),
      description: newGoalDesc.trim() || null,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setNewGoalTitle("");
      setNewGoalDesc("");
      setShowGoalForm(false);
      fetchData();
    }
  };

  const deleteGoal = async (id: string) => {
    await supabase.from("skill_goals").delete().eq("id", id);
    fetchData();
  };

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="font-display text-3xl font-bold text-foreground">Career Goals</h1>
        <p className="text-muted-foreground mt-1">Define your long-term goal and let AI break it into skills</p>
      </motion.div>

      {/* Career Goal Setup */}
      <Card className="bg-card border-border p-6 shadow-card mb-8">
        <h3 className="font-display text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          Your Career Goal
        </h3>
        <div className="space-y-4">
          <div>
            <Label className="text-sm text-muted-foreground">What career do you want to pursue?</Label>
            <Textarea
              value={careerGoal}
              onChange={(e) => setCareerGoal(e.target.value)}
              placeholder="e.g., Become a Full-Stack Developer specializing in React and Node.js"
              className="mt-1.5 bg-secondary border-border min-h-[80px]"
            />
          </div>
          <div>
            <Label className="text-sm text-muted-foreground">Available study hours per week</Label>
            <Input
              type="number"
              value={studyHours}
              onChange={(e) => setStudyHours(e.target.value)}
              min="1"
              max="80"
              className="mt-1.5 bg-secondary border-border w-32"
            />
          </div>
          <div className="flex gap-3">
            <Button onClick={saveCareerGoal} disabled={savingProfile || !careerGoal.trim()} className="gradient-gold text-primary-foreground">
              {savingProfile ? "Saving..." : "Save Goal"}
            </Button>
            <Button
              onClick={generateSkillBreakdown}
              disabled={isGenerating || !careerGoal.trim()}
              variant="outline"
              className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
            >
              {isGenerating ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
              ) : (
                <><Sparkles className="w-4 h-4 mr-2" /> AI Breakdown</>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Skill Goals */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-lg font-semibold text-foreground">Skill Goals ({goals.length})</h3>
        <Button variant="ghost" size="sm" onClick={() => setShowGoalForm(!showGoalForm)} className="text-primary">
          <Plus className="w-4 h-4 mr-1" /> Add Manually
        </Button>
      </div>

      <AnimatePresence>
        {showGoalForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
            <Card className="bg-card border-border p-5 mb-4">
              <div className="space-y-3">
                <Input
                  placeholder="Skill title"
                  value={newGoalTitle}
                  onChange={(e) => setNewGoalTitle(e.target.value)}
                  className="bg-secondary border-border"
                />
                <Textarea
                  placeholder="Description (optional)"
                  value={newGoalDesc}
                  onChange={(e) => setNewGoalDesc(e.target.value)}
                  className="bg-secondary border-border"
                />
                <div className="flex gap-2">
                  <Button onClick={addManualGoal} disabled={!newGoalTitle.trim()} size="sm" className="gradient-gold text-primary-foreground">
                    Add Goal
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setShowGoalForm(false)}>Cancel</Button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-3">
        {goals.map((goal, i) => (
          <motion.div key={goal.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="bg-card border-border p-5 shadow-card hover:border-primary/30 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <ChevronRight className="w-4 h-4 text-primary" />
                    <h4 className="font-display font-semibold text-foreground">{goal.title}</h4>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      goal.status === "completed" ? "bg-success/20 text-success" :
                      goal.status === "paused" ? "bg-muted text-muted-foreground" :
                      "bg-primary/20 text-primary"
                    }`}>
                      {goal.status}
                    </span>
                  </div>
                  {goal.description && <p className="text-sm text-muted-foreground ml-6">{goal.description}</p>}
                  <div className="ml-6 mt-3">
                    <div className="flex items-center gap-2">
                      <Progress value={Number(goal.progress) || 0} className="flex-1 h-1.5" />
                      <span className="text-xs text-muted-foreground">{Math.round(Number(goal.progress) || 0)}%</span>
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => deleteGoal(goal.id)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          </motion.div>
        ))}
        {goals.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Target className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p>No skill goals yet. Set your career goal and use AI to generate them!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Goals;
