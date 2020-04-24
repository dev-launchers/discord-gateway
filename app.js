const Discord = require('discord.js');
const winston = require('winston');

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
});

const client = new Discord.Client();

client.on('ready', () => {
    logger.info(`Logged in as ${client.user.tag}!`);
});

client.on('message', msg => {
    // Ignore bot messages to prevent infinite conversation 
    if (msg.author.bot) {
        return
    }

    let msgs = msg.content.split(' ')
    if (msgs.length === 0) {
        logger.info(`no message`)
        return
    }

    const backendClient = new WorkerClient(process.env.WORKER_URL, logger);
    switch (msgs[0]) {
        case 'submit':
            backendClient.submit(msg, msgs[1]);
            break;
        case 'last':
            backendClient.checkLastSubmission(msg);
            break;
        default:
            help(msg)
    }
});

client.login(process.env.DISCORD_TOKEN);

class WorkerClient {
    constructor(backendURL, logger) {
        this.url = backendURL;
        this.logger = logger
    }

    submit(msg, submission) {
        this.logger.info(`${msg.author} submits ${submission}`)
    };

    checkLastSubmission(msg) {
        this.logger.info(`${msg.author} ask for last submission`)
    };
}

function help(clientMsg) {
    clientMsg.reply(`I am very disciplined! I will only talk to you if you follow these rules!\n
    1. To submit your guess, say submit followed by your guess <> \n
    2. To query your previous guesses, say last \n
    `)
}
