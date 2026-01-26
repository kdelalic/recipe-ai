# Firebase Context

## Services Used

- **Firestore**: Recipe storage and user favorites
- **Authentication**: User sign-up, login, sessions
- **Cloud Functions**: Background tasks (Node.js)

## Structure

```
firebase/
├── functions/
│   └── index.js       # Cloud Functions
├── firebase.json      # Config
└── .firebaserc        # Project aliases
```

## Cloud Functions (`functions/index.js`)

| Function | Schedule | Purpose |
|----------|----------|---------|
| `scheduledDeletion` | Every 24h | Delete archived recipes >30 days old |
| `pingBackendHealthCheck` | Every 10min | Keep backend warm |
| `pingFrontendHealthCheck` | Every 10min | Monitor frontend |

## Environment Variables

Required in Firebase environment:
- `BACKEND_URL`
- `FRONTEND_URL`

## Commands

```bash
firebase deploy --only functions    # Deploy functions
firebase emulators:start            # Local testing
```
