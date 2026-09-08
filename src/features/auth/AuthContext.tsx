import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

type Role = "participant" | "team" | null;

interface AuthContextType {
  role: Role;
  login: (role: Role) => void;
  logout: () => void;
  isReady: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Load saved role on app startup
    AsyncStorage.getItem("auth_role").then((savedRole) => {
      if (savedRole === "participant" || savedRole === "team") {
        setRoleState(savedRole);
      }
      setIsReady(true);
    });
  }, []);

  const login = async (newRole: Role) => {
    setRoleState(newRole);
    if (newRole) {
      await AsyncStorage.setItem("auth_role", newRole);
    }
  };

  const logout = async () => {
    setRoleState(null);
    await AsyncStorage.removeItem("auth_role");
  };

  return (
    <AuthContext.Provider value={{ role, login, logout, isReady }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
