# Roadmap

Ideas and features to come back to later. Not commitments.

## Location-based reminders

**Idea:** attach a place to a task (e.g. "buy spray" → the pharmacy) and get reminded
only when you're near that place, instead of at a fixed time.

**Feasibility notes (Sep 2026):**

- Not possible in the browser in the background. The Geolocation API only works while the
  page is open and in the foreground; the W3C Geofencing spec was abandoned.
- Possible on native iOS/Android via OS geofencing (CoreLocation region monitoring,
  Android Geofencing API). The OS wakes the app on region entry using cell/Wi-Fi and
  low-power sensors, so the GPS does *not* need to be always on. Same mechanism as
  Apple Reminders and Todoist.
- Limits: 20 regions per app on iOS, 100 on Android. Realistic radius 100–200 m, trigger
  may lag by tens of seconds. Requires the "Always" location permission, which many users
  decline.

**Possible path:**

1. Browser-only first step: on app open, read the current position and surface nearby
   tasks at the top of the list. No background behaviour, no special permission.
2. Wrap the existing React app with Capacitor and add a geofencing plugin
   (community plugin, or the commercial Transistorsoft one). Alternative: Expo with
   `expo-location`, but that means rewriting the UI in React Native.
3. Place picker to pick "the pharmacy": Nominatim (OpenStreetMap, free), or Google
   Places / Mapbox for better results beyond the free tier.

**Data model:** `Task` would gain an optional `location?: { name: string; lat: number;
lng: number; radiusM: number }`.
