document.addEventListener('DOMContentLoaded', (event) => {
    const audioPlayer = document.getElementById('audioPlayer');
    const songInfoDiv = document.getElementById('song-info');
    const canvas = document.getElementById('audioVisualizer');
    const canvasCtx = canvas.getContext('2d');
    const colorPicker = document.getElementById('colorPicker');

    let audioContext;
    let analyzer;
    let dataArray;
    let started = false;
    let barColor = colorPicker.value;

    const modal = document.getElementById("settingsModal");
    const btn = document.querySelector(".modal-btn");
    const span = document.getElementsByClassName("close")[0];

    btn.onclick = function() {
        modal.style.display = "block";
    }

    span.onclick = function() {
        modal.style.display = "none";
    }

    window.onclick = function(event) {
        if (event.target === modal) {
            modal.style.display = "none";
        }
    }

    colorPicker.addEventListener('change', (e) => {
        barColor = e.target.value;
    });

    function setCanvasSize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight / 2.5; // Adjust height as needed
        if (analyzer) {
            draw(); // Redraw if analyzer exists
        }
    }

    window.addEventListener('resize', setCanvasSize);
    setCanvasSize();

    function setupVisualizer() {
        if (!started) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const source = audioContext.createMediaElementSource(audioPlayer);
            analyzer = audioContext.createAnalyser();
            source.connect(analyzer);
            analyzer.connect(audioContext.destination);
            analyzer.fftSize = 256;
            const bufferLength = analyzer.frequencyBinCount;
            dataArray = new Uint8Array(bufferLength);
            started = true;
        }
        canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
        draw();
    }

    function draw() {
        if (!analyzer) return;

        requestAnimationFrame(draw);
        analyzer.getByteFrequencyData(dataArray);
        canvasCtx.fillStyle = 'rgb(0, 0, 0)';
        canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

        let barWidth = (canvas.width / dataArray.length) * 5;
        let barHeight;
        let x = 0;
        let radius = 8; // Radius for rounded corners
        let stepSize = 2;

        for (let i = 0; i < dataArray.length; i += stepSize) {
            barHeight = dataArray[i];

            canvasCtx.beginPath();
            canvasCtx.fillStyle = barColor;
            canvasCtx.moveTo(x + radius, canvas.height - barHeight / 2);
            canvasCtx.arcTo(x + barWidth, canvas.height - barHeight / 2, x + barWidth, canvas.height, radius);
            canvasCtx.arcTo(x + barWidth, canvas.height, x, canvas.height, radius);
            canvasCtx.arcTo(x, canvas.height, x, canvas.height - barHeight / 2, radius);
            canvasCtx.arcTo(x, canvas.height - barHeight / 2, x + barWidth, canvas.height - barHeight / 2, radius);
            canvasCtx.closePath();
            canvasCtx.fill();

            x += barWidth + 1;
        }
    }

    audioPlayer.onplay = () => {
        if (!audioContext) {
            setupVisualizer();
        }
    };

    const volumeControl = document.getElementById('volumeControl');
    volumeControl.addEventListener('input', function() {
        audioPlayer.volume = this.value;
        document.getElementById('volValue').innerHTML= `${this.value*100}%`;
    });

    const playButton = document.getElementById('play-button');
    playButton.addEventListener('click', function() {
        if (audioPlayer.paused) {
            audioPlayer.play();
            setupVisualizer();
            playButton.classList.remove('lni-play');
            playButton.classList.add('lni-pause');
        }
    });

    function fetchSongAndUpdatePlayer() {
        fetch('/api/song')
            .then(response => response.json())
            .then(songData => {
                audioPlayer.src = songData.path;
                audioPlayer.load();
                document.getElementById('current-song').textContent = songData.title; // Corrected element for the song title
                document.getElementById('current-artist').textContent = songData.artist;
                document.getElementById('current-album').textContent = songData.album;
                updateLikeCount(songData.title);
                //songInfoDiv.innerHTML = `Now playing: ${songData.title} <br>Artist(s): ${songData.artist}`;
                updateLikeButt();
            })
            .catch(error => console.error('Error fetching new song:', error));
    }

    audioPlayer.onended = fetchSongAndUpdatePlayer;
    fetchSongAndUpdatePlayer();
});

function showInfo(sectionId) {
    const sections = document.querySelectorAll('.info-content');
    sections.forEach(section => {
        if (section.id === sectionId) {
            section.style.display = section.style.display === 'block' ? 'none' : 'block';
        } else {
            section.style.display = 'none'; // Hide other sections
        }
    });
}

function setCurrentSong(songTitle) {
    document.getElementById('song-info').textContent = songTitle;
    updateLikeCount(songTitle);
}

function updateLikeButt() {
    const likeButt = document.getElementById('like-button');
    hasLiked = false;
    likeButt.classList.remove('lni-heart-fill');
    likeButt.classList.remove('animate__rubberBand');
    likeButt.classList.add('lni-heart');
}

function updateLikeCount(songTitle) {
    fetch(`/api/likes/${encodeURIComponent(songTitle)}`)
        .then(response => response.json())
        .then(data => {
            document.getElementById('like-count').textContent = data.likes;
        })
        .catch(error => console.error('Error fetching like count:', error));
}

let hasLiked = false;

document.getElementById('like-button').addEventListener('click', function() {
    if(!hasLiked){
    const currentSongTitle = document.getElementById('current-song').textContent;
    fetch(`/api/like/${encodeURIComponent(currentSongTitle)}`, { method: 'POST' })
        .then(response => response.json())
        .then(data => {
            document.getElementById('like-count').textContent = data.likes;
            this.classList.remove('lni-heart');
            this.classList.add('lni-heart-fill');
            this.classList.add('animate__rubberBand');
            hasLiked = true;
        })
        .catch(error => console.error('Error updating like count:', error));
    }
});

document.getElementById('toggle-comments').addEventListener('click', function() {
    var contentDiv = document.getElementById('content');
    var commentsDiv = document.getElementById('comments-sextion');

    if (contentDiv.style.display !== 'none') {
        contentDiv.style.display = 'none';
        commentsDiv.style.display = 'block';
        loadComments(); // Function to load comments
    } else {
        contentDiv.style.display = 'block';
        commentsDiv.style.display = 'none';
    }
});

function formatting(commentText) {
        return commentText;
}

function loadComments() {
    fetch('/api/comments')
        .then(response => response.json())
        .then(comments => {
            var commentsDiv = document.getElementById('comments-section');
            commentsDiv.innerHTML = ''; // Clear previous comments
            comments.forEach(comment => {
                var commentElement = document.createElement('div');
                var formattedComment = formatting(comment.comment);
                commentElement.className = "seeduck";
                commentElement.innerHTML = `<strong>#${comment.id} <span style="color:#9f52cb;margin-left:1px;">Stranger</span></strong><small style="float:right;">${comment.timestamp}</small><br>${formattedComment}`;
                commentsDiv.appendChild(commentElement);
            });
        })
        .catch(error => console.error('Error loading comments:', error));
}

function submitComment(commentText) {
    fetch('/api/comment', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ comment: commentText })
    })
    .then(response => response.json())
    .then(data => {
        console.log('Comment submitted:', data);
        loadComments();
    })
    .catch(error => console.error('Error posting comment:', error));
}

document.getElementById('comment-form').addEventListener('submit', function(event) {
    event.preventDefault();
    const commentText = document.getElementById('comment-text').value.trim();
    if(commentText){
        submitComment(commentText);
        document.getElementById('comment-text').value = ''; // Clear the textarea
    }
    else if(!commentText) {
        alert("Why do you want to enter an empty comment?");
    }
});

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('static/js/service-worker.js').then(registration => {
            console.log('ServiceWorker registration successful with scope: ', registration.scope);
        }, err => {
            console.log('ServiceWorker registration failed: ', err);
        }).catch(err => {
            console.log(err);
        });
    });
} else {
    console.log('Service workers are not supported.');
}

document.getElementById('feeduck').addEventListener('click', function() {
    var chuck = document.getElementById('sneed');
    var feed = document.getElementById('feeduck');
    if(chuck.style.display !== 'none') {
        chuck.style.display = 'none';
        feed.classList.remove('lni-angle-double-down');
        feed.classList.add('lni-angle-double-up');
    }
    else {
        chuck.style.display = 'block';
        feed.classList.remove('lni-angle-double-up');
        feed.classList.add('lni-angle-double-down');

    }
});