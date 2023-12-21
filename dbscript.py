import sqlite3

def init_db():
    conn = sqlite3.connect('song_likes.db')
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS songs (
            title TEXT PRIMARY KEY,
            likes INTEGER DEFAULT 0
        )
    ''')
    conn.commit()
    conn.close()

init_db()
