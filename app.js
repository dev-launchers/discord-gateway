const Discord = require('discord.js');
const winston = require('winston');
const axios = require('axios').default;

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
        const submitter = msg.author;
        axios.post(`${this.url}/submit/discord/${submitter.id}`, {
            "submission": submission,
            "ts": msg.createdTimestamp,
        }).then(resp => {
            // Backend returns text data to reply to user
            msg.reply(resp.data)
            this.logger.info(`${submitter.username} submits ${submission}, result ${resp.data}`)
        }).catch(err => {
            msg.reply(`Submission failed, please try again or find someone to fix me X_X.`)
            this.logger.error(`Submission for ${submitter.username} failed, err ${err}`)
        })
    };

    checkLastSubmission(msg) {
        axios.get(`${this.url}/submit/discord/last/${submitter.id}`)
            .then(resp => {
                msg.reply(`last submission is ${resp.data}`);
                this.logger.info(`${submitter.username} last submission is ${submission}`);
            })
            .catch(err => {
                msg.reply(`Check last submission failed, please try again or find someone to fix me X_X.`);
                this.logger.error(`Last submission for ${submitter.username} failed, err ${err}`);
            })
    };
}

function help(clientMsg) {
    clientMsg.reply(`I am very disciplined! I will only talk to you if you follow these rules!\n
    1. To submit your guess, say submit followed by your guess <> \n
    2. To query your previous guesses, say last \n
    `)
}
