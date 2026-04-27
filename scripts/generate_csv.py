"""
Generador de datos para plataforma estilo 4chan en Neo4j.
Produce ~7000 nodos y todas las relaciones necesarias en CSV.
Garantiza grafo conexo: cada nodo tiene al menos 1 relación.
"""

import csv
import random
import uuid
import hashlib
import os
from datetime import datetime, date, timedelta
from faker import Faker

fake = Faker()
random.seed(42)
Faker.seed(42)

OUT = os.path.join(os.path.dirname(__file__), '..', 'csv_data')
os.makedirs(OUT, exist_ok=True)

# ── helpers ────────────────────────────────────────────────────────────────────

def uid():
    return str(uuid.uuid4())

def rand_date(start='2020-01-01', end='2025-12-31'):
    s = datetime.strptime(start, '%Y-%m-%d')
    e = datetime.strptime(end, '%Y-%m-%d')
    return (s + timedelta(days=random.randint(0, (e - s).days))).strftime('%Y-%m-%d')

def rand_dt(start='2020-01-01', end='2025-12-31'):
    d = rand_date(start, end)
    h, m, s = random.randint(0,23), random.randint(0,59), random.randint(0,59)
    return f"{d}T{h:02d}:{m:02d}:{s:02d}"

def ip_address():
    return f"{random.randint(1,254)}.{random.randint(0,255)}.{random.randint(0,255)}.{random.randint(1,254)}"

def ip_hash(ip):
    return hashlib.md5(ip.encode()).hexdigest()[:12]

def write_csv(filename, rows, fieldnames):
    path = os.path.join(OUT, filename)
    with open(path, 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        w.writerows(rows)
    print(f"  ✓ {filename}: {len(rows)} filas")
    return rows

# ── NODOS ──────────────────────────────────────────────────────────────────────

# ── Board (10) ─────────────────────────────────────────────────────────────────
BOARD_DEFS = [
    ('Technology',    'tech',   'Hardware, software, and everything in between', False),
    ('Science',       'sci',    'Physics, chemistry, biology and more',           False),
    ('Random',        'b',      'Anything goes. No rules.',                       True),
    ('Video Games',   'v',      'Discuss all video games',                        False),
    ('Politics',      'pol',    'News and political discussion',                  False),
    ('Anime & Manga', 'a',      'Japanese animation and comics',                  False),
    ('Music',         'mu',     'Share and discuss music',                        False),
    ('Sports',        'sp',     'Football, basketball, MMA and more',             False),
    ('Finance',       'biz',    'Business, stocks, and crypto',                   False),
    ('Paranormal',    'x',      'UFOs, ghosts, conspiracies',                     True),
]

boards = []
for name, slug, desc, nsfw in BOARD_DEFS:
    boards.append({
        'id':         uid(),
        'name':       name,
        'slug':       slug,
        'description': desc,
        'nsfw':       str(nsfw).lower(),
        'post_count': str(random.randint(100, 50000)),
        'created_at': rand_date('2019-01-01', '2021-12-31'),
    })
board_ids = [b['id'] for b in boards]
board_slugs = {b['id']: b['slug'] for b in boards}
write_csv('boards.csv', boards,
    ['id','name','slug','description','nsfw','post_count','created_at'])


# ── IP (450) ───────────────────────────────────────────────────────────────────
COUNTRIES = ['GT', 'US', 'MX', 'DE', 'JP', 'BR', 'CA', 'FR', 'AU', 'RU']
ISP_LIST  = ['Comcast', 'AT&T', 'Verizon', 'Deutsche Telekom', 'NTT', 'Claro',
             'Telus', 'Orange', 'Optus', 'Rostelecom', 'Tigo', 'Claro GT']

ips = []
ip_addresses = list({ip_address() for _ in range(500)})[:450]
for addr in ip_addresses:
    ips.append({
        'address':    addr,
        'country':    random.choice(COUNTRIES),
        'isp':        random.choice(ISP_LIST),
        'is_proxy':   str(random.random() < 0.08).lower(),
        'risk_score': str(round(random.uniform(0.0, 1.0), 3)),
        'first_seen': rand_date('2018-01-01', '2024-01-01'),
    })
ip_addr_list = [i['address'] for i in ips]
write_csv('ips.csv', ips,
    ['address','country','isp','is_proxy','risk_score','first_seen'])


# ── User (1000) ────────────────────────────────────────────────────────────────
INTEREST_POOL = ['technology','anime','politics','gaming','science','music',
                 'sports','finance','paranormal','memes','coding','crypto',
                 'philosophy','history','art','movies','books','fitness']

users = []
for _ in range(1000):
    ip = random.choice(ip_addr_list)
    is_anon = random.random() < 0.60
    joined = rand_date('2019-01-01', '2024-06-01')
    interests = random.sample(INTEREST_POOL, k=random.randint(1, 5))
    users.append({
        'id':         uid(),
        'alias':      fake.user_name() if not is_anon else f"Anonymous{random.randint(1000,9999)}",
        'is_anon':    str(is_anon).lower(),
        'ip_hash':    ip_hash(ip),
        'joined_at':  joined,
        'post_count': str(random.randint(0, 2000)),
        'karma':      str(random.randint(-50, 5000)),
        'banned':     str(random.random() < 0.04).lower(),
        'interests':  '|'.join(interests),
    })
user_ids = [u['id'] for u in users]
write_csv('users.csv', users,
    ['id','alias','is_anon','ip_hash','joined_at','post_count','karma','banned','interests'])


# ── Moderator (15) ─────────────────────────────────────────────────────────────
MOD_LEVELS = ['junior', 'senior', 'head']
mods = []
for i in range(15):
    ip = random.choice(ip_addr_list)
    joined = rand_date('2018-01-01', '2022-01-01')
    since  = rand_date(joined, '2023-01-01')
    active_b = random.sample([b['slug'] for b in boards], k=random.randint(1, 4))
    mods.append({
        'id':            uid(),
        'alias':         f"mod_{fake.user_name()}",
        'ip_hash':       ip_hash(ip),
        'joined_at':     joined,
        'post_count':    str(random.randint(50, 5000)),
        'karma':         str(random.randint(200, 10000)),
        'interests':     '|'.join(random.sample(INTEREST_POOL, 3)),
        'level':         random.choice(MOD_LEVELS),
        'since':         since,
        'active_boards': '|'.join(active_b),
        'active':        str(random.random() < 0.85).lower(),
    })
mod_ids = [m['id'] for m in mods]
write_csv('moderators.csv', mods,
    ['id','alias','ip_hash','joined_at','post_count','karma','interests',
     'level','since','active_boards','active'])


# ── Tag (200) ──────────────────────────────────────────────────────────────────
TAG_NAMES = list({
    'help','question','rant','meme','serious','breaking','offtopic','nsfw',
    'humor','meta','ask','daily','weekly','opinion','leak','rumor',
    'tutorial','guide','news','discussion','thread','ama','rip','kek',
    'cringe','based','cope','seethe','wojak','pepe','greentext','bait',
    'troll','schizo','doomer','coomer','boomer','zoomer','chad','virgin',
    'redpill','bluepill','blackpill','tinfoil','glowie','fed','shill',
    'anon','fren','wagecuck','neet','hikikomori','isekai','waifu','trap',
    'furry','gore','ylyl','webm','oc','repost','checked','trips','dubs',
    'feels','sad','happy','rage','autism','based_department','kek','lmao',
    'wtf','holy_shit','no_way','confirmed','fake','legit','cope_harder',
    'quantum','biology','chemistry','physics','math','statistics','ml','ai',
    'python','javascript','rust','golang','cpp','linux','windows','mac',
    'crypto','bitcoin','ethereum','stonks','wsb','dd','yolo','calls','puts',
    'nfl','nba','mma','esports','chess','soccer','formula1','olympics',
    'japan','usa','europe','latam','politics','election','corruption',
} - {''})[:200]

while len(TAG_NAMES) < 200:
    TAG_NAMES.append(f"tag_{len(TAG_NAMES)}")

COLORS = ['#e74c3c','#3498db','#2ecc71','#f39c12','#9b59b6',
          '#1abc9c','#e67e22','#95a5a6','#34495e','#ecf0f1']

tags = []
for name in TAG_NAMES[:200]:
    tags.append({
        'name':       name,
        'color':      random.choice(COLORS),
        'count':      str(random.randint(1, 5000)),
        'active':     str(random.random() < 0.90).lower(),
        'created_at': rand_date('2019-01-01', '2023-01-01'),
    })
tag_names = [t['name'] for t in tags]
write_csv('tags.csv', tags,
    ['name','color','count','active','created_at'])


# ── Thread (700) ───────────────────────────────────────────────────────────────
THREAD_TITLES = [
    "What do you guys think about {}?",
    "{} general - post 'em",
    "Daily {} thread",
    "Why is {} so {}?",
    "I can't believe {} just happened",
    "{} is ruining everything",
    "Hot take: {} is actually good",
    "Rate my {}",
    "Post your {}",
    "Help with {}: {} not working",
    "{} appreciation thread",
    "Unpopular opinion on {}",
    "Am I the only one who {}?",
    "Just found out about {} and I'm losing my mind",
    "The {} situation is getting worse",
]
NOUNS = ['AI','the government','crypto','anime','Linux','Python','JavaScript',
         'elections','memes','science','music','gaming','health','privacy',
         'the economy','climate','space','quantum computing','NFTs','social media']
ADJS = ['based','cringe','overrated','underrated','broken','perfect','cursed','blessed']

threads = []
for i in range(700):
    title_tmpl = random.choice(THREAD_TITLES)
    try:
        title = title_tmpl.format(random.choice(NOUNS), random.choice(ADJS))
    except (IndexError, KeyError):
        try:
            title = title_tmpl.format(random.choice(NOUNS))
        except (IndexError, KeyError):
            title = random.choice(NOUNS) + ' thread'
    created = rand_dt('2020-01-01', '2025-12-01')
    t_tags = random.sample(tag_names, k=random.randint(1, 5))
    threads.append({
        'id':          uid(),
        'title':       title,
        'created_at':  created,
        'is_pinned':   str(random.random() < 0.05).lower(),
        'tags':        '|'.join(t_tags),
        'bump_order':  str(random.randint(1, 10000)),
        'reply_count': str(random.randint(0, 500)),
        'locked':      str(random.random() < 0.08).lower(),
    })
thread_ids = [t['id'] for t in threads]
write_csv('threads.csv', threads,
    ['id','title','created_at','is_pinned','tags','bump_order','reply_count','locked'])


# ── Post (4000) ────────────────────────────────────────────────────────────────
POST_TEMPLATES = [
    "This is actually {} insane. Can't believe no one is talking about it.",
    "OP is a {}. Sage goes in all fields.",
    "Based and {}pilled. We finally agree on something.",
    "kek, {} told you so. Stay {} forever.",
    ">be me\n>see this thread\n>mfw {}",
    "Checked. Also {} is correct about everything.",
    "This. {} This is the way.",
    "I've been saying this for years. {} wake up.",
    "touch grass {}. seriously.",
    "Why do people keep falling for {} bait?",
    "Mods are {}. This board is compromised.",
    "Not gonna lie this {} actually made me laugh.",
    "Holy based. {}",
    "Cringe and {}pilled.",
    ">implying {} matters",
    "Anon you don't understand how {} works.",
    "Sir this is a {} board.",
    "I actually agree with OP. {} needs to be said.",
    "No way this is real. {}",
    "This thread will be deleted in {}. Screenshot this.",
]
FILL = ['absolutely','completely','painfully','objectively','based','cringe',
        'literally','unironically','cope','seethe','dilate','based','true','false',
        'correct','wrong','5 minutes','2 hours','epic']

posts = []
for i in range(4000):
    tmpl = random.choice(POST_TEMPLATES)
    try:
        content = tmpl.format(random.choice(FILL), random.choice(FILL))
    except (IndexError, KeyError):
        try:
            content = tmpl.format(random.choice(FILL))
        except (IndexError, KeyError):
            content = fake.sentence()
    if random.random() < 0.15:
        content = fake.paragraph(nb_sentences=random.randint(2, 6))
    media_urls = []
    if random.random() < 0.25:
        media_urls = [f"https://i.4cdn.org/img/{uid()[:8]}.{'jpg' if random.random()<0.7 else 'png'}"]
    created = rand_dt('2020-01-01', '2025-12-31')
    posts.append({
        'id':          uid(),
        'content':     content.replace('\n', ' ').replace(',', ' '),
        'created_at':  created,
        'score':       str(random.randint(-10, 500)),
        'is_op':       str(i % 7 == 0).lower(),
        'deleted':     str(random.random() < 0.05).lower(),
        'reply_count': str(random.randint(0, 200)),
        'word_count':  str(len(content.split())),
        'flagged':     str(random.random() < 0.07).lower(),
        'media_urls':  '|'.join(media_urls),
    })
post_ids = [p['id'] for p in posts]
write_csv('posts.csv', posts,
    ['id','content','created_at','score','is_op','deleted',
     'reply_count','word_count','flagged','media_urls'])


# ── File (400) ─────────────────────────────────────────────────────────────────
FILE_TYPES = ['image/jpeg','image/png','image/gif','video/webm','image/webp']

files = []
for _ in range(400):
    ext  = {'image/jpeg':'jpg','image/png':'png','image/gif':'gif',
             'video/webm':'webm','image/webp':'webp'}
    ftype = random.choice(FILE_TYPES)
    fext  = ext[ftype]
    fid   = uid()
    files.append({
        'id':          fid,
        'url':         f"https://i.4cdn.org/media/{fid[:8]}.{fext}",
        'type':        ftype,
        'size_kb':     str(round(random.uniform(10.0, 8192.0), 2)),
        'uploaded_at': rand_date('2020-01-01', '2025-12-01'),
        'width':       str(random.choice([640,800,1024,1280,1920,2560])),
        'height':      str(random.choice([480,600,768,720,1080,1440])),
        'checksum':    hashlib.md5(fid.encode()).hexdigest(),
    })
file_ids = [f['id'] for f in files]
write_csv('files.csv', files,
    ['id','url','type','size_kb','uploaded_at','width','height','checksum'])


# ── Report (250) ───────────────────────────────────────────────────────────────
REASONS    = ['spam','off-topic','illegal content','doxxing','ban evasion',
              'rule 1 violation','NSFW on SFW board','flooding','raid']
STATUSES   = ['open','under_review','resolved','dismissed']

reports = []
for _ in range(250):
    created = rand_dt('2021-01-01', '2025-12-31')
    status  = random.choice(STATUSES)
    reports.append({
        'id':         uid(),
        'reason':     random.choice(REASONS),
        'created_at': created,
        'status':     status,
        'resolved':   str(status == 'resolved').lower(),
        'notes':      fake.sentence() if random.random() < 0.5 else '',
        'priority':   str(random.randint(1, 5)),
    })
report_ids = [r['id'] for r in reports]
write_csv('reports.csv', reports,
    ['id','reason','created_at','status','resolved','notes','priority'])


# ── Ban (150) ──────────────────────────────────────────────────────────────────
BAN_SCOPES  = ['board','global','ip']
BAN_REASONS = ['spam','repeated violations','doxxing','illegal content',
               'raiding','evading previous ban','flooding']

bans = []
for _ in range(150):
    starts = rand_dt('2021-01-01', '2025-06-01')
    perm   = random.random() < 0.10
    ends   = rand_date(starts[:10], '2026-12-31') if not perm else '9999-12-31'
    bans.append({
        'id':         uid(),
        'reason':     random.choice(BAN_REASONS),
        'starts_at':  starts,
        'ends_at':    ends,
        'scope':      random.choice(BAN_SCOPES),
        'permanent':  str(perm).lower(),
        'appeal_url': f"https://chan.local/appeal/{uid()[:8]}",
    })
ban_ids = [b['id'] for b in bans]
write_csv('bans.csv', bans,
    ['id','reason','starts_at','ends_at','scope','permanent','appeal_url'])


# ── Reaction (600) ─────────────────────────────────────────────────────────────
REACTION_TYPES = ['like','kek','based','cringe','rage','cry','wow','👍','👎','🔥']

reactions = []
for _ in range(600):
    reactions.append({
        'id':         uid(),
        'type':       random.choice(REACTION_TYPES),
        'created_at': rand_dt('2020-01-01', '2025-12-31'),
        'anon_id':    uid()[:8],
        'weight':     str(round(random.uniform(0.1, 2.0), 2)),
        'source':     random.choice(['web','mobile','api']),
    })
reaction_ids = [r['id'] for r in reactions]
write_csv('reactions.csv', reactions,
    ['id','type','created_at','anon_id','weight','source'])


# ── RELACIONES ─────────────────────────────────────────────────────────────────
print("\nGenerando relaciones...")

# Board -[HAS_THREAD]-> Thread
# Garantiza conexión: cada thread va a un board, cada board tiene al menos 1 thread
rel_board_thread = []
thread_to_board = {}
# Distribuir threads entre boards (al menos 1 por board)
board_thread_pool = list(thread_ids)
random.shuffle(board_thread_pool)
# Asignar mínimo 1 thread por board
for i, bid in enumerate(board_ids):
    tid = board_thread_pool[i]
    thread_to_board[tid] = bid
    rel_board_thread.append({
        'board_id':  bid,
        'thread_id': tid,
        'pinned':    str(random.random() < 0.05).lower(),
        'order':     str(random.randint(1, 1000)),
        'added_at':  rand_date('2020-01-01', '2025-01-01'),
    })
# Resto de threads → board aleatorio
for tid in board_thread_pool[len(board_ids):]:
    bid = random.choice(board_ids)
    thread_to_board[tid] = bid
    rel_board_thread.append({
        'board_id':  bid,
        'thread_id': tid,
        'pinned':    str(random.random() < 0.03).lower(),
        'order':     str(random.randint(1, 1000)),
        'added_at':  rand_date('2020-01-01', '2025-01-01'),
    })
write_csv('rel_board_thread.csv', rel_board_thread,
    ['board_id','thread_id','pinned','order','added_at'])


# Thread -[HAS_POST]-> Post
# Garantiza: cada post va a un thread, cada thread tiene al menos 1 post
rel_thread_post = []
post_to_thread = {}
post_pool = list(post_ids)
random.shuffle(post_pool)
# Al menos 1 post por thread
for i, tid in enumerate(thread_ids):
    pid = post_pool[i]
    post_to_thread[pid] = tid
    rel_thread_post.append({
        'thread_id': tid,
        'post_id':   pid,
        'position':  str(1),
        'is_op':     'true',
        'added_at':  rand_dt('2020-01-01', '2025-12-01'),
    })
# Resto → thread aleatorio
for pos, pid in enumerate(post_pool[len(thread_ids):], start=2):
    tid = random.choice(thread_ids)
    post_to_thread[pid] = tid
    rel_thread_post.append({
        'thread_id': tid,
        'post_id':   pid,
        'position':  str(pos % 500 + 1),
        'is_op':     'false',
        'added_at':  rand_dt('2020-01-01', '2025-12-01'),
    })
write_csv('rel_thread_post.csv', rel_thread_post,
    ['thread_id','post_id','position','is_op','added_at'])


# User -[WROTE]-> Post (todos los posts tienen autor)
rel_user_post = []
post_to_user = {}
for pid in post_ids:
    uid_ = random.choice(user_ids)
    post_to_user[pid] = uid_
    rel_user_post.append({
        'user_id': uid_,
        'post_id': pid,
        'at':      rand_dt('2020-01-01', '2025-12-31'),
        'from_ip': random.choice(ip_addr_list),
        'device':  random.choice(['desktop','mobile','tablet']),
    })
write_csv('rel_user_post.csv', rel_user_post,
    ['user_id','post_id','at','from_ip','device'])


# User -[CREATED]-> Thread (todos los threads tienen creador)
rel_user_thread = []
for tid in thread_ids:
    uid_ = random.choice(user_ids)
    rel_user_thread.append({
        'user_id':   uid_,
        'thread_id': tid,
        'at':        rand_dt('2020-01-01', '2025-12-01'),
        'from_ip':   random.choice(ip_addr_list),
        'anon_id':   uid()[:8],
    })
write_csv('rel_user_thread.csv', rel_user_thread,
    ['user_id','thread_id','at','from_ip','anon_id'])


# Post -[QUOTES]-> Post (30% de posts citan otro)
rel_post_quotes = []
quotable = list(post_ids)
for pid in post_ids:
    if random.random() < 0.30:
        target = random.choice(quotable)
        if target != pid:
            rel_post_quotes.append({
                'from_post_id': pid,
                'to_post_id':   target,
                'at':           rand_dt('2020-01-01', '2025-12-31'),
                'context':      random.choice(['disagreement','agreement','question','joke','info']),
                'resolved':     str(random.random() < 0.4).lower(),
            })
write_csv('rel_post_quotes.csv', rel_post_quotes,
    ['from_post_id','to_post_id','at','context','resolved'])


# Post -[HAS_FILE]-> File (garantiza: todos los files tienen post)
rel_post_file = []
file_pool = list(file_ids)
random.shuffle(file_pool)
for fid in file_pool:
    pid = random.choice(post_ids)
    rel_post_file.append({
        'post_id':     pid,
        'file_id':     fid,
        'attached_at': rand_dt('2020-01-01', '2025-12-31'),
        'primary':     str(random.random() < 0.80).lower(),
        'order':       str(random.randint(1, 4)),
    })
write_csv('rel_post_file.csv', rel_post_file,
    ['post_id','file_id','attached_at','primary','order'])


# Thread -[TAGGED_WITH]-> Tag (garantiza: todos los tags tienen al menos 1 thread)
rel_thread_tag = []
tag_pool = list(tag_names)
random.shuffle(tag_pool)
used_tags = set()
# 1 thread por tag mínimo
for i, tname in enumerate(tag_pool):
    tid = random.choice(thread_ids)
    used_tags.add(tname)
    rel_thread_tag.append({
        'thread_id': tid,
        'tag_name':  tname,
        'added_at':  rand_date('2020-01-01', '2025-01-01'),
        'added_by':  random.choice(['system','mod','user']),
        'relevance': str(round(random.uniform(0.1, 1.0), 3)),
    })
# Extra: cada thread tiene 1-4 tags adicionales
for tid in thread_ids:
    for tname in random.sample(tag_pool, k=random.randint(1, 4)):
        rel_thread_tag.append({
            'thread_id': tid,
            'tag_name':  tname,
            'added_at':  rand_date('2020-01-01', '2025-01-01'),
            'added_by':  random.choice(['system','mod','user']),
            'relevance': str(round(random.uniform(0.1, 1.0), 3)),
        })
write_csv('rel_thread_tag.csv', rel_thread_tag,
    ['thread_id','tag_name','added_at','added_by','relevance'])


# Report -[TARGETS]-> Post (todos los reports apuntan a un post)
rel_report_post = []
for rid in report_ids:
    pid = random.choice(post_ids)
    rel_report_post.append({
        'report_id': rid,
        'post_id':   pid,
        'at':        rand_dt('2021-01-01', '2025-12-31'),
        'severity':  random.choice(['low','medium','high','critical']),
        'auto_flagged': str(random.random() < 0.25).lower(),
    })
write_csv('rel_report_post.csv', rel_report_post,
    ['report_id','post_id','at','severity','auto_flagged'])


# Moderator -[MANAGES]-> Board (cada board tiene al menos 1 mod, cada mod administra al menos 1 board)
rel_mod_board = []
board_pool = list(board_ids)
random.shuffle(board_pool)
# 1 mod por board mínimo
for i, bid in enumerate(board_pool):
    mid = mod_ids[i % len(mod_ids)]
    rel_mod_board.append({
        'mod_id':   mid,
        'board_id': bid,
        'since':    rand_date('2019-01-01', '2023-01-01'),
        'role':     random.choice(['janitor','moderator','global_moderator']),
        'active':   str(random.random() < 0.90).lower(),
    })
# Extra relaciones mod-board
for mid in mod_ids:
    for bid in random.sample(board_ids, k=random.randint(1, 3)):
        if not any(r['mod_id'] == mid and r['board_id'] == bid for r in rel_mod_board):
            rel_mod_board.append({
                'mod_id':   mid,
                'board_id': bid,
                'since':    rand_date('2019-01-01', '2023-01-01'),
                'role':     random.choice(['janitor','moderator']),
                'active':   str(random.random() < 0.80).lower(),
            })
write_csv('rel_mod_board.csv', rel_mod_board,
    ['mod_id','board_id','since','role','active'])


# Moderator -[ISSUED_BAN]-> Ban (todos los bans fueron emitidos por algún mod)
rel_mod_ban = []
for bid in ban_ids:
    mid = random.choice(mod_ids)
    rel_mod_ban.append({
        'mod_id': mid,
        'ban_id': bid,
        'at':     rand_dt('2021-01-01', '2025-12-31'),
        'reason': random.choice(BAN_REASONS),
        'appeal_allowed': str(random.random() < 0.70).lower(),
    })
write_csv('rel_mod_ban.csv', rel_mod_ban,
    ['mod_id','ban_id','at','reason','appeal_allowed'])


# Ban -[BANS]-> User (todos los bans afectan a un usuario)
rel_ban_user = []
banned_user_ids = [u['id'] for u in users if u['banned'] == 'true']
if len(banned_user_ids) < len(ban_ids):
    # Si hay más bans que usuarios baneados, reusar algunos
    banned_user_ids = banned_user_ids + random.choices(user_ids, k=len(ban_ids)-len(banned_user_ids))
for i, bid in enumerate(ban_ids):
    uid_ = banned_user_ids[i % len(banned_user_ids)]
    rel_ban_user.append({
        'ban_id':       bid,
        'user_id':      uid_,
        'effective_at': rand_dt('2021-01-01', '2025-12-31'),
        'scope':        random.choice(BAN_SCOPES),
        'notified':     str(random.random() < 0.80).lower(),
    })
write_csv('rel_ban_user.csv', rel_ban_user,
    ['ban_id','user_id','effective_at','scope','notified'])


# User -[REPORTED]-> Report (todos los reports fueron hechos por un usuario)
rel_user_report = []
for rid in report_ids:
    uid_ = random.choice(user_ids)
    rel_user_report.append({
        'user_id':   uid_,
        'report_id': rid,
        'at':        rand_dt('2021-01-01', '2025-12-31'),
        'anonymous': str(random.random() < 0.55).lower(),
        'ip_hash':   ip_hash(random.choice(ip_addr_list)),
    })
write_csv('rel_user_report.csv', rel_user_report,
    ['user_id','report_id','at','anonymous','ip_hash'])


# User -[FOLLOWS]-> Board (cada board seguido por al menos 5 usuarios)
rel_user_board = []
seen_follows = set()
for bid in board_ids:
    for uid_ in random.sample(user_ids, k=5):
        key = (uid_, bid)
        if key not in seen_follows:
            seen_follows.add(key)
            rel_user_board.append({
                'user_id':  uid_,
                'board_id': bid,
                'since':    rand_date('2019-01-01', '2025-01-01'),
                'notify':   str(random.random() < 0.60).lower(),
                'priority': str(random.randint(1, 5)),
            })
# Extra: usuarios siguen 1-5 boards
for uid_ in random.sample(user_ids, k=400):
    for bid in random.sample(board_ids, k=random.randint(1, 5)):
        key = (uid_, bid)
        if key not in seen_follows:
            seen_follows.add(key)
            rel_user_board.append({
                'user_id':  uid_,
                'board_id': bid,
                'since':    rand_date('2019-01-01', '2025-01-01'),
                'notify':   str(random.random() < 0.60).lower(),
                'priority': str(random.randint(1, 5)),
            })
write_csv('rel_user_board.csv', rel_user_board,
    ['user_id','board_id','since','notify','priority'])


# Reaction -[REACTED_TO]-> Post (todas las reactions apuntan a un post)
rel_reaction_post = []
for rcid in reaction_ids:
    pid = random.choice(post_ids)
    rel_reaction_post.append({
        'reaction_id': rcid,
        'post_id':     pid,
        'at':          rand_dt('2020-01-01', '2025-12-31'),
        'anon_id':     uid()[:8],
        'weight':      str(round(random.uniform(0.1, 2.0), 2)),
    })
write_csv('rel_reaction_post.csv', rel_reaction_post,
    ['reaction_id','post_id','at','anon_id','weight'])


# Post -[POSTED_FROM]-> IP (todos los posts tienen IP)
rel_post_ip = []
for pid in post_ids:
    addr = random.choice(ip_addr_list)
    rel_post_ip.append({
        'post_id':    pid,
        'ip_address': addr,
        'at':         rand_dt('2020-01-01', '2025-12-31'),
        'proxy':      str(random.random() < 0.08).lower(),
        'country':    random.choice(COUNTRIES),
    })
write_csv('rel_post_ip.csv', rel_post_ip,
    ['post_id','ip_address','at','proxy','country'])


# ── RESUMEN ────────────────────────────────────────────────────────────────────
print("\n" + "="*55)
print("RESUMEN DE NODOS GENERADOS")
print("="*55)
totals = {
    'Board':     len(boards),
    'IP':        len(ips),
    'User':      len(users),
    'Moderator': len(mods),
    'Tag':       len(tags),
    'Thread':    len(threads),
    'Post':      len(posts),
    'File':      len(files),
    'Report':    len(reports),
    'Ban':       len(bans),
    'Reaction':  len(reactions),
}
total = 0
for label, count in totals.items():
    print(f"  {label:<12}: {count:>5}")
    total += count
print(f"  {'TOTAL':<12}: {total:>5}  {'✓ supera 5000' if total >= 5000 else '✗ falta'}")
print("="*55)
print(f"\nArchivos CSV guardados en: {os.path.abspath(OUT)}")
