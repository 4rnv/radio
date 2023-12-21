from flask import Flask, jsonify, render_template, request
from filter import REPLACEMENTS
import random
import json
import os
import sqlite3
import nh3
import re
import html
app = Flask(__name__, static_folder='static')
def load_songs():
    with open('songs.json', 'r') as file:
        return json.load(file)
    
songs = load_songs()

@app.route('/')
def index():
    return render_template('index.html')

@app.errorhandler(404)
def page_not_found(e):
    return render_template('404.html'), 404

'''@app.errorhandler(403)
def page_not_found(e):
    return render_template('403.html'), 403 '''

@app.route('/api/song')
def get_song():
    selected_song = random.choice(songs)
    selected_song['path'] = os.path.join(app.static_url_path, 'music', selected_song['file'])
    return jsonify(selected_song)

def get_db_connection():
    conn = sqlite3.connect('song_likes.db')
    conn.row_factory = sqlite3.Row
    return conn

@app.route('/api/likes/<song>')
def get_likes(song):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT likes FROM songs WHERE title = ?', (song,))
    song_data = cursor.fetchone()
    conn.close()

    like_count = song_data['likes'] if song_data else 0
    return jsonify({'likes': like_count})

@app.route('/api/like/<song>', methods=['POST'])
@app.route('/api/like/<song>', methods=['POST'])
def like_song(song):
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT likes FROM songs WHERE title = ?', (song,))
            song_data = cursor.fetchone()

            if song_data:
                new_likes = song_data['likes'] + 1
                cursor.execute('UPDATE songs SET likes = ? WHERE title = ?', (new_likes, song))
            else:
                cursor.execute('INSERT INTO songs (title, likes) VALUES (?, 1)', (song,))
                new_likes = 1

            conn.commit()
            return jsonify({'likes': new_likes})

    except sqlite3.Error as e:
        print(f"Database error: {e}")
        return jsonify({'error': 'Database error occurred'}), 500

def get_comments_db_connection():
    conn = sqlite3.connect('komments.db')
    conn.row_factory = sqlite3.Row
    return conn


@app.route('/api/comment', methods=['POST'])
def post_comment():
    #comment_text = request.json['comment'].strip()
    raw_comment_text = request.json['comment'].strip()
    if not raw_comment_text:
        return jsonify({'status': 'error', 'message': 'Comment cannot be empty'}), 400
    sanitized_comment = nh3.clean(raw_comment_text)
    processed_comment = replace_prohibited_words(sanitized_comment)

    conn = get_comments_db_connection()
    conn.execute('INSERT INTO comments (comment) VALUES (?)', (processed_comment,))
    conn.commit()
    conn.close()

    return jsonify({'status': 'success'})

def format_comment(text):
    text = html.escape(text)
    if text.startswith('>'):
        # Apply green text style to the entire comment
        return f'<span style="color: green;">{text[1:]}</span>'
    else:
        # Return the text as is if it doesn't start with '>'
        return text

def replace_prohibited_words(text):
    for word, replacement in REPLACEMENTS.items():
        # Use regular expressions for case-insensitive replacement
        text = re.sub(re.escape(word), replacement, text, flags=re.IGNORECASE)
    return text

@app.route('/api/comments')
def get_comments():
    conn = get_comments_db_connection()
    comments = conn.execute('SELECT id, comment, timestamp FROM comments ORDER BY timestamp DESC').fetchall()
    conn.close()
    formatted_comments = [{'id': comment['id'],
                           'comment': format_comment(comment['comment']),
                           'timestamp': comment['timestamp']} 
                           for comment in comments]
    return jsonify(formatted_comments)

if __name__ == '__main__':
    app.run(debug=False, port=9001)