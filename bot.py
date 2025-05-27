import discord
from discord.ext import commands
import sqlite3

intents = discord.Intents.default()
intents.message_content = True
bot = commands.Bot(command_prefix="!", intents=intents)

# Connect to the database
conn = sqlite3.connect('./db.db')
cur = conn.cursor()

# Helper function to check if the author has the required role
def has_required_role(ctx):
    required_roles = ['Staff', 'Moderator', 'Management', 'Co CEO', 'Developer', 'CEO']
    return any(role.name in required_roles for role in ctx.author.roles)

@bot.command()
@commands.check(has_required_role)
async def plan(ctx, user: discord.Member, plan: str):
    cur.execute("SELECT * FROM users WHERE discord_id=?", (str(user.id),))
    result = cur.fetchone()
    if result == None:
        await ctx.send("유저가 없습니다.")
    else:
        if plan == "w":
            cur.execute("UPDATE users SET plan=? WHERE discord_id=?", ("Whitelist", str(user.id)))
            conn.commit()
            await ctx.send(f"Updated {user.name}'s plan to Whitelist.")
        elif plan == "p":
            cur.execute("UPDATE users SET plan=? WHERE discord_id=?", ("Premium", str(user.id)))
            conn.commit()
            await ctx.send(f"Updated {user.name}'s plan to Premium.")
        else:
            await ctx.send("Invalid plan value. Please enter 'w' for Whitelist or 'p' for Premium.")

@bot.command()
@commands.check(has_required_role)
async def ban(ctx, user: discord.Member):
    cur.execute("SELECT * FROM users WHERE discord_id=?", (str(user.id),))
    result = cur.fetchone()
    if result is None:
        await ctx.send("유저가 없습니다.")
    else:
        cur.execute("DELETE FROM users WHERE discord_id=?", (str(user.id),))
        conn.commit()
        await ctx.send(f"Removed {user.name} from the database.")

bot.run('MTEyODk2NTAxMDU2ODI0OTQzNA.GfvlVZ.g2GQebNZBbio3sa5wzNguzafxOaOHhrI_cljs4')
