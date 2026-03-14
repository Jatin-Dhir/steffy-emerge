// Type Definitions

export interface ClothingItem {
  item_id: string;
  user_id: string;
  category: ClothingCategory;
  name: string;
  image_base64: string;
  color?: string;
  pattern?: string;
  fabric?: string;
  season?: Season;
  style?: StyleCategory;
  tags?: string[];
  created_at: string;
}

export type ClothingCategory = 
  | 'tops'
  | 'bottoms'
  | 'dresses'
  | 'jackets'
  | 'shoes'
  | 'accessories';

export type Season = 'spring' | 'summer' | 'fall' | 'winter' | 'all';

export type StyleCategory = 'casual' | 'formal' | 'streetwear' | 'sport' | 'elegant';

export interface Outfit {
  outfit_id: string;
  user_id: string;
  name: string;
  item_ids: string[];
  ai_generated: boolean;
  description?: string;
  occasion?: string;
  created_at: string;
}

export interface User {
  user_id: string;
  email: string;
  name: string;
  picture?: string;
}

export interface AIDetectionResult {
  category: ClothingCategory;
  name: string;
  color?: string;
  pattern?: string;
  fabric?: string;
  season?: Season;
  style?: StyleCategory;
  confidence?: number;
}

export interface ChatMessage {
  message_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  outfit_suggestion?: string[];
}