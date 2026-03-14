// import { Toaster } from "../components/ui/toaster";
// import { Toaster as Sonner } from "../components/ui/sonner";
// import { TooltipProvider } from "../components/ui/tooltip";
// import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
// import { AuthProvider } from "../hooks/useAuth";
// import Auth from "../pages/Auth";
// import AppLayout from "../components/AppLayout";
import Dashboard from "../pages/Dashboard";
// import Goals from "../pages/Goals";
// import WeeklyPlan from "../pages/WeeklyPlan";
// import Sessions from "../pages/Sessions";
// import SettingsPage from "../pages/Settings";
// import NotFound from "../pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <Dashboard />
  // <QueryClientProvider client={queryClient}>
  //   <TooltipProvider>
  //     <Toaster />
  //     <Sonner />
  //     <BrowserRouter>
  //       <AuthProvider>
  //         <Routes>
  //           <Route path="/auth" element={<Auth />} />
  //           <Route element={<AppLayout />}>
  //             <Route path="/dashboard" element={<Dashboard />} />
  //             <Route path="/goals" element={<Goals />} />
  //             <Route path="/weekly-plan" element={<WeeklyPlan />} />
  //             <Route path="/sessions" element={<Sessions />} />
  //             <Route path="/settings" element={<SettingsPage />} />
  //           </Route>
  //           <Route path="/" element={<Navigate to="/dashboard" replace />} />
  //           <Route path="*" element={<NotFound />} />
  //         </Routes>
  //       </AuthProvider>
  //     </BrowserRouter>
  //   </TooltipProvider>
  // </QueryClientProvider>
);

export default App;
