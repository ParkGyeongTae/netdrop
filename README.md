# netdrop

같은 로컬 네트워크(Wi-Fi)에 연결된 기기끼리 텍스트/파일을 웹서버를 통해 주고받는 도구입니다.

## 사용 시나리오

1. 개인 컴퓨터에서 웹서버를 실행합니다.
2. 같은 Wi-Fi에 연결된 다른 컴퓨터의 브라우저로 그 웹서버에 접속합니다.
3. 접속한 페이지의 입력창에 텍스트를 입력하면, 접속한 모든 사람에게 그 내용이 실시간으로 표시됩니다.
4. (향후) 텍스트뿐 아니라 파일/폴더도 같은 방식으로 주고받을 예정입니다.

## 설치 요구 사항

- [Node.js](https://nodejs.org/) 18 이상 (내장 모듈만 사용하므로 `npm install`은 필요 없습니다)

## 실행 방법

```bash
git clone https://github.com/ParkGyeongTae/netdrop.git
cd netdrop
node server.js
```

서버를 실행하면 콘솔에 접속 주소가 출력됩니다.

```
netdrop 서버가 실행 중입니다.
  로컬:  http://localhost:8080
  같은 Wi-Fi: http://192.168.0.x:8080
```

- 서버를 실행한 컴퓨터에서는 `http://localhost:8080`으로 접속합니다.
- 같은 Wi-Fi의 다른 기기에서는 `같은 Wi-Fi:` 옆에 출력된 주소로 접속합니다.
- 포트를 바꾸고 싶다면 `PORT` 환경 변수를 지정합니다: `PORT=3000 node server.js`

## 로드맵

- [ ] Phase 1: 텍스트를 웹으로 받아 접속한 모든 사람에게 실시간으로 표시
- [ ] Phase 2: 파일 전송
- [ ] Phase 3: 폴더(다중 파일) 전송

## 기술 스택

- Node.js (외부 npm 의존성 없음, `node server.js`로 바로 실행)
- 내장 `http` 모듈 기반 단일 파일 서버
- 실시간 미리보기는 Server-Sent Events(SSE)로 전달

## 상태

초기 단계, 개발 진행 중입니다.
