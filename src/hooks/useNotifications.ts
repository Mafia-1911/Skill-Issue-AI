// src/hooks/useNotifications.ts
// NEW FEATURE: In-app notification system
// Reads from a "notifications" table in Supabase (schema below)
// Also triggers browser push notifications if permission is granted.
//
// Required Supabase table:
// CREATE TABLE notifications (
//   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
//   user_id UUID REFERENCES auth.users NOT NULL,
//   title TEXT NOT NULL,
//   body TEXT,
//   type TEXT DEFAULT 'info', -- 'info' | 'success' | 'warning' | 'reminder'
//   read BOOLEAN DEFAULT false,
//   link TEXT, -- optional route to navigate to on click
//   created_at TIMESTAMPTZ DEFAULT now()
// );
// ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
// CREATE POLICY "Users see own notifications" ON notifications FOR ALL USING (auth.uid() = user_id);

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface AppNotification {
  id: string;
  title: string;
  body?: string;
  type: "info" | "success" | "warning" | "reminder";
  read: boolean;
  link?: string;
  created_at: string;
}

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    const list = (data || []) as AppNotification[];
    setNotifications(list);
    setUnreadCount(list.filter((n) => !n.read).length);
    setLoading(false);
  }, [user]);

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("notifications:" + user.id)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const n = payload.new as AppNotification;
          setNotifications((prev) => [n, ...prev]);
          setUnreadCount((c) => c + 1);

          // Browser push notification
          if (Notification.permission === "granted") {
            new Notification(n.title, {
              body: n.body,
              icon: "/favicon.ico",
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  const markAllRead = async () => {
    if (!user) return;
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const deleteNotification = async (id: string) => {
    await supabase.from("notifications").delete().eq("id", id);
    setNotifications((prev) => {
      const filtered = prev.filter((n) => n.id !== id);
      setUnreadCount(filtered.filter((n) => !n.read).length);
      return filtered;
    });
  };

  const requestPushPermission = async () => {
    if ("Notification" in window) {
      await Notification.requestPermission();
    }
  };

  return {
    notifications,
    unreadCount,
    loading,
    markRead,
    markAllRead,
    deleteNotification,
    requestPushPermission,
    refetch: fetchNotifications,
  };
}
