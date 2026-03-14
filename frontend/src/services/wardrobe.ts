import { apiService } from './api';
import { ClothingItem, AIDetectionResult } from '../types';

class WardrobeService {
  async getItems(category?: string): Promise<ClothingItem[]> {
    const endpoint = category ? `/api/wardrobe/items?category=${category}` : '/api/wardrobe/items';
    return apiService.get<ClothingItem[]>(endpoint);
  }

  async getItem(itemId: string): Promise<ClothingItem> {
    return apiService.get<ClothingItem>(`/api/wardrobe/items/${itemId}`);
  }

  async addItem(item: Partial<ClothingItem>): Promise<ClothingItem> {
    return apiService.post<ClothingItem>('/api/wardrobe/items', item);
  }

  async deleteItem(itemId: string): Promise<{ message: string }> {
    return apiService.delete(`/api/wardrobe/items/${itemId}`);
  }

  async detectClothing(imageBase64: string): Promise<AIDetectionResult> {
    return apiService.post<AIDetectionResult>('/api/ai/recognize-clothing', {
      image_base64: imageBase64,
    });
  }

  async generateOutfit(params: any): Promise<any> {
    return apiService.post('/api/ai/generate-outfit', params);
  }
}

export const wardrobeService = new WardrobeService();