import { User } from 'firebase/auth';

export interface UserInfo {
  userId: string;
  username: string;
  email: string;
  createdAt?: string;
  deleted?: boolean;
  deletedAt?: string;
  provider?: 'email' | 'google' | 'apple';
  photoURL?: string;
}

export interface Task {
  uid: string;
  id: number;
  labelTask: string;
  date: string;
  label: string | number;
  /** @deprecated Use diaperType instead. Kept for backward compatibility with existing data. */
  idCaca?: string | number;
  /** Type of diaper consistency: 0 = solid, 1 = soft, 2 = liquid */
  diaperType?: number;
  /** Content of diaper: 0 = pee, 1 = poop, 2 = both (optional) */
  diaperContent?: number;
  boobLeft?: number;
  boobRight?: number;
  user: string;
  createdBy: string;
  comment: string;
}

export interface Baby {
  id: string;
  type: 'Boy' | 'Girl';
  name: string;
  birthDate: string;
  profilePhoto?: string; // URL Firebase Storage
  height?: number; // en cm
  weight?: number; // en kg (avec décimales)
  CreatedDate: string;
  user: string[];
  admin: string;
  userName: string;
  userEmail: string;
  tasks: Task[];
}

export interface AuthUserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  babyID: string | null;
  setBabyID: (id: string | null) => void;
  userInfo: UserInfo | null;
  setUserInfo: (info: UserInfo | null) => void;
  usersList: string[];
  setUsersList: (list: string[]) => void;
  selectedCategoryFilter: number | null;
  setSelectedCategoryFilter: (filter: number | null) => void;
}
