@echo off
REM Task Scheduler 트리거용 — 로그온 시 pm2 dump 복원
REM pm2-windows-startup 의 보조 안전망. 둘이 모두 등록되어 있어도 중복 실행은 idempotent.
cd /d D:\SYS_v4
node "%APPDATA%\npm\node_modules\pm2\bin\pm2" resurrect
