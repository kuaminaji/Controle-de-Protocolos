' iniciar_backend.vbs
Set WshShell = CreateObject("WScript.Shell")
WshShell.Run chr(34) & "C:\Protocolos\backend\backend.bat" & Chr(34), 0
Set WshShell = Nothing
