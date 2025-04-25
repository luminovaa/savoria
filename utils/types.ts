export type User = {
    id?: string;
    email?: string;
    created_at?: string;
    name?: string;
    password?: string;
    last_sign_in_at?: string;
    
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
    id: string;
    name: string;
  };