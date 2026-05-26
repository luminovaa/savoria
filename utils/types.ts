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
  wifi_name?: string;
  wifi_password?: string;
}

export type Role = {
  id: number;
  name: string;
};

export type MenuItem = {
  id: number;
  name_menu: string;
  description?: string;
  price: number;
  category_id?: number;
  images: string;
  promo: boolean;
  stock?: number;
  promo_price: number | null;
  promo_start?: string | null;
  promo_end?: string | null;
  created_at?: string;
  updated_at?: string;
  is_deleted?: boolean;
  is_archive?: boolean;
  isAddButton?: boolean;
  category?: Category
}

export type Category = {
  id: number;
  name_category: string;
  created_at: string;
  updated_at: string;
};

export type Order = {
  id: string;
  created_at: string;
  invoice_number: string;
  total: number;
  total_amount: number;
  payment_type: string;
  status: string;
  user_id: string;


};

export type OrderDetail = {
  id: string;
  created_at: string;
  invoice_number: string;
  total: number;
  customer: string;
  total_amount: number;
  payment_type: string;
  status: string;
  user_id: string; paid: number,
  changes: number
  user?: {
    email: string;
    first_name: string;
    last_name: string;
  };
};

export type OrderItem = {
  id: string;
  order_id: string;
  menu_id: string;
  quantity: number;
  subtotal: number;
  price: number;
  menu?: MenuItem
};

export type Member = {
  id: string;
  name_member: string;
  percent: number;
  created_at: string;
  is_deleted?: boolean;
}