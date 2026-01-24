import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

/* ================= TYPES ================= */

export type UserProfile = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  role: string | null;
  email: string | null; // lấy từ auth.session
};

type AuthContextType = {
  user: UserProfile | null;
  userId: string | null;
  isLoggedIn: boolean;
  loading: boolean;
  refreshUser: () => Promise<void>;
};

/* ================= CONTEXT ================= */

const AuthContext = createContext<AuthContextType>({
  user: null,
  userId: null,
  isLoggedIn: false,
  loading: true,
  refreshUser: async () => {},
});

/* ================= PROVIDER ================= */

export const AuthProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  /* ===== FETCH PROFILE ===== */
  const fetchUserProfile = async (userId: string, email: string | null) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, full_name, avatar_url, role")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Fetch profile error:", error);
      setUser(null);
      return;
    }

    setUser({
      ...data,
      email, // ✅ gắn email từ auth
    });
  };

  /* ===== REFRESH USER ===== */
  const refreshUser = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const authUser = session?.user;

    if (!authUser) {
      setUser(null);
      return;
    }

    await fetchUserProfile(authUser.id, authUser.email ?? null);
  };

  /* ===== INIT + AUTH LISTENER ===== */
  useEffect(() => {
    // 1️⃣ Init session
    supabase.auth.getSession().then(async ({ data }) => {
      const authUser = data.session?.user;

      if (authUser) {
        await fetchUserProfile(authUser.id, authUser.email ?? null);
      } else {
        setUser(null);
      }

      setLoading(false);
    });

    // 2️⃣ Listen auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const authUser = session?.user;

      if (authUser) {
        await fetchUserProfile(authUser.id, authUser.email ?? null);
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  /* ================= PROVIDER VALUE ================= */

  return (
    <AuthContext.Provider
      value={{
        user,
        userId: user?.id ?? null,
        isLoggedIn: !!user,
        loading,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

/* ================= HOOK ================= */

export const useAuth = () => useContext(AuthContext);
