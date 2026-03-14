#!/usr/bin/env python3
"""
Backend Testing for Steffy Assistance - Smart AI Wardrobe App
Tests all backend APIs including authentication, wardrobe management, AI features, and outfits.
"""

import os
import requests
import json
import base64
import time
from datetime import datetime, timezone, timedelta
import subprocess
import sys
from io import BytesIO
from PIL import Image

# Configuration
BACKEND_URL = os.environ.get("BACKEND_URL", "http://localhost:3000/api")
TEST_USER_EMAIL = f"test.user.{int(time.time())}@example.com"
TEST_USER_NAME = "Test User"

class BackendTester:
    def __init__(self):
        self.session_token = None
        self.user_id = None
        self.created_items = []
        self.created_outfits = []
        
    def create_test_image_base64(self, color=(255, 0, 0), size=(200, 200)):
        """Create a simple test image and return as base64"""
        # Create a simple colored rectangle with some pattern
        img = Image.new('RGB', size, color)
        
        # Add some pattern to make it a real image with features
        from PIL import ImageDraw
        draw = ImageDraw.Draw(img)
        
        # Draw some shapes to make it look like clothing
        draw.rectangle([20, 20, 180, 180], outline=(0, 0, 0), width=3)
        draw.ellipse([50, 50, 150, 150], fill=(255, 255, 255))
        draw.rectangle([80, 80, 120, 120], fill=(0, 255, 0))
        
        # Convert to base64
        buffer = BytesIO()
        img.save(buffer, format='JPEG')
        img_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
        return img_base64

    def setup_test_user(self):
        """Create test user and session in MongoDB using auth_testing.md protocol"""
        print("🔧 Setting up test user and session...")
        
        # Generate unique IDs
        timestamp = int(time.time())
        self.user_id = f"user_{timestamp}"
        self.session_token = f"test_session_{timestamp}"
        
        # MongoDB commands to create test user and session
        mongo_commands = f"""
use('test_database');
db.users.insertOne({{
  user_id: '{self.user_id}',
  email: '{TEST_USER_EMAIL}',
  name: '{TEST_USER_NAME}',
  picture: 'https://via.placeholder.com/150',
  created_at: new Date()
}});
db.user_sessions.insertOne({{
  user_id: '{self.user_id}',
  session_token: '{self.session_token}',
  expires_at: new Date(Date.now() + 7*24*60*60*1000),
  created_at: new Date()
}});
print('Test user created successfully');
"""
        
        try:
            # Execute MongoDB commands
            result = subprocess.run(
                ['mongosh', '--eval', mongo_commands],
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if result.returncode == 0:
                print(f"✅ Test user created: {self.user_id}")
                print(f"✅ Session token: {self.session_token}")
                return True
            else:
                print(f"❌ MongoDB setup failed: {result.stderr}")
                return False
                
        except Exception as e:
            print(f"❌ Error setting up test user: {str(e)}")
            return False

    def test_health_check(self):
        """Test basic health endpoint"""
        print("\n🏥 Testing health check...")
        try:
            response = requests.get(f"{BACKEND_URL}/health", timeout=10)
            if response.status_code == 200:
                print("✅ Health check passed")
                return True
            else:
                print(f"❌ Health check failed: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Health check error: {str(e)}")
            return False

    def test_auth_me(self):
        """Test /api/auth/me endpoint"""
        print("\n🔐 Testing authentication...")
        try:
            headers = {"Authorization": f"Bearer {self.session_token}"}
            response = requests.get(f"{BACKEND_URL}/auth/me", headers=headers, timeout=10)
            
            if response.status_code == 200:
                user_data = response.json()
                if user_data.get('user_id') == self.user_id:
                    print("✅ Authentication test passed")
                    print(f"   User: {user_data.get('name')} ({user_data.get('email')})")
                    return True
                else:
                    print(f"❌ User ID mismatch: expected {self.user_id}, got {user_data.get('user_id')}")
                    return False
            else:
                print(f"❌ Auth test failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Auth test error: {str(e)}")
            return False

    def test_wardrobe_crud(self):
        """Test wardrobe CRUD operations"""
        print("\n👕 Testing wardrobe CRUD operations...")
        headers = {"Authorization": f"Bearer {self.session_token}"}
        
        # Test 1: Create clothing item
        print("  📝 Testing create clothing item...")
        test_image = self.create_test_image_base64((255, 0, 0))  # Red shirt
        
        item_data = {
            "category": "tops",
            "name": "Red Test Shirt",
            "image_base64": test_image,
            "color": "red",
            "season": "summer"
        }
        
        try:
            response = requests.post(
                f"{BACKEND_URL}/wardrobe/items",
                json=item_data,
                headers=headers,
                timeout=15
            )
            
            if response.status_code == 200:
                item = response.json()
                item_id = item.get('item_id')
                self.created_items.append(item_id)
                print(f"  ✅ Item created: {item_id}")
            else:
                print(f"  ❌ Create item failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"  ❌ Create item error: {str(e)}")
            return False

        # Test 2: Get all items
        print("  📋 Testing get all items...")
        try:
            response = requests.get(f"{BACKEND_URL}/wardrobe/items", headers=headers, timeout=10)
            
            if response.status_code == 200:
                items = response.json()
                if len(items) >= 1:
                    print(f"  ✅ Retrieved {len(items)} items")
                else:
                    print("  ❌ No items found")
                    return False
            else:
                print(f"  ❌ Get items failed: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"  ❌ Get items error: {str(e)}")
            return False

        # Test 3: Get item by ID
        print("  🔍 Testing get item by ID...")
        try:
            response = requests.get(
                f"{BACKEND_URL}/wardrobe/items/{item_id}",
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 200:
                item = response.json()
                print(f"  ✅ Retrieved item: {item.get('name')}")
            else:
                print(f"  ❌ Get item by ID failed: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"  ❌ Get item by ID error: {str(e)}")
            return False

        # Test 4: Filter by category
        print("  🏷️ Testing category filter...")
        try:
            response = requests.get(
                f"{BACKEND_URL}/wardrobe/items?category=tops",
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 200:
                items = response.json()
                print(f"  ✅ Found {len(items)} tops")
            else:
                print(f"  ❌ Category filter failed: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"  ❌ Category filter error: {str(e)}")
            return False

        print("✅ Wardrobe CRUD tests passed")
        return True

    def test_ai_image_recognition(self):
        """Test AI image recognition"""
        print("\n🤖 Testing AI image recognition...")
        headers = {"Authorization": f"Bearer {self.session_token}"}
        
        # Create a more realistic clothing image
        test_image = self.create_test_image_base64((0, 0, 255))  # Blue item
        
        recognition_data = {
            "image_base64": test_image
        }
        
        try:
            response = requests.post(
                f"{BACKEND_URL}/ai/recognize-clothing",
                json=recognition_data,
                headers=headers,
                timeout=30  # AI calls may take longer
            )
            
            if response.status_code == 200:
                result = response.json()
                required_fields = ['category', 'name', 'color', 'season']
                
                if all(field in result for field in required_fields):
                    print("✅ AI recognition successful")
                    print(f"   Category: {result.get('category')}")
                    print(f"   Name: {result.get('name')}")
                    print(f"   Color: {result.get('color')}")
                    print(f"   Season: {result.get('season')}")
                    return True
                else:
                    print(f"❌ Missing required fields in response: {result}")
                    return False
            else:
                print(f"❌ AI recognition failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ AI recognition error: {str(e)}")
            return False

    def test_ai_outfit_generation(self):
        """Test AI outfit generation"""
        print("\n🎨 Testing AI outfit generation...")
        headers = {"Authorization": f"Bearer {self.session_token}"}
        
        # First, create multiple items for outfit generation
        print("  📦 Creating multiple wardrobe items...")
        items_to_create = [
            {"category": "tops", "name": "Blue Shirt", "color": "blue", "season": "summer"},
            {"category": "bottoms", "name": "Black Jeans", "color": "black", "season": "all"},
            {"category": "shoes", "name": "White Sneakers", "color": "white", "season": "all"},
            {"category": "jackets", "name": "Denim Jacket", "color": "blue", "season": "spring"}
        ]
        
        for item_data in items_to_create:
            item_data["image_base64"] = self.create_test_image_base64()
            
            try:
                response = requests.post(
                    f"{BACKEND_URL}/wardrobe/items",
                    json=item_data,
                    headers=headers,
                    timeout=15
                )
                
                if response.status_code == 200:
                    item = response.json()
                    self.created_items.append(item.get('item_id'))
                    print(f"    ✅ Created: {item_data['name']}")
                else:
                    print(f"    ❌ Failed to create {item_data['name']}")
                    
            except Exception as e:
                print(f"    ❌ Error creating {item_data['name']}: {str(e)}")

        # Test outfit generation
        print("  🎯 Testing outfit generation...")
        outfit_request = {
            "occasion": "casual",
            "weather": "sunny",
            "preferences": "comfortable and stylish"
        }
        
        try:
            response = requests.post(
                f"{BACKEND_URL}/ai/generate-outfit",
                json=outfit_request,
                headers=headers,
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                outfits = result.get('outfits', [])
                
                if outfits and len(outfits) > 0:
                    print(f"✅ Generated {len(outfits)} outfit(s)")
                    for i, outfit in enumerate(outfits):
                        print(f"   Outfit {i+1}: {outfit.get('name', 'Unnamed')}")
                        print(f"   Items: {len(outfit.get('item_ids', []))} pieces")
                    return True
                else:
                    print("❌ No outfits generated")
                    return False
            else:
                print(f"❌ Outfit generation failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Outfit generation error: {str(e)}")
            return False

    def test_outfits_crud(self):
        """Test outfits CRUD operations"""
        print("\n👗 Testing outfits CRUD operations...")
        headers = {"Authorization": f"Bearer {self.session_token}"}
        
        # Ensure we have some items to create an outfit
        if len(self.created_items) < 2:
            print("❌ Need at least 2 items to create outfit")
            return False
        
        # Test 1: Create outfit
        print("  📝 Testing create outfit...")
        outfit_data = {
            "name": "Test Casual Outfit",
            "item_ids": self.created_items[:3],  # Use first 3 items
            "ai_generated": False,
            "description": "A test outfit for validation"
        }
        
        try:
            response = requests.post(
                f"{BACKEND_URL}/outfits",
                json=outfit_data,
                headers=headers,
                timeout=15
            )
            
            if response.status_code == 200:
                outfit = response.json()
                outfit_id = outfit.get('outfit_id')
                self.created_outfits.append(outfit_id)
                print(f"  ✅ Outfit created: {outfit_id}")
            else:
                print(f"  ❌ Create outfit failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"  ❌ Create outfit error: {str(e)}")
            return False

        # Test 2: Get all outfits
        print("  📋 Testing get all outfits...")
        try:
            response = requests.get(f"{BACKEND_URL}/outfits", headers=headers, timeout=10)
            
            if response.status_code == 200:
                outfits = response.json()
                print(f"  ✅ Retrieved {len(outfits)} outfits")
            else:
                print(f"  ❌ Get outfits failed: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"  ❌ Get outfits error: {str(e)}")
            return False

        # Test 3: Get outfit by ID
        print("  🔍 Testing get outfit by ID...")
        try:
            response = requests.get(
                f"{BACKEND_URL}/outfits/{outfit_id}",
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 200:
                outfit = response.json()
                print(f"  ✅ Retrieved outfit: {outfit.get('name')}")
            else:
                print(f"  ❌ Get outfit by ID failed: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"  ❌ Get outfit by ID error: {str(e)}")
            return False

        print("✅ Outfits CRUD tests passed")
        return True

    def test_logout(self):
        """Test logout functionality"""
        print("\n🚪 Testing logout...")
        headers = {"Authorization": f"Bearer {self.session_token}"}
        
        try:
            response = requests.post(f"{BACKEND_URL}/auth/logout", headers=headers, timeout=10)
            
            if response.status_code == 200:
                print("✅ Logout successful")
                
                # Verify session is invalidated
                auth_response = requests.get(f"{BACKEND_URL}/auth/me", headers=headers, timeout=10)
                if auth_response.status_code == 401:
                    print("✅ Session properly invalidated")
                    return True
                else:
                    print("❌ Session still valid after logout")
                    return False
            else:
                print(f"❌ Logout failed: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Logout error: {str(e)}")
            return False

    def cleanup(self):
        """Clean up test data"""
        print("\n🧹 Cleaning up test data...")
        
        # Clean up MongoDB data
        mongo_cleanup = f"""
use('test_database');
db.users.deleteOne({{user_id: '{self.user_id}'}});
db.user_sessions.deleteMany({{user_id: '{self.user_id}'}});
db.clothing_items.deleteMany({{user_id: '{self.user_id}'}});
db.outfits.deleteMany({{user_id: '{self.user_id}'}});
print('Cleanup completed');
"""
        
        try:
            subprocess.run(['mongosh', '--eval', mongo_cleanup], timeout=30)
            print("✅ Test data cleaned up")
        except Exception as e:
            print(f"⚠️ Cleanup warning: {str(e)}")

    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting Steffy Assistance Backend Tests")
        print("=" * 50)
        
        test_results = {}
        
        # Setup
        if not self.setup_test_user():
            print("❌ Test setup failed - aborting")
            return False
        
        # Run tests in order
        tests = [
            ("Health Check", self.test_health_check),
            ("Authentication", self.test_auth_me),
            ("Wardrobe CRUD", self.test_wardrobe_crud),
            ("AI Image Recognition", self.test_ai_image_recognition),
            ("AI Outfit Generation", self.test_ai_outfit_generation),
            ("Outfits CRUD", self.test_outfits_crud),
            ("Logout", self.test_logout)
        ]
        
        for test_name, test_func in tests:
            try:
                test_results[test_name] = test_func()
            except Exception as e:
                print(f"❌ {test_name} crashed: {str(e)}")
                test_results[test_name] = False
        
        # Cleanup
        self.cleanup()
        
        # Summary
        print("\n" + "=" * 50)
        print("📊 TEST SUMMARY")
        print("=" * 50)
        
        passed = sum(1 for result in test_results.values() if result)
        total = len(test_results)
        
        for test_name, result in test_results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            print(f"{test_name:25} {status}")
        
        print(f"\nOverall: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 All tests passed!")
            return True
        else:
            print("⚠️ Some tests failed")
            return False

if __name__ == "__main__":
    tester = BackendTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)