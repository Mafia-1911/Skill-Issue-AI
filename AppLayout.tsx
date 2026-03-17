import { useAuth } from "./hooks/useAuth";
import { Navigate, Outlet, useLocation, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Brain, LayoutDashboard, Target, Calendar, BookOpen, LogOut, Settings } from "lucide-react";
import { Button } from "./components/ui/button";

//need to add a way to track sentiments 
// need to make the ui smooth 

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: Target, label: "Goals", path: "/goals" },
  { icon: Calendar, label: "Weekly Plan", path: "/weekly-plan" },
  { icon: BookOpen, label: "Sessions", path: "/sessions" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

const AppLayout = () => {
  const { user, loading, signOut } = useAuth();
  const location = useLocation();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  );
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 flex-col bg-sidebar border-r border-sidebar-border p-4">
        <div className="flex items-center gap-3 px-3 mb-8">
          <div className="w-9 h-9 rounded-xl gradient-gold flex items-center justify-center">
            <Brain className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-display text-lg font-bold text-foreground">SkillForge</span>
        </div>

        <nav className="flex-1 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path}>
                <motion.div
                  whileHover={{ x: 4 }}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-sidebar-accent text-primary"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  }`}
                >
                  <item.icon className="w-4.5 h-4.5" />
                  {item.label}
                </motion.div>
              </Link>
            );
          })}
        </nav>

        <Button
          variant="ghost"
          onClick={signOut}
          className="justify-start gap-3 text-muted-foreground hover:text-destructive px-3"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </Button>
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-sidebar border-b border-sidebar-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg gradient-gold flex items-center justify-center">
            <Brain className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-display text-base font-bold text-foreground">SkillForge</span>
        </div>
        <Button variant="ghost" size="sm" onClick={signOut} className="text-muted-foreground">
          <LogOut className="w-4 h-4" />
        </Button>
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-sidebar border-t border-sidebar-border flex justify-around py-2">
        {navItems.slice(0, 4).map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link key={item.path} to={item.path} className="flex flex-col items-center gap-1 px-3 py-1">
              <item.icon className={`w-5 h-5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
              <span className={`text-[10px] ${isActive ? "text-primary font-medium" : "text-muted-foreground"}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Main content */}
      <main className="flex-1 overflow-auto md:p-8 p-4 pt-20 pb-24 md:pt-8 md:pb-8">
        <div className="max-w-6xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AppLayout;
