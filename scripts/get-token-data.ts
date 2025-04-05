const { createUmi } = require('@metaplex-foundation/umi-bundle-defaults');
const { fetchMetadata, findMetadataPda } = require('@metaplex-foundation/mpl-token-metadata');
const { publicKey } = require('@metaplex-foundation/umi');

(async () => {
  // Umi 인스턴스 생성
  const umi = createUmi('https://api.devnet.solana.com');

  // Mint 주소 설정
  const mint = publicKey('43hotxWdt5efQi7aJwRVpexZBcHMKNaNn9Z4dG7QxJeT');

  // 메타데이터 PDA 찾기
  const metadataPda = findMetadataPda(umi, { mint });

  // 메타데이터 가져오기
  const metadata = await fetchMetadata(umi, metadataPda);

  // isMutable 상태 출력
  console.log('isMutable:', metadata.isMutable);

  console.log('metadata:', metadata);
})();