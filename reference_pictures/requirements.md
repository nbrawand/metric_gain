# Workout Progressive Web App - Requirements Document

## 1. Overview

A progressive web app designed to help users optimize their strength training through scientifically-backed progressive overload and auto-regulation. The app manages mesocycles (3-7 week training blocks) with intelligent volume and intensity progression based on user feedback.

## 2. User Management

### 2.1 Authentication
- Users must create accounts and log in
- All user data stored in cloud database
- Multi-device support via cloud sync
- PWA installation for offline capability

## 3. Core Data Entities

### 3.1 Mesocycle
- **Duration**: 3-7 weeks
- **Structure**:
  - Weeks 1-(N-1): Training weeks
  - Week N: Deload week (50% sets, 50% weight)
- **Frequency**: User-defined (e.g., 3x/week, 6x/week for PPL)
- **Workouts**: Multiple workouts that repeat throughout the mesocycle
- **Volume Tracking**: Calculated as weight × reps × sets
- **Status**: Current, Completed
- **Copying**: Users can copy existing mesocycles

### 3.2 Workouts
- Belong to a mesocycle
- Repeat weekly throughout the mesocycle (e.g., Mon/Wed/Fri or Push/Pull/Legs)
- Contain multiple exercises
- Can be created from templates

### 3.3 Exercises
- **Pre-loaded Database**: App ships with standard exercise library
- **Custom Exercises**: Users can create their own
- **Properties**:
  - Name
  - Exercise Type: Freeweight, Machine, Bodyweight, Cable
  - Muscle Group (primary)
  - Sets (max 15 per exercise)

### 3.4 Muscle Groups
- **Fixed Categories**: Chest, Back, Legs, Shoulders, Delts, Bis, Tris, Calfs, Abs
- Users cannot create custom muscle groups

## 4. Progressive Overload System

### 4.1 Weight Progression
- **Base Algorithm**: 2% weight increase
- **Adaptive Adjustment**: If user changes weight during workout:
  - Calculate equivalent rep adjustment
  - Example: Recommended 100lbs × 8 reps → User enters 110lbs → App suggests ~6 reps
  - If weight deviation is too large, don't suggest new rep count
- **Future Extensibility**: Architecture must support ML-based progression algorithms

### 4.2 RIR (Reps in Reserve) Progression
- Start of mesocycle: 3 RIR recommended
- End of mesocycle: 0 RIR recommended
- Linear progression throughout mesocycle
- **Note**: RIR is recommended only; actual RIR not tracked

### 4.3 Volume Progression
- Volume increases based on user feedback
- Sets added to exercises based on auto-regulation algorithm
- Maximum 15 sets per exercise

## 5. Auto-Regulation System

### 5.1 Soreness Feedback (Pre-Muscle Group)
Asked at the **beginning** of each muscle group during workout:

**"When did you recover from your last [muscle group] workout?"**

Options (stored as 0-3):
1. Didn't get sore (0)
2. Recovered a while ago (1)
3. Recovered just in time (2)
4. Still sore (3)

**Impact**: Influences sets added for next workout

### 5.2 Performance Feedback (Post-Muscle Group)
Asked at the **end** of each muscle group during workout:

**Pump Level:**
- No pump (0)
- Light pump - like I noticed I was lifting (1)
- Good pump (2)
- Amazing pump (3)

**Challenge Level:**
- Easy (0)
- Good (1)
- Difficult (2)
- Very difficult (3)

**Impact**: Combined with soreness data to determine sets added for next workout

### 5.3 Set Addition Algorithm
- **Initial Version**: Simple rule-based algorithm
- **Architecture**: Must support business logic + machine learning models
- **Logic**: Based on combination of:
  - Soreness level (0-3)
  - Pump level (0-3)
  - Challenge level (0-3)
- **Constraint**: Never exceed 15 sets per exercise

## 6. Deload Week

### 6.1 Structure
- Automatically applied to final week of mesocycle
- **Volume Reduction**: 50% of sets
- **Intensity Reduction**: 50% of weight

### 6.2 Purpose
- Recovery and adaptation
- Preparation for next mesocycle

## 7. Mesocycle Transition

### 7.1 Starting New Mesocycle
1. User completes mesocycle (including deload week)
2. User selects which week from previous mesocycle to start from
3. App copies weights/reps from selected week
4. Volume (sets) starts lower than copied week
5. Progressive overload continues from new baseline

### 7.2 Week Selection
- User sees list of weeks (Week 1, Week 2, etc.)
- No additional details shown for each week
- Selected week's weights/reps become starting point

## 8. Templates

### 8.1 Mesocycle Templates
- Pre-built mesocycle structures
- Users can copy and customize
- Include:
  - Workout split (e.g., PPL, Upper/Lower)
  - Exercise selection
  - Starting sets/reps/weights (user customizes weights)
  - Frequency

### 8.2 Template Library
- Shipped with app
- Users can save their own mesocycles as templates

## 9. Data Recording & Analytics

### 9.1 Workout Data Captured
Per set:
- Weight (lbs or kg)
- Reps completed
- Timestamp

Per muscle group:
- Soreness level (0-3)
- Pump level (0-3)
- Challenge level (0-3)

### 9.2 Data Storage
- **All data must be stored** for future analytics
- Numerical format for ML compatibility
- No user-facing analytics/graphs in initial version
- Data structure must support future statistical models

## 10. UI/UX Requirements

### 10.1 Design Principles
- **Minimalist**: Clean, distraction-free interface
- **Dark Theme**: Primary color scheme
- **Mobile-First**: Optimized for phone usage during workouts
- **Progressive Web App**: Installable, offline-capable

### 10.2 Key Screens (from reference images)

**Mesocycles Screen:**
- List of mesocycles
- Status indicator (Current/Completed)
- Duration and frequency display
- Create new mesocycle button

**Workout Screen:**
- Exercise list grouped by muscle group
- Set tracking with weight/reps input
- Visual feedback (checkboxes/colored indicators)
- Quick actions menu (hamburger)
- Calendar view for mesocycle progress

**Navigation:**
- Bottom nav bar: Workout, Mesos, Templates, Exercises, More
- Context menus for additional actions

### 10.3 Interaction Patterns
- Tap to edit weight/reps
- Quick completion checkboxes
- Muscle group sections with visual separators
- Modal popups for feedback collection

## 11. Technical Requirements

### 11.1 Architecture
- **Frontend**: Modern PWA framework (React, Vue, or similar)
- **Backend**: RESTful API or GraphQL
- **Database**: Cloud-hosted relational or document database
- **Scalability**: Designed to handle growth
- **Extensibility**: Plugin architecture for future ML models

### 11.2 Progressive Web App
- Service workers for offline functionality
- App manifest for installation
- Responsive design
- Fast load times

### 11.3 Data Persistence
- Real-time sync with cloud database
- Offline queue for workout data entry
- Conflict resolution for multi-device usage

## 12. Future Extensibility

### 12.1 Machine Learning Integration
- Architecture must support ML model integration for:
  - Weight progression suggestions
  - Volume auto-regulation
  - Injury risk prediction
  - Personalized programming

### 12.2 Statistical Models
- Framework for A/B testing progression algorithms
- Support for user-specific model training
- Data pipeline for model improvement

### 12.3 Analytics Dashboard (Future)
- User-facing progress visualization
- Performance trends
- Volume/intensity tracking over time

## 13. Features Explicitly NOT Included (V1)

- User-facing analytics/graphs
- Body weight tracking
- Rest timers between sets
- Custom muscle groups
- Muscle priorities
- Social features
- Nutrition tracking

## 14. Success Metrics

- User retention through mesocycle completion
- Workout adherence rates
- Data quality for ML training
- Progressive overload adherence
- User satisfaction with recommendations

---

## Appendix A: Muscle Group Reference

1. Chest
2. Back
3. Legs
4. Shoulders
5. Delts
6. Bis (Biceps)
7. Tris (Triceps)
8. Calfs
9. Abs

## Appendix B: Feedback Scales (Numerical Storage)

**Soreness (0-3):**
- 0: Didn't get sore
- 1: Recovered a while ago
- 2: Recovered just in time
- 3: Still sore

**Pump (0-3):**
- 0: No pump
- 1: Light pump
- 2: Good pump
- 3: Amazing pump

**Challenge (0-3):**
- 0: Easy
- 1: Good
- 2: Difficult
- 3: Very difficult

## Appendix C: Example User Flow

1. User creates account and logs in
2. User selects or creates a mesocycle (e.g., "Push Pull Legs", 5 weeks, 6 days/week)
3. User adds exercises to each workout from exercise database
4. User starts Week 1, Day 1 (Push)
5. For each muscle group:
   - App asks soreness level before first exercise
   - User completes sets, entering weight/reps
   - App suggests next set weight/reps based on previous performance
   - After muscle group complete, app asks pump and challenge level
6. User completes workout
7. App calculates volume and adjusts next week's sets based on feedback
8. Weeks 2-4 repeat with progressive overload
9. Week 5 is automatic deload (50% weight, 50% sets)
10. User selects Week 3 to start new mesocycle from
11. New mesocycle begins with Week 3's weights but lower volume
