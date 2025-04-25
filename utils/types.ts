export type User = {
    id?: string;
    email?: string;
    created_at?: string;
    name?: string;
    password?: string;
    last_sign_in_at?: string;
    role: Role | Role[];
}

export type UserList = {
    id: string;
    email: string;
    last_sign_in_at?: string;
    first_name?: string;
    last_name?: string;
    role?: Role;
    role_name?: string;
};

export type ProfileWithRole = {
    id: string;
    first_name?: string;
    last_name?: string;
    role_id?: string;
    role?: { name: string };  // This matches the structure from your Supabase query
  }

export type Shop = {
    id?: string;
    name?: string;
    address?: string;
    created_at?: Date;
    updated_at?: Date;
    phone?: string;
}

export type Role = {
    id: number;
    name: string;
};

export type  MenuItem = {
  id: number;
  name_menu: string;
  description: string;
  price: number;
  category_id: number;
  images: string;
  promo: boolean;
  promo_price: number | null;
  promo_start: string | null;
  promo_end: string | null;
  created_at: string;
  updated_at: string;
  isAddButton?: boolean;
}