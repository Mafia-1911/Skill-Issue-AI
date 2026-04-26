import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Zap, Brain, MessageCircle, Check, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const moodEmojis = [
  { score: 1, emoji: "😫", label: "Burnt Out", color: "bg-destructive/20 border-destructive/40 text-destructive" },
  { score: 2, emoji: "😔", label: "Struggling", color: "bg-orange-500/20 border-orange-500/40 text-orange-400" },
  { score: 3, emoji: "😐", label: "Neutral", color: "bg-muted border-border text-muted-foreground" },
  { score: 4, emoji: "😊", label: "Good", color: "bg-info/20 border-info/40 text-info" },
  { score: 5, emoji: "🔥", label: "Energized", color: "bg-success/20 border-success/40 text-success" },
];

const energyLevels = [
  { score: 1, icon: TrendingDown, label: "Very Low" },
  { score: 2, icon: TrendingDown, label: "Low" },
  { score: 3, icon: Minus, label: "Moderate" },
  { score: 4, icon: TrendingUp, label: "High" },
  { score: 5, icon: TrendingUp, label: "Very High" },
];

interface MoodCheckinProps {
  onComplete?: () => void;
  compact?: boolean;
}

const MoodCheckin = ({ onComplete, compact = false }: MoodCheckinProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [mood, setMood] = useState<number>(0);
  const [energy, setEnergy] = useState<number>(0);
  const [stress, setStress] = useState<number>(0);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!user || !mood || !energy || !stress) return;
    setSubmitting(true);

    const { error } = await supabase.from("mood_checkins").insert({
      user_id: user.id,
      mood_score: mood,
      energy_level: energy,
      stress_level: stress,
      note: note || null,
    });

    if (error) {
      toast({ title: "Error", description: "Could not save check-in", variant: "destructive" });
    } else {
      setSubmitted(true);
      toast({ title: "Check-in saved!", description: "Your mood data will help optimize your schedule" });
      onComplete?.();
    }
    setSubmitting(false);
  };

  if (submitted) {
    return (
      <Card className="bg-card border-border p-6 shadow-card">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center py-4">
          <div className="w-12 h-12 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-3">
            <Check className="w-6 h-6 text-success" />
          </div>
          <p className="font-display font-semibold text-foreground">Feeling noted!</p>
          <p className="text-sm text-muted-foreground mt-1">Your schedule will adapt accordingly</p>
        </motion.div>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border p-6 shadow-card">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl bg-accent/20 flex items-center justify-center">
          <Heart className="w-4.5 h-4.5 text-accent" />
        </div>
        <div>
          <h3 className="font-display font-semibold text-foreground text-base">How are you feeling?</h3>
          <p className="text-xs text-muted-foreground">Help us adjust your study load</p>
        </div>
      </div>

      {/* Mood */}
      <div className="mb-5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">Mood</label>
        <div className="flex gap-2">
          {moodEmojis.map((m) => (
            <motion.button
              key={m.score}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setMood(m.score)}
              className={`flex-1 flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 transition-all cursor-pointer ${
                mood === m.score ? m.color : "bg-secondary/50 border-transparent text-muted-foreground"
              }`}
            >
              <span className="text-xl">{m.emoji}</span>
              <span className="text-[10px] font-medium">{m.label}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Energy */}
      <div className="mb-5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block flex items-center gap-1.5">
          <Zap className="w-3 h-3" /> Energy Level
        </label>
        <div className="flex gap-2">
          {energyLevels.map((e) => (
            <motion.button
              key={e.score}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setEnergy(e.score)}
              className={`flex-1 p-2 rounded-lg border text-center text-xs font-medium transition-all cursor-pointer ${
                energy === e.score
                  ? "bg-primary/20 border-primary/40 text-primary"
                  : "bg-secondary/50 border-transparent text-muted-foreground"
              }`}
            >
              {e.label}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Stress */}
      <div className="mb-5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block flex items-center gap-1.5">
          <Brain className="w-3 h-3" /> Stress Level
        </label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((s) => (
            <motion.button
              key={s}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setStress(s)}
              className={`flex-1 p-2 rounded-lg border text-center text-xs font-medium transition-all cursor-pointer ${
                stress === s
                  ? s >= 4 ? "bg-destructive/20 border-destructive/40 text-destructive"
                    : s >= 3 ? "bg-warning/20 border-warning/40 text-warning"
                    : "bg-success/20 border-success/40 text-success"
                  : "bg-secondary/50 border-transparent text-muted-foreground"
              }`}
            >
              {s <= 2 ? "Low" : s === 3 ? "Med" : s === 4 ? "High" : "Max"}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Note */}
      {!compact && (
        <div className="mb-5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block flex items-center gap-1.5">
            <MessageCircle className="w-3 h-3" /> Note (optional)
          </label>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Anything on your mind? Struggling with a topic?"
            className="bg-secondary/50 border-border text-sm min-h-[60px] resize-none"
            maxLength={500}
          />
        </div>
      )}

      <Button
        onClick={handleSubmit}
        disabled={!mood || !energy || !stress || submitting}
        className="w-full gradient-gold text-primary-foreground shadow-glow"
      >
        {submitting ? "Saving..." : "Log Check-in"}
      </Button>
    </Card>
  );
};

export default MoodCheckin;
