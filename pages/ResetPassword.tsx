import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Navigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, ArrowRight, Sparkles, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

// Google SVG icon 
const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);

type View = "login" | "signup" | "forgot";

const Auth = () => {
  const { user, loading, signIn, signUp } = useAuth();
  const [view, setView] = useState<View>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;

  
  // ── Email/Password submit ────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    if (view === "login") {
      const { error } = await signIn(email, password);
      if (error) {
        toast({
          title: "Login failed",
          description: error.message,
          variant: "destructive",
        });
      }
    } else if (view === "signup") {
      const { error } = await signUp(email, password, fullName);
      if (error) {
        toast({
          title: "Sign up failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Check your email",
          description: "We sent you a confirmation link.",
        });
      }
    }

    setSubmitting(false);
  };
    // ── Google OAuth ─────────────────────────────────────────────────────────
  const handleGoogleSignIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      toast({
        title: "Google sign-in failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };


  // ── Forgot password ──────────────────────────────────────────────────────
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      toast({
        title: "Reset failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Reset link sent",
        description: "Check your email for a password reset link.",
      });
      setView("login");
      setEmail("");
    }

    setSubmitting(false);
  };
  
  // ── Helpers ──────────────────────────────────────────────────────────────
  const isLogin = view === "login";
  const isForgot = view === "forgot";

  const headingText = {
    login: "Welcome back",
    signup: "Create your account",
    forgot: "Reset your password",
  }[view];

  const subText = {
    login: "Sign in to continue your learning journey",
    signup: "Start building your skills with AI guidance",
    forgot: "Enter your email and we'll send you a reset link",
  }[view];

  
  return (
    <div className="min-h-screen flex bg-background">
      {/* ── Left branding panel  ─────────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center">
        <div className="absolute inset-0 gradient-glow" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 text-center px-12"
        >
          <div className="inline-flex items-center gap-3 mb-8">
            <div className="w-14 h-14 rounded-2xl gradient-gold flex items-center justify-center shadow-glow">
              <Brain className="w-8 h-8 text-primary-foreground" />
            </div>
            <span className="font-display text-3xl font-bold text-foreground">
              Skill-Issue
            </span>
          </div>
          <h1 className="font-display text-5xl font-bold text-foreground mb-6 leading-tight">
            AI-Powered
            <br />
            <span className="text-gradient">Skill Building</span>
            <br />
            Manager
          </h1>
          <p className="text-muted-foreground text-lg max-w-md mx-auto">
            Define your career goals. Let AI create your personalized learning
            path. Track progress with intelligent scheduling.
          </p>

          <div className="mt-12 flex items-center gap-6 justify-center">
            {["Smart Planning", "Auto-Scheduling", "AI Guidance"].map(
              (feature, i) => (
                <motion.div
                  key={feature}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + i * 0.15 }}
                  className="flex items-center gap-2 text-muted-foreground"
                >
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-sm">{feature}</span>
                </motion.div>
              ),
            )}
          </div>
        </motion.div>
      </div>
