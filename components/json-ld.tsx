/**
 * JSON-LD 삽입용 서버 컴포넌트.
 *
 * `<` 를 이스케이프해 본문에 `</script>` 가 섞여도 태그가 조기에 닫히지 않게 한다.
 * (치과명·주소는 외부 데이터라 그대로 신뢰하지 않는다.)
 */
export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  )
}
