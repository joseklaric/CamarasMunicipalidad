require('dotenv').config({ path: 'c:\\camaras\\.env' }); // Carga las variables de entorno desde el archivo .env en c:\camaras
console.log('Credenciales de login cargadas:', process.env.LOGIN_USERNAME, process.env.LOGIN_PASSWORD);
console.log('Credenciales de cámaras cargadas:', process.env.CAMERA_USERNAME, process.env.CAMERA_PASSWORD);
const express = require('express');
const { spawn } = require('child_process');
const fs = require('fs');
const session = require('express-session');
const app = express();

// Configuración para rastrear intentos fallidos
const loginAttempts = new Map(); // Almacena los intentos fallidos por nombre de usuario
const MAX_ATTEMPTS = 5; // Máximo de intentos permitidos antes de bloquear
const LOCKOUT_TIME = 15 * 60 * 1000; // 15 minutos en milisegundos

app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'Poliku2626',
    resave: false,
    saveUninitialized: false
}));

// Sirve los archivos estáticos de la carpeta public sin autenticación (para logo-casilda.png)
app.use('/public', express.static('c:\\camaras\\public'));

// Define las rutas públicas (/login y /logout) antes de aplicar isAuthenticated
app.get('/login', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Iniciar Sesión - Casilda</title>
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                    font-family: 'Arial', sans-serif;
                }

                body {
                    background-color: #F5F5F5;
                    color: #333;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                }

                header {
                    background-color: #2E7D32;
                    padding: 15px 0;
                    text-align: center;
                    position: fixed;
                    top: 0;
                    width: 100%;
                    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
                }

                header img.logo {
                    max-width: 280px;
                    height: auto;
                }

                header h1 {
                    color: #FFFFFF;
                    font-size: 24px;
                    margin-top: 10px;
                }

                .login-container {
                    background-color: #FFFFFF;
                    padding: 30px;
                    border-radius: 10px;
                    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
                    width: 100%;
                    max-width: 400px;
                    margin-top: 100px;
                    text-align: center;
                }

                .login-container h2 {
                    color: #2E7D32;
                    margin-bottom: 20px;
                }

                .login-container label {
                    display: block;
                    text-align: left;
                    margin-bottom: 5px;
                    font-weight: bold;
                }

                .login-container input {
                    width: 100%;
                    padding: 10px;
                    margin-bottom: 15px;
                    border: 1px solid #ccc;
                    border-radius: 5px;
                    font-size: 16px;
                }

                .login-container button {
                    background-color: #FFCA28;
                    color: #333;
                    border: none;
                    padding: 12px 25px;
                    font-size: 16px;
                    cursor: pointer;
                    border-radius: 5px;
                    width: 100%;
                    transition: background-color 0.3s;
                }

                .login-container button:hover {
                    background-color: #FFB300;
                }
            </style>
        </head>
        <body>
            <header>
                <img src="/public/logo-casilda.png" alt="Logo Casilda" class="logo">
                <h1>Iniciar Sesión - Casilda</h1>
            </header>

            <div class="login-container">
                <h2>Iniciar Sesión</h2>
                <form method="POST" action="/login">
                    <label for="username">Usuario:</label>
                    <input type="text" id="username" name="username" required>
                    <label for="password">Contraseña:</label>
                    <input type="password" id="password" name="password" required>
                    <button type="submit">Ingresar</button>
                </form>
            </div>
        </body>
        </html>
    `);
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const now = Date.now();

    // Verifica si el usuario está bloqueado
    const attemptData = loginAttempts.get(username) || { attempts: 0, lastAttempt: 0, lockedUntil: 0 };
    
    if (attemptData.lockedUntil > now) {
        const remainingTime = Math.ceil((attemptData.lockedUntil - now) / 1000 / 60); // Tiempo restante en minutos
        console.log(`Usuario ${username} bloqueado hasta ${new Date(attemptData.lockedUntil).toISOString()}`);
        return res.send(`
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Error - Casilda</title>
                <style>
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                        font-family: 'Arial', sans-serif;
                    }

                    body {
                        background-color: #F5F5F5;
                        color: #333;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        height: 100vh;
                    }

                    header {
                        background-color: #2E7D32;
                        padding: 15px 0;
                        text-align: center;
                        position: fixed;
                        top: 0;
                        width: 100%;
                        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
                    }

                    header img.logo {
                        max-width: 280px;
                        height: auto;
                    }

                    header h1 {
                        color: #FFFFFF;
                        font-size: 24px;
                        margin-top: 10px;
                    }

                    .error-container {
                        background-color: #FFFFFF;
                        padding: 30px;
                        border-radius: 10px;
                        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
                        width: 100%;
                        max-width: 400px;
                        margin-top: 100px;
                        text-align: center;
                    }

                    .error-container p {
                        color: #D32F2F;
                        margin-bottom: 20px;
                    }

                    .error-container a {
                        color: #2E7D32;
                        text-decoration: none;
                        font-weight: bold;
                    }

                    .error-container a:hover {
                        text-decoration: underline;
                    }
                </style>
            </head>
            <body>
                <header>
                    <img src="/public/logo-casilda.png" alt="Logo Casilda" class="logo">
                    <h1>Error - Casilda</h1>
                </header>

                <div class="error-container">
                    <p>Demasiados intentos fallidos. Estás bloqueado por ${remainingTime} minutos.</p>
                    <a href="/login">Volver</a>
                </div>
            </body>
            </html>
        `);
    }

    console.log(`Intento de login - Ingresado: ${username}:${password}`);
    console.log(`Credenciales esperadas: ${process.env.LOGIN_USERNAME}:${process.env.LOGIN_PASSWORD}`);

    if (users[username] && users[username] === password) {
        console.log('Login exitoso');
        // Limpia los intentos fallidos después de un login exitoso
        loginAttempts.delete(username);
        req.session.loggedIn = true;
        res.redirect('/index.html');
    } else {
        console.log('Login fallido');
        // Incrementa el contador de intentos fallidos
        attemptData.attempts += 1;
        attemptData.lastAttempt = now;

        if (attemptData.attempts >= MAX_ATTEMPTS) {
            attemptData.lockedUntil = now + LOCKOUT_TIME;
            console.log(`Usuario ${username} bloqueado por ${LOCKOUT_TIME / 1000 / 60} minutos`);
        }

        loginAttempts.set(username, attemptData);

        res.send(`
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Error - Casilda</title>
                <style>
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                        font-family: 'Arial', sans-serif;
                    }

                    body {
                        background-color: #F5F5F5;
                        color: #333;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        height: 100vh;
                    }

                    header {
                        background-color: #2E7D32;
                        padding: 15px 0;
                        text-align: center;
                        position: fixed;
                        top: 0;
                        width: 100%;
                        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
                    }

                    header img.logo {
                        max-width: 280px;
                        height: auto;
                    }

                    header h1 {
                        color: #FFFFFF;
                        font-size: 24px;
                        margin-top: 10px;
                    }

                    .error-container {
                        background-color: #FFFFFF;
                        padding: 30px;
                        border-radius: 10px;
                        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
                        width: 100%;
                        max-width: 400px;
                        margin-top: 100px;
                        text-align: center;
                    }

                    .error-container p {
                        color: #D32F2F;
                        margin-bottom: 20px;
                    }

                    .error-container a {
                        color: #2E7D32;
                        text-decoration: none;
                        font-weight: bold;
                    }

                    .error-container a:hover {
                        text-decoration: underline;
                    }
                </style>
            </head>
            <body>
                <header>
                    <img src="/public/logo-casilda.png" alt="Logo Casilda" class="logo">
                    <h1>Error - Casilda</h1>
                </header>

                <div class="error-container">
                    <p>Usuario o contraseña incorrectos. Intentos restantes: ${MAX_ATTEMPTS - attemptData.attempts}</p>
                    <a href="/login">Volver</a>
                </div>
            </body>
            </html>
        `);
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

// Aplica el middleware isAuthenticated a todas las demás rutas
function isAuthenticated(req, res, next) {
    if (req.session.loggedIn) return next();
    res.redirect('/login');
}

app.use(isAuthenticated);

// Sirve los archivos estáticos después de la autenticación
app.use(express.static('c:\\camaras'));

// Usa variables de entorno para las URLs de las cámaras
const cameras = {
    'camara1': `rtsp://${process.env.CAMERA_USERNAME || 'radio'}:${process.env.CAMERA_PASSWORD || 'Conectar123456'}@192.168.10.18:1025/live.sdp`,
    'camara2': `rtsp://${process.env.CAMERA_USERNAME || 'radio'}:${process.env.CAMERA_PASSWORD || 'Conectar123456'}@192.168.10.69:554/live.sdp`,
    'camara3': `rtsp://${process.env.CAMERA_USERNAME || 'radio'}:${process.env.CAMERA_PASSWORD || 'Conectar123456'}@192.168.10.72:554`,
    'camara4': `rtsp://${process.env.CAMERA_USERNAME || 'radio'}:${process.env.CAMERA_PASSWORD || 'Conectar123456'}@192.168.10.76:554`,
    
};

// Usa variables de entorno para las credenciales del usuario (login)
const users = {
    [process.env.LOGIN_USERNAME || 'radio']: process.env.LOGIN_PASSWORD || 'Conectar123456'
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
        '-use_wallclock_as_timestamps', '1',
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

app.get('/close', (req, res) => {
    res.send('Cerrando servidor...');
    setTimeout(() => process.exit(), 1000);
});

app.listen(3000, '0.0.0.0', () => console.log('Servidor en http://0.0.0.0:3000'));