// pm2 ecosystem — SYS_v4 (3747) + KDS bridge (3939) 운영 프로세스 매니저.
//
// 사용:
//   초기 1회:
//     npm run bundle:claude         # prestart 의 bundle-claude.js 를 수동 실행
//     pm2 start ecosystem.config.js
//     pm2 save                      # 현재 프로세스 목록을 dump 에 기록
//     pm2-startup install           # Windows 부팅 시 자동 기동 등록
//
//   상태 확인:
//     pm2 status / pm2 logs / pm2 logs sys-v4 / pm2 logs kds-bridge
//
//   중지:
//     pm2 stop all / pm2 delete all
//
// 정책:
//   - autorestart: 죽으면 즉시 재기동
//   - max_restarts + min_uptime: 1분 안에 5번 죽으면 멈춤 (flapping 보호)
//   - max_memory_restart: 메모리 초과 시 자동 재시작 (OOM 사전 차단)
//   - 로그는 logs/pm2-*.log 에 분리 저장

module.exports = {
  apps: [
    {
      name: 'sys-v4',
      script: 'src/server.js',
      cwd: 'D:/SYS_v4',
      env: { ESYS_DEV: '1' },
      autorestart: true,
      watch: false,
      max_restarts: 5,
      min_uptime: '60s',
      max_memory_restart: '1G',
      out_file: 'D:/SYS_v4/logs/pm2-sys-v4-out.log',
      error_file: 'D:/SYS_v4/logs/pm2-sys-v4-err.log',
      merge_logs: true,
      time: true,
    },
    {
      name: 'kds-bridge',
      script: 'bridge-server.js',
      cwd: 'C:/Users/hj.moon/Downloads/AX_KDS_design system-v4/AX_KDS_design system-v4',
      autorestart: true,
      watch: false,
      max_restarts: 5,
      min_uptime: '60s',
      max_memory_restart: '512M',
      out_file: 'D:/SYS_v4/logs/pm2-kds-bridge-out.log',
      error_file: 'D:/SYS_v4/logs/pm2-kds-bridge-err.log',
      merge_logs: true,
      time: true,
    },
  ],
};
