# Pong

**Type:** Game Replace
**Difficulty:** 2
**Created:** Session 1 (2026-03-21)
**Original wish:** "not a maze, you pick"

## What it does
Replaces the maze entirely with a classic Pong game. Player controls the bottom paddle (arrow keys / A+D), AI controls the top. First to 5 points wins the level.

## How to remix
- Change `winScore` to adjust game length
- Change `player.width` for paddle size (huge paddle = easy mode, tiny = hard)
- Change `ai.speed` for AI difficulty
- Add multiple balls by duplicating the ball object
- Add power-ups by spawning collectibles that modify paddle size or ball speed
- Add obstacles in the middle of the arena

## Key parameters
| Parameter | Default | Effect |
|---|---|---|
| `winScore` | 5 | Points needed to win |
| `player.width` | 80 | Player paddle width (px) |
| `player.speed` | 5 | Player paddle speed |
| `ai.width` | 80 | AI paddle width (px) |
| `ai.speed` | 3.5 | AI tracking speed |
| `ball.dx/dy` | 3 | Ball velocity |
| `ball.radius` | 6 | Ball size |
