import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../integrations/supabase/client";
import { motion } from "framer-motion";
import { Settings as SettingsIcon, User, Clock, Save } from "lucide-react";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { useToast } from "../hooks/use-toast";

const SettingsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [fullName, setFullName] = useState("");
  const [studyHours, setStudyHours] = useState("10");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("user_id", user.id).single().then(({ data }) => {
      if (data) {
        setFullName(data.full_name || "");
        setStudyHours(String(data.available_hours_per_week || 10));
      }
    });
  }, [user]);

  const saveSettings = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      full_name: fullName.trim(),
      available_hours_per_week: Number(studyHours) || 10,
    }).eq("user_id", user.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Settings saved!" });
    }
    setSaving(false);
  };

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="font-display text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your profile and preferences</p>
      </motion.div>

      <Card className="bg-card border-border p-6 shadow-card max-w-lg">
        <h3 className="font-display text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
          <User className="w-5 h-5 text-primary" /> Profile
        </h3>
        <div className="space-y-5">
          <div>
            <Label className="text-sm text-muted-foreground">Email</Label>
            <Input value={user?.email || ""} disabled className="mt-1.5 bg-muted border-border" />
          </div>
          <div>
            <Label className="text-sm text-muted-foreground">Full Name</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1.5 bg-secondary border-border" />
          </div>
          <div>
            <Label className="text-sm text-muted-foreground flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> Available study hours per week
            </Label>
            <Input
              type="number"
              value={studyHours}
              onChange={(e) => setStudyHours(e.target.value)}
              min="1"
              max="80"
              className="mt-1.5 bg-secondary border-border w-32"
            />
          </div>
          <Button onClick={saveSettings} disabled={saving} className="gradient-gold text-primary-foreground shadow-glow">
            <Save className="w-4 h-4 mr-2" /> {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default SettingsPage;
