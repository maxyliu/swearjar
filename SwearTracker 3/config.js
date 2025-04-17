require("dotenv").config();

/**
 * Base configuration for the Discord Swear Jar Bot
 */
const config = {
    // Discord Bot Token - KEEP THIS SECRET!
    token: process.env.DISCORD_TOKEN,

    // Application ID for slash commands
    applicationId: process.env.APPLICATION_ID,

    // Intents needed by the bot
    intents: ["Guilds", "GuildMessages", "GuildMembers", "MessageContent"],

    // Default color for embeds
    colors: {
        primary: "#4287f5",
        success: "#42f569",
        warning: "#f5d442",
        error: "#f54242",
    },

    // Base list of swear words to track
    // These are intentionally kept mild for the example
    swearWords: [
        "ass",
        "asshole",
        "bitch",
        "bastard",
        "crap",
        "damn",
        "dick",
        "douche",
        "douchebag",
        "fuck",
        "fucking",
        "goddamn",
        "hell",
        "motherfucker",
        "piss",
        "pussy",
        "shit",
        "Cunt",
        "Ass",
        "Fuck",
        "Bitch",
        "Fag",
        "kys",
        "peenar",
        "cunmy",
        "Faggot",
        "Dick",
        "Pussy",
        "Bastard",
        "Bullshit",
        "Cock",
        "Piss",
        "Prick",
        "Slut",
        "Twat",
        "Tranny",
        "Wanke",
        "whore",
        "horseshit",
        "arse",
        "wtf",
        "tf",
        "chink",
        "abeed",
        "dyke",
        "clitirus",
        "dike",
        "retard",
        "penis",
        "cum",
        "orgasm",
        "penus",
        "vagina",
        "sperm",
        "fetish",
        "clit",
        "bollock",
        "bullock",
        "fck"
        
        
    ],

    // Response messages when users swear
    swearResponses: {
        // Random responses for single swear
        single: [
            "You have the right to remain silent, {username}—especially if you’re gonna curse.",
            "Dispatch, we’ve got a Code 5 on {username}—swearing in public.",
            "Ticket issued for verbal misconduct. Pay the jar, {username}",
            "This is your profanity patrol speaking. Drop the swears and walk away, {username}.",
            "Officer Jar here. That’s a direct violation of Server Conduct Code 187—profanity by {username}.",
            "You’re on camera, {username}. That’s a direct violation of Server Conduct Code 187—profanity.",
            "License and vocabulary, please. You’re being pulled over for bad language, {username}.",
            "You’re being pulled over for bad language, {username}."
            
        ],

        // Random responses for multiple swears
        multiple: [
            "Whoa, {username}, that’s a whole felony paragraph. {count} fines applied.",
            "{username}, you just dropped {count} swears in one message. That’s a record—and a fine.",
            "{username}, that message broke the swear limit. {count} counts of verbal misconduct logged",
            "{username}, you triggered the profanity multiplier: {count}x foul detected.",
            "{username}, you are now being fined for {count} separate infractions. You’re on thin ice."
        ],
    },

    // Words to exclude from swear detection (e.g. legitimate words that contain swear words)
    whitelist: [
        "assist",
        "assassin",
        "class",
        "pass",
        "assembly",
        "assign",
        "assumption",
        "mass",
        "bass",
        "grass",
        "brass",
        "hello"
    ],

    // Fun facts about swearing for the swearfact command
    swearFacts: [
        "Swearing has been scientifically proven to help relieve pain.",
        "Children typically learn their first swear word at age two.",
        "The average person swears about 80 to 90 times per day.",
        "Swear words are stored in a different part of the brain than other language.",
        "People who swear a lot are often more honest than those who don't.",
        "The most commonly used swear word in English is the F-word.",
        "Swearing increases when people are in emotional situations.",
        "Intelligent people actually tend to swear more than those with lower IQs.",
        "The act of swearing activates the 'fight or flight' response in your body.",
        "Swearing can help build team bonding and solidarity in some work environments.",
        "Using swear words can increase the perceived intensity and humor of a story.",
        "In many languages, swear words are among the first words learned by non-native speakers.",
        "The brain processes swear words differently than it processes other language.",
        "Swear words often remain intact in people with certain types of brain damage.",
        "Taboo words can command more attention than non-taboo words."
    ]
};

module.exports = config;
