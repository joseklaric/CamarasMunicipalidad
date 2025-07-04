@echo off
cd C:\camaras
taskkill /IM node.exe /F
"C:\Users\Administrador\AppData\Roaming\npm\pm2.cmd" start servidor.js || "C:\Users\Administrador\AppData\Roaming\npm\pm2.cmd" resurrect
"C:\Users\Administrador\AppData\Roaming\npm\pm2.cmd" save
exit

