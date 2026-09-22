export type Setting = {
  key: string;
  value: string;
  label: string;
  help: string | null;
  type: 'text' | 'longtext' | 'number' | 'bool';
  gruppe: string;
  sort: number;
};

export type Material = {
  id: string;
  name: string;
  price_per_gram: number;
  description: string | null;
  color: string | null;
  active: boolean;
  sort: number;
};

export type WeightRange = {
  id: string;
  label: string;
  min_g: number;
  max_g: number;
  active: boolean;
  sort: number;
};

export type Extra = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  scope: 'item' | 'order';
  active: boolean;
  sort: number;
};

export type DeliveryOption = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  active: boolean;
  sort: number;
};

export type Product = {
  id: string;
  code: string | null;
  name: string;
  description: string | null;
  details?: string | null;
  images?: string[] | null;
  source_url?: string | null;
  price: number;
  image_url: string | null;
  material: string | null;
  weight_g: number | null;
  category: string | null;
  featured: boolean;
  active: boolean;
  sort: number;
  created_at?: string;
};

export type TeamMember = {
  id: string;
  user_id: string | null;
  name: string;
  role: string | null;
  bio: string | null;
  email: string | null;
  avatar_url: string | null;
  show_on_site: boolean;
  sort: number;
};

export type Faq = {
  id: string;
  question: string;
  answer: string;
  active: boolean;
  sort: number;
};

export type Profile = {
  id: string;
  email: string | null;
  name: string | null;
  role: 'eier' | 'medlem' | string;
  created_at?: string;
};

export type Invite = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  status: string;
  created_at: string;
  accepted_at: string | null;
};

export type Example = {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  category: string | null;
  active: boolean;
  sort: number;
};

export type SiteData = {
  settings: Record<string, string>;
  materials: Material[];
  weightRanges: WeightRange[];
  extras: Extra[];
  deliveryOptions: DeliveryOption[];
  products: Product[];
  team: TeamMember[];
  faq: Faq[];
  examples: Example[];
  connected: boolean;
};

export type Task = {
  id: string;
  title: string;
  notes: string | null;
  assigned_to: string | null;
  due_date: string | null;
  priority: 'lav' | 'normal' | 'hoy' | string;
  done: boolean;
  done_at: string | null;
  done_by: string | null;
  created_by: string | null;
  sort: number;
  created_at: string;
};
