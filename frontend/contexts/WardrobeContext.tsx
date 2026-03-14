import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import Constants from 'expo-constants';

const BACKEND_URL =
  Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL ||
  process.env.EXPO_PUBLIC_BACKEND_URL ||
  'http://127.0.0.1:3001';

export interface ClothingItem {
  item_id: string;
  user_id: string;
  category: string;
  name: string;
  image_base64: string;
  color?: string;
  season?: string;
  fabric?: string;
  pattern?: string;
  fit?: string;
  occasion?: string;
  created_at: string;
}

export interface Outfit {
  outfit_id: string;
  user_id: string;
  name: string;
  item_ids: string[];
  ai_generated: boolean;
  description?: string;
  created_at: string;
}

export interface UserProfile {
  user_id: string;
  avatar_image_base64?: string;
  body_photo_base64?: string;
  body_type?: string;
  body_analysis?: {
    body_type?: string;
    height_range?: string;
    skin_tone?: string;
    build?: string;
    styling_tips?: string[];
  };
  style_preferences?: string[];
  favorite_colors?: string[];
}

export interface TryOnResult {
  type: 'description' | 'image';
  description: string;
  outfit_description: string;
  items: { name: string; category: string }[];
  note?: string;
  image_base64?: string;
}

interface WardrobeContextType {
  items: ClothingItem[];
  outfits: Outfit[];
  profile: UserProfile | null;
  loading: boolean;
  fetchItems: () => Promise<void>;
  fetchOutfits: () => Promise<void>;
  fetchProfile: () => Promise<void>;
  addItem: (item: Partial<ClothingItem>) => Promise<ClothingItem | null>;
  deleteItem: (itemId: string) => Promise<void>;
  addOutfit: (outfit: Partial<Outfit>) => Promise<Outfit | null>;
  deleteOutfit: (outfitId: string) => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  recognizeClothing: (imageBase64: string) => Promise<any>;
  generateOutfitAI: (params: any) => Promise<any>;
  tryOnOutfit: (params: { outfitId?: string; itemIds?: string[]; bodyPhoto?: string }) => Promise<TryOnResult | null>;
}

const WardrobeContext = createContext<WardrobeContextType | undefined>(undefined);

export function WardrobeProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchItems();
    fetchOutfits();
    fetchProfile();
  }, []);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${BACKEND_URL}/api/wardrobe/items`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setItems(data);
      }
    } catch {
      // Backend unavailable — keep empty state
    } finally {
      setLoading(false);
    }
  };

  const fetchOutfits = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/outfits`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setOutfits(data);
      }
    } catch {
      // Backend unavailable
    }
  };

  const fetchProfile = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/profile`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setProfile(data);
      }
    } catch {
      // Backend unavailable
    }
  };

  const addItem = async (item: Partial<ClothingItem>): Promise<ClothingItem | null> => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/wardrobe/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
        credentials: 'include',
      });
      if (response.ok) {
        const newItem = await response.json();
        setItems((prev) => [...prev, newItem]);
        return newItem;
      }
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || response.statusText || 'Failed to add item');
    } catch (error) {
      throw error;
    }
  };

  const deleteItem = async (itemId: string) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/wardrobe/items/${itemId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (response.ok) {
        setItems((prev) => prev.filter((item) => item.item_id !== itemId));
      }
    } catch {
      // Silently fail
    }
  };

  const addOutfit = async (outfit: Partial<Outfit>): Promise<Outfit | null> => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/outfits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(outfit),
        credentials: 'include',
      });
      if (response.ok) {
        const newOutfit = await response.json();
        setOutfits((prev) => [...prev, newOutfit]);
        return newOutfit;
      }
    } catch {
      // Silently fail
    }
    return null;
  };

  const deleteOutfit = async (outfitId: string) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/outfits/${outfitId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (response.ok) {
        setOutfits((prev) => prev.filter((o) => o.outfit_id !== outfitId));
      }
    } catch {
      // Silently fail
    }
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include',
      });
      if (response.ok) {
        const updated = await response.json();
        setProfile(updated);
      }
    } catch {
      // Silently fail
    }
  };

  const recognizeClothing = async (imageBase64: string): Promise<any> => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/ai/recognize-clothing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_base64: imageBase64 }),
        credentials: 'include',
      });
      const data = await response.json();
      if (response.ok && !data.error) {
        return data;
      }
    } catch {
      // AI unavailable
    }
    return null;
  };

  const generateOutfitAI = async (params: any): Promise<any> => {
    const response = await fetch(`${BACKEND_URL}/api/ai/generate-outfit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
      credentials: 'include',
    });
    const data = await response.json().catch(() => ({}));
    if (response.ok) return data;
    throw new Error(data.detail || 'AI outfit generation failed');
  };

  const tryOnOutfit = async ({
    outfitId,
    itemIds,
    bodyPhoto,
  }: {
    outfitId?: string;
    itemIds?: string[];
    bodyPhoto?: string;
  }): Promise<TryOnResult | null> => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/ai/try-on`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outfit_id: outfitId,
          item_ids: itemIds,
          body_photo_base64: bodyPhoto,
        }),
        credentials: 'include',
      });
      const data = await response.json().catch(() => null);
      if (response.ok && data) return data as TryOnResult;
    } catch {
      // AI unavailable
    }
    return null;
  };

  return (
    <WardrobeContext.Provider
      value={{
        items,
        outfits,
        profile,
        loading,
        fetchItems,
        fetchOutfits,
        fetchProfile,
        addItem,
        deleteItem,
        addOutfit,
        deleteOutfit,
        updateProfile,
        recognizeClothing,
        generateOutfitAI,
        tryOnOutfit,
      }}
    >
      {children}
    </WardrobeContext.Provider>
  );
}

export function useWardrobe() {
  const context = useContext(WardrobeContext);
  if (context === undefined) {
    throw new Error('useWardrobe must be used within a WardrobeProvider');
  }
  return context;
}
