const express = require('express');
const { spawn } = require('child_process');
const fs = require('fs');
const session = require('express-session');
const app = express();

app.use(express.static('c:\\camaras'));
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'Poliku2626',
    resave: false,
    saveUninitialized: false
}));

const cameras = {
    'camara1': 'rtsp://radio:Conectar123456@192.168.10.18:1025/live.sdp',
    'camara2': 'rtsp://radio:Conectar123456@192.168.10.69:554/live.sdp',
    'camara3': 'rtsp://radio:Conectar123456@192.168.10.75:554',
    'camara4': 'rtsp://radio:Conectar123456@192.168.10.74:554'
};

const users = {
    'radio': 'Conectar123456'
};

Object.keys(cameras).forEach(cameraId => {
    const rtspUrl = cameras[cameraId];
    const outputFile = `c:\\camaras\\hls\\${cameraId}.m3u8`;
    console.log(`Iniciando FFmpeg para ${cameraId} en ${outputFile}`);
    const ffmpeg = spawn('c:\\camaras\\ffmpeg\\bin\\ffmpeg', [
        '-i', rtspUrl,
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-b:v', '2M',
        '-r', '25',
        '-g', '75',
        '-sc_threshold', '0',
        '-force_key_frames', 'expr:gte(t,n_forced*3)',
        '-c:a', 'aac',
        '-ar', '44100',
        '-use_wallclock_as_timestamps', '1', // Usar timestamps basados en el reloj
        '-f', 'hls',
        '-hls_time', '3',
        '-hls_list_size', '10',
        '-hls_segment_filename', `c:\\camaras\\hls\\${cameraId}_%03d.ts`,
        '-hls_flags', 'delete_segments+append_list',
        '-loglevel', 'debug',
        outputFile
    ]);
    ffmpeg.stderr.on('data', (data) => console.error(`FFmpeg stderr (${cameraId}): ${data.toString()}`));
    ffmpeg.stdout.on('data', (data) => console.log(`FFmpeg stdout (${cameraId}): ${data.toString()}`));
    ffmpeg.on('error', (err) => console.error(`FFmpeg error (${cameraId}): ${err}`));
    ffmpeg.on('close', (code) => console.log(`FFmpeg cerrado (${cameraId}) con código ${code}`));
    ffmpeg.on('spawn', () => console.log(`FFmpeg proceso iniciado correctamente para ${cameraId}`));
});

function isAuthenticated(req, res, next) {
    if (req.session.loggedIn) return next();
    res.redirect('/login');
}

app.get('/login', (req, res) => {
    res.send(`
        <form method="POST" action="/login">
            <h2>Iniciar Sesión</h2>
            <label>Usuario: <input type="text" name="username"></label><br>
            <label>Contraseña: <input type="password" name="password"></label><br>
            <button type="submit">Ingresar</button>
        </form>
    `);
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (users[username] && users[username] === password) {
        req.session.loggedIn = true;
        res.redirect('/index.html');
    } else {
        res.send('Usuario o contraseña incorrectos. <a href="/login">Volver</a>');
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

app.get('/stream/:cameraId', isAuthenticated, (req, res) => {
    const cameraId = req.params.cameraId;
    const fileToServe = `c:\\camaras\\hls\\${cameraId}.m3u8`;
    if (!cameras[cameraId]) return res.status(404).send('Cámara no encontrada');
    if (fs.existsSync(fileToServe)) {
        res.sendFile(fileToServe, (err) => {
            if (err) {
                console.error(`Error enviando archivo ${fileToServe}: ${err.message}`);
                res.status(500).send('Error generando stream');
            }
        });
    } else {
        res.status(503).send('Stream aún no disponible, espera unos segundos');
    }
});

app.get('/index.html', isAuthenticated, (req, res) => {
    res.sendFile('c:\\camaras\\index.html');
});

app.listen(3000, () => console.log('Servidor en http://localhost:3000'));