const axios = require("axios").default;
const express = require('express');
const promClient = require('prom-client');
const Discord = require("discord.js");
const winston = require("winston");

const logger = winston.createLogger({
    level: "info",
    format: winston.format.json()
});

const metrics = registerMetrics()

startMetricsServer(metrics);

const client = new Discord.Client();

client.on("ready", () => {
    logger.info(`Logged in as ${client.user.tag}!`);
});

client.on("message", msg => {
    if (!msg.mentions.has(client.user)) {
        logger.info(`no mention`);
        return;
    }
    // Ignore bot messages to prevent infinite conversation
    if (msg.author.bot) {
        return;
    }
    let msgs = msg.content.split(" ");
    if (msgs.length === 0) {
        logger.info(`no message`);
        return;
    }

    const backendClient = new BackendClient(
        process.env.BACKEND_URL,
        process.env.BACKEND_TOKEN,
        logger,
        metrics,
    );

    switch (msgs[1]) {
        case "submit!":
            metrics.commandCount.inc({ command: "submit" });
            backendClient.submit(msg, msgs[2]);
            break;
        case "last!":
            metrics.commandCount.inc({ command: "last" });
            backendClient.checkLastSubmission(msg);
            break;
        default:
            help(msg);
    }
});

client.login(process.env.DISCORD_TOKEN);

class BackendClient {
    constructor(backendURL, backendToken, logger, metrics) {
        this.url = backendURL;
        this.defaultReqConfig = {
            headers: {
                Authorization: `Bearer ${backendToken}`
            }
        };
        this.logger = logger;
        this.metrics = metrics;
    }

    submit(msg, submission) {
        const submitter = msg.author;
        const body = {
            submission: submission,
            ts: msg.createdTimestamp
        };

        axios
            .post(
                `${this.url}/submit/discord/${submitter.id}`,
                body,
                this.defaultReqConfig
            )
            .then(resp => {
                // Backend returns text data to reply to user
                msg.reply(resp.data);
                this.logger.info(
                    `${submitter.username} submits ${submission}, result ${resp.data}`
                );
            })
            .catch(err => {
                this.metrics.errorCount.inc();
                msg.reply(
                    `Submission failed, please try again or find someone to fix me X_X.`
                );
                this.logger.error(
                    `Submission for ${submitter.username} failed, err ${err}`
                );
            });
    }

    checkLastSubmission(msg) {
        const submitter = msg.author;
        axios
            .get(
                `${this.url}/submit/discord/last/${submitter.id}`,
                this.defaultReqConfig
            )
            .then(resp => {
                msg.reply(resp.data);
                this.logger.info(`${submitter.username} ${resp.data}`);
            })
            .catch(err => {
                this.metrics.errorCount.inc();
                msg.reply(
                    `Check last submission failed, please try again or find someone to fix me X_X.`
                );
                this.logger.error(
                    `Last submission for ${submitter.username} failed, err ${err}`
                );
            });
    }
}

function registerMetrics() {
    const collectDefaultMetrics = promClient.collectDefaultMetrics;
    const Registry = promClient.Registry;
    const register = new Registry();
    collectDefaultMetrics({ register });
    const commandCount = new promClient.Counter({
        name: 'command_count',
        help: 'Count of commands called by users',
        labelNames: ['command'],
    });
    const errorCount = new promClient.Counter({
        name: 'error_count',
        help: 'Count of errors',
    });
    register.registerMetric(commandCount);
    register.registerMetric(errorCount);
    return {
        register: register,
        commandCount: commandCount,
        errorCount: errorCount,
    }
}

function startMetricsServer(metrics) {
    const server = express();
    server.get('/metrics', (req, res) => {
        res.set('Content-Type', metrics.register.contentType);
        res.end(metrics.register.metrics());
    });

    const port = process.env.PORT;
    logger.info(`Metrics server listening to ${port}, metrics exposed on /metrics endpoint`);
    server.listen(port);

}

function help(clientMsg) {
    clientMsg.reply(`I am very disciplined! I will only talk to you if you mention me and follow these rules!\n
    1. To submit your guess, say submit! followed by your guess \n
    2. To query your previous guesses, say last! \n
    `);
}
