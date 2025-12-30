import { User } from "@/lib/db/schema";

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (username: string) => Promise<void>;
  register: (username: string, displayName: string, avatar?: string) => Promise<void>;
  logout: () => void;
}

export interface SessionData {
  userId: string;
  username: string;
  timestamp: number;
}
