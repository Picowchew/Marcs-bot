const Discord = require('discord.js');
const { PREFIX, TOKEN, OWNER_ID, ADMINS_ID, MODS_ID, ADMINS_ROLE_ID, LOGS_CHANNEL_ID, GUILD_ID, CLOCK, CODING, CHECKMARK, CROSSMARK } = require('./config.json');

const client = new Discord.Client();

let GUILD = {};
let ADMINS_ROLE = {};

async function send_del_embed_diff(message, executors) {
  let executors_info = executors.map(executor => `${client.users.cache.get(executor).tag} (${executor})`);
  executors_info.push(`${message.author.tag} (${message.author.id})`);
  const del_embed_diff = new Discord.MessageEmbed()
    .setColor('#919191') // Gray
    .setTitle('Message Deleted (Action Required)')
    .setAuthor(`${message.author.tag} (${message.author.id})`, `${message.author.displayAvatarURL({ format: 'png', dynamic: true, size: 1024 })}`)
    .setDescription('Use `]confirm <msg_id_of_this_embed> <id_of_deleter>` to confirm who deleted the message.')
    .addFields(
      { name: 'Possible Deleters', value: executors_info.join('\n') },
      { name: 'Channel', value: `<#${message.channel.id}> (${message.channel.name})` }
    )
    .setTimestamp()
    .setFooter(`Message ID: ${message.id}`);
  if (message.content) del_embed_diff.addField('Content', `${message.content}`);
  if (message.attachments) {
    message.attachments.forEach(attachment => {
      del_embed_diff.addField('Attachment', `${attachment.proxyURL}`);
    });
  }
  await GUILD.channels.cache.get(LOGS_CHANNEL_ID).send(del_embed_diff);
}

async function send_del_embed_same(message) {
  const del_embed_same = new Discord.MessageEmbed()
    .setColor('#1cb2fc') // Blue
    .setTitle('Message Deleted')
    .setAuthor(`${message.author.tag} (${message.author.id})`, `${message.author.displayAvatarURL({ format: 'png', dynamic: true, size: 1024 })}`)
    .addField('Channel', `<#${message.channel.id}> (${message.channel.name})`)
    .setTimestamp()
    .setFooter(`Message ID: ${message.id}`);
  if (message.content) del_embed_same.addField('Content', `${message.content}`);
  if (message.attachments) {
    message.attachments.forEach(attachment => {
      del_embed_same.addField('Attachment', `${attachment.proxyURL}`);
    });
  }
  await GUILD.channels.cache.get(LOGS_CHANNEL_ID).send(del_embed_same);
}

client.once('ready', () => {
    console.log(`${client.user.tag}\n${client.user.id}\n${Date()}\n===== Logged in successfully =====`);
    client.user.setActivity(`you | ${PREFIX}list`, { type: 'WATCHING' });
    GUILD = client.guilds.cache.get(GUILD_ID);
    ADMINS_ROLE = GUILD.roles.cache.get(ADMINS_ROLE_ID);
});

client.on('message', async message => {
  const msg = message.content.toLowerCase();

  if (message.author.bot || !(message.channel.type === 'dm' || msg.startsWith(PREFIX))) return;

  const command = (msg.startsWith(PREFIX)) ? msg.slice(PREFIX.length) : msg;
  const author_id_str = message.author.id.toString();

  if (['github', 'git'].includes(command)) {
    await message.channel.send(`${CODING} GitHub repository URL is <https://github.com/Picowchew/Marcs-bot>.`);
  } else if (command === 'list') {
    const list_embed = new Discord.MessageEmbed()
      .setColor('#4fde1f') // Green
      .setTitle('List of Commands')
      .setDescription(`Prefix is \`${PREFIX}\`.`)
      .addFields(
        { name: 'Everyone', value: 'github/git, list, uptime' },
        { name: 'Mods', value: 'confirm' },
        { name: 'Admins', value: 'deop, op' }
      );
    await message.channel.send(list_embed);
  } else if (command === 'uptime') {
    const uptime = client.uptime;
    const days = Math.floor(uptime/86400000);
    const hours = Math.floor(uptime/3600000) % 24;
    const minutes = Math.floor(uptime/60000) % 60;
    const seconds = Math.floor(uptime/1000) % 60;
    let uptime_msg = `${seconds}s**.`;
    if (minutes || hours || days) {
      uptime_msg = `${minutes}m, ` + uptime_msg;
      if (hours || days) {
        uptime_msg = `${hours}h, ` + uptime_msg;
        if (days) {
          uptime_msg = `${days}d, ` + uptime_msg;
        }
      }
    }
    await message.channel.send(`${CLOCK} Uptime is **` + uptime_msg);
  } else if (OWNER_ID === author_id_str || ADMINS_ID.includes(author_id_str) || MODS_ID.includes(author_id_str)) {
    if (command.startsWith('confirm ') && !(message.channel.type === 'dm')) {
      const msg_split = msg.split(' ');
      if (msg_split.length === 3) {
        const embed_msg_id = msg_split[1];
        const deleter_id = msg_split[2];
        try {
          const embed_msg = await GUILD.channels.cache.get(LOGS_CHANNEL_ID).messages.fetch(embed_msg_id);
          if (embed_msg.embeds[0].title.includes('(Action Required)')) {
            if (embed_msg.embeds[0].author.name.includes(`(${deleter_id})`)) {
              embed_msg.embeds[0].color = '#1cb2fc'; // Blue
              embed_msg.embeds[0].title = 'Message Deleted';
              delete embed_msg.embeds[0].description;
              embed_msg.embeds[0].fields.shift();
              await embed_msg.edit(new Discord.MessageEmbed(embed_msg.embeds[0]));
              await message.channel.send(`${CHECKMARK} Confirmation complete.`);
            } else if (embed_msg.embeds[0].fields[0].value.includes(`(${deleter_id})`)) {
              embed_msg.embeds[0].color = '#bd52f7'; // Purple
              embed_msg.embeds[0].title = 'Message Deleted By Other User';
              delete embed_msg.embeds[0].description;
              embed_msg.embeds[0].fields[0].name = 'Deleter';
              embed_msg.embeds[0].fields[0].value = `${client.users.cache.get(deleter_id).tag} (${deleter_id})`;
              await embed_msg.edit(new Discord.MessageEmbed(embed_msg.embeds[0]));
              await message.channel.send(`${CHECKMARK} Confirmation complete.`);
            } else {
              await message.channel.send(`${CROSSMARK} User provided is not a possible deleter.`);
            }
          } else {
            await message.channel.send(`${CROSSMARK} This message does not require any action.`);
          }
        } catch(e) {
          await message.channel.send(`${CROSSMARK} Unable to find message with ID \`${embed_msg_id}\` in <#${LOGS_CHANNEL_ID}>.`);
          console.error(e);
        }
      } else if (msg_split.length < 3) {
        await message.channel.send(`${CROSSMARK} Not enough arguments provided.`);
      } else {
        await message.channel.send(`${CROSSMARK} Too many arguments provided.`);
      }
    } else if (OWNER_ID === author_id_str || ADMINS_ID.includes(author_id_str)) {
      if (command === 'deop') {
        await GUILD.members.cache.get(author_id_str).roles.remove(ADMINS_ROLE).catch(e => console.error(e));
        await message.channel.send(`${message.author} ${CHECKMARK}`);
      } else if (command === 'op') {
        await GUILD.members.cache.get(author_id_str).roles.add(ADMINS_ROLE).catch(e => console.error(e));
        await message.channel.send(`${message.author} ${CHECKMARK}`);
      }
    }
  }
});

client.on('messageDelete', async message => {
	if (message.channel.type === 'dm') return;
	const del_logs = await GUILD.fetchAuditLogs({
		type: 'MESSAGE_DELETE',
  });
  const now = Date.now();
  const entries = del_logs.entries.filter(entry =>
    entry.extra.channel.id === message.channel.id &&
    entry.target.id === message.author.id &&
    now - entry.createdTimestamp < 303000 // 5 minutes and 3 seconds
  );
  if (entries.size) {
    let executors = [];
    entries.forEach(entry => {
      if (!executors.includes(entry.executor.id)) executors.push(entry.executor.id);
    });
    await send_del_embed_diff(message, executors);
  } else {
    await send_del_embed_same(message);
  }
});

client.on('guildMemberRemove', async member => {
	const kick_logs = await GUILD.fetchAuditLogs({
		type: 'MEMBER_KICK',
  });
  const now = Date.now();
  const kick_log_found = kick_logs.entries.find(kick_log =>
    kick_log.target.id === member.id &&
    now - kick_log.createdTimestamp < 3000 // 3 seconds
  );
  if (kick_log_found) {
    const kick_embed = new Discord.MessageEmbed()
      .setColor('#ffca1c') // Yellow-orange
      .setTitle('Kick')
      .setDescription(`**${member.user.tag} (${member.id})**\nwas kicked by\n**${kick_log_found.executor.tag} (${kick_log_found.executor.id})**`)
      .setThumbnail(`${member.user.displayAvatarURL({ format: 'png', dynamic: true, size: 1024 })}`)
      .setTimestamp();
    if (kick_log_found.reason) kick_embed.addField('Reason', `${kick_log_found.reason}`);
    await GUILD.channels.cache.get(LOGS_CHANNEL_ID).send(kick_embed);
  }
});

client.on('guildBanAdd', async (guild, user) => {
	const ban_logs = await GUILD.fetchAuditLogs({
		type: 'MEMBER_BAN_ADD',
  });
  const now = Date.now();
  const ban_log_found = ban_logs.entries.find(ban_log =>
    ban_log.target.id === user.id &&
    now - ban_log.createdTimestamp < 3000 // 3 seconds
  );
  if (ban_log_found) {
    const ban_embed = new Discord.MessageEmbed()
      .setColor('#f24024') // Red
      .setTitle('Ban')
      .setDescription(`**${user.tag} (${user.id})**\nwas banned by\n**${ban_log_found.executor.tag} (${ban_log_found.executor.id})**`)
      .setThumbnail(`${user.displayAvatarURL({ format: 'png', dynamic: true, size: 1024 })}`)
      .setTimestamp();
    if (ban_log_found.reason) ban_embed.addField('Reason', `${ban_log_found.reason}`);
    await GUILD.channels.cache.get(LOGS_CHANNEL_ID).send(ban_embed);
  }
});

client.login(TOKEN);
