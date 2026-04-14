from fastapi import FastAPI, APIRouter, HTTPException, Header, Response, Request, Depends
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import json
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import asyncio
import base64
import io
from passlib.context import CryptContext
import google.generativeai as genai

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'test_database')
gemini_api_key = os.environ.get('GEMINI_API_KEY', '')
hf_token = os.environ.get('HF_TOKEN', '')
password_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=3000, connectTimeoutMS=3000)
db = client[db_name]

if gemini_api_key:
    genai.configure(api_key=gemini_api_key)

_GEMINI_MODELS = ["gemini-2.5-flash-lite", "gemini-2.0-flash-lite", "gemini-2.0-flash"]
gemini_model = genai.GenerativeModel(_GEMINI_MODELS[0]) if gemini_api_key else None

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

async def _gemini_generate(prompt, images=None):
    """Try multiple Gemini models, falling back on quota errors."""
    for model_name in _GEMINI_MODELS:
        try:
            model = genai.GenerativeModel(model_name)
            content = [prompt] + (images or [])
            result = await asyncio.to_thread(model.generate_content, content)
            return result
        except Exception as e:
            if '429' in str(e) or 'quota' in str(e).lower():
                logger.warning(f"Quota exceeded for {model_name}, trying next model")
                continue
            raise
    raise Exception("All Gemini models quota exceeded. Please wait a minute and try again.")

_memory_items: Dict[str, List[dict]] = {}
_memory_outfits: Dict[str, List[dict]] = {}
_memory_profiles: Dict[str, dict] = {}
_memory_calendar: Dict[str, List[dict]] = {}

app = FastAPI()

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Unhandled error: {exc}")
    return JSONResponse(status_code=500, content={"detail": str(exc)})

api_router = APIRouter(prefix="/api")

# ============================================================
# Models
# ============================================================

class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    created_at: datetime

class LoginRequest(BaseModel):
    email: str
    password: str

class RegisterRequest(BaseModel):
    email: str
    password: str
    name: str

class ClothingItem(BaseModel):
    item_id: str
    user_id: str
    category: str
    name: str
    image_base64: str
    color: Optional[str] = None
    season: Optional[str] = None
    fabric: Optional[str] = None
    pattern: Optional[str] = None
    fit: Optional[str] = None
    occasion: Optional[str] = None
    created_at: datetime

class ClothingItemCreate(BaseModel):
    category: str
    name: str
    image_base64: str
    color: Optional[str] = None
    season: Optional[str] = None
    fabric: Optional[str] = None
    pattern: Optional[str] = None
    fit: Optional[str] = None
    occasion: Optional[str] = None

class Outfit(BaseModel):
    outfit_id: str
    user_id: str
    name: str
    item_ids: List[str]
    created_at: datetime
    ai_generated: bool = False
    description: Optional[str] = None

class OutfitCreate(BaseModel):
    name: str
    item_ids: List[str]
    ai_generated: bool = False
    description: Optional[str] = None

class CalendarOutfit(BaseModel):
    calendar_id: str
    user_id: str
    date: str
    outfit_id: str
    created_at: datetime

class CalendarOutfitCreate(BaseModel):
    date: str
    outfit_id: str

class AIOutfitRequest(BaseModel):
    occasion: Optional[str] = None
    weather: Optional[str] = None
    preferences: Optional[str] = None

class ImageRecognitionRequest(BaseModel):
    image_base64: str

class TryOnRequest(BaseModel):
    outfit_id: Optional[str] = None
    item_ids: Optional[List[str]] = None
    body_photo_base64: Optional[str] = None

class UserProfile(BaseModel):
    user_id: str
    avatar_image_base64: Optional[str] = None
    body_photo_base64: Optional[str] = None
    body_type: Optional[str] = None
    body_analysis: Optional[Dict[str, Any]] = None  # AI-analyzed: shape, height_range, skin_tone, etc.
    style_preferences: Optional[List[str]] = None
    favorite_colors: Optional[List[str]] = None
    updated_at: datetime

class UserProfileUpdate(BaseModel):
    avatar_image_base64: Optional[str] = None
    body_photo_base64: Optional[str] = None
    body_type: Optional[str] = None
    body_analysis: Optional[Dict[str, Any]] = None
    style_preferences: Optional[List[str]] = None
    favorite_colors: Optional[List[str]] = None

class ChatMessage(BaseModel):
    message_id: str
    user_id: str
    role: str
    content: str
    created_at: datetime

class ChatRequest(BaseModel):
    message: str
    context: Optional[Dict[str, Any]] = None

class GenerateOutfitImageRequest(BaseModel):
    outfit_id: str

# ============================================================
# Auth helpers
# ============================================================

DEMO_USER = User(
    user_id="demo_user",
    email="demo@steffy.app",
    name="Fashion Lover",
    picture=None,
    created_at=datetime.now(timezone.utc),
)

async def get_current_user(
    request: Request,
    authorization: Optional[str] = Header(None)
) -> User:
    try:
        session_token = None
        if authorization and authorization.startswith("Bearer "):
            session_token = authorization.replace("Bearer ", "")
        if not session_token:
            session_token = request.cookies.get("session_token")
        if not session_token:
            return DEMO_USER
        session = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
    except Exception:
        return DEMO_USER

    if not session:
        return DEMO_USER

    expires_at = session.get("expires_at")
    if expires_at:
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at < datetime.now(timezone.utc):
            return DEMO_USER

    try:
        user_doc = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    except Exception:
        return DEMO_USER

    if not user_doc:
        return DEMO_USER
    return User(**user_doc)

# ============================================================
# Auth endpoints
# ============================================================

@api_router.post("/auth/register")
async def register(response: Response, request: RegisterRequest):
    try:
        existing_user = await db.users.find_one({"email": request.email.lower()})
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered")
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        password_hash = password_context.hash(request.password)
        user_doc = {
            "user_id": user_id, "email": request.email.lower(), "name": request.name,
            "picture": None, "password_hash": password_hash,
            "created_at": datetime.now(timezone.utc)
        }
        await db.users.insert_one(user_doc)
        session_token = uuid.uuid4().hex
        await db.user_sessions.insert_one({
            "user_id": user_id, "session_token": session_token,
            "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
            "created_at": datetime.now(timezone.utc)
        })
        response.set_cookie(key="session_token", value=session_token, httponly=True,
                            secure=False, samesite="lax", max_age=7*24*60*60, path="/")
        return {"user_id": user_id, "email": request.email.lower(), "name": request.name,
                "picture": None, "session_token": session_token}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration error: {e}")
        raise HTTPException(status_code=500, detail="Registration failed")

@api_router.post("/auth/login")
async def login(response: Response, request: LoginRequest):
    try:
        user_doc = await db.users.find_one({"email": request.email.lower()})
        if not user_doc:
            raise HTTPException(status_code=401, detail="Invalid email or password")
        password_hash = user_doc.get("password_hash")
        if not password_hash:
            raise HTTPException(status_code=401, detail="Account uses external login.")
        if not password_context.verify(request.password, password_hash):
            raise HTTPException(status_code=401, detail="Invalid email or password")
        user_id = user_doc["user_id"]
        session_token = uuid.uuid4().hex
        await db.user_sessions.insert_one({
            "user_id": user_id, "session_token": session_token,
            "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
            "created_at": datetime.now(timezone.utc)
        })
        response.set_cookie(key="session_token", value=session_token, httponly=True,
                            secure=False, samesite="lax", max_age=7*24*60*60, path="/")
        return {"user_id": user_id, "email": user_doc["email"], "name": user_doc["name"],
                "picture": user_doc.get("picture"), "session_token": session_token}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(status_code=500, detail="Login failed")

@api_router.get("/auth/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@api_router.post("/auth/logout")
async def logout(response: Response, current_user: User = Depends(get_current_user),
                 authorization: Optional[str] = Header(None)):
    session_token = None
    if authorization and authorization.startswith("Bearer "):
        session_token = authorization.replace("Bearer ", "")
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Logged out successfully"}

# ============================================================
# Profile endpoints
# ============================================================

@api_router.get("/profile")
async def get_profile(current_user: User = Depends(get_current_user)):
    default_profile = {
        "user_id": current_user.user_id,
        "avatar_image_base64": None,
        "body_photo_base64": None,
        "body_type": None,
        "style_preferences": [],
        "favorite_colors": [],
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    try:
        profile = await db.user_profiles.find_one({"user_id": current_user.user_id}, {"_id": 0})
        if not profile:
            await db.user_profiles.insert_one({**default_profile, "updated_at": datetime.now(timezone.utc)})
            return default_profile
        return profile
    except Exception:
        return _memory_profiles.get(current_user.user_id, default_profile)

async def _analyze_body_photo(body_photo_b64: str) -> Optional[Dict[str, Any]]:
    """Analyze body photo for body type and styling-relevant details using AI."""
    if not gemini_api_key:
        return None
    try:
        from PIL import Image
        b64 = body_photo_b64.split(",")[-1] if "," in body_photo_b64 else body_photo_b64
        img_bytes = base64.b64decode(b64)
        img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
        prompt = """Analyze this full-body photo for fashion styling purposes. Return ONLY a JSON object (no markdown) with:
- body_type: one of "petite", "slim", "average", "athletic", "hourglass", "pear", "apple", "rectangular"
- height_range: "short", "average", "tall"
- skin_tone: "fair", "light", "medium", "olive", "tan", "brown", "dark"
- build: brief description (e.g. "balanced proportions", "broad shoulders")
- styling_tips: 2-3 short tips for flattering outfits based on this body

Example: {"body_type":"hourglass","height_range":"average","skin_tone":"warm medium","build":"balanced proportions","styling_tips":["Emphasize waist","Avoid boxy cuts"]}"""
        result = await _gemini_generate(prompt, [img])
        text = (result.text or "").strip()
        if "```" in text:
            text = text.split("```")[1].split("```")[0].strip()
            if text.startswith("json"):
                text = text[4:].strip()
        return json.loads(text) if text else None
    except Exception as e:
        logger.warning(f"Body photo analysis failed: {e}")
        return None

@api_router.put("/profile")
async def update_profile(profile_update: UserProfileUpdate,
                         current_user: User = Depends(get_current_user)):
    update_data = {k: v for k, v in profile_update.model_dump(exclude_unset=True).items()}
    update_data["updated_at"] = datetime.now(timezone.utc)

    # When body photo is uploaded, analyze for body type and styling details
    if "body_photo_base64" in update_data and update_data["body_photo_base64"]:
        analysis = await _analyze_body_photo(update_data["body_photo_base64"])
        if analysis:
            update_data["body_type"] = analysis.get("body_type") or update_data.get("body_type")
            update_data["body_analysis"] = analysis

    try:
        await db.user_profiles.update_one(
            {"user_id": current_user.user_id}, {"$set": update_data}, upsert=True
        )
        profile = await db.user_profiles.find_one({"user_id": current_user.user_id}, {"_id": 0})
        return profile
    except Exception:
        uid = current_user.user_id
        if uid not in _memory_profiles:
            _memory_profiles[uid] = {
                "user_id": uid, "avatar_image_base64": None, "body_photo_base64": None,
                "body_type": None, "style_preferences": [], "favorite_colors": []
            }
        _memory_profiles[uid].update(update_data)
        return _memory_profiles[uid]

# ============================================================
# Wardrobe endpoints
# ============================================================

@api_router.post("/wardrobe/items", response_model=ClothingItem)
async def create_clothing_item(item: ClothingItemCreate,
                               current_user: User = Depends(get_current_user)):
    item_id = f"item_{uuid.uuid4().hex[:12]}"
    item_doc = {
        "item_id": item_id,
        "user_id": current_user.user_id,
        "category": item.category,
        "name": item.name,
        "image_base64": item.image_base64,
        "color": item.color,
        "season": item.season,
        "fabric": item.fabric,
        "pattern": item.pattern,
        "fit": item.fit,
        "occasion": item.occasion,
        "created_at": datetime.now(timezone.utc)
    }
    try:
        await db.clothing_items.insert_one(item_doc)
    except Exception as e:
        logger.warning(f"MongoDB unavailable ({e}), using in-memory store")
        uid = current_user.user_id
        if uid not in _memory_items:
            _memory_items[uid] = []
        _memory_items[uid].append(item_doc)
    return ClothingItem(**item_doc)

@api_router.get("/wardrobe/items", response_model=List[ClothingItem])
async def get_clothing_items(category: Optional[str] = None,
                             current_user: User = Depends(get_current_user)):
    try:
        query = {"user_id": current_user.user_id}
        if category:
            query["category"] = category
        items = await db.clothing_items.find(query, {"_id": 0}).to_list(1000)
    except Exception:
        items = [i for i in _memory_items.get(current_user.user_id, [])
                 if not category or i.get("category") == category]
    return [ClothingItem(**{k: v for k, v in item.items() if k != "_id"}) for item in items]

@api_router.get("/wardrobe/items/{item_id}", response_model=ClothingItem)
async def get_clothing_item(item_id: str, current_user: User = Depends(get_current_user)):
    try:
        item = await db.clothing_items.find_one(
            {"item_id": item_id, "user_id": current_user.user_id}, {"_id": 0}
        )
    except Exception:
        item = next((i for i in _memory_items.get(current_user.user_id, [])
                     if i.get("item_id") == item_id), None)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return ClothingItem(**{k: v for k, v in item.items() if k != "_id"})

@api_router.delete("/wardrobe/items/{item_id}")
async def delete_clothing_item(item_id: str, current_user: User = Depends(get_current_user)):
    try:
        result = await db.clothing_items.delete_one(
            {"item_id": item_id, "user_id": current_user.user_id}
        )
        if result.deleted_count > 0:
            return {"message": "Item deleted successfully"}
    except Exception:
        pass
    uid = current_user.user_id
    if uid in _memory_items:
        before = len(_memory_items[uid])
        _memory_items[uid] = [i for i in _memory_items[uid] if i.get("item_id") != item_id]
        if len(_memory_items[uid]) < before:
            return {"message": "Item deleted successfully"}
    raise HTTPException(status_code=404, detail="Item not found")

# ============================================================
# AI: Clothing recognition
# ============================================================

@api_router.post("/ai/recognize-clothing")
async def recognize_clothing(request: ImageRecognitionRequest,
                              current_user: User = Depends(get_current_user)):
    """Detect category, name, color, fabric, pattern, fit, season, occasion from a photo."""
    if not gemini_api_key:
        return {"error": "AI not configured. Set GEMINI_API_KEY in .env", "manual": True}
    try:
        from PIL import Image
        b64 = request.image_base64.split(",")[-1] if "," in request.image_base64 else request.image_base64
        img_bytes = base64.b64decode(b64)
        img = Image.open(io.BytesIO(img_bytes)).convert("RGB")

        prompt = """You are an expert fashion analyst. Analyze this clothing item image in detail and respond ONLY with valid JSON.

Detect the following attributes:
1. category - one of: tops, bottoms, dresses, jackets, shoes, accessories
2. name - specific descriptive name (e.g. "Slim-Fit Dark Wash Jeans", "Floral Wrap Midi Dress")
3. color - primary color(s) (e.g. "Navy Blue", "White & Blue Stripe")
4. season - one of: spring, summer, fall, winter, all
5. fabric - material (e.g. "Denim", "Cotton", "Silk", "Polyester", "Wool", "Linen", "Leather", "Knit")
6. pattern - visual pattern (e.g. "Solid", "Striped", "Floral", "Plaid", "Checked", "Geometric", "Animal Print", "Abstract")
7. fit - silhouette/fit (e.g. "Slim Fit", "Regular Fit", "Oversized", "Relaxed", "Tailored", "Cropped", "Bodycon")
8. occasion - best use case (e.g. "Casual", "Formal", "Business Casual", "Party", "Athletic", "Beach", "Date Night")

Respond ONLY with this exact JSON format, no other text:
{"category":"...","name":"...","color":"...","season":"...","fabric":"...","pattern":"...","fit":"...","occasion":"..."}"""

        response = await _gemini_generate(prompt, [img])
        response_text = (response.text or "").strip()
        if "```json" in response_text:
            response_text = response_text.split("```json")[1].split("```")[0].strip()
        elif "```" in response_text:
            response_text = response_text.split("```")[1].split("```")[0].strip()
        return json.loads(response_text)
    except Exception as e:
        logger.error(f"Image recognition error: {e}")
        return {"error": str(e), "manual": True}

# ============================================================
# AI: Single outfit generation
# ============================================================

@api_router.post("/ai/generate-outfit")
async def generate_outfit(request: AIOutfitRequest,
                          current_user: User = Depends(get_current_user)):
    """Generate a single outfit recommendation from the wardrobe."""
    if not gemini_api_key:
        raise HTTPException(status_code=503, detail="AI requires GEMINI_API_KEY in backend .env")
    try:
        try:
            items = await db.clothing_items.find(
                {"user_id": current_user.user_id}, {"_id": 0}
            ).to_list(1000)
        except Exception:
            items = list(_memory_items.get(current_user.user_id, []))

        if len(items) < 2:
            raise HTTPException(status_code=400,
                                detail="Need at least 2 items in wardrobe to generate an outfit")

        wardrobe_desc = "Available clothing items:\n"
        for item in items:
            details = []
            if item.get('color'):
                details.append(item['color'])
            if item.get('fabric'):
                details.append(item['fabric'])
            if item.get('pattern'):
                details.append(item['pattern'])
            detail_str = ", ".join(details) if details else item.get('color', 'unknown color')
            wardrobe_desc += f"- {item['item_id']}: {item['name']} ({item['category']}, {detail_str})\n"

        # Fetch profile for body-type-aware recommendations
        body_context = ""
        try:
            profile = await db.user_profiles.find_one({"user_id": current_user.user_id}, {"_id": 0})
        except Exception:
            profile = _memory_profiles.get(current_user.user_id)
        if profile and (profile.get("body_type") or profile.get("body_analysis")):
            bt = profile.get("body_type")
            ba = profile.get("body_analysis") or {}
            body_context = f"User body type: {bt or 'not specified'}"
            if isinstance(ba, dict) and ba.get("styling_tips"):
                tips = ba["styling_tips"]
                body_context += f". Flattering tips: {'; '.join(tips) if isinstance(tips, list) else tips}"
            body_context += "\n"

        prompt = f"""You are an expert fashion stylist. Based on this wardrobe:

{wardrobe_desc}
{body_context}"""
        if request.occasion:
            prompt += f"Occasion: {request.occasion}\n"
        if request.weather:
            prompt += f"Weather/Season: {request.weather}\n"
        if request.preferences:
            prompt += f"Style preferences: {request.preferences}\n"

        prompt += """
Create EXACTLY ONE perfect outfit combination. Choose items that work harmoniously together.
Give it an inspiring name and explain why this combination works stylistically.

Respond ONLY with this exact JSON format:
{"outfit": {"item_ids": ["item_id1", "item_id2"], "name": "...", "description": "..."}}"""

        completion = await _gemini_generate(prompt)
        response_text = (completion.text or "").strip()
        if "```json" in response_text:
            response_text = response_text.split("```json")[1].split("```")[0].strip()
        elif "```" in response_text:
            response_text = response_text.split("```")[1].split("```")[0].strip()

        result = json.loads(response_text)
        # Filter item_ids to only include valid ones
        valid_ids = {item['item_id'] for item in items}
        if "outfit" in result:
            result["outfit"]["item_ids"] = [
                iid for iid in result["outfit"].get("item_ids", []) if iid in valid_ids
            ]
        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Outfit generation error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate outfit: {e}")

# ============================================================
# AI: Virtual try-on (image generation via Hugging Face IDM-VTON)
# ============================================================

async def _try_generate_tryon_image(
    outfit_desc: str,
    body_photo_b64: Optional[str] = None,
    garment_image_b64: Optional[str] = None,
) -> Optional[bytes]:
    """Generate try-on image using Hugging Face IDM-VTON. Needs body photo + garment image."""
    if not hf_token or not body_photo_b64 or not garment_image_b64:
        return None
    try:
        from gradio_client import Client
        from PIL import Image
        import tempfile

        def _do_gen():
            try:
                human_b64 = body_photo_b64.split(",")[-1] if "," in body_photo_b64 else body_photo_b64
                garm_b64 = garment_image_b64.split(",")[-1] if "," in garment_image_b64 else garment_image_b64
                human_img = Image.open(io.BytesIO(base64.b64decode(human_b64))).convert("RGB")
                garm_img = Image.open(io.BytesIO(base64.b64decode(garm_b64))).convert("RGB")
                with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as fh:
                    human_img.save(fh, format="PNG")
                    human_path = fh.name
                with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as fg:
                    garm_img.save(fg, format="PNG")
                    garm_path = fg.name
                try:
                    client = Client("yisol/IDM-VTON", hf_token=hf_token)
                    human_dict = {"background": human_path, "layers": [], "composite": None}
                    result = client.predict(
                        human_dict,
                        garm_path,
                        outfit_desc,
                        True,   # is_checked (auto mask)
                        False,  # is_checked_crop
                        30,     # denoise_steps
                        42,     # seed
                        api_name="/tryon",
                    )
                    out_path = result[0] if isinstance(result, (list, tuple)) else result
                    if out_path and Path(out_path).exists():
                        with open(out_path, "rb") as f:
                            return f.read()
                finally:
                    try:
                        Path(human_path).unlink(missing_ok=True)
                        Path(garm_path).unlink(missing_ok=True)
                    except Exception:
                        pass
            except Exception as e:
                logger.warning(f"IDM-VTON try-on failed: {e}", exc_info=True)
            return None

        return await asyncio.to_thread(_do_gen)
    except Exception as e:
        logger.warning(f"Try-on image generation failed: {e}")
        return None

async def _try_gemini_tryon_image(outfit_desc: str, body_photo_b64: Optional[str] = None) -> Optional[bytes]:
    """Generate try-on image via Gemini image models (priority order)."""
    if not gemini_api_key:
        return None
    try:
        from google import genai as genai_new
        from google.genai import types
        client = genai_new.Client(api_key=gemini_api_key)

        def _do():
            prompt = f"Full-body fashion photo of a person wearing: {outfit_desc}. Editorial style, neutral background, photorealistic."
            contents = [prompt]
            if body_photo_b64:
                b64 = body_photo_b64.split(",")[-1] if "," in body_photo_b64 else body_photo_b64
                pil_img = __import__("PIL.Image", fromlist=["Image"]).Image.open(io.BytesIO(base64.b64decode(b64))).convert("RGB")
                prompt_edit = f"Photorealistic image of this exact person wearing: {outfit_desc}. Same pose and face."
                contents = [prompt_edit, pil_img]
            image_models = [
                "imagen-4.0-ultra-generate-001",
                "gemini-2.5-flash-image",
                "gemini-2.0-flash-exp-image-generation",
            ]
            for model in image_models:
                try:
                    if "imagen" in model:
                        r = client.models.generate_images(model=model, prompt=prompt, config=types.GenerateImagesConfig(number_of_images=1))
                        for gi in (getattr(r, "generated_images", None) or []):
                            if getattr(gi, "image", None):
                                buf = io.BytesIO()
                                gi.image.save(buf, format="PNG")
                                return buf.getvalue()
                    else:
                        cfg = types.GenerateContentConfig(response_modalities=["IMAGE"], image_config=types.ImageConfig(aspect_ratio="3:4"))
                        r = client.models.generate_content(model=model, contents=contents, config=cfg)
                        for c in getattr(r, "candidates", []) or []:
                            for p in getattr(getattr(c, "content", None), "parts", None) or []:
                                if hasattr(p, "inline_data") and p.inline_data:
                                    raw = getattr(p.inline_data, "data", None)
                                    if raw:
                                        return raw if isinstance(raw, bytes) else base64.b64decode(raw)
                except Exception as model_err:
                    logger.warning(f"Try-on image model failed ({model}): {model_err}")
                    continue
            return None
        return await asyncio.to_thread(_do)
    except Exception as e:
        logger.warning(f"Gemini try-on image failed: {e}")
        return None

@api_router.post("/ai/try-on")
async def virtual_try_on(request: TryOnRequest,
                         current_user: User = Depends(get_current_user)):
    """Generate AI image of user wearing specified outfit items."""
    if not gemini_api_key:
        raise HTTPException(status_code=503, detail="AI requires GEMINI_API_KEY in backend .env")

    try:
        # Resolve item_ids
        item_ids = request.item_ids or []
        if request.outfit_id and not item_ids:
            try:
                outfit = await db.outfits.find_one(
                    {"outfit_id": request.outfit_id, "user_id": current_user.user_id}, {"_id": 0}
                )
            except Exception:
                outfit = next((o for o in _memory_outfits.get(current_user.user_id, [])
                               if o.get("outfit_id") == request.outfit_id), None)
            if outfit:
                item_ids = outfit.get("item_ids", [])

        # Fetch item details for outfit description
        items = []
        try:
            for iid in item_ids:
                item = await db.clothing_items.find_one(
                    {"item_id": iid, "user_id": current_user.user_id},
                    {"_id": 0, "name": 1, "category": 1, "color": 1, "fabric": 1, "pattern": 1, "fit": 1, "image_base64": 1}
                )
                if item:
                    items.append(item)
        except Exception:
            mem = {i.get("item_id"): i for i in _memory_items.get(current_user.user_id, [])}
            for iid in item_ids:
                if iid in mem:
                    items.append(mem[iid])

        if not items:
            raise HTTPException(
                status_code=400,
                detail="No valid items found for try-on. Save an outfit with at least one wardrobe item."
            )

        outfit_desc = ", ".join(
            [
                f"{item.get('color', '')} {item.get('fabric', '')} {item['name']}".strip()
                for item in items
            ]
        )

        # Resolve body photo (from request or stored profile) for Gemini image edit
        body_photo = request.body_photo_base64
        if not body_photo:
            try:
                profile = await db.user_profiles.find_one(
                    {"user_id": current_user.user_id}, {"_id": 0, "body_photo_base64": 1}
                )
            except Exception:
                profile = _memory_profiles.get(current_user.user_id)
            if profile:
                body_photo = profile.get("body_photo_base64")

        # Gemini ImageGen Ultra only (no IDM-VTON)
        image_bytes = None
        if gemini_api_key:
            try:
                image_bytes = await _try_gemini_tryon_image(outfit_desc, body_photo)
            except Exception as g_e:
                logger.warning(f"Gemini image try-on failed: {g_e}")
        if image_bytes:
            try:
                image_base64 = base64.b64encode(image_bytes).decode("utf-8")
                return {
                    "type": "image",
                    "image_base64": image_base64,
                    "description": f"Your try-on look: {outfit_desc}",
                    "outfit_description": outfit_desc,
                    "items": [{"name": i["name"], "category": i["category"]} for i in items],
                }
            except Exception as enc_e:
                logger.warning(f"Try-on image encode failed: {enc_e}")
        # Image-only mode: never return text fallback
        raise HTTPException(
            status_code=503,
            detail=(
                "Image generation failed on all configured image models "
                "(Imagen 4 Ultra / Gemini Flash Image). Check API key permissions and quota."
            ),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Try-on error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Try-on failed: {e}")

# ============================================================
# Outfit endpoints
# ============================================================

@api_router.post("/outfits", response_model=Outfit)
async def create_outfit(outfit: OutfitCreate, current_user: User = Depends(get_current_user)):
    outfit_id = f"outfit_{uuid.uuid4().hex[:12]}"
    outfit_doc = {
        "outfit_id": outfit_id,
        "user_id": current_user.user_id,
        "name": outfit.name,
        "item_ids": outfit.item_ids,
        "ai_generated": outfit.ai_generated,
        "description": outfit.description,
        "created_at": datetime.now(timezone.utc)
    }
    try:
        await db.outfits.insert_one(outfit_doc)
    except Exception as e:
        logger.warning(f"MongoDB unavailable ({e}), using in-memory store")
        uid = current_user.user_id
        if uid not in _memory_outfits:
            _memory_outfits[uid] = []
        _memory_outfits[uid].append(outfit_doc)
    return Outfit(**outfit_doc)

@api_router.get("/outfits", response_model=List[Outfit])
async def get_outfits(current_user: User = Depends(get_current_user)):
    try:
        outfits = await db.outfits.find(
            {"user_id": current_user.user_id}, {"_id": 0}
        ).to_list(1000)
    except Exception:
        outfits = _memory_outfits.get(current_user.user_id, [])
    return [Outfit(**{k: v for k, v in o.items() if k != "_id"}) for o in outfits]

@api_router.get("/outfits/{outfit_id}", response_model=Outfit)
async def get_outfit(outfit_id: str, current_user: User = Depends(get_current_user)):
    try:
        outfit = await db.outfits.find_one(
            {"outfit_id": outfit_id, "user_id": current_user.user_id}, {"_id": 0}
        )
    except Exception:
        outfit = next((o for o in _memory_outfits.get(current_user.user_id, [])
                       if o.get("outfit_id") == outfit_id), None)
    if not outfit:
        raise HTTPException(status_code=404, detail="Outfit not found")
    return Outfit(**{k: v for k, v in outfit.items() if k != "_id"})

@api_router.delete("/outfits/{outfit_id}")
async def delete_outfit(outfit_id: str, current_user: User = Depends(get_current_user)):
    try:
        result = await db.outfits.delete_one(
            {"outfit_id": outfit_id, "user_id": current_user.user_id}
        )
        if result.deleted_count > 0:
            return {"message": "Outfit deleted successfully"}
    except Exception:
        pass
    uid = current_user.user_id
    if uid in _memory_outfits:
        before = len(_memory_outfits[uid])
        _memory_outfits[uid] = [o for o in _memory_outfits[uid] if o.get("outfit_id") != outfit_id]
        if len(_memory_outfits[uid]) < before:
            return {"message": "Outfit deleted successfully"}
    raise HTTPException(status_code=404, detail="Outfit not found")

# ============================================================
# Calendar endpoints
# ============================================================

@api_router.post("/calendar", response_model=CalendarOutfit)
async def schedule_outfit(calendar_item: CalendarOutfitCreate,
                          current_user: User = Depends(get_current_user)):
    calendar_id = f"cal_{uuid.uuid4().hex[:12]}"
    calendar_doc = {
        "calendar_id": calendar_id, "user_id": current_user.user_id,
        "date": calendar_item.date, "outfit_id": calendar_item.outfit_id,
        "created_at": datetime.now(timezone.utc)
    }
    try:
        await db.calendar_outfits.insert_one(calendar_doc)
    except Exception:
        uid = current_user.user_id
        if uid not in _memory_calendar:
            _memory_calendar[uid] = []
        _memory_calendar[uid].append(calendar_doc)
    return CalendarOutfit(**calendar_doc)

@api_router.get("/calendar", response_model=List[CalendarOutfit])
async def get_calendar_outfits(start_date: Optional[str] = None, end_date: Optional[str] = None,
                               current_user: User = Depends(get_current_user)):
    try:
        query = {"user_id": current_user.user_id}
        if start_date and end_date:
            query["date"] = {"$gte": start_date, "$lte": end_date}
        elif start_date:
            query["date"] = {"$gte": start_date}
        calendar_items = await db.calendar_outfits.find(query, {"_id": 0}).to_list(1000)
    except Exception:
        calendar_items = _memory_calendar.get(current_user.user_id, [])
    return [CalendarOutfit(**{k: v for k, v in item.items() if k != "_id"}) for item in calendar_items]

@api_router.delete("/calendar/{calendar_id}")
async def delete_calendar_outfit(calendar_id: str, current_user: User = Depends(get_current_user)):
    try:
        result = await db.calendar_outfits.delete_one(
            {"calendar_id": calendar_id, "user_id": current_user.user_id}
        )
        if result.deleted_count > 0:
            return {"message": "Calendar item deleted successfully"}
    except Exception:
        pass
    uid = current_user.user_id
    if uid in _memory_calendar:
        before = len(_memory_calendar[uid])
        _memory_calendar[uid] = [c for c in _memory_calendar[uid] if c.get("calendar_id") != calendar_id]
        if len(_memory_calendar[uid]) < before:
            return {"message": "Calendar item deleted successfully"}
    raise HTTPException(status_code=404, detail="Calendar item not found")

# ============================================================
# AI Stylist Chat — with suggested_outfit extraction
# ============================================================

def _fuzzy_match_items(item_names_mentioned: List[str], wardrobe_items: List[dict]) -> List[str]:
    """Match mentioned item names to wardrobe item_ids using simple substring matching."""
    matched_ids = []
    for mention in item_names_mentioned:
        mention_lower = mention.lower().strip()
        for item in wardrobe_items:
            item_name_lower = item.get("name", "").lower()
            if mention_lower in item_name_lower or item_name_lower in mention_lower:
                item_id = item.get("item_id")
                if item_id and item_id not in matched_ids:
                    matched_ids.append(item_id)
                    break
    return matched_ids

@api_router.post("/stylist/chat")
async def chat_with_stylist(request: ChatRequest,
                            current_user: User = Depends(get_current_user)):
    """Chat with AI stylist. Returns response + optional suggested_outfit."""
    logger.info("Stylist chat request received")
    if not gemini_api_key:
        raise HTTPException(status_code=503, detail="AI requires GEMINI_API_KEY in backend .env")

    try:
        try:
            all_items = await db.clothing_items.find(
                {"user_id": current_user.user_id}, {"_id": 0}
            ).to_list(100)
            outfits = await db.outfits.find(
                {"user_id": current_user.user_id}, {"_id": 0, "name": 1, "description": 1}
            ).to_list(50)
        except Exception:
            all_items = list(_memory_items.get(current_user.user_id, []))
            outfits = [{k: v for k, v in o.items() if k in ("name", "description")}
                       for o in _memory_outfits.get(current_user.user_id, [])]

        try:
            chat_history = await db.chat_messages.find(
                {"user_id": current_user.user_id}
            ).sort("created_at", -1).limit(10).to_list(10)
        except Exception:
            chat_history = []

        wardrobe_context = f"User's wardrobe: {len(all_items)} items"
        if all_items:
            categories = {}
            for item in all_items:
                cat = item.get('category', 'unknown')
                categories[cat] = categories.get(cat, 0) + 1
            wardrobe_context += f" ({', '.join([f'{v} {k}' for k, v in categories.items()])})"

        wardrobe_list = "\n".join([
            f"- {item['name']} ({item['category']}, {item.get('color', '')}{', ' + item['fabric'] if item.get('fabric') else ''})"
            for item in all_items[:30]
        ])

        # Fetch profile for body type / styling context
        body_context = ""
        try:
            profile = await db.user_profiles.find_one({"user_id": current_user.user_id}, {"_id": 0})
        except Exception:
            profile = _memory_profiles.get(current_user.user_id)
        if profile:
            bt = profile.get("body_type")
            ba = profile.get("body_analysis")
            if bt or ba:
                body_context = f"\nUser's body type: {bt or 'not specified'}"
                if isinstance(ba, dict):
                    tips = ba.get("styling_tips")
                    if tips:
                        body_context += f"\nStyling tips for this user: {'; '.join(tips) if isinstance(tips, list) else tips}"
                    if ba.get("height_range"):
                        body_context += f"\nHeight: {ba['height_range']}"
                    if ba.get("skin_tone"):
                        body_context += f"\nSkin tone: {ba['skin_tone']}"

        conversation = ""
        if chat_history:
            for msg in reversed(chat_history[-6:]):
                role = "User" if msg["role"] == "user" else "Steffy"
                conversation += f"{role}: {msg['content']}\n"

        system_prompt = f"""You are Steffy, a world-class AI fashion stylist with expertise in color theory, body types, fabric, and current trends.

Your personality:
- Warm, encouraging, and genuinely excited about fashion
- Give specific, actionable advice referencing the user's actual wardrobe items
- Use fashion terminology naturally and educationally
- Be concise (2-4 sentences typically) unless asked for detail

Current wardrobe: {wardrobe_context}
Items available: 
{wardrobe_list}
Saved outfits: {len(outfits)}{body_context if body_context else ""}

Recent conversation:
{conversation}

IMPORTANT: When you suggest a complete outfit combination, end your response with a JSON block in this exact format on its own line:
OUTFIT_SUGGESTION:{{"name":"Outfit Name","items":["exact item name 1","exact item name 2"]}}

Only include OUTFIT_SUGGESTION if you are recommending a specific combination of 2+ items to wear together."""

        full_prompt = f"{system_prompt}\n\nUser: {request.message}\nSteffy:"
        logger.info("Calling Gemini API for stylist chat...")
        completion = await _gemini_generate(full_prompt)
        raw_response = completion.text or ""
        logger.info("Gemini stylist response received")

        # Extract outfit suggestion if present
        suggested_outfit = None
        response_text = raw_response

        if "OUTFIT_SUGGESTION:" in raw_response:
            parts = raw_response.split("OUTFIT_SUGGESTION:")
            response_text = parts[0].strip()
            try:
                suggestion_json_str = parts[1].strip()
                # Handle trailing text after the JSON
                if "\n" in suggestion_json_str:
                    suggestion_json_str = suggestion_json_str.split("\n")[0]
                suggestion_data = json.loads(suggestion_json_str)
                mentioned_names = suggestion_data.get("items", [])
                matched_ids = _fuzzy_match_items(mentioned_names, all_items)
                if len(matched_ids) >= 2:
                    suggested_outfit = {
                        "name": suggestion_data.get("name", "Steffy's Pick"),
                        "item_ids": matched_ids,
                        "description": response_text
                    }
            except Exception as parse_err:
                logger.warning(f"Could not parse outfit suggestion: {parse_err}")

        # Save messages
        user_msg_id = f"msg_{uuid.uuid4().hex[:12]}"
        assistant_msg_id = f"msg_{uuid.uuid4().hex[:12]}"
        try:
            await db.chat_messages.insert_many([
                {
                    "message_id": user_msg_id, "user_id": current_user.user_id,
                    "role": "user", "content": request.message,
                    "created_at": datetime.now(timezone.utc)
                },
                {
                    "message_id": assistant_msg_id, "user_id": current_user.user_id,
                    "role": "assistant", "content": response_text,
                    "created_at": datetime.now(timezone.utc)
                }
            ])
        except Exception:
            pass

        result = {"response": response_text, "message_id": assistant_msg_id}
        if suggested_outfit:
            result["suggested_outfit"] = suggested_outfit
        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Stylist chat error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process chat: {e}")

@api_router.get("/stylist/history")
async def get_chat_history(limit: int = 50, current_user: User = Depends(get_current_user)):
    try:
        messages = await db.chat_messages.find(
            {"user_id": current_user.user_id}, {"_id": 0}
        ).sort("created_at", -1).limit(limit).to_list(limit)
    except Exception:
        messages = []
    return {"messages": list(reversed(messages))}

@api_router.delete("/stylist/history")
async def clear_chat_history(current_user: User = Depends(get_current_user)):
    try:
        await db.chat_messages.delete_many({"user_id": current_user.user_id})
    except Exception:
        pass
    return {"message": "Chat history cleared"}

# ============================================================
# Root & health
# ============================================================

@api_router.get("/")
async def root():
    return {"message": "Steffy AI Wardrobe API"}

@api_router.get("/health")
async def health_check():
    mongo_ok = False
    try:
        await client.admin.command("ping")
        mongo_ok = True
    except Exception:
        pass
    return {
        "status": "healthy",
        "service": "steffy-api",
        "mongo": "ok" if mongo_ok else "unavailable (using in-memory fallback)",
        "ai": "gemini" if gemini_api_key else "not configured",
    }

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=[
        "http://localhost:8081", "http://localhost:8082", "http://localhost:19006",
        "http://localhost:3000", "http://localhost:5173", "http://localhost:19000",
        "http://127.0.0.1:8081", "http://127.0.0.1:8082", "http://127.0.0.1:19006",
        "http://127.0.0.1:3000", "http://127.0.0.1:5173", "http://127.0.0.1:19000",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
