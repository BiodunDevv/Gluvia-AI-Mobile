# Gluvia AI - Diabetic Meal Guidance Platform

A professional React Native mobile application built with Expo for diabetic patients to track meals, monitor glucose levels, and receive AI-powered health recommendations.

## 🌟 Features

### ✅ Complete Authentication System

- Multi-step registration with legal consent
- Secure login with JWT tokens
- Forgot password functionality
- Role-based access control (blocks admin users from mobile app)
- Token persistence with expo-secure-store
- Device ID tracking for security

### ✅ Offline-First Architecture

- SQLite database for offline data storage
- Automatic sync when internet connection is restored
- Network status indicator (shows online/offline status)
- Local user profile caching
- Meal and glucose reading offline tracking

### ✅ Professional UI/UX

- Apple-inspired design language
- Smooth animations with react-native-reanimated
- Custom animated tab bar with sliding indicator
- Multi-step onboarding screens (shown once)
- Smart routing based on authentication status
- SafeAreaView for all screens (notch-safe)
- TouchableWithoutFeedback for keyboard dismissal

### ✅ User Profile Management

- Complete profile editing
- Diabetes type selection (Type 1, Type 2, Gestational, Prediabetes)
- Age and contact information management
- Profile picture placeholder with camera icon
- Real-time profile updates with offline fallback

### ✅ Health Tracking (Database Ready)

- Meal logging with nutritional information
- Glucose reading records
- Sync status tracking for offline→online data transfer
- Timestamped entries for accurate tracking

## 🛠 Tech Stack

- **Framework**: React Native with Expo SDK 54
- **Routing**: expo-router (file-based navigation)
- **Styling**: NativeWind (Tailwind CSS for React Native)
- **State Management**: Zustand
- **HTTP Client**: Axios with interceptors
- **Database**: expo-sqlite (offline storage)
- **Storage**: expo-secure-store (tokens), @react-native-async-storage/async-storage (onboarding)
- **Network Detection**: @react-native-community/netinfo
- **Icons**: lucide-react-native
- **Animations**: react-native-reanimated
- **Device Info**: expo-device

## 📱 App Structure

```
app/
├── index.tsx                 # Splash screen
├── onboarding.tsx           # 5-slide welcome screens
├── current-user.tsx         # Smart landing page
├── (auth)/
│   ├── login.tsx           # Login screen
│   ├── register.tsx        # Multi-step registration
│   └── forgot-password.tsx # Password recovery
└── (tabs)/
    ├── index.tsx           # Dashboard/Home
    └── profile.tsx         # User profile

components/
├── auth/                   # Auth-related components
│   ├── auth-header.tsx    # Logo + brand header
│   ├── legal-modal.tsx    # Terms & Privacy modals
│   └── step-indicator.tsx # Multi-step progress
├── tab/
│   └── animated-tab-bar.tsx # Custom tab navigation
└── network-indicator.tsx   # Offline status banner

store/
└── auth-store.ts          # Zustand auth state

lib/
├── api.ts                 # Axios configuration
├── database.ts            # SQLite operations
├── device.ts              # Device ID generation
└── network.ts             # Network status utilities
```

## 🚀 Getting Started

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Start the development server**

   ```bash
   npx expo start
   ```

3. **Run on device/emulator**
   - Press `a` for Android
   - Press `i` for iOS
   - Scan QR code with Expo Go app

## 🔐 Authentication Flow

1. **Splash Screen** → Check onboarding status
2. **Onboarding** (first time) → 5 slides with skip option
3. **Current User Page** → Check authentication
   - Authenticated → Show continue to dashboard button
   - Not authenticated → Show sign in/create account options
4. **Dashboard/Profile** → Full app access

## 🌐 API Integration

**Base URL**: `https://gluvia-backend.onrender.com`

**Endpoints**:

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/forgot-password` - Password reset
- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update user profile

**Authentication**:

- JWT tokens stored in expo-secure-store
- Automatic token refresh with Axios interceptors
- Device ID sent with each request

## 🎨 Design System

**Primary Color**: `#1447e6` (Blue)

**Typography**:

- Headings: Bold, tracking-tight
- Body: Regular, leading-6
- Labels: Semibold, uppercase, tracking-wide

**Components**:

- Rounded corners: 16-24px
- Shadows: Subtle, elevated
- Icons: 16-24px
- Buttons: 52-56px height
- Spacing: 8px base unit

## 📦 Key Features Implementation

### Role-Based Access Control

```typescript
// Admin users are blocked from mobile app
if (response.data.data.user.role === "admin") {
  throw new Error(
    "Admin login is not allowed in the mobile app. Please visit https://gluvia.vercel.app"
  );
}
```

### Offline Storage

```typescript
// Save user to local SQLite on login
await initDatabase();
await saveUserToDb(response.data.data.user);

// Use local data when offline
const localUser = await getUserFromDb(userId);
```

### Network Status Detection

```typescript
// Real-time network monitoring
subscribeToNetworkStatus((isConnected) => {
  // Show banner when offline
  // Auto-hide when back online
});
```

## 🔄 Offline Sync Strategy

1. **User Actions While Offline**:
   - Saved to local SQLite with `synced = 0`
   - User sees immediate feedback

2. **When Connection Restored**:
   - Fetch unsynced records
   - POST to API endpoints
   - Mark as `synced = 1` on success

3. **Conflict Resolution**:
   - Server timestamp wins
   - Local changes queued for retry

## 📝 Database Schema

### Users Table

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  name TEXT,
  phone TEXT,
  role TEXT,
  age INTEGER,
  diabetesType TEXT,
  createdAt TEXT,
  lastLoginAt TEXT,
  profileData TEXT -- JSON string
)
```

### Meals Table

```sql
CREATE TABLE meals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId TEXT,
  name TEXT,
  timestamp TEXT,
  calories REAL,
  carbs REAL,
  protein REAL,
  fat REAL,
  synced INTEGER DEFAULT 0
)
```

### Glucose Readings Table

```sql
CREATE TABLE glucose_readings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId TEXT,
  value REAL,
  timestamp TEXT,
  notes TEXT,
  synced INTEGER DEFAULT 0
)
```

## 🐛 Known Issues

None currently. All features tested and working.

## 🚧 Future Enhancements

- [ ] Meal photo upload with image recognition
- [ ] Glucose trend charts and analytics
- [ ] Push notifications for reminders
- [ ] Health worker consultation chat
- [ ] Export health reports as PDF
- [ ] Apple Health & Google Fit integration
- [ ] Dark mode support
- [ ] Multi-language support

## 📄 License

Proprietary - Gluvia AI

## 👥 Team

Developed by the Gluvia AI team

---

**Admin Panel**: https://gluvia.vercel.app (Web-only, not accessible from mobile app)
