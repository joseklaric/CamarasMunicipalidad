Set WShell = CreateObject("WScript.Shell")
' Cierra cualquier instancia existente de node.exe
WShell.Run "cmd.exe /c taskkill /IM node.exe /F", 0, True
' Agrega un retraso de 30 segundos
WScript.Sleep 30000 ' 30 segundos
' Inicia el servidor
WShell.Run "cmd.exe /c cd c:\camaras && node servidor.js", 1