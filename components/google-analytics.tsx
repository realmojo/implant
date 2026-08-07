const MEASUREMENT_ID = "G-SZ6J7M8P0M"

/**
 * Google Analytics (gtag.js).
 *
 * next/script 를 쓰지 않는다. 루트 레이아웃은 서버에서 렌더되므로 여기서 그린
 * <script> 는 최초 HTML 에 그대로 실려 정상 실행된다.
 * 표준 스니펫대로 외부 스크립트는 async 로 싣고, 인라인에서 dataLayer 를
 * 먼저 만들어 두기 때문에 로드 순서와 무관하게 동작한다.
 */
export function GoogleAnalytics() {
  return (
    <>
      <script
        async
        src={`https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`}
      />
      <script
        dangerouslySetInnerHTML={{
          __html: `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${MEASUREMENT_ID}');`,
        }}
      />
    </>
  )
}
