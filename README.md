# STuDOS — Student Innovation & Opportunity Network 🚀

> **StuDos** is a mobile innovation ecosystem where students discover hackathons & fellowships, find complementary teammates, pitch ideas, showcase prototypes, and accelerate their startup or engineering ambitions.

---

## 📱 Quick Start: Run on Your Phone with Expo Go

Follow these simple steps to run StuDos directly on your physical iOS or Android device.

### 1. Prerequisites

1. **Install Node.js (v18.x or v20.x LTS)** on your computer:  
   Download from [nodejs.org](https://nodejs.org/)
2. **Install Expo Go on your mobile phone**:
   - **iOS**: Download [Expo Go on the App Store](https://apps.apple.com/app/expo-go/id982107779)
   - **Android**: Download [Expo Go on Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent)
3. Ensure your computer and phone are connected to the **same Wi-Fi network**.

---

### 2. Clone and Install Dependencies

```bash
# 1. Clone this repository
git clone https://github.com/chaitu64/Studos-app.git

# 2. Enter project directory
cd Studos-app

# 3. Install required packages
npm install
```

---

### 3. Launch Development Server

```bash
# Start Expo development server
npx expo start
```

Once Metro Bundler starts in your terminal:
- **On Android**: Open the **Expo Go** app and tap **"Scan QR code"**, then scan the QR code displayed in your terminal.
- **On iOS**: Open the default **Camera app**, point it at the QR code in your terminal, and tap the yellow banner that says **"Open in Expo Go"**.

> 💡 **Troubleshooting Connection / Different Wi-Fi networks**:
> If your phone cannot connect to your laptop's IP address, start Expo with tunneling:
> ```bash
> npx expo start --tunnel
> ```
> This creates a secure cloud tunnel allowing your phone to load the app from anywhere.

---

## ✨ Features Overview

### 1. 💡 Idea Hub
- Pitch ideas with problem statements, stage tags (Concept, Prototype, Live MVP), and target teammates.
- Upvote, comment, and bookmark promising peer initiatives.

### 2. 🤝 Team Formation & Open Roles
- Create teams for hackathons, startup competitions, or open-source projects.
- Define specific role openings (e.g., Frontend React Native, ML Engineer, UI/UX Designer).
- One-tap applications with custom messages and automated notifications to team leads.

### 3. ⚡ Opportunities & Hackathons
- Curated database of verified student hackathons, fellowship grants, accelerator batches, and internships.
- Live countdown badges, prize pools, and eligibility criteria.

### 4. 🎴 Collaborator Discovery (Swipeable Matching)
- Interactive discovery cards showcasing student skills, university, and project interests.
- Fluid swipe gestures (Swipe right to connect / bookmark, swipe left to pass) powered by physical PanResponder animations.

### 5. 💬 Real-Time Messaging & Chat Rooms
- Dedicated 1-on-1 direct messaging threads.
- Group community chat rooms (e.g., `#general-builders`, `#hackathon-squads`, `#ai-ml-innovators`).

### 6. 🏆 Builder Impact Leaderboard
- Recognition system awarding points for publishing ideas, shipping projects, and mentoring peers.

### 7. 👤 Portfolio & Skill Showcases
- Verified student profiles highlighting GitHub, LinkedIn, portfolios, branch, and active status.

---

## 🛠️ Tech Stack

- **Framework**: React Native with [Expo SDK 57](https://expo.dev)
- **Routing & Navigation**: Expo Router v5 (file-based navigation)
- **Language**: TypeScript (`strict` mode)
- **Icons**: `@expo/vector-icons` (Ionicons)
- **State & Storage**: React Context + `@react-native-async-storage/async-storage`
- **UI & Layout**: Custom Dark Charcoal (`#090B0F`) theme with Vivid Red (`#FF3B30`) accents adhering to an 8-point spacing system.

---

## 📁 Project Structure

```text
studos-app/
├── src/
│   ├── app/                      # Expo Router screens
│   │   ├── (tabs)/               # Bottom tab navigation (Home, Discover, Create, Chat, Profile)
│   │   ├── ideahub/              # Idea listing, details, and submission
│   │   ├── teams/                # Team directory, creation, and detail screens
│   │   ├── opportunities/        # Hackathons and fellowships
│   │   ├── projects/             # Project showcases & submissions
│   │   ├── chat/                 # 1-on-1 direct messaging
│   │   ├── chat-rooms/           # Topic-based community rooms
│   │   ├── notifications/        # Activity alerts & invitations
│   │   ├── leaderboard/          # Rankings & point rules
│   │   ├── search/               # Global search across all entities
│   │   └── settings/             # User preferences & account settings
│   ├── components/               # Reusable UI & Card components
│   │   ├── cards/                # IdeaCard, TeamCard, OpportunityCard, SwipeProfileCard
│   │   ├── navigation/           # Custom Header and navigation bars
│   │   └── ui/                   # Button, Card, Badge, Avatar, Chip, Input, Modal
│   ├── constants/                # Theme colors, Typography, Spacing tokens
│   ├── context/                  # AppContext with persistent AsyncStorage
│   ├── services/                 # Mock database seeds & mock data
│   └── types/                    # Core TypeScript models
├── app.json                      # Expo application manifest
├── package.json                  # NPM dependencies & scripts
└── tsconfig.json                 # TypeScript compiler configuration
```

---

## 🧪 Developer Commands

```bash
# Typecheck TypeScript files
npx tsc --noEmit

# Lint codebase
npx expo lint

# Verify Expo dependencies
npx expo-doctor

# Clear Metro cache if experiencing bundle issues
npx expo start -c
```

---

## 📄 License

This project is built for student innovation. Distributed under the MIT License.
