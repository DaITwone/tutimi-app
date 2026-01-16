# ☕ Coffee & Tea App

> A mobile-first application built with Expo, React Native, TypeScript, and Supabase.

The project focuses on practical frontend development: navigation, data fetching, image handling, admin CRUD flows, and UX details commonly found in real-world mobile products.

---

## 📋 Project Overview

The app includes three main areas:

**Customer-facing storefront**
- Home, menu, product details, and news

**User account**
- Favorites, vouchers, and user information

**Admin interface**
- Manage products, banners, themes, news, and vouchers

Data is powered by Supabase (Postgres + Auth + Storage), while routing and layouts are handled using Expo Router. The UI prioritizes clarity, responsiveness, and smooth interactions over visual complexity.

---

## 💡 What Problem This App Solves

- Provides a lightweight mobile storefront for browsing beverages and promotions.
- Allows store owners to manage content directly in the app without a separate admin website.
- Demonstrates a complete frontend workflow: UI rendering, API integration, image storage, role-gated admin screens, and UX handling.

---

## 👥 Who It's For

- Small cafés or pop-up stores needing a simple mobile app.
- Recruiters and developers reviewing a junior frontend project with real backend integration.

---

## 🎯 Why This Project Exists

### Learning goals
- Mobile navigation with Expo Router
- Supabase integration (auth, database, storage)
- Reusable hooks and service-based logic
- UX-focused interaction patterns

### Real-world relevance
Shows how a single developer can design and build a usable mobile app with admin functionality.

---

## ✨ Key Features

### Storefront & Account
- Mobile-first layouts using React Native and Nativewind
- Banner carousel with snapping and indicators
- Category-based menu using SectionList
- Favorites linked to product data
- Voucher eligibility checks
- Auth flows with focus-based refresh

### Admin
- Dashboard with animated counters
- CRUD flows for products, vouchers, news, and themes
- Image upload via Expo ImagePicker + Supabase Storage
- Swipeable list actions using gesture-based UI

---

## 🏗️ Frontend Architecture & UX

- Clear separation of concerns using hooks and services
- Explicit loading and error states
- SafeAreaView usage and responsive layouts
- Animations to improve perceived performance and usability

---

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| **React Native + Expo** | Mobile-first UI and native APIs |
| **Expo Router** | File-based routing with nested layouts |
| **TypeScript** | Safer data handling and refactoring |
| **Supabase** | Auth, relational data, and image storage |
| **Nativewind** | Utility-based styling |
| **react-native-gesture-handler** | Swipe and gesture interactions |
| **AsyncStorage** | Lightweight local persistence |

These tools were chosen to focus on product behavior and UX rather than custom backend infrastructure.

---

## 📁 Project Structure

```
app/
  (tabs)/      # Customer-facing screens
  (admin)/     # Admin routes and layouts
  (auth)/      # Authentication flows
  _layout.tsx  # Root providers and navigation

hooks/         # Reusable hooks (theme, branding, notifications)
services/      # Business logic (e.g. voucher rules)
lib/           # Shared utilities (Supabase client)
assets/        # Images and branding
```

### Why This Structure Works
- Route grouping mirrors real product surfaces.
- Hooks keep components focused on rendering and UX.
- Services isolate business logic from UI.
- Admin and user flows are clearly separated for maintainability.

---

## 🔧 Notable Technical Decisions

**Hooks & services for separation of concerns**
- Business rules (e.g. voucher eligibility) live outside UI components.

**Layout-based routing**
- Nested layouts simplify role-based navigation and shared UI.

**Direct backend integration**
- Supabase is used for queries, joins, auth, and file storage.

**UX-driven logic**
- Loading, error, and empty states are handled explicitly.
- Gesture-based interactions reduce UI clutter on mobile.

**Lifecycle awareness**
- Cleanup of listeners and mounted checks to avoid memory leaks.

**Pragmatic tradeoffs**
- Simple Alert-based error handling with clear paths for future improvement.

---

## 📸 Screenshots / Demo

*(Placeholders)*

- Home screen with banners and best sellers
- Menu with category navigation
- Admin dashboard with animated statistics
- Short demo video showing admin product upload and user flow

---

## 🚧 Limitations & Future Improvements

- [ ] Extract shared UI components into a `components/` directory
- [ ] Centralize helper utilities (e.g. image URL handling)
- [ ] Improve error handling with a unified notification system
- [ ] Add form validation and better field-level feedback
- [ ] Introduce basic testing and CI
- [ ] Clean up backup files
- [ ] Improve accessibility and contrast
- [ ] Harden role-based security using Supabase RLS

---

## 🚀 Setup

**1. Clone the repository**

**2. Install dependencies**
```bash
npm install
```

**3. Create a Supabase project and set up required tables**

**4. Configure environment variables:**
```
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY
EXPO_PUBLIC_DEV_ADMIN (optional)
```

**5. Start the project:**
```bash
npx expo start
```

---

## 🎓 What This Project Demonstrates

- Solid foundation in mobile frontend development
- Attention to UX details and interaction quality
- Ability to integrate backend services and APIs
- Clean separation of concerns and maintainable structure
- Strong learning mindset and readiness for growth in a frontend role

---

**Built with ❤️ using React Native & Supabase**
