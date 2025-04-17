# Discord Swear Jar Bot

A Discord bot that tracks and counts how many times users swear in your Discord server. The bot identifies swear words in messages (including bypass attempts), logs usage details, and provides detailed statistics through commands.

## Features

- **Advanced Swear Detection**: Detects swear words even with bypass techniques like special characters, spaces between letters, and character substitutions
- **Persistent Tracking**: Stores all data in PostgreSQL database for permanent records
- **Detailed Statistics**: View user stats, server leaderboards, word-specific stats, and more
- **Admin Controls**: Reset users, toggle notifications, add/remove words, and more
- **Customizable**: Easily add or remove words from the tracking list

## Commands

### User Commands

- `/stats [user]` - Shows swear statistics for yourself or another user
- `/history [user]` - View recent swear messages for a user
- `/leaderboard [limit]` - View the server's swear leaderboard
- `/serverstats` - View overall swearing statistics for the server
- `/wordstats [word]` - View statistics for a specific swear word
- `/swearfact` - Get a random fact about swearing
- `/help` - Shows information about available commands

### Admin Commands

- `/resetuser [user]` - Reset a user's swear count
- `/togglenotify [enabled]` - Toggle swear word notifications in the current channel
- `/addword [word]` - Add a new word to the swear list
- `/removeword [word]` - Remove a word from the swear list
- `/cleardata` - Clear all swear data (CAUTION: cannot be undone)

## Setup

1. Create a `.env` file with the following variables:
   ```
   DISCORD_TOKEN=your_discord_token_here
   APPLICATION_ID=your_application_id_here
   DATABASE_URL=postgresql://user:password@localhost:5432/dbname
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Run the bot:
   ```
   npm start
   ```

## Required Bot Permissions

- Read Messages/View Channels
- Send Messages
- Read Message History
- Use Slash Commands
- Message Content Intent (must be enabled in Discord Developer Portal)

## Technical Details

- Built with Discord.js
- PostgreSQL database for persistent storage
- Advanced regex patterns for bypass detection
- Character substitution mapping for detecting evasion tactics

## License

ISC License