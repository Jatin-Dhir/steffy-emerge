# Steffy Assistance – Smart AI Wardrobe

## Product Overview
Steffy Assistance is a modern AI-powered mobile wardrobe management application that helps users organize their clothing, generate AI outfit recommendations, and plan their daily looks with style.

## Tech Stack
- **Frontend**: Expo / React Native with TypeScript
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **AI Integration**: OpenAI GPT-5.2 via Emergent LLM Key
- **Authentication**: Emergent Google OAuth

## Core Features

### 1. Authentication
- **Google Social Login** via Emergent Auth
- Session-based authentication with 7-day expiry
- Seamless login experience across web and mobile

### 2. Dashboard
- Welcome screen with user personalization
- Wardrobe statistics (total items, outfits)
- Quick actions for common tasks
- Wardrobe overview by category
- Recent outfits display
- Virtual try-on placeholder (MVP: shows upload prompt)

### 3. Wardrobe Management
- **Add Clothing Items**:
  - Photo upload from device gallery
  - AI-powered image recognition (auto-categorizes clothing)
  - Manual category selection (tops, bottoms, dresses, jackets, shoes, accessories)
  - Color and season tagging
- **View Items**:
  - Category filter tabs
  - Grid layout with beautiful images
  - Item detail modal
- **Delete Items**: Confirmation before deletion

### 4. AI-Powered Features
- **Image Recognition**:
  - Automatically detects clothing type
  - Suggests category, name, color, and season
  - Uses OpenAI Vision API
  
- **Outfit Generation**:
  - AI creates outfit combinations from wardrobe
  - Customizable with occasion, weather, preferences
  - Multiple outfit suggestions per generation
  - Save AI-generated outfits to collection

### 5. Looks (Outfit Collections)
- View all saved outfits
- AI-generated outfit badge
- Outfit detail view showing all items
- Delete outfits with confirmation
- Visual outfit preview with item images

### 6. Calendar (Coming Soon)
- Placeholder screen with feature preview
- Will allow daily outfit planning
- Weather integration planned
- Reminder notifications planned

### 7. Settings
- User profile display
- Account management options
- Preferences (theme, language) - coming soon
- Help & support information
- Logout functionality

## Design System

### Liquid Glass UI
- **Background**: Dark gradient (black to purple-pink)
- **Cards**: Translucent glass effect with blur
- **Colors**:
  - Primary: #FF6B9D (pink)
  - Secondary: #C44569 (dark pink)
  - Accent: #FFA07A (coral)
  - Background: #0A0A0F (near black)
  - Surface: #1A1A2E (dark blue-gray)
  
### Visual Elements
- Floating SVG icons on landing page
- Smooth animations and transitions
- Gradient buttons
- Category chips with icons
- Glass cards with subtle borders

### Navigation
- Bottom tab navigation with 5 tabs
- Platform-specific tab bar height
- Icon-based navigation

## API Endpoints

### Authentication
- `POST /api/auth/session` - Exchange session_id for token
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout user

### Wardrobe
- `POST /api/wardrobe/items` - Add clothing item
- `GET /api/wardrobe/items` - Get all items (with category filter)
- `GET /api/wardrobe/items/{item_id}` - Get single item
- `DELETE /api/wardrobe/items/{item_id}` - Delete item

### AI Features
- `POST /api/ai/recognize-clothing` - Recognize clothing from image
- `POST /api/ai/generate-outfit` - Generate AI outfit recommendations

### Outfits
- `POST /api/outfits` - Create outfit
- `GET /api/outfits` - Get all outfits
- `GET /api/outfits/{outfit_id}` - Get single outfit
- `DELETE /api/outfits/{outfit_id}` - Delete outfit

### Calendar (Endpoints exist, UI coming soon)
- `POST /api/calendar` - Schedule outfit
- `GET /api/calendar` - Get scheduled outfits
- `DELETE /api/calendar/{calendar_id}` - Remove scheduled outfit

## Data Models

### User
```typescript
{
  user_id: string;
  email: string;
  name: string;
  picture?: string;
  created_at: datetime;
}
```

### ClothingItem
```typescript
{
  item_id: string;
  user_id: string;
  category: string; // tops, bottoms, dresses, jackets, shoes, accessories
  name: string;
  image_base64: string; // Base64 encoded image
  color?: string;
  season?: string; // spring, summer, fall, winter, all
  created_at: datetime;
}
```

### Outfit
```typescript
{
  outfit_id: string;
  user_id: string;
  name: string;
  item_ids: string[];
  ai_generated: boolean;
  description?: string;
  created_at: datetime;
}
```

## Image Handling
- All images stored as base64 in MongoDB
- Supports JPEG, PNG, WEBP formats
- Images compressed to 70% quality on upload
- Aspect ratio 3:4 for clothing items

## AI Integration
- **Provider**: OpenAI GPT-5.2
- **Key**: Emergent LLM Key (universal key)
- **Use Cases**:
  1. Image recognition for clothing categorization
  2. Outfit generation based on wardrobe items
  3. Style recommendations

## Mobile Features
- Cross-platform (iOS, Android, Web)
- Photo gallery access with permissions
- Touch-optimized UI (44px minimum touch targets)
- Responsive layouts for different screen sizes
- Platform-specific navigation behavior

## Future Enhancements (Roadmap)
1. **3D Avatar & Virtual Try-On**:
   - User photo upload
   - AI avatar generation
   - Clothing overlay on 3D model
   
2. **Calendar Integration**:
   - Daily outfit planning
   - Weather API integration
   - Push notifications for reminders
   
3. **Social Features**:
   - Share outfits with friends
   - Fashion community
   - Outfit inspiration feed
   
4. **Advanced AI**:
   - Style analysis
   - Shopping recommendations
   - Trend predictions

## Environment Variables

### Backend (.env)
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=test_database
EMERGENT_LLM_KEY=sk-emergent-xxxxx
```

### Frontend (.env)
```
EXPO_PUBLIC_BACKEND_URL=https://ai-fashion-stylist-3.preview.emergentagent.com
EXPO_PACKAGER_PROXY_URL=https://ai-fashion-stylist-3.preview.emergentagent.com
EXPO_PACKAGER_HOSTNAME=your-app.preview.emergentagent.com
```

## Testing Strategy
1. Backend API testing with curl
2. Authentication flow testing
3. Image upload and recognition testing
4. AI outfit generation testing
5. Frontend UI/UX testing
6. Cross-platform compatibility testing

## Success Metrics
- User can successfully authenticate
- User can add items to wardrobe with AI recognition
- AI can generate relevant outfit recommendations
- All CRUD operations work smoothly
- UI is responsive and beautiful
- No critical errors or crashes
