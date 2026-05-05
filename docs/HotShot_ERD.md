# HotShot ERD

```mermaid
erDiagram
  USER {
    string id PK
    string username
    string passwordHash
    int points
    int wins
    int losses
  }

  SESSION {
    string token PK
    string userId FK
  }

  GAME {
    string id PK
    string sport
    string away
    string home
    datetime startsAt
    string status
    int awayOdds
    int homeOdds
    string winner
    string storyline
  }

  BET {
    string id PK
    string userId FK
    string gameId FK
    string team
    int odds
    int wager
    int potentialWin
    datetime createdAt
    string result
    datetime settledAt
  }

  PARLAY {
    string id PK
    string userId FK
    int wager
    datetime createdAt
    string result
  }

  PARLAY_LEG {
    string id PK
    string parlayId FK
    string gameId FK
    string team
    int odds
  }

  USER ||--o{ SESSION : owns
  USER ||--o{ BET : places
  USER ||--o{ PARLAY : creates
  GAME ||--o{ BET : receives
  PARLAY ||--|{ PARLAY_LEG : contains
  GAME ||--o{ PARLAY_LEG : included_in
```

## Relationship Summary

- One user can have many login sessions.
- One user can place many single-game bets.
- One user can create many parlays.
- One game can have many single-game bets.
- One parlay contains two or more parlay legs.
- Each parlay leg points to one game and one selected team.

## Notes

The current backend stores users, sessions, games, bets, parlays, and leaderboard totals in PostgreSQL. The ERD summarizes the relationships used by the backend API.
