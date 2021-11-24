const Discord = require("discord.js");
const fs = require("fs")
const config = JSON.parse(fs.readFileSync("config.json", "utf-8"))
const configPath = "./config.json";

const client = new Discord.Client({ intents: ["GUILDS", "GUILD_MESSAGES", "GUILD_MEMBERS"] })

//Basic Config Shit
let prefix = config["prefix"]
let color = config["color"]


//Infraction Handler 
let infractions = new Map();

//Start Up Shit
client.once("ready", () => {
    console.log("#################################");
    console.log("#################################");
    console.log("##        Sleepin_ Bots        ##");
    console.log("##         GrayHay Bot         ##");
    console.log("##           Online            ##");
    console.log("#################################");
    console.log("#################################");
})

//Media Watcher 
client.on("messageCreate", message => {
    if (message.channel.type === "dm" || message.channel.type === "group") return;
    if (message.attachments.size === 0) return;
    if (permCheck(message.author, message.member) >= config["permissions"]["autobypass"] || config["bypasslist"].includes(message.author.id)) return;
    if (config["channels"].includes(message.channel.id)) {
        if (infractions.has(message.author.id)) {
            infractions.set(message.author.id, infractions.get(message.author.id) + 1)
            if (infractions.get(message.author.id) >= config["totalInfractions"]) {
                message.channel.send(config["messages"]["toManyMessages"].replace("%u", message.author.toString()).replace("%c", message.guild.channels.cache.get(config["redirectChannel"]).toString()))
                let imgMap = [];
                message.attachments.forEach(attachment => {
                    imgMap.push(attachment.attachment)
                })
                message.guild.channels.cache.get(config["redirectChannel"]).send(`From: ${message.author.toString()}\n${imgMap.join("\n")}`)
                message.delete()
            }
            setTimeout(() => {
                infractions.set(message.author.id, infractions.get(message.author.id) - 1)
            }, config["infractionTimer"] * 1000);
        } else {
            infractions.set(message.author.id, 1)
            setTimeout(() => {
                infractions.set(message.author.id, infractions.get(message.author.id) - 1)
            }, config["infractionTimer"] * 1000);
        }
    }
})



//CMDs
client.on("messageCreate", message => {
    if (message.channel.type === "dm" || message.channel.type === "group") return;
    if (!message.content.startsWith(prefix)) return;
    let args = message.content.substring(prefix.length).split(" ");

    if (args[0] === "set") {
        set(message, args)
    } else if (args[0].toLowerCase() === "whitelist") {
        whitelist(message, args)
    } else if (args[0].toLowerCase() === "bypasslist") {
        bypasslist(message, args)
    } else if (args[0].toLowerCase() === "channellist" || args[0].toLowerCase() === "channels" || args[0].toLowerCase() === "channellists" || args[0].toLowerCase() === "channel") {
        channellist(message, args)
    } else if (args[0].toLowerCase() === "help") {
        help(message)
    }


})

async function help(message) {
    let embed = new Discord.MessageEmbed()
    .setColor(color)
    .setTitle(`Help Page`)
    .setDescription(`List of commands to use`)
    .setFields({name: `\`${prefix}set\`:`, value:`Allows you to edit settings for bot.`},
    {name: `\`${prefix}whitelist [add/remove/list]\`:`, value:`Adds, removes, or lists whitelisted user ids.`},
    {name: `\`${prefix}bypasslist [add/remove/list]\`:`, value:`Adds, removes, or lists bypassed listed user ids.`},
    {name: `\`${prefix}[channel(s), channellist(s)] [add/remove/list]\`:`, value:`Adds, removes, or lists watched channels.`, inline: true}
    )
    message.channel.send({ embeds: [embed] })
}

async function channellist(message, args) {
    message.delete()
    if (await permCheck(message.author, message.member) <= 1) return returnInvaildPermssion(message, 1);

    if (!args[1]) returnInvaildSyntax(message, `${args[0].replace(prefix, "")} add/remove/list`);
    else if (args[1].toLowerCase() === "add") {
        let channel = message.mentions.channels.first()

        if (channel) {
            if (config["channels"].includes(channel.id)) return returnInvaildSyntax(message, `${args[0].replace(prefix, "")} add id`);

            config["channels"].push(channel.id)

            fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
            returnAddEmbed(message.channel, channel.name, "channellist")

        } else if (message.guild.channels.cache.has(args[2])) {
            channel = await message.guild.channels.fetch(args[2]).catch(returnInvaildSyntax(message, `${args[0].replace(prefix, "")} add #channel/channelID`));
            config["channels"].push(channel.id)
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2))

            returnAddEmbed(message.channel, args[2], "channellist")
        } else {
            returnInvaildSyntax(message, `${args[0].replace(prefix, "")} add #channel/channelID`);
        }
    } else if (args[1].toLowerCase() === "remove") {
        let channel = message.mentions.channels.first()
        if (!config["channels"].includes(channel.id)) return returnInvaildSyntax(message, `${args[0].replace(prefix, "")} remove #channel/channelID (Channel not in channel list)`);

        if (channel) {
            config["channels"].splice(config["channels"].indexOf(channel.id), 1)

            fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
            returnRemoveEmbed(message.channel, channel.name, "channellist")

        } else if (message.guild.channels.cache.has(args[2])) {
            channel = await message.guild.channels.fetch(args[2]).catch(returnInvaildSyntax(message, `${args[0].replace(prefix, "")} add #channel/channelID`));
            config["channels"].push(channel.id)
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2))

            returnRemoveEmbed(message.channel, args[2], "channellist")
        } else {
            returnInvaildSyntax(message, `${args[0].replace(prefix, "")} remove #channel/channelID`);
        }
    } else if (args[1].toLowerCase() === "list") {
        let embed = new Discord.MessageEmbed()
            .setColor(color)
            .setTitle(`Channel List`)
            .setDescription(`**List of watched channel ids**\n\n\`${config["channels"].join("\n")}\``)
        message.channel.send({ embeds: [embed] })
    } else { returnInvaildSyntax(message, `${args[0].replace(prefix, "")} add/remove/list`) }
}

async function bypasslist(message, args) {
    message.delete()
    if (await permCheck(message.author, message.member) < 2) return returnInvaildPermssion(message, 2);

    if (!args[1]) returnInvaildSyntax(message, "bypasslist add/remove/list");
    else if (args[1].toLowerCase() === "add") {
        let user = message.mentions.users.first()

        if (user) {
            if (config["bypasslist"].includes(user.id)) return returnInvaildSyntax(message, "bypasslist add @user/userID (User Already Added)");

            config["bypasslist"].push(user.id)

            fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
            returnAddEmbed(message.channel, user.username, "bypasslist")

        } else if (message.guild.members.fetch(args[2])) {
            user = await message.guild.members.fetch(args[2])
            config["bypasslist"].push(user.id)
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2))

            returnAddEmbed(message.channel, args[2], "bypasslist")
        } else {
            returnInvaildSyntax(message, "bypasslist add/remove/clear @user/userID");
        }
    } else if (args[1].toLowerCase() === "remove") {
        let user = message.mentions.users.first()
        if (!config["bypasslist"].includes(user.id)) return returnInvaildSyntax(message, "bypasslist remove @user/userID (User Not bypasslisted)");
    
        if (user) {
            config["bypasslist"].splice(config["bypasslist"].indexOf(user.id), 1)

            fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
            returnRemoveEmbed(message.channel, user.username, "bypasslist")

        } else if (message.guild.members.fetch(args[2])) {
            user = await message.guild.members.fetch(args[2])
            config["bypasslist"].push(user.id)
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2))

            returnRemoveEmbed(message.channel, args[2], "bypasslist")
        } else {
            returnInvaildSyntax(message, "bypasslist add/remove/clear @user/userID");
        }
    } else if (args[1].toLowerCase() === "list") {
        let embed = new Discord.MessageEmbed()
            .setColor(color)
            .setTitle(`Bypasslist`)
            .setDescription(`**List of bypassed ids**\n\n\`${config["bypasslist"].join("\n")}\``)
        message.channel.send({ embeds: [embed] })
    }
}

async function whitelist(message, args) {
    message.delete()
    if (await permCheck(message.author, message.member) < 2) return returnInvaildPermssion(message, 2);

    if (!args[1]) returnInvaildSyntax(message, "whitelist add/remove/list");
    else if (args[1].toLowerCase() === "add") {
        let user = message.mentions.users.first()

        if (user) {
            if (config["whitelist"].includes(user.id)) return returnInvaildSyntax(message, "whitelist add @user/userID (User Already Added)");

            config["whitelist"].push(user.id)

            fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
            returnAddEmbed(message.channel, user.username, "whitelist")

        } else if (message.guild.members.fetch(args[2])) {
            user = await message.guild.members.fetch(args[2])
            config["whitelist"].push(user.id)
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2))

            returnAddEmbed(message.channel, args[2], "whitelist")
        } else {
            returnInvaildSyntax(message, "whitelist add/remove/clear @user/userID");
        }
    } else if (args[1].toLowerCase() === "remove") {
        let user = message.mentions.users.first()
        if (!config["whitelist"].includes(user.id)) return returnInvaildSyntax(message, "whitelist remove @user/userID (User Not Whitelisted)");

        if (user) {
            config["whitelist"].splice(config["whitelist"].indexOf(user.id), 1)

            fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
            returnRemoveEmbed(message.channel, user.username, "whitelist")

        } else if (message.guild.members.fetch(args[2])) {
            user = await message.guild.members.fetch(args[2])
            config["whitelist"].push(user.id)
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2))

            returnRemoveEmbed(message.channel, args[2], "whitelist")
        } else {
            returnInvaildSyntax(message, "whitelist add/remove/clear @user/userID");
        }
    } else if (args[1].toLowerCase() === "list") {
        let embed = new Discord.MessageEmbed()
            .setColor(color)
            .setTitle(`Whitelist`)
            .setDescription(`**List of whitelisted ids**\n\n\`${config["whitelist"].join("\n")}\``)
        message.channel.send({ embeds: [embed] })
    }
}

async function set(message, args) {
    message.delete()
    if (await permCheck(message.author, message.member) < config["permissions"]["setCMD"]) return returnInvaildPermssion(message, config["permissions"]["setCMD"]);

    if (!args[1]) {
        let embed = new Discord.MessageEmbed()
        .setColor(color)
        .setTitle(`Settings Help`)
        .setDescription(`*Use* `+`\`${prefix}set "entry"\``+`*for more information on each entry.*`)
        .setFields({name: `Possible Entries`, value:`prefix, color, redirectchannel, staffrole, infractiontimer, totalinfractions, permissions`})
        message.channel.send({ embeds: [embed] })
    } else if (args[1].toLowerCase() === "prefix") {
        if (!args[2]) return returnInvaildSyntax(message, `set prefix 'prefix'`);
        config["prefix"] = args[2]
        prefix = args[2]
        fs.writeFile(configPath, ``, (err) => {
            fs.writeFile(configPath, JSON.stringify(config, null, 2), (err) => { });
        });

        returnSuccessEmbed(message.channel, args[2], "prefix")

    } else if (args[1].toLowerCase() === "color") {
        if (!args[2]) return returnInvaildSyntax(message, `set color 'hexCode'`);
        if (!args[2].match(/[0-9A-Fa-f]{6}/g)) return returnInvaildSyntax(message, `set color 'hexCode'`);
        config["color"] = args[2]
        color = args[2]
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2))

        returnSuccessEmbed(message.channel, args[2], "color")
    } else if (args[1].toLowerCase() == "redirectchannel") {
        if (!args[2]) return returnInvaildSyntax(message, `set redirectChannel 'channel ID'`);
        if (!message.guild.channels.cache.has(args[2])) return returnInvaildSyntax(message, `set redirectChannel 'channel ID'`);
        config["redirectChannel"] = args[2]
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2))

        returnSuccessEmbed(message.channel, args[2], "redirectChannel")
    } else if (args[1].toLowerCase() == "staffrole") {
        if (!args[2]) return returnInvaildSyntax(message, `set staffrole 'role ID'`);
        if (!message.guild.channels.cache.has(args[2])) return returnInvaildSyntax(message, `set staffrole 'role ID'`);
        config["staffrole"] = args[2]
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2))

        returnSuccessEmbed(message.channel, args[2], "staffrole")
    } else if (args[1].toLowerCase() === "infractiontimer") {
        if (!args[2]) return returnInvaildSyntax(message, `set infractionTimer 'seconds'`);
        if (!args[2].match(/[0-9]/g)) return returnInvaildSyntax(message, `set infractionTimer 'seconds'`);
        config["infractionTimer"] = args[2]
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2))

        returnSuccessEmbed(message.channel, args[2], "infractionTimer")
    } else if (args[1].toLowerCase() === "totalinfractions") {
        if (!args[2]) return returnInvaildSyntax(message, `set totalInfractions 'infractions'`);
        if (!args[2].match(/[0-9]/g)) return returnInvaildSyntax(message, `set totalInfractions 'infractions'`);
        config["totalInfractions"] = args[2]
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2))

        returnSuccessEmbed(message.channel, args[2], "totalInfractions")
    } else if (args[1].toLowerCase() === "permissions") {
        if (!args[2] || !args[3]) return returnInvaildSyntax(message, `set permissions 'setCMD-autobypass' 'level (0-1-2)'`);
        if (parseInt(args[3]) > 2 || parseInt(args[3]) < 0) return returnInvaildSyntax(message, `set permissions 'setCMD-autobypass' 'level (0-1-2)'`);

        if (args[2].toLowerCase() === "setcmd") {
            config["permissions"]["setCMD"] = parseInt(args[3])
            fs.writeFile(configPath, ``, (err) => {
                fs.writeFile(configPath, JSON.stringify(config, null, 2), (err) => { });
            });

            returnSuccessEmbed(message.channel, parseInt(args[3]), "setCMD")
        } else if (args[2].toLowerCase() === "autobypass") {
            config["permissions"]["autobypass"] = parseInt(args[3])
            fs.writeFile(configPath, ``, (err) => {
                fs.writeFile(configPath, JSON.stringify(config, null, 2), (err) => { });
            });

            returnSuccessEmbed(message.channel, parseInt(args[3]), "autobypass")
        } else {
            returnInvaildSyntax(message, `set permissions 'setCMD-autobypass' 'level (0-1-2)'`);
        }
    }
}

async function returnSuccessEmbed(channel, input, object) {
    let embed = new Discord.MessageEmbed()
        .setColor(color)
        .setTitle(`Sucess!`)
        .setDescription(`\`${object}\` sucessfully set to \`${input}\``)
    channel.send({ embeds: [embed] })
}

async function returnRemoveEmbed(channel, input, object) {
    let embed = new Discord.MessageEmbed()
        .setColor(color)
        .setTitle(`Sucess!`)
        .setDescription(`\`${input}\` removed from \`${object}\``)
    channel.send({ embeds: [embed] })
}

async function returnAddEmbed(channel, input, object) {
    let embed = new Discord.MessageEmbed()
        .setColor(color)
        .setTitle(`Sucess!`)
        .setDescription(`\`${input}\` added to \`${object}\``)
    channel.send({ embeds: [embed] })
}

async function returnInvaildSyntax(message, c) {
    let embed = new Discord.MessageEmbed()
        .setColor("#e74c3c")
        .setTitle("Invalid Syntax")
        .setDescription(`Correct Syntax: \`${prefix + c}\``)
    message.channel.send({ embeds: [embed] }).then(async rembed => {
        setTimeout(() => { rembed.delete() }, 15000);
    })
}

async function returnInvaildPermssion(message, level) {
    let embed = new Discord.MessageEmbed()
        .setColor("#e74c3c")
        .setTitle("Invalid Permissions")
        .setDescription(`You need permission level \`${level}\``)
    message.channel.send({ embeds: [embed] }).then(async rembed => {
        setTimeout(() => { rembed.delete() }, 15000);
    })
}

function permCheck(user, member) {
    if (config["whitelist"].includes(user.id)) return 2;
    else if (member.roles.cache.has(config["staffrole"])) return 1;
    else return 0;
}

client.login(config["token"])